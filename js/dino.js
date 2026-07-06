// dino.js — 程序化恐龍模型。每種恐龍是一個 THREE.Group,用基本體(膠囊、球、盒)組出
// 依真實比例的身形,並在 userData 掛上可動部位(腿、頸、尾、翼)供 main 做步態動畫。
// 造型走「可辨識的寫實剪影」路線:不是精細掃描模型,但比例、姿態、材質都對得上該物種。
import * as THREE from 'three';
import { makeSkinTexture } from './textures.js';

function skinMat(sp) {
  const tex = makeSkinTexture(sp.color, sp.accent, hash(sp.id), sp.build !== 'raptor' && sp.build !== 'pterosaur');
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0.0 });
}
function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

// 膠囊(身體/四肢通用)。
function capsule(mat, r, len) {
  const g = new THREE.CapsuleGeometry(r, len, 6, 12);
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m;
}
function box(mat, w, h, d) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = true; return m; }
function sphere(mat, r, wseg = 12) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, wseg, wseg), mat); m.castShadow = true; return m; }
function cone(mat, r, h, seg = 8) { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat); m.castShadow = true; return m; }

// 建一條腿(大腿+小腿+腳),回傳 {group, upper, lower} 供擺動。
function buildLeg(mat, thigh, shin, footLen, thick) {
  const group = new THREE.Group();
  const upper = new THREE.Group();
  const thighMesh = capsule(mat, thick, thigh); thighMesh.position.y = -thigh / 2; thighMesh.rotation.x = 0;
  upper.add(thighMesh);
  const lower = new THREE.Group(); lower.position.y = -thigh;
  const shinMesh = capsule(mat, thick * 0.7, shin); shinMesh.position.y = -shin / 2; lower.add(shinMesh);
  const foot = box(mat, thick * 1.6, thick * 0.8, footLen); foot.position.set(0, -shin, footLen * 0.25); lower.add(foot);
  upper.add(lower);
  group.add(upper);
  return { group, upper, lower };
}

/** 主入口:依物種建立模型。回傳 Group,userData 含 parts 供動畫、species 供 UI/picking。 */
export function buildDino(sp) {
  const mat = skinMat(sp);
  let model;
  switch (sp.build) {
    case 'theropod': model = theropod(sp, mat); break;
    case 'raptor': model = raptor(sp, mat); break;
    case 'sauropod': model = sauropod(sp, mat); break;
    case 'ceratopsian': model = ceratopsian(sp, mat); break;
    case 'stegosaur': model = stegosaur(sp, mat); break;
    case 'hadrosaur': model = hadrosaur(sp, mat); break;
    case 'ankylosaur': model = ankylosaur(sp, mat); break;
    case 'pterosaur': model = pterosaur(sp, mat); break;
    default: model = theropod(sp, mat);
  }
  model.userData.species = sp;
  // 讓每個子 mesh 都指回根,方便 raycast 命中後找到恐龍。
  model.traverse((o) => { o.userData.dinoRoot = model; });
  return model;
}

/* ---------------- 各科造型 ---------------- */
// 尺度換算:模型內用「標準單位≈公尺」,再依 species 尺寸整體縮放。以肩高為基準。

