// main.js — 總指揮:狀態機、渲染迴圈(含 hidden browser 後備)、相機、互動、漫遊模式、__DW 測試 API。
//
// 兩條鐵律(改邏輯前必讀):
//  1) 狀態與動畫分離。使用者操作當下 state 立即改變(聚焦、切視角、資訊面板);相機飛行/淡入只是裝飾。
//     動畫被節流/中斷/掉幀,邏輯不受影響。過去專案把邏輯綁在動畫回呼上,背景分頁節流時整個卡死——不要走回頭路。
//  2) 恐龍位置與姿態由 state.time(天內時刻)與各自的 wander 種子純函數決定,不做跨幀增量累加,
//     所以任意暫停/拉時間軸都不會累積誤差。
import * as THREE from 'three';
import { SPECIES, SPECIES_BY_ID, PERIODS, PERIOD_BY_ID, speciesOfPeriod, tourOf, phaseOf } from './data.js';
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

  // 生成恐龍。
  let i = 0;
  for (const sp of SPECIES) {
    const root = buildDino(sp);
    const y = sp.spawn.fly ? 34 : heightAt(sp.spawn.x, sp.spawn.z);
    root.position.set(sp.spawn.x, y, sp.spawn.z);
    root.rotation.y = sp.spawn.rot;
    scene.add(root);
    const label = makeLabel(sp);
    dinos.push({ root, sp, base: { x: sp.spawn.x, z: sp.spawn.z, rot: sp.spawn.rot }, label, phase: i * 1.7 });
    i++;
    UI.setLoad(0.6 + 0.35 * (i / SPECIES.length), `喚醒恐龍... ${sp.name}`);
    await yieldFrame();
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
    d.label.style.display = (vis && state.settings.labels) ? '' : 'none';
    if (!vis) d.label.classList.remove('show');
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
  });
}
function toggleFlow() { state.timeFlow = !state.timeFlow; UI.setFlowIcon(state.timeFlow); }

function applySetting(key, val) {
  state.settings[key] = val;
  if (key === 'shadows') renderer.shadowMap.enabled = val;
  if (key === 'fog') scene.fog = val ? new THREE.Fog(scene.fog?.color || 0xbcd3e6, 120, 340) : null;
  if (key === 'labels') dinos.forEach((d) => { d.label.style.display = (val && d.root.visible) ? '' : 'none'; });
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

/* ---------------- 恐龍動畫(裝飾層,可被節流不影響狀態) ---------------- */
function animateDinos(elapsed) {
  for (const d of dinos) {
    if (!d.root.visible) continue;   // 只動目前年代的恐龍
    const parts = d.root.userData.parts;
    const sp = d.sp;
    const t = elapsed + d.phase;
    if (sp.build === 'pterosaur') {
      // 盤旋 + 拍翼。
      const r = 26;
      d.root.position.set(Math.cos(t * 0.18) * r, 32 + Math.sin(t * 0.4) * 3, Math.sin(t * 0.18) * r);
      d.root.rotation.y = -t * 0.18 + Math.PI / 2;
      const flap = Math.sin(t * 2.2) * 0.5;
      if (parts.wings) { parts.wings[0].rotation.x = flap; parts.wings[1].rotation.x = -flap; }
      continue;
    }
    // 陸生:輕微踏步 + 頸尾擺動 + 呼吸起伏。
    const breathe = Math.sin(t * 0.8) * 0.02;
    d.root.position.y = heightAt(d.base.x, d.base.z) + breathe;
    if (parts.legs) {
      parts.legs.forEach((leg, li) => {
        const swing = Math.sin(t * 1.4 + li * Math.PI) * 0.18;
        leg.upper.rotation.z = swing;
        if (leg.lower) leg.lower.rotation.z = Math.max(0, -swing) * 0.6;
      });
    }
    if (parts.neck) parts.neck.rotation.z = Math.sin(t * 0.5) * 0.06 + (parts.neck.userData.base || 0);
    if (parts.tail) parts.tail.rotation.y = Math.sin(t * 0.6) * 0.12;
    if (parts.head) parts.head.rotation.y = Math.sin(t * 0.35) * 0.15;
  }
}

/* ---------------- 標籤投影 ---------------- */
function updateLabels() {
  if (!state.settings.labels || state.view === 'walk') {
    dinos.forEach((d) => d.label.classList.remove('show'));
    return;
  }
  const w = container.clientWidth, h = container.clientHeight;
  for (const d of dinos) {
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

  animateDinos(elapsed);
  if (state.view === 'overview') updateOverviewCamera(dt); else updateWalkCamera(dt);

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
