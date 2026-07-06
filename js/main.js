// main.js — 總指揮:狀態機、渲染迴圈(含 hidden browser 後備)、相機、互動、漫遊模式、__DW 測試 API。
//
// 兩條鐵律(改邏輯前必讀):
//  1) 狀態與動畫分離。使用者操作當下 state 立即改變(聚焦、切視角、資訊面板);相機飛行/淡入只是裝飾。
//     動畫被節流/中斷/掉幀,邏輯不受影響。過去專案把邏輯綁在動畫回呼上,背景分頁節流時整個卡死——不要走回頭路。
//  2) 恐龍自主行為是 dt 驅動的模擬(每隻一個 mind:位置/朝向/速度/AI 狀態,見 updateHerd)。
//     對節流的韌性:dt 已夾在 ≤0.05,背景節流時只是步進變大、行為持續,不凍結。天色仍是 state.time 的純函數。
//     紀元史詩(updateEpic)也是 dt 驅動、可隨時結束並完整復原(恐龍縮放/天空/相機)。
import * as THREE from 'three';
import { SPECIES, SPECIES_BY_ID, PERIODS, PERIOD_BY_ID, speciesOfPeriod, tourOf, phaseOf, EPIC } from './data.js';
import { buildWorld, buildSky, skyStateForHour, heightAt, WORLD } from './world.js';
import { buildDino } from './dino.js';
import * as UI from './ui.js';

/* ---------------- 狀態(唯一事實來源) ---------------- */
const state = {
  view: 'overview',      // 'overview' | 'walk'
  period: 'cretaceous',  // 'triassic' | 'jurassic' | 'cretaceous' — 目前年代(只顯示該年代恐龍)
  focus: null,           // 恐龍 id | null
  following: false,      // 遠觀時相機是否跟著聚焦恐龍
  time: 10.0,            // 0..24 一天的時刻
  timeFlow: false,       // 時間是否自動流動
  tourIndex: -1,         // -1 表示未在導覽
  settings: { labels: true, shadows: true, fog: true, quality: 'high' },
};
let periodMood = PERIOD_BY_ID.cretaceous.mood;   // 目前年代的環境氛圍(天色/植被/密度)

let renderer, scene, camera, sky, worldRefs;
let sun, ambient, hemi;
const dinos = [];        // { root, sp, base:{x,z,rot}, label }
let raycaster, pointer;
const clock = { last: 0 };

// 相機控制(遠觀:軌道;漫遊:第一人稱)。
const orbit = { target: new THREE.Vector3(0, 4, 0), dist: 78, theta: 0.6, phi: 1.32, dragging: false, px: 0, py: 0 };
const walk = { pos: new THREE.Vector3(0, 0, 40), yaw: Math.PI, pitch: -0.05, vel: new THREE.Vector3(), keys: {}, locked: false, lockFailCount: 0, lastUnlock: -1 };
let flyTween = null;

// 紀元史詩模式(自動演出:三疊→侏羅→白堊→隕石→滅絕→鳥類)。
const epic = { active: false, t: 0, stage: -1, meteor: null, fireball: null, ash: null, skyFall: 0, shake: 0 };
const METEOR_START = new THREE.Vector3(280, 440, -540);
const METEOR_HIT = new THREE.Vector3(150, 6, -230);

const container = document.getElementById('app');
const labelLayer = document.getElementById('labels');