function theropod(sp, mat) {
  const g = new THREE.Group();
  const parts = { legs: [], neck: null, tail: null, head: null };
  const scale = sp.heightM / 4.0;

  const hipY = 4.0;
  // 身體(髖到胸)。
  const body = capsule(mat, 1.3, 3.4); body.rotation.z = Math.PI / 2; body.position.set(0, hipY, 0);
  g.add(body);
  const chest = sphere(mat, 1.35); chest.position.set(2.2, hipY + 0.2, 0); g.add(chest);

  // 頸+頭。
  const neck = new THREE.Group(); neck.position.set(3.1, hipY + 0.4, 0);
  const neckMesh = capsule(mat, 0.75, 1.4); neckMesh.rotation.z = 0.7; neckMesh.position.set(0.5, 0.7, 0); neck.add(neckMesh);
  const head = new THREE.Group(); head.position.set(1.1, 1.4, 0);
  const skull = box(mat, 1.9, 1.2, 1.0); skull.position.set(0.4, 0, 0); head.add(skull);
  const jaw = box(mat, 1.7, 0.4, 0.85); jaw.position.set(0.35, -0.65, 0); head.add(jaw);
  // 牙齒。
  const teethMat = new THREE.MeshStandardMaterial({ color: 0xf0e6d0, roughness: 0.5 });
  for (let i = 0; i < 6; i++) { const t = cone(teethMat, 0.08, 0.34); t.position.set(-0.2 + i * 0.24, -0.35, 0.4); t.rotation.x = Math.PI; head.add(t); const t2 = t.clone(); t2.position.z = -0.4; head.add(t2); }
  // 眼。
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x120c08, roughness: 0.3 });
  const e1 = sphere(eyeMat, 0.14, 8); e1.position.set(0.0, 0.35, 0.5); head.add(e1);
  const e2 = e1.clone(); e2.position.z = -0.5; head.add(e2);
  neck.add(head); g.add(neck); parts.neck = neck; parts.head = head;

  // 短前肢。
  for (const s of [1, -1]) {
    const arm = capsule(mat, 0.22, 0.7); arm.position.set(2.0, hipY - 0.3, s * 0.9); arm.rotation.z = 0.5; g.add(arm);
  }
  // 尾。
  const tail = new THREE.Group(); tail.position.set(-1.3, hipY, 0);
  let seg = tail; let tlen = 4.2, tr = 1.1;
  const tailSegs = [];
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Group(); s.position.set(i === 0 ? -0.2 : -tlen / 4, 0, 0);
    const tm = capsule(mat, tr, tlen / 4); tm.rotation.z = Math.PI / 2; tm.position.x = -tlen / 8; s.add(tm);
    seg.add(s); seg = s; tailSegs.push(s); tr *= 0.7;
  }
  g.add(tail); parts.tail = tail; parts.tailSegs = tailSegs;

  // 雙腿。
  for (const s of [1, -1]) {
    const leg = buildLeg(mat, 2.2, 1.9, 1.4, 0.6); leg.group.position.set(0, hipY, s * 0.95);
    g.add(leg.group); parts.legs.push(leg);
  }

  g.scale.setScalar(scale);
  g.userData.parts = parts; g.userData.hipY = hipY * scale;
  return g;
}

function raptor(sp, mat) {
  const g = new THREE.Group();
  const parts = { legs: [], neck: null, tail: null };
  const hipY = 1.4;
  const body = capsule(mat, 0.4, 1.2); body.rotation.z = Math.PI / 2; body.position.set(0, hipY, 0); g.add(body);
  // 羽毛感:沿背與尾加一排薄板。
  const featherMat = new THREE.MeshStandardMaterial({ color: sp.accent, roughness: 1, side: THREE.DoubleSide });
  const neck = new THREE.Group(); neck.position.set(1.0, hipY + 0.3, 0);
  const nm = capsule(mat, 0.22, 0.5); nm.rotation.z = 1.0; nm.position.set(0.2, 0.35, 0); neck.add(nm);
  const head = new THREE.Group(); head.position.set(0.45, 0.6, 0);
  const skull = box(mat, 0.7, 0.34, 0.3); skull.position.x = 0.25; head.add(skull);
  const snout = cone(mat, 0.16, 0.5); snout.rotation.z = -Math.PI / 2; snout.position.set(0.65, 0, 0); head.add(snout);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x140d08 });
  const e = sphere(eyeMat, 0.06, 8); e.position.set(0.2, 0.12, 0.16); head.add(e); const e2 = e.clone(); e2.position.z = -0.16; head.add(e2);
  neck.add(head); g.add(neck); parts.neck = neck;
  const tail = new THREE.Group(); tail.position.set(-0.7, hipY, 0);
  const tm = capsule(mat, 0.28, 1.6); tm.rotation.z = Math.PI / 2; tm.position.x = -0.9; tail.add(tm);
  for (let i = 0; i < 5; i++) { const f = box(featherMat, 0.5, 0.02, 0.36); f.position.set(-0.3 - i * 0.32, 0.15, 0); tail.add(f); }
  g.add(tail); parts.tail = tail;
  // 前肢帶羽。
  for (const s of [1, -1]) { const wing = box(featherMat, 0.7, 0.02, 0.5); wing.position.set(0.5, hipY, s * 0.45); wing.rotation.x = s * 0.3; g.add(wing); }
  for (const s of [1, -1]) {
    const leg = buildLeg(mat, 0.75, 0.7, 0.5, 0.2); leg.group.position.set(0, hipY, s * 0.35);
    // 鐮刀爪。
    const clawMat = new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.5 });
    const claw = cone(clawMat, 0.06, 0.3); claw.position.set(0.2, -1.4, 0); claw.rotation.z = -1.2; leg.lower.add(claw);
    g.add(leg.group); parts.legs.push(leg);
  }
  const scale = sp.heightM / 0.5 * 0.5; // 伶盜龍矮,放大係數收斂避免過大
  g.scale.setScalar(Math.max(1, scale));
  g.userData.parts = parts; g.userData.hipY = hipY * Math.max(1, scale);
  return g;
}

