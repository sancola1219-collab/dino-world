// main.js — 總指揮:狀態機、渲染迴圈(含 hidden browser 後備)、相機、互動、漫遊模式、__DW 測試 API。
//
// 兩條鐵律(改邏輯前必讀):
//  1) 狀態與動畫分離。使用者操作當下 state 立即改變(聚焦、切視角、資訊面板);相機飛行/淡入只是裝飾。
//     動畫被節流/中斷/掉幀,邏輯不受影響。過去專案把邏輯綁在動畫回呼上,背景分頁節流時整個卡死——不要走回頭路。
//  2) 恐龍位置與姿態由 state.time(天內時刻)與各自的 wander 種子純函數決定,不做跨幀增量累加,
//     所以任意暫停/拉時間軸都不會累積誤差。
import * as THREE from 'three';
import { SPECIES, SPECIES_BY_ID, TOUR, phaseOf } from './data.js';
import { buildWorld, buildSky, skyStateForHour, heightAt, WORLD } from './world.js';
import { buildDino } from './dino.js';
import * as UI from './ui.js';

/* ---------------- 狀態(唯一事實來源) ---------------- */
const state = {
  view: 'overview',      // 'overview' | 'walk'
  focus: null,           // 恐龍 id | null
  following: false,      // 遠觀時相機是否跟著聚焦恐龍
  time: 10.0,            // 0..24 一天的時刻
  timeFlow: false,       // 時間是否自動流動
  tourIndex: -1,         // -1 表示未在導覽
  settings: { labels: true, shadows: true, fog: true, quality: 'high' },
};

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
  renderer.toneMappingExposure = 1.25;
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
  applyTime(state.time);
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
  sky.material.uniforms.top.value.copy(s.top);
  sky.material.uniforms.bottom.value.copy(s.bottom);
  sky.material.uniforms.horizon.value.copy(s.horizon);
  sun.color.copy(s.sunColor); sun.intensity = s.sunIntensity;
  ambient.color.copy(s.ambColor); ambient.intensity = s.ambIntensity;
  hemi.intensity = 0.15 + s.ambIntensity * 0.4;
  const d = s.sunDir.clone().multiplyScalar(160);
  sun.position.set(d.x, Math.max(4, d.y), d.z);
  if (scene.fog) { scene.fog.color.copy(s.horizon); }
  renderer.setClearColor(s.horizon);
  UI.setClock(hour);
}

/* ---------------- 聚焦一隻恐龍 ---------------- */
function focusDino(id) {
  const sp = SPECIES_BY_ID[id];
  if (!sp) return;
  state.focus = id;                       // 狀態立即改變
  state.following = false;
  UI.showInfo(sp, state.following, () => toggleFollow());
  UI.setBreadcrumb(`${sp.name} · ${sp.sci}`);
  const d = dinos.find((x) => x.sp.id === id);
  if (d && state.view === 'overview') {
    // 裝飾層:相機飛過去。
    const target = d.root.position.clone().add(new THREE.Vector3(0, sp.heightM * 0.5, 0));
    startFly(target, Math.max(14, sp.lengthM * 1.6));
  }
}
function toggleFollow() {
  state.following = !state.following;
  UI.showInfo(SPECIES_BY_ID[state.focus], state.following, () => toggleFollow());
}
function closeInfo() {
  state.focus = null; state.following = false;
  UI.hideInfo(); UI.setBreadcrumb('白堊紀晚期 · 谷地');
}

function startFly(target, dist) {
  flyTween = { from: orbit.target.clone(), to: target.clone(), fromD: orbit.dist, toD: dist, t: 0 };
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
  UI.setBreadcrumb(state.focus ? `${SPECIES_BY_ID[state.focus].name}` : '白堊紀晚期 · 谷地');
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
  const roots = dinos.map((d) => d.root);
  const hits = raycaster.intersectObjects(roots, true);
  if (hits.length) {
    let o = hits[0].object;
    while (o && !o.userData.dinoRoot) o = o.parent;
    if (o && o.userData.species) focusDino(o.userData.species.id);
  }
}

function bindUI() {
  UI.initUI({
    onView: setView,
    onToggleDex: () => UI.toggleDex(),
    onTour: startTour,
    onFocus: (id) => { UI.openDex(); focusDino(id); },
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
  if (key === 'labels') dinos.forEach((d) => { d.label.style.display = val ? '' : 'none'; });
  if (key === 'quality') {
    renderer.setPixelRatio(Math.min(devicePixelRatio, val === 'high' ? 2 : 1));
  }
  applyTime(state.time);
}

/* ---------------- 生態導覽 ---------------- */
function startTour() { state.tourIndex = 0; showTourStep(); }
function stepTour(delta) {
  state.tourIndex = clamp(state.tourIndex + delta, 0, TOUR.length - 1);
  showTourStep();
}
function showTourStep() {
  const stop = TOUR[state.tourIndex];
  const sp = SPECIES_BY_ID[stop.id];
  focusDino(sp.id);
  UI.showTour(state.tourIndex, TOUR.length, sp, stop.text);
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
    forceSize(w, h) { container.style.width = w + 'px'; container.style.height = h + 'px'; sizeToContainer(); },
    step(ms = 16) { tick(lastTick + ms); },        // 假時鐘推進一幀
    focus(id) { focusDino(id); },
    setView,
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