/* ---------------- 初始化 ---------------- */
async function init() {
  renderer = new THREE.WebGLRenderer({ antialias: state.settings.quality === 'high', powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, state.settings.quality === 'high' ? 2 : 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  container.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xbcd3e6, 120, 340);

  camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2000);

  UI.setLoad(0.1, '鋪設谷地地形...');
  await yieldFrame();
  worldRefs = buildWorld(scene, state.settings.quality);
  sky = buildSky(scene);

  UI.setLoad(0.4, '種下蕨類與針葉林...');
  await yieldFrame();

  // 光照。
  sun = new THREE.DirectionalLight(0xfff2d8, 1.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(state.settings.quality === 'high' ? 2048 : 1024, state.settings.quality === 'high' ? 2048 : 1024);
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 400;
  const sc = sun.shadow.camera; sc.left = -120; sc.right = 120; sc.top = 120; sc.bottom = -120;
  sun.shadow.bias = -0.0004;
  scene.add(sun); scene.add(sun.target);
  ambient = new THREE.AmbientLight(0xffffff, 0.7);
  hemi = new THREE.HemisphereLight(0xbcd3e6, 0x2a2416, 0.4);
  scene.add(ambient, hemi);

  UI.setLoad(0.6, '喚醒恐龍...');
  await yieldFrame();

  // 生成生物:每種一群(hero=第一隻,帶標籤、被聚焦;其餘為背景族群,散佈在 hero 周圍)。
  let idx = 0, si = 0;
  for (const sp of SPECIES) {
    const count = sp.herd ?? defaultHerd(sp);
    for (let k = 0; k < count; k++) {
      const isHero = k === 0;
      const root = buildDino(sp);          // 材質已快取,只重算幾何,成本低
      const jx = isHero ? 0 : (Math.random() - 0.5) * 26, jz = isHero ? 0 : (Math.random() - 0.5) * 26;
      const sx = sp.spawn.x + jx, sz = sp.spawn.z + jz;
      const rot = sp.spawn.rot + (isHero ? 0 : Math.random() * 6.28);
      const y = sp.spawn.fly ? (sp.period === 'cambrian' ? 10 : 30) : heightAt(sx, sz);
      root.position.set(sx, y, sz); root.rotation.y = rot;
      scene.add(root);
      const label = isHero ? makeLabel(sp) : null;
      const d = { root, sp, base: { x: sx, z: sz, rot }, label, hero: isHero, phase: idx * 0.7 };
      d.mind = initMind(sp, idx);
      d.mind.x = sx; d.mind.z = sz; d.mind.homeX = sx; d.mind.homeZ = sz; d.mind.heading = rot;
      d.mind.origScale = root.scale.x;
      dinos.push(d); idx++;
    }
    si++;
    UI.setLoad(0.6 + 0.35 * (si / SPECIES.length), `喚醒生物... ${sp.name}`);
    if (si % 4 === 0) await yieldFrame();   // 每幾種讓步一次(hidden 分頁 setTimeout 節流,少讓步=載入更快)
  }

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  bindInput();
  bindUI();
  setPeriod(state.period, true);   // 設定初始年代:恐龍可見性、環境氛圍、介紹卡(內含 applyTime)
  sizeToContainer();
  ro.observe(container);

  UI.setLoad(1.0, '完成');
  UI.hideLoading();
  UI.showHelp();
  UI.setActiveView('overview');

  startLoop();
  exposeTestAPI();
}

function yieldFrame() { return new Promise((r) => setTimeout(r, 0)); } // 見機器教訓:載入讓步用 setTimeout,hidden 下 rAF 不觸發

/* ---------------- 恐龍名稱標籤 ---------------- */
function makeLabel(sp) {
  const el = document.createElement('div');
  el.className = 'dinoLabel';
  el.textContent = sp.name;
  el.onclick = (e) => { e.stopPropagation(); focusDino(sp.id); };
  labelLayer.appendChild(el);
  return el;
}

/* ---------------- 時間與光照 ---------------- */
function applyTime(hour) {
  state.time = hour;
  const s = skyStateForHour(hour);
  // 疊上年代氛圍色調(乘算;白堊紀 tint=白=不變)。
  const tint = new THREE.Color(periodMood.sky);
  const top = s.top.clone().multiply(tint), bottom = s.bottom.clone().multiply(tint), horizon = s.horizon.clone().multiply(tint);
  sky.material.uniforms.top.value.copy(top);
  sky.material.uniforms.bottom.value.copy(bottom);
  sky.material.uniforms.horizon.value.copy(horizon);
  sun.color.copy(s.sunColor.clone().multiply(new THREE.Color(periodMood.sun))); sun.intensity = s.sunIntensity;
  ambient.color.copy(s.ambColor); ambient.intensity = s.ambIntensity;
  hemi.intensity = 0.35 + s.ambIntensity * 0.75;   // 提高天空/地面反照,讓恐龍陰影側不死黑、跳出植被
  hemi.color.copy(horizon); hemi.groundColor.setHex(periodMood.hemiGround);
  const d = s.sunDir.clone().multiplyScalar(160);
  sun.position.set(d.x, Math.max(4, d.y), d.z);
  // 霧色:白天用年代霧色,夜晚壓暗成地平線色。
  const fogC = horizon.clone().lerp(new THREE.Color(periodMood.fog), s.isNight ? 0 : 0.6);
  if (scene.fog) { scene.fog.color.copy(fogC); }
  renderer.setClearColor(fogC);
  UI.setClock(hour);
}

/* ---------------- 年代切換 ---------------- */
// 切換地質年代:只顯示該年代的恐龍,換上該年代的環境氛圍與發展史介紹卡。
function setPeriod(id, initial = false) {
  const per = PERIOD_BY_ID[id];
  if (!per) return;
  state.period = id;
  periodMood = per.mood;
  // 恐龍可見性(狀態立即套用)。
  dinos.forEach((d) => {
    const vis = d.sp.period === id;
    d.root.visible = vis;
    if (d.label) { d.label.style.display = (vis && state.settings.labels) ? '' : 'none'; if (!vis) d.label.classList.remove('show'); }
  });
  // 環境氛圍。
  worldRefs.applyMood(per.mood);
  applyTime(state.time);
  // 清掉上一年代的聚焦/導覽。
  state.focus = null; state.following = false; UI.hideInfo(); endTour();
  UI.setBreadcrumb(`${per.name} · ${per.tagline}`);
  UI.setActivePeriod(id);
  UI.rebuildDex(id, (spid) => focusDino(spid));
  // 發展史介紹卡:使用者主動切年代時彈出(初始載入已有歡迎頁,不重複打擾)。
  if (!initial) { UI.showPeriodIntro(per, speciesOfPeriod(id), (spid) => focusDino(spid)); resetCamera(); }
}

/* ---------------- 聚焦一隻恐龍 ---------------- */
function periodBreadcrumb() { const p = PERIOD_BY_ID[state.period]; return `${p.name} · ${p.tagline}`; }

function focusDino(id) {
  const sp = SPECIES_BY_ID[id];
  if (!sp) return;
  if (sp.period !== state.period) setPeriod(sp.period);   // 跨年代點選 → 先切到該年代
  state.focus = id;                       // 狀態立即改變
  state.following = false;
  UI.showInfo(sp, state.following, () => toggleFollow());
  UI.setBreadcrumb(`${sp.name} · ${sp.sci}`);
  const d = dinos.find((x) => x.sp.id === id);
  if (d && state.view === 'overview') {
    // 裝飾層:相機飛過去,並用接近水平的低角度把恐龍映在天空/地平線上(比俯視清楚立體得多)。
    const target = d.root.position.clone().add(new THREE.Vector3(0, sp.heightM * 0.5, 0));
    // 依體型決定距離,讓恐龍約佔畫面 60% 高。特徵尺寸取身高與體長折衷。
    const char = Math.max(sp.heightM * 1.1, sp.lengthM * 0.55);
    const dist = clamp(char * 1.9, 5, 70);   // 下限放小,讓迷你恐龍(始盜龍等)也框得夠近
    startFly(target, dist, 1.42, sp.spawn.rot + 2.3);    // 低角度近水平、從側前方看剪影
  }
}
function toggleFollow() {
  state.following = !state.following;
  UI.showInfo(SPECIES_BY_ID[state.focus], state.following, () => toggleFollow());
}
function closeInfo() {
  state.focus = null; state.following = false;
  UI.hideInfo(); UI.setBreadcrumb(periodBreadcrumb());
}

// 相機飛行:補間 目標點、距離,可選補間 phi(俯仰)/theta(方位)。角度省略時維持現值。
function startFly(target, dist, phi = orbit.phi, theta = orbit.theta) {
  // theta 取最短路徑,避免繞一大圈。
  let dTheta = theta - orbit.theta;
  while (dTheta > Math.PI) dTheta -= Math.PI * 2;
  while (dTheta < -Math.PI) dTheta += Math.PI * 2;
  flyTween = {
    from: orbit.target.clone(), to: target.clone(), fromD: orbit.dist, toD: dist,
    fromPhi: orbit.phi, toPhi: phi, fromTheta: orbit.theta, toTheta: orbit.theta + dTheta, t: 0,
  };
}

/* ---------------- 視角切換 ---------------- */
function setView(view) {
  if (view === state.view) return;
  if (view === 'walk') enterWalk();
  else exitWalk();
}
function enterWalk() {
  state.view = 'walk';
  UI.setActiveView('walk'); UI.setWalkHUD(true);
  UI.setBreadcrumb('漫遊 · 第一人稱');
  // 從目前相機附近的地面開始。
  walk.pos.set(orbit.target.x, 0, orbit.target.z + 30);
  walk.pos.y = heightAt(walk.pos.x, walk.pos.z) + 1.7;
  requestLock();
}
function exitWalk() {
  state.view = 'overview';
  UI.setActiveView('overview'); UI.setWalkHUD(false); UI.showResumeTip(false);
  UI.setBreadcrumb(state.focus ? `${SPECIES_BY_ID[state.focus].name}` : periodBreadcrumb());
  if (document.pointerLockElement) document.exitPointerLock();
}

/* ---------------- Pointer Lock(遵守冷卻教訓) ---------------- */
function requestLock() {
  // Esc 退出後約 1.25s 內必失敗;若剛解鎖不到 1.3s,先不要硬試,等玩家點畫面。
  const p = renderer.domElement.requestPointerLock?.();
  if (p && p.catch) p.catch(() => {});
}
document.addEventListener('pointerlockchange', () => {
  walk.locked = document.pointerLockElement === renderer.domElement;
  if (state.view === 'walk') {
    if (!walk.locked) { walk.lastUnlock = performance.now(); UI.showResumeTip(true); }
    else { UI.showResumeTip(false); }
  }
});
document.addEventListener('pointerlockerror', () => {
  walk.lockFailCount++;
  // 連續失敗 ≥3 次才判定環境不支援(見教訓:第一次失敗常只是冷卻期)。
  if (walk.lockFailCount >= 3) UI.showResumeTip(true);
});

/* ---------------- 輸入 ---------------- */
function bindInput() {
  const el = renderer.domElement;
  // 遠觀:拖曳旋轉。
  el.addEventListener('pointerdown', (e) => {
    if (state.view !== 'overview') return;
    orbit.dragging = true; orbit.px = e.clientX; orbit.py = e.clientY; orbit.moved = false;
  });
  window.addEventListener('pointermove', (e) => {
    if (state.view === 'overview' && orbit.dragging) {
      const dx = e.clientX - orbit.px, dy = e.clientY - orbit.py;
      if (Math.abs(dx) + Math.abs(dy) > 3) orbit.moved = true;
      orbit.theta -= dx * 0.005; orbit.phi = clamp(orbit.phi - dy * 0.005, 0.15, 1.5);
      orbit.px = e.clientX; orbit.py = e.clientY;
      state.following = false;
    } else if (state.view === 'walk' && walk.locked) {
      walk.yaw -= e.movementX * 0.0022; walk.pitch = clamp(walk.pitch - e.movementY * 0.0022, -1.2, 1.0);
    }
  });
  window.addEventListener('pointerup', () => { orbit.dragging = false; });
  el.addEventListener('wheel', (e) => {
    if (state.view !== 'overview') return;
    e.preventDefault(); orbit.dist = clamp(orbit.dist * (1 + Math.sign(e.deltaY) * 0.1), 12, 260);
  }, { passive: false });

  // 點擊選取恐龍(遠觀)。
  el.addEventListener('click', (e) => {
    if (state.view === 'overview') {
      if (orbit.moved) return;
      pickAt(e.clientX, e.clientY);
    } else if (state.view === 'walk' && !walk.locked) {
      // 玩家點畫面重新上鎖(冷卻過後才會成功;失敗會被 pointerlockerror 計數)。
      requestLock();
    }
  });
  el.addEventListener('dblclick', () => { if (state.view === 'overview') { closeInfo(); resetCamera(); } });

  // 鍵盤。
  window.addEventListener('keydown', (e) => {
    walk.keys[e.code] = true;
    if (e.code === 'Escape') {
      if (state.view === 'walk') { /* 瀏覽器自動解鎖,pointerlockchange 會顯示恢復提示 */ }
    }
    if (e.code === 'Digit1') setView('overview');
    if (e.code === 'Digit2') setView('walk');
    if (e.code === 'Space' && state.view === 'overview') { e.preventDefault(); toggleFlow(); }
  });
  window.addEventListener('keyup', (e) => { walk.keys[e.code] = false; });
}

function pickAt(cx, cy) {
  const r = renderer.domElement.getBoundingClientRect();
  pointer.x = ((cx - r.left) / r.width) * 2 - 1;
  pointer.y = -((cy - r.top) / r.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const roots = dinos.filter((d) => d.root.visible).map((d) => d.root);
  const hits = raycaster.intersectObjects(roots, true);
  if (hits.length) {
    let o = hits[0].object;
    while (o && !o.userData.dinoRoot) o = o.parent;
    if (o && o.userData.species) focusDino(o.userData.species.id);
  }
}

function bindUI() {
  UI.initUI({
    periods: PERIODS,
    onPeriod: (id) => setPeriod(id),
    onView: setView,
    onToggleDex: () => UI.toggleDex(),
    onTour: startTour,
    onFocus: (id) => focusDino(id),
    onCloseInfo: closeInfo,
    onTourStep: stepTour,
    onTourExit: endTour,
    onTime: (h) => { state.timeFlow = false; UI.setFlowIcon(false); applyTime(h); },
    onToggleFlow: toggleFlow,
    onSetting: applySetting,
    onEpic: startEpic,
    onEpicEnd: endEpic,
  });
}
function toggleFlow() { state.timeFlow = !state.timeFlow; UI.setFlowIcon(state.timeFlow); }

function applySetting(key, val) {
  state.settings[key] = val;
  if (key === 'shadows') renderer.shadowMap.enabled = val;
  if (key === 'fog') scene.fog = val ? new THREE.Fog(scene.fog?.color || 0xbcd3e6, 120, 340) : null;
  if (key === 'labels') dinos.forEach((d) => { if (d.label) d.label.style.display = (val && d.root.visible) ? '' : 'none'; });
  if (key === 'quality') {
    renderer.setPixelRatio(Math.min(devicePixelRatio, val === 'high' ? 2 : 1));
  }
  applyTime(state.time);
}

/* ---------------- 生態導覽(依目前年代動態產生) ---------------- */
function currentTour() { return tourOf(state.period); }
function startTour() { state.tourIndex = 0; showTourStep(); }
function stepTour(delta) {
  const tour = currentTour();
  state.tourIndex = clamp(state.tourIndex + delta, 0, tour.length - 1);
  showTourStep();
}
function showTourStep() {
  const tour = currentTour();
  const stop = tour[state.tourIndex];
  const sp = SPECIES_BY_ID[stop.id];
  focusDino(sp.id);
  UI.showTour(state.tourIndex, tour.length, sp, stop.text);
}
function endTour() { state.tourIndex = -1; UI.hideTour(); }

/* ---------------- 相機 ---------------- */
function resetCamera() { orbit.theta = 0.6; orbit.phi = 1.32; startFly(new THREE.Vector3(0, 4, 0), 78); }

function updateOverviewCamera(dt) {
  if (flyTween) {
    flyTween.t = Math.min(1, flyTween.t + dt * 1.6);
    const e = easeInOut(flyTween.t);
    orbit.target.lerpVectors(flyTween.from, flyTween.to, e);
    orbit.dist = flyTween.fromD + (flyTween.toD - flyTween.fromD) * e;
    orbit.phi = flyTween.fromPhi + (flyTween.toPhi - flyTween.fromPhi) * e;
    orbit.theta = flyTween.fromTheta + (flyTween.toTheta - flyTween.fromTheta) * e;
    if (flyTween.t >= 1) flyTween = null;
  }
  // 跟隨:目標平滑追上聚焦恐龍。
  if (state.following && state.focus) {
    const d = dinos.find((x) => x.sp.id === state.focus);
    if (d) orbit.target.lerp(d.root.position.clone().add(new THREE.Vector3(0, d.sp.heightM * 0.5, 0)), 0.06);
  }
  const st = Math.sin(orbit.phi), ct = Math.cos(orbit.phi);
  camera.position.set(
    orbit.target.x + orbit.dist * st * Math.sin(orbit.theta),
    orbit.target.y + orbit.dist * ct,
    orbit.target.z + orbit.dist * st * Math.cos(orbit.theta),
  );
  camera.lookAt(orbit.target);
}

function updateWalkCamera(dt) {
  const speed = (walk.keys['ShiftLeft'] || walk.keys['ShiftRight'] ? 18 : 8);
  const fwd = new THREE.Vector3(Math.sin(walk.yaw), 0, Math.cos(walk.yaw));
  const right = new THREE.Vector3(Math.cos(walk.yaw), 0, -Math.sin(walk.yaw));
  const move = new THREE.Vector3();
  if (walk.keys['KeyW']) move.add(fwd);
  if (walk.keys['KeyS']) move.sub(fwd);
  if (walk.keys['KeyD']) move.add(right);
  if (walk.keys['KeyA']) move.sub(right);
  if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed * dt);
  walk.pos.add(move);
  // 邊界。
  const lim = WORLD.size * 0.46;
  walk.pos.x = clamp(walk.pos.x, -lim, lim); walk.pos.z = clamp(walk.pos.z, -lim, lim);
  // 貼地。
  const ground = heightAt(walk.pos.x, walk.pos.z);
  walk.pos.y = Math.max(ground + 1.7, WORLD.waterLevel + 1.2);
  camera.position.copy(walk.pos);
  const dir = new THREE.Vector3(
    Math.sin(walk.yaw) * Math.cos(walk.pitch),
    Math.sin(walk.pitch),
    Math.cos(walk.yaw) * Math.cos(walk.pitch),
  );
  camera.lookAt(walk.pos.clone().add(dir));
}

/* ================= 恐龍自主行為(生態模擬) =================
   每隻恐龍有一個 mind:自己的位置/朝向/速度/行為狀態,每幀依 dt 推進(不是純時間函數)。
   對節流的韌性:dt 已在 tick 夾在 ≤0.05,節流時只是步進變大、行為持續前進,不會凍結;
   使用者操作(聚焦/切年代/視角)仍是狀態層立即生效,行為只是讓世界活起來的裝飾模擬。 */
function initMind(sp, i) {
  const maxSpeed = clamp(9 - sp.heightM * 0.55, 2.2, 8.5);   // 越大越慢
  const marine = sp.period === 'cambrian';
  return {
    x: sp.spawn.x, z: sp.spawn.z, homeX: sp.spawn.x, homeZ: sp.spawn.z,
    heading: sp.spawn.rot, speed: 0, maxSpeed,
    ai: 'graze', timer: 0.5 + Math.random() * 3,
    tx: sp.spawn.x, tz: sp.spawn.z,          // 遊走目標
    gait: i * 1.3, bob: 0, panic: 0, prey: null, threat: null,
    // 飛行/游泳參數(翼龍高空盤旋;寒武海洋生物低空「游」在海床上方)。
    flyR: (marine ? 14 : 22) + (i % 3) * (marine ? 5 : 8), flyPhase: i * 1.1,
    flyBase: marine ? 7 + (i % 3) * 3 : 28 + (i % 2) * 8,
  };
}
// 未指定 herd 時的族群數量:肉食少、巨獸少、小型多。
function defaultHerd(sp) {
  if (sp.diet === 'carn') return sp.heightM > 3 ? 1 : 2;
  if (sp.heightM > 8) return 2;
  return sp.heightM < 1 ? 6 : 4;
}

const VALLEY_R = WORLD.size * 0.42;
function riverX(z) { return Math.sin(z / 60) * 22 + 4; }          // 河中心(與 world.js 一致)
function isHerb(sp) { return sp.diet === 'herb' || sp.diet === 'omni'; }

function updateHerd(dt) {
  const land = dinos.filter((d) => d.root.visible && !d.sp.spawn.fly);   // 排除飛行/游泳生物(另由 animateAerial 處理)
  // 掠食者鎖定 + 獵物受驚(每幀評估,製造可見的追逐事件)。
  for (const c of land) {
    if (c.sp.diet !== 'carn') continue;
    if (c.mind.ai !== 'hunt') continue;
    let best = null, bd = 1e9;
    for (const h of land) {
      if (h === c || !isHerb(h.sp)) continue;
      const dd = (h.mind.x - c.mind.x) ** 2 + (h.mind.z - c.mind.z) ** 2;
      if (dd < bd) { bd = dd; best = h; }
    }
    c.mind.prey = best;
    if (best) {
      const dist = Math.sqrt(bd);
      if (dist < 55) { best.mind.ai = 'flee'; best.mind.threat = c; best.mind.panic = 1; best.mind.timer = Math.max(best.mind.timer, 1.5); }
      if (dist < 5.5) { c.mind.ai = 'patrol'; c.mind.prey = null; c.mind.timer = 2 + Math.random() * 3; }   // 追到了 → 獵物竄逃、掠食者放棄
    }
  }
  for (const d of land) stepDino(d, dt);
}

function chooseBehavior(d) {
  const m = d.mind, sp = d.sp, r = Math.random();
  m.timer = 3 + Math.random() * 5;
  if (sp.diet === 'carn') {
    if (r < 0.42) { m.ai = 'hunt'; m.timer = 5 + Math.random() * 5; }
    else { m.ai = 'patrol'; pickWander(d, 45); }
  } else {
    if (m.ai === 'flee') { m.ai = 'graze'; m.timer = 2 + Math.random() * 2; return; }
    if (r < 0.42) { m.ai = 'graze'; m.timer = 3 + Math.random() * 4; }
    else if (r < 0.72) { m.ai = 'walk'; pickWander(d, 30); }
    else { m.ai = 'drink'; m.tx = riverX(m.homeZ); m.tz = m.homeZ + (Math.random() - 0.5) * 20; }
  }
}
function pickWander(d, radius) {
  const a = Math.random() * Math.PI * 2, r = radius * (0.3 + Math.random() * 0.7);
  d.mind.tx = clamp(d.mind.homeX + Math.cos(a) * r, -VALLEY_R, VALLEY_R);
  d.mind.tz = clamp(d.mind.homeZ + Math.sin(a) * r, -VALLEY_R, VALLEY_R);
}

function stepDino(d, dt) {
  const m = d.mind, sp = d.sp;
  m.timer -= dt;
  // 逃跑狀態:威脅消失(遠離或不在)就回到覓食。
  if (m.ai === 'flee' && (!m.threat || !m.threat.root.visible || dist2(m, m.threat.mind) > 62 * 62)) { m.ai = 'graze'; m.threat = null; m.timer = 1.5 + Math.random() * 2; }
  if (m.timer <= 0) chooseBehavior(d);
  m.panic = Math.max(0, m.panic - dt * 0.5);

  // 決定目標方向與速度。
  let desired = m.heading, targetSpeed = 0, grazing = false;
  if (m.ai === 'graze') { targetSpeed = 0; grazing = true; }
  else if (m.ai === 'walk' || m.ai === 'patrol') { desired = angTo(m, m.tx, m.tz); targetSpeed = m.maxSpeed * 0.42; if (reached(m, 3)) m.timer = Math.min(m.timer, 0.1); }
  else if (m.ai === 'drink') { desired = angTo(m, m.tx, m.tz); targetSpeed = m.maxSpeed * 0.4; if (reached(m, 6)) { targetSpeed = 0; grazing = true; } }
  else if (m.ai === 'hunt' && m.prey) { desired = angTo(m, m.prey.mind.x, m.prey.mind.z); targetSpeed = m.maxSpeed * 1.05; }
  else if (m.ai === 'flee' && m.threat) { desired = Math.atan2(-(m.z - m.threat.mind.z), (m.x - m.threat.mind.x)); targetSpeed = m.maxSpeed * 1.35; }
  else { targetSpeed = 0; }

  // 邊界:接近谷地邊緣就轉回中心。
  const rad = Math.hypot(m.x, m.z);
  if (rad > VALLEY_R * 0.95) { desired = Math.atan2(-(-m.z), (-m.x)); targetSpeed = Math.max(targetSpeed, m.maxSpeed * 0.4); }

  // 轉向(限制角速度)與加速。
  let dh = wrapPi(desired - m.heading);
  const maxTurn = (m.ai === 'flee' || m.ai === 'hunt' ? 3.2 : 1.8) * dt;
  m.heading += clamp(dh, -maxTurn, maxTurn);
  m.speed += (targetSpeed - m.speed) * Math.min(1, dt * 2.5);

  // 前進(前向 = (cosθ, -sinθ) 對應 root.rotation.y=θ)。
  const nx = m.x + Math.cos(m.heading) * m.speed * dt;
  const nz = m.z - Math.sin(m.heading) * m.speed * dt;
  // 陸生避免踏進深水(飲水時可到岸邊)。
  const gy = heightAt(nx, nz);
  if (m.ai !== 'drink' && gy < WORLD.waterLevel + 0.4) { m.speed *= 0.5; }
  else { m.x = clamp(nx, -VALLEY_R - 4, VALLEY_R + 4); m.z = clamp(nz, -VALLEY_R - 4, VALLEY_R + 4); }

  // 套用到模型。
  m.bob = grazing ? Math.sin((performance.now() / 1000 + d.phase) * 1.6) * 0.12 : 0;
  const groundY = heightAt(m.x, m.z);
  d.root.position.set(m.x, groundY - (grazing ? Math.abs(m.bob) : -Math.abs(Math.sin(m.gait) * 0.02 * m.speed)), m.z);
  if (m.speed > 0.05) d.root.rotation.y = m.heading;

  // 步態:腿擺動頻率隨速度;靜止時腿不動。
  m.gait += m.speed * dt * 1.4;
  const parts = d.root.userData.parts;
  if (parts && parts.legs) {
    const amp = Math.min(0.5, 0.12 + m.speed * 0.05);
    parts.legs.forEach((leg, li) => {
      const sw = Math.sin(m.gait * 3 + li * Math.PI) * amp;
      leg.upper.rotation.z = sw;
      if (leg.lower) leg.lower.rotation.z = Math.max(0, -sw) * 0.7;
    });
  }
}

// 飛行(翼龍、巨蜻蜓)與游泳(奇蝦、歐巴賓):盤旋 + 起伏 + 拍翼/擺鰭。
function animateAerial(elapsed) {
  for (const d of dinos) {
    if (!d.root.visible || !d.sp.spawn.fly) continue;
    const m = d.mind, marine = d.sp.period === 'cambrian';
    const spd = marine ? 0.12 : 0.16;
    const t = elapsed * spd + m.flyPhase;
    const r = m.flyR + Math.sin(t * 0.7) * (marine ? 4 : 8);
    const y = m.flyBase + Math.sin(t * 1.3) * (marine ? 2.5 : 7);
    const cx = m.homeX * 0.3, cz = m.homeZ * 0.3;            // 各自圍繞略不同的中心,不擠成一團
    const x = cx + Math.cos(t) * r, z = cz + Math.sin(t) * r;
    const yy = epic.active && epic.skyFall ? Math.max(heightAt(x, z) + 1, y - epic.skyFall * 30) : y;
    d.root.position.set(x, yy, z);
    d.root.rotation.y = -t + Math.PI / 2;
    d.root.rotation.z = Math.sin(t) * (marine ? 0.25 : 0.15);
    const parts = d.root.userData.parts;
    if (parts && parts.wings) {
      const flap = Math.sin(elapsed * (marine ? 3.2 : 2.4) + d.phase) * (marine ? 0.35 : 0.5);
      parts.wings.forEach((w, wi) => { w.rotation.x = flap * (wi % 2 ? -1 : 1); });
    }
  }
}

function dist2(a, b) { return (a.x - b.x) ** 2 + (a.z - b.z) ** 2; }
function angTo(m, tx, tz) { return Math.atan2(-(tz - m.z), (tx - m.x)); }
function reached(m, r) { return (m.x - m.tx) ** 2 + (m.z - m.tz) ** 2 < r * r; }
function wrapPi(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }

/* ================= 紀元史詩模式 =================
   一場自動演出:三疊紀黎明 → 侏羅巨龍 → 白堊繁盛 → 隕石劃空 → 撞擊白光 → 大滅絕 → 鳥類存續。
   全程 dt 驅動(節流韌性),使用者可隨時「結束」返回。 */
function startEpic() {
  if (epic.active) return;
  epic.active = true; epic.t = 0; epic.stage = -1; epic.skyFall = 0; epic.shake = 0;
  state.focus = null; state.following = false; state.timeFlow = false; flyTween = null;
  UI.hideInfo(); endTour(); UI.hidePeriodIntro(); UI.hideHelp();
  document.body.classList.add('epic');
  UI.setEpic(true);
  applyTime(12);                                     // 正午為起點
  orbit.target.set(0, 6, 0); orbit.dist = 96; orbit.phi = 1.3; orbit.theta = 0.4;
}
function endEpic() {
  if (!epic.active) return;
  epic.active = false; document.body.classList.remove('epic');
  UI.setEpic(false); UI.hideCinematic(); UI.setFlash(0);
  if (epic.meteor) { scene.remove(epic.meteor); epic.meteor = null; }
  if (epic.fireball) { scene.remove(epic.fireball); epic.fireball = null; }
  if (epic.ash) { scene.remove(epic.ash); epic.ash = null; }
  epic.skyFall = 0;
  dinos.forEach((d) => d.root.scale.setScalar(d.mind.origScale));   // 復活所有生物
  setPeriod('cretaceous', true);
  resetCamera();
}
function nextAt(si) { return si + 1 < EPIC.stages.length ? EPIC.stages[si + 1].at : EPIC.totalSec; }

function updateEpic(dt) {
  epic.t = Math.min(EPIC.totalSec, epic.t + dt);
  let si = 0; for (let k = 0; k < EPIC.stages.length; k++) if (epic.t >= EPIC.stages[k].at) si = k;
  const st = EPIC.stages[si];
  if (si !== epic.stage) { enterStage(si, st); epic.stage = si; }
  const span = Math.max(0.01, nextAt(si) - st.at), p = clamp((epic.t - st.at) / span, 0, 1);
  if (st.meteor) meteorPhase(p);
  else if (st.impact) impactPhase(p);
  else if (st.aftermath) aftermathPhase(dt);
  if (epic.t >= EPIC.totalSec) endEpic();
}
function clearDoom() {                                  // 進入(隕石後的)新時代時,清掉末日殘留
  if (epic.ash) { scene.remove(epic.ash); epic.ash = null; }
  if (epic.fireball) { scene.remove(epic.fireball); epic.fireball = null; }
  epic.skyFall = 0; UI.setFlash(0);
}
function enterStage(si, st) {
  UI.showCinematic(st.title, st.caption);
  if (st.period) { clearDoom(); setPeriod(st.period, true); dinos.forEach((d) => d.root.scale.setScalar(d.mind.origScale)); }
  if (st.meteor && !epic.meteor) { epic.meteor = buildMeteor(); scene.add(epic.meteor); }
  if (st.impact) {
    UI.setFlash(1); epic.shake = 1;
    if (epic.meteor) { scene.remove(epic.meteor); epic.meteor = null; }
    if (!epic.fireball) { epic.fireball = buildFireball(); scene.add(epic.fireball); }
  }
  if (st.aftermath && !epic.ash) { epic.ash = buildAsh(); scene.add(epic.ash); epic.skyFall = 1; }
}
function meteorPhase(p) {
  if (epic.meteor) { epic.meteor.position.lerpVectors(METEOR_START, METEOR_HIT, p * p); epic.meteor.scale.setScalar(1 + p * 2.5); }
  applyDoomSky(p * 0.45);
  if (p > 0.75) dinos.forEach((d) => { if (d.root.visible && d.sp.build !== 'pterosaur') { d.mind.ai = 'flee'; d.mind.threat = null; d.mind.panic = 1; d.mind.speed = d.mind.maxSpeed * 1.3; } });
}
function impactPhase(p) {
  UI.setFlash(Math.max(0, 1 - p * 2.2));
  applyDoomSky(0.45 + p * 0.55);
  epic.skyFall = 1;
  if (epic.fireball) { epic.fireball.scale.setScalar(1 + p * 10); epic.fireball.material.opacity = Math.max(0, 0.95 - p * 0.95); }
  dinos.forEach((d) => { const k = Math.max(0.0001, 1 - p * 1.15); d.root.scale.setScalar(d.mind.origScale * k); });   // 萬物凋零
}
function aftermathPhase(dt) {
  applyDoomSky(1);
  UI.setFlash(0);                                    // 確保白光已散(跳段時也歸零)
  dinos.forEach((d) => d.root.scale.setScalar(0.0001));   // 恐龍全數消失(含翼龍)
  if (epic.ash) {                                    // 餘燼飄落
    const pos = epic.ash.geometry.attributes.position; const a = pos.array;
    for (let i = 1; i < a.length; i += 3) { a[i] -= dt * 6; if (a[i] < 0) a[i] += 120; }
    pos.needsUpdate = true; epic.ash.rotation.y += dt * 0.02;
  }
}
function applyDoomSky(k) {
  k = clamp(k, 0, 1);
  const mix = (baseHex, doomHex) => new THREE.Color(baseHex).lerp(new THREE.Color(doomHex), k);
  sky.material.uniforms.top.value.copy(mix(0x2b7bd6, 0x140805));
  sky.material.uniforms.bottom.value.copy(mix(0xcfe2f0, 0x40160a));
  const hor = mix(0xeef4f8, 0x7a2a0a);
  sky.material.uniforms.horizon.value.copy(hor);
  sun.intensity = 1.7 * (1 - k * 0.9); sun.color.copy(mix(0xfff2d8, 0xff4a1e));
  ambient.intensity = 0.7 * (1 - k * 0.55); hemi.intensity = 1.0 * (1 - k * 0.5);
  if (scene.fog) { scene.fog.color.copy(hor); scene.fog.near = 80 - k * 40; scene.fog.far = 340 - k * 200; }
  renderer.setClearColor(hor);
}
function updateEpicCamera(dt) {
  orbit.theta += dt * 0.055;
  const st = EPIC.stages[epic.stage] || {};
  const targetPhi = st.meteor ? 1.02 : st.impact ? 1.12 : st.aftermath ? 1.36 : 1.3;
  orbit.phi += (targetPhi - orbit.phi) * Math.min(1, dt * 1.2);
  const s = Math.sin(orbit.phi), c = Math.cos(orbit.phi);
  let px = orbit.target.x + orbit.dist * s * Math.sin(orbit.theta);
  let py = orbit.target.y + orbit.dist * c;
  let pz = orbit.target.z + orbit.dist * s * Math.cos(orbit.theta);
  if (epic.shake > 0.001) { const a = epic.shake * 3; px += (Math.random() - 0.5) * a; py += (Math.random() - 0.5) * a; pz += (Math.random() - 0.5) * a; epic.shake = Math.max(0, epic.shake - dt * 0.6); }
  camera.position.set(px, py, pz); camera.lookAt(orbit.target);
}
function buildMeteor() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(3, 16, 16), new THREE.MeshBasicMaterial({ color: 0xfff6d8 })));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(5.2, 16, 16), new THREE.MeshBasicMaterial({ color: 0xff9a44, transparent: true, opacity: 0.45 })));
  const dir = METEOR_START.clone().sub(METEOR_HIT).normalize();
  const trail = new THREE.Mesh(new THREE.ConeGeometry(3.2, 30, 14), new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.5 }));
  trail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); trail.position.copy(dir.clone().multiplyScalar(15));
  g.add(trail);
  const light = new THREE.PointLight(0xff8030, 4, 400); g.add(light);
  g.position.copy(METEOR_START);
  return g;
}
function buildFireball() {
  const m = new THREE.Mesh(new THREE.SphereGeometry(12, 20, 20), new THREE.MeshBasicMaterial({ color: 0xff6a1e, transparent: true, opacity: 0.9 }));
  m.position.copy(METEOR_HIT); return m;
}
function buildAsh() {
  const N = 900, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 320; pos[i * 3 + 1] = Math.random() * 120; pos[i * 3 + 2] = (Math.random() - 0.5) * 320; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x5a544c, size: 0.9, transparent: true, opacity: 0.75 }));
}