function sauropod(sp, mat) {
  const g = new THREE.Group();
  const parts = { legs: [], neck: null, tail: null };
  const hipY = 6.5;
  const body = capsule(mat, 3.0, 5.5); body.rotation.z = Math.PI / 2; body.position.set(0, hipY, 0); g.add(body);
  const shoulder = sphere(mat, 3.2); shoulder.position.set(3.6, hipY + 1.2, 0); g.add(shoulder); // 腕龍肩高於臀
  // 長頸(多節,向上前伸)。
  const neck = new THREE.Group(); neck.position.set(5.5, hipY + 2.5, 0);
  let seg = neck; const neckSegs = [];
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Group(); s.position.set(i === 0 ? 0 : 1.3, i === 0 ? 0 : 1.0, 0);
    const nm = capsule(mat, 1.1 - i * 0.12, 1.6); nm.rotation.z = -0.8; nm.position.set(0.6, 0.8, 0); s.add(nm);
    seg.add(s); seg = s; neckSegs.push(s);
  }
  const head = sphere(mat, 0.9); head.scale.set(1.4, 0.9, 0.9); head.position.set(0.9, 1.0, 0); seg.add(head);
  const crest = sphere(mat, 0.5); crest.position.set(0.6, 1.6, 0); seg.add(crest); // 腕龍鼻脊
  g.add(neck); parts.neck = neck; parts.neckSegs = neckSegs;
  // 長尾。
  const tail = new THREE.Group(); tail.position.set(-3.5, hipY, 0);
  let tseg = tail; const tailSegs = []; let tr = 2.2;
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Group(); s.position.set(i === 0 ? 0 : -1.8, 0, 0);
    const tm = capsule(mat, tr, 1.8); tm.rotation.z = Math.PI / 2; tm.position.x = -1.0; s.add(tm);
    tseg.add(s); tseg = s; tailSegs.push(s); tr *= 0.72;
  }
  g.add(tail); parts.tail = tail; parts.tailSegs = tailSegs;
  // 四柱腿。
  for (const sx of [1, -1]) for (const zx of [1, -1]) {
    const leg = buildLeg(mat, 3.4, 3.0, 1.8, 1.1);
    leg.group.position.set(sx > 0 ? 3.2 : -3.0, hipY, zx * 2.2);
    g.add(leg.group); parts.legs.push(leg);
  }
  const scale = sp.heightM / 12;
  g.scale.setScalar(scale);
  g.userData.parts = parts; g.userData.hipY = hipY * scale; g.userData.quadruped = true;
  return g;
}

function ceratopsian(sp, mat) {
  const g = new THREE.Group();
  const parts = { legs: [], neck: null, tail: null };
  const hipY = 2.6;
  const body = capsule(mat, 1.6, 3.0); body.rotation.z = Math.PI / 2; body.position.set(0, hipY, 0); g.add(body);
  // 頭:頸盾 + 三角。
  const neck = new THREE.Group(); neck.position.set(2.6, hipY, 0);
  const head = new THREE.Group(); head.position.set(1.0, -0.1, 0);
  const skull = box(mat, 1.8, 1.2, 1.2); skull.position.x = 0.4; head.add(skull);
  const beak = cone(mat, 0.4, 0.9); beak.rotation.z = -Math.PI / 2; beak.position.set(1.5, -0.2, 0); head.add(beak);
  // 頸盾(扁圓大板)。
  const frill = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.25, 20, 1, false, 0, Math.PI), mat);
  frill.rotation.set(Math.PI / 2, 0, Math.PI / 2); frill.position.set(-0.6, 0.4, 0); frill.scale.set(1, 1.2, 1); head.add(frill);
  const hornMat = new THREE.MeshStandardMaterial({ color: 0xd8cbb0, roughness: 0.6 });
  const brow1 = cone(hornMat, 0.18, 1.4); brow1.position.set(0.7, 1.1, 0.5); brow1.rotation.x = -0.3; head.add(brow1);
  const brow2 = brow1.clone(); brow2.position.z = -0.5; head.add(brow2);
  const nose = cone(hornMat, 0.16, 0.6); nose.position.set(1.2, 0.6, 0); head.add(nose);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x140d08 });
  const e = sphere(eyeMat, 0.11, 8); e.position.set(0.7, 0.2, 0.62); head.add(e); const e2 = e.clone(); e2.position.z = -0.62; head.add(e2);
  neck.add(head); g.add(neck); parts.neck = neck;
  const tail = new THREE.Group(); tail.position.set(-2.4, hipY, 0);
  const tm = capsule(mat, 0.9, 1.8); tm.rotation.z = Math.PI / 2; tm.position.x = -1.0; tail.add(tm); g.add(tail); parts.tail = tail;
  for (const sx of [1, -1]) for (const zx of [1, -1]) {
    const leg = buildLeg(mat, 1.5, 1.2, 1.0, 0.55); leg.group.position.set(sx > 0 ? 1.6 : -1.6, hipY, zx * 1.2);
    g.add(leg.group); parts.legs.push(leg);
  }
  const scale = sp.heightM / 3;
  g.scale.setScalar(scale);
  g.userData.parts = parts; g.userData.hipY = hipY * scale; g.userData.quadruped = true;
  return g;
}

function stegosaur(sp, mat) {
  const g = new THREE.Group();
  const parts = { legs: [], neck: null, tail: null };
  const hipY = 2.8;
  const body = capsule(mat, 1.7, 3.2); body.rotation.z = Math.PI / 2; body.position.set(0, hipY, 0); g.add(body);
  // 拱背(前低後高)。
  g.rotation.z = 0;
  const neck = new THREE.Group(); neck.position.set(2.6, hipY - 0.4, 0);
  const nm = capsule(mat, 0.7, 1.2); nm.rotation.z = 0.4; nm.position.set(0.6, -0.2, 0); neck.add(nm);
  const head = box(mat, 1.0, 0.55, 0.6); head.position.set(1.4, -0.6, 0); neck.add(head);
  g.add(neck); parts.neck = neck;
  // 背板(兩排交錯)。
  const plateMat = new THREE.MeshStandardMaterial({ color: sp.accent, roughness: 0.7, side: THREE.DoubleSide });
  for (let i = 0; i < 8; i++) {
    const size = 1.0 + Math.sin(i / 7 * Math.PI) * 1.4;
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0, size, 0.15, 3, 1), plateMat);
    plate.rotation.set(0, 0, 0);
    const px = 2.0 - i * 0.6;
    plate.position.set(px, hipY + 1.4 + Math.sin(i / 7 * Math.PI) * 0.6, (i % 2 ? 0.3 : -0.3));
    plate.castShadow = true; g.add(plate);
  }
  // 尾 + 四尖刺。
  const tail = new THREE.Group(); tail.position.set(-2.4, hipY, 0);
  const tm = capsule(mat, 0.8, 2.2); tm.rotation.z = Math.PI / 2; tm.position.x = -1.2; tail.add(tm);
  const spikeMat = new THREE.MeshStandardMaterial({ color: 0xcfc2a6, roughness: 0.6 });
  for (const s of [1, -1]) for (const o of [0, 0.5]) { const spk = cone(spikeMat, 0.14, 1.1); spk.position.set(-2.2 - o, 0.4, s * 0.5); spk.rotation.z = -0.9; spk.rotation.x = s * 0.4; tail.add(spk); }
  g.add(tail); parts.tail = tail;
  for (const sx of [1, -1]) for (const zx of [1, -1]) {
    const isBack = sx > 0; const leg = buildLeg(mat, isBack ? 2.0 : 1.1, isBack ? 1.4 : 0.8, 1.0, 0.6);
    leg.group.position.set(isBack ? 1.6 : -1.6, hipY, zx * 1.3);
    g.add(leg.group); parts.legs.push(leg);
  }
  const scale = sp.heightM / 4;
  g.scale.setScalar(scale);
  g.userData.parts = parts; g.userData.hipY = hipY * scale; g.userData.quadruped = true;
  return g;
}