/* ---------------- 標籤投影 ---------------- */
function updateLabels() {
  if (!state.settings.labels || state.view === 'walk' || epic.active) {
    dinos.forEach((d) => d.label && d.label.classList.remove('show'));
    return;
  }
  const w = container.clientWidth, h = container.clientHeight;
  for (const d of dinos) {
    if (!d.label) continue;                                // 只有 hero 有標籤
    if (!d.root.visible) { d.label.classList.remove('show'); continue; }
    const p = d.root.position.clone().add(new THREE.Vector3(0, d.sp.heightM + 1, 0));
    p.project(camera);
    const visible = p.z < 1 && p.x > -1.1 && p.x < 1.1 && p.y > -1.1 && p.y < 1.1;
    if (visible) {
      d.label.classList.add('show');
      d.label.style.left = `${(p.x * 0.5 + 0.5) * w}px`;
      d.label.style.top = `${(-p.y * 0.5 + 0.5) * h}px`;
    } else d.label.classList.remove('show');
  }
}

/* ---------------- 渲染迴圈 + hidden browser 後備 ---------------- */
let rafId = 0, watchdog = 0, lastTick = 0;
function startLoop() {
  lastTick = performance.now();
  // 依當下 hidden 狀態選驅動器(見教訓:頁面一載入即 hidden 時不會有 visibilitychange)。
  installDriver();
  document.addEventListener('visibilitychange', installDriver);
}
function installDriver() {
  cancelAnimationFrame(rafId); clearInterval(watchdog); rafId = 0; watchdog = 0;
  if (document.hidden) {
    watchdog = setInterval(() => tick(performance.now()), 250);
  } else {
    const loop = (now) => { tick(now); rafId = requestAnimationFrame(loop); };
    rafId = requestAnimationFrame(loop);
    // 看門狗:即使可見,也防掉幀時標籤不更新。
    watchdog = setInterval(() => { if (performance.now() - lastTick > 500) tick(performance.now()); }, 400);
  }
}