function hadrosaur(sp, mat) {
  const g = new THREE.Group();
  const parts = { legs: [], neck: null, tail: null };
  const hipY = 3.0;
  const body = capsule(mat, 1.3, 3.0); body.rotation.z = Math.PI / 2; body.position.set(0, hipY, 0); g.add(body);
  const neck = new THREE.Group(); neck.position.set(2.4, hipY + 0.5, 0);
  const nm = capsule(mat, 0.6, 1.4); nm.rotation.z = 0.8; nm.position.set(0.5, 0.6, 0); neck.add(nm);
  const head = new THREE.Group(); head.position.set(1.0, 1.2, 0);
  const skull = box(mat, 1.2, 0.6, 0.55); skull.position.x = 0.3; head.add(skull);
  const bill = box(mat, 0.7, 0.25, 0.7); bill.position.set(0.95, -0.1, 0); head.add(bill); // 鴨嘴
  // 冠管(向後上)。
  const crestMat = new THREE.MeshStandardMaterial({ color: sp.accent, roughness: 0.7 });
  const crest = capsule(crestMat, 0.22, 1.4); crest.position.set(-0.4, 0.6, 0); crest.rotation.z = 1.0; head.add(crest);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x140d08 });
  const e = sphere(eyeMat, 0.08, 8); e.position.set(0.35, 0.15, 0.28); head.add(e); const e2 = e.clone(); e2.position.z = -0.28; head.add(e2);
  neck.add(head); g.add(neck); parts.neck = neck;
  const tail = new THREE.Group(); tail.position.set(-2.2, hipY, 0);
  const tm = capsule(mat, 0.9, 2.6); tm.rotation.z = Math.PI / 2; tm.position.x = -1.4; tail.add(tm); g.add(tail); parts.tail = tail;
  // 後腿粗壯、前肢細短(可四足)。
  for (const s of [1, -1]) { const leg = buildLeg(mat, 2.0, 1.6, 1.1, 0.55); leg.group.position.set(0.2, hipY, s * 0.8); g.add(leg.group); parts.legs.push(leg); }
  for (const s of [1, -1]) { const arm = capsule(mat, 0.28, 1.2); arm.position.set(2.0, hipY - 0.6, s * 0.7); arm.rotation.z = 0.3; g.add(arm); }
  const scale = sp.heightM / 4.5;
  g.scale.setScalar(scale);
  g.userData.parts = parts; g.userData.hipY = hipY * scale;
  return g;
}