function tick(now) {
  const dt = Math.min(0.05, (now - lastTick) / 1000);
  lastTick = now;
  const elapsed = now / 1000;

  if (state.timeFlow) { state.time = (state.time + dt * 0.6) % 24; applyTime(state.time); }

  if (epic.active) updateEpic(dt);
  updateHerd(dt);          // 陸生生物自主行為
  animateAerial(elapsed);  // 飛行/游泳生物
  if (epic.active) updateEpicCamera(dt);
  else if (state.view === 'overview') updateOverviewCamera(dt); else if (state.view === 'walk') updateWalkCamera(dt);

  // 水面微動。
  if (worldRefs?.water) worldRefs.water.position.y = WORLD.waterLevel + Math.sin(elapsed * 0.6) * 0.05;

  renderer.render(scene, camera);
  updateLabels();
}

/* ---------------- 尺寸 ---------------- */
const ro = new ResizeObserver(() => sizeToContainer());
function sizeToContainer() {
  const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}

/* ---------------- 工具 ---------------- */
function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

/* ---------------- 測試 API(見機器教訓:驗證走同步模擬,不靠截圖) ---------------- */
function exposeTestAPI() {
  window.__DW = {
    state,
    dinos,
    _cam: camera, _r: renderer, _scene: scene, THREE,
    camInfo() { return { pos: camera.position.toArray().map((v) => +v.toFixed(1)), target: orbit.target.toArray().map((v) => +v.toFixed(1)), dist: +orbit.dist.toFixed(1), phi: +orbit.phi.toFixed(2), theta: +orbit.theta.toFixed(2) }; },
    strips() {
      renderer.render(scene, camera);
      const gl = renderer.getContext(); const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
      const px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const band = (y0, y1) => { let r = 0, g = 0, b = 0, n = 0; for (let y = y0; y < y1; y++) for (let x = 0; x < w; x += 4) { const i = (y * w + x) * 4; r += px[i]; g += px[i + 1]; b += px[i + 2]; n++; } return [r / n | 0, g / n | 0, b / n | 0]; };
      return { top: band(h * 0.7, h), mid: band(h * 0.35, h * 0.65), bottom: band(0, h * 0.3) }; // 注意 readPixels 原點在左下
    },
    forceSize(w, h) { container.style.width = w + 'px'; container.style.height = h + 'px'; sizeToContainer(); },
    step(ms = 16) { tick(lastTick + ms); },        // 假時鐘推進一幀
    focus(id) { focusDino(id); },
    setView,
    setPeriod(id) { setPeriod(id); },
    period() { return state.period; },
    visibleDinos() { return dinos.filter((d) => d.root.visible).map((d) => d.sp.id); },
    setTime(h) { applyTime(h); },
    tour: { start: startTour, step: stepTour, end: endTour, index: () => state.tourIndex },
    epic: { start: startEpic, end: endEpic, jump(sec) { epic.t = sec; }, info: () => ({ active: epic.active, t: +epic.t.toFixed(1), stage: epic.stage, skyFall: epic.skyFall }) },
    minds: () => dinos.filter((d) => d.root.visible).map((d) => ({ id: d.sp.id, ai: d.mind.ai, x: +d.mind.x.toFixed(1), z: +d.mind.z.toFixed(1), sp: +d.mind.speed.toFixed(1) })),
    // 回傳畫面像素統計(同一 task 內 render→readPixels)。
    sample() {
      renderer.render(scene, camera);
      const gl = renderer.getContext();
      const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
      const px = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let r = 0, g = 0, b = 0, bright = 0, n = w * h;
      for (let i = 0; i < n; i++) { const R = px[i * 4], G = px[i * 4 + 1], B = px[i * 4 + 2]; r += R; g += G; b += B; if (R + G + B > 90) bright++; }
      return { w, h, avg: [r / n | 0, g / n | 0, b / n | 0], brightRatio: +(bright / n).toFixed(3) };
    },
    counts() { return { dinos: dinos.length, labelsShown: dinos.filter((d) => d.label.classList.contains('show')).length }; },
  };
}

/* ---------------- 啟動 ---------------- */
init().catch((e) => {
  console.error(e);
  UI.setLoad(1, '載入發生錯誤:' + e.message);
});