function ankylosaur(sp, mat) {
  const g = new THREE.Group();
  const parts = { legs: [], neck: null, tail: null };
  const hipY = 1.6;
  const body = new THREE.Mesh(new THREE.SphereGeometry(2.0, 16, 12), mat);
  body.scale.set(1.8, 0.85, 1.3); body.position.set(0, hipY, 0); body.castShadow = true; g.add(body);
  // 甲板(背上一堆骨突)。
  const plateMat = new THREE.MeshStandardMaterial({ color: sp.accent, roughness: 0.9 });
  for (let i = 0; i < 24; i++) {
    const ang = (i / 24) * Math.PI * 2; const row = Math.floor(i / 8);
    const bump = new THREE.Mesh(new THREE.SphereGeometry(0.3 + (i % 3) * 0.08, 8, 6), plateMat);
    bump.position.set(Math.cos(ang) * (2.0 - row * 0.4), hipY + 1.0 - row * 0.2, Math.sin(ang) * (1.5 - row * 0.3));
    bump.castShadow = true; g.add(bump);
  }
  const head = new THREE.Group(); head.position.set(3.0, hipY - 0.3, 0);
  const skull = box(mat, 1.0, 0.7, 1.1); head.add(skull);
  for (const s of [1, -1]) { const horn = cone(plateMat, 0.16, 0.5); horn.position.set(-0.3, 0.2, s * 0.5); horn.rotation.x = s * 0.6; head.add(horn); }
  g.add(head); parts.neck = head;
  // 尾 + 尾錘。
  const tail = new THREE.Group(); tail.position.set(-3.0, hipY, 0);
  const tm = capsule(mat, 0.55, 2.4); tm.rotation.z = Math.PI / 2; tm.position.x = -1.4; tail.add(tm);
  const club = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), plateMat); club.scale.set(1.2, 0.9, 1.2); club.position.set(-3.0, 0, 0); club.castShadow = true; tail.add(club);
  g.add(tail); parts.tail = tail;
  for (const sx of [1, -1]) for (const zx of [1, -1]) { const leg = buildLeg(mat, 0.9, 0.7, 0.9, 0.5); leg.group.position.set(sx > 0 ? 1.4 : -1.4, hipY, zx * 1.5); g.add(leg.group); parts.legs.push(leg); }
  const scale = sp.heightM / 1.7;
  g.scale.setScalar(scale);
  g.userData.parts = parts; g.userData.hipY = hipY * scale; g.userData.quadruped = true;
  return g;
}

function pterosaur(sp, mat) {
  const g = new THREE.Group();
  const parts = { legs: [], wings: [], neck: null };
  const bodyY = 0;
  const body = capsule(mat, 0.5, 1.4); body.rotation.z = Math.PI / 2; body.position.set(0, bodyY, 0); g.add(body);
  // 長頸 + 長喙 + 頭冠。
  const neck = new THREE.Group(); neck.position.set(1.0, 0.2, 0);
  const nm = capsule(mat, 0.28, 1.4); nm.rotation.z = 0.5; nm.position.set(0.6, 0.5, 0); neck.add(nm);
  const head = new THREE.Group(); head.position.set(1.3, 1.0, 0);
  const beak = cone(mat, 0.18, 2.2); beak.rotation.z = -Math.PI / 2 + 0.2; beak.position.set(1.0, -0.1, 0); head.add(beak);
  const crest = new THREE.Mesh(new THREE.CircleGeometry(0.6, 12, 0, Math.PI), new THREE.MeshStandardMaterial({ color: sp.accent, side: THREE.DoubleSide, roughness: 0.7 }));
  crest.rotation.y = Math.PI / 2; crest.position.set(-0.2, 0.4, 0); head.add(crest);
  neck.add(head); g.add(neck); parts.neck = neck;
  // 巨翼(每側:上臂 + 翼膜)。
  const membraneMat = new THREE.MeshStandardMaterial({ color: sp.color, roughness: 1, side: THREE.DoubleSide, transparent: true, opacity: 0.96 });
  for (const s of [1, -1]) {
    const wing = new THREE.Group(); wing.position.set(0, 0.1, s * 0.4);
    const arm = capsule(mat, 0.18, 4.5); arm.rotation.x = -Math.PI / 2; arm.position.set(0, 0, s * 2.3); wing.add(arm);
    // 翼膜(三角面)。
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.lineTo(-1.6, s * 5.2); shape.lineTo(1.4, s * 5.0); shape.lineTo(0.6, 0); shape.closePath();
    const mem = new THREE.Mesh(new THREE.ShapeGeometry(shape), membraneMat);
    mem.rotation.x = -Math.PI / 2; mem.position.y = 0; mem.castShadow = true; wing.add(mem);
    g.add(wing); parts.wings.push(wing);
  }
  const scale = 1.0;
  g.scale.setScalar(scale);
  g.userData.parts = parts; g.userData.hipY = 0; g.userData.flyer = true;
  return g;
}
