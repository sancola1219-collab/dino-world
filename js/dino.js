// dino.js — 程序化恐龍模型(寫實自然風)。
// 核心做法:每隻恐龍的身體是「一條脊椎曲線放樣(loft)出的單一平滑連續表面」——
// 鼻→頭→頸→軀幹→尾一氣呵成,不再是一顆顆球/膠囊黏起來的塊狀玩具。
// 放樣用平行移動框架(parallel-transport frames)避免扭曲;腿用漸縮圓柱;再依物種疊上特徵。
// userData.parts.legs 供 main.js 做步態動畫;parts.wings 供翼龍拍翼。
import * as THREE from 'three';
import { makeSkinTexture } from './textures.js';

function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
// 皮膚材質依物種 id 快取:族群(herd)會重複建同種個體,快取讓昂貴的程序化貼圖只算一次。
const _skinCache = {};
function skinMat(sp) {
  if (_skinCache[sp.id]) return _skinCache[sp.id];
  const scaly = sp.build !== 'raptor' && sp.build !== 'pterosaur' && sp.build !== 'earlytheropod';
  const { map, normalMap } = makeSkinTexture(sp.color, sp.accent, hash(sp.id), scaly);
  // DoubleSide:放樣(loft)身體的三角纏繞方向會讓 FrontSide 剔除近面、身體看起來透明(幽靈狀);
  // 雙面渲染保證實體、不透明(對封閉的腿/頭球體無害)。normalMap 讓體表有鱗片/皺褶的立體受光。
  const m = new THREE.MeshStandardMaterial({
    map, normalMap, normalScale: new THREE.Vector2(0.6, 0.6),
    roughness: 0.9, metalness: 0.0, side: THREE.DoubleSide,
  });
  _skinCache[sp.id] = m;
  return m;
}

/* ---------------- 基本體 ---------------- */
function box(mat, w, h, d) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = true; m.receiveShadow = true; return m; }
function sphere(mat, r, seg = 18) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), mat); m.castShadow = true; m.receiveShadow = true; return m; }
function cone(mat, r, h, seg = 14) { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat); m.castShadow = true; return m; }
function ellip(mat, rx, ry, rz, seg = 20) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, seg, seg), mat); m.scale.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true; return m; }
function tcyl(mat, rTop, rBot, len, seg = 16) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, len, seg), mat); m.castShadow = true; m.receiveShadow = true; return m; }

const EYE = new THREE.MeshStandardMaterial({ color: 0x0b0805, roughness: 0.25, metalness: 0.1 });
function addEyes(parent, x, y, z, r) { const e = sphere(EYE, r, 8); e.position.set(x, y, z); parent.add(e); const e2 = e.clone(); e2.position.z = -z; parent.add(e2); }

/* ---------------- 脊椎放樣(核心) ----------------
   nodes: [{x,y,z?,r,ry?,rz?}]  沿身體中線,r=半徑,ry=垂直、rz=水平橢圓係數。
   回傳單一平滑 Mesh。 */
function loft(mat, nodes, R = 20) {
  const P = nodes.map((n) => new THREE.Vector3(n.x, n.y, n.z || 0));
  const n = P.length;
  const T = [];
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
    T.push(b.clone().sub(a).normalize());
  }
  // 平行移動框架:起始法線垂直於首切線,之後沿切線變化旋轉,避免扭轉。
  const N = [];
  const up = Math.abs(T[0].y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  N.push(up.clone().sub(T[0].clone().multiplyScalar(up.dot(T[0]))).normalize());
  for (let i = 1; i < n; i++) {
    const t0 = T[i - 1], t1 = T[i];
    const axis = t0.clone().cross(t1); const al = axis.length();
    if (al < 1e-6) { N.push(N[i - 1].clone()); } else {
      axis.multiplyScalar(1 / al);
      const ang = Math.acos(Math.min(1, Math.max(-1, t0.dot(t1))));
      const nn = N[i - 1].clone().applyAxisAngle(axis, ang);
      nn.sub(t1.clone().multiplyScalar(nn.dot(t1))).normalize();
      N.push(nn);
    }
  }
  const pos = [], uv = [], idx = [];
  for (let i = 0; i < n; i++) {
    const bin = T[i].clone().cross(N[i]).normalize();
    const nd = nodes[i], ry = nd.ry ?? 1, rz = nd.rz ?? 1, r = nd.r;
    for (let j = 0; j < R; j++) {
      const a = j / R * Math.PI * 2;
      const off = N[i].clone().multiplyScalar(Math.cos(a) * r * ry).add(bin.clone().multiplyScalar(Math.sin(a) * r * rz));
      const v = P[i].clone().add(off);
      pos.push(v.x, v.y, v.z);
      uv.push((i / (n - 1)) * 2.5, j / R);
    }
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < R; j++) {
    const a = i * R + j, b = i * R + (j + 1) % R, c = (i + 1) * R + j, d = (i + 1) * R + (j + 1) % R;
    idx.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true;
  return m;
}

/* ---------------- 腿(放樣肌肉、可動) ----------------
   用 loft 把大腿/小腿做成有肌肉起伏的平滑肢段(取代直筒圓柱),仍保留 upper/lower 兩段可擺動。 */
function legTapered(mat, thigh, shin, rHip, rKnee, rAnkle) {
  const group = new THREE.Group();
  const upper = new THREE.Group();
  const hip = sphere(mat, rHip * 1.08, 12); upper.add(hip);                       // 髖關節覆蓋接縫
  const th = loft(mat, [                                                          // 大腿:上粗、中段肌肉鼓起、收到膝
    { x: 0, y: 0.1, r: rHip * 1.05 }, { x: 0, y: -thigh * 0.32, r: rHip * 1.12, rz: 1.15 },
    { x: 0, y: -thigh * 0.72, r: rKnee * 1.08 }, { x: 0, y: -thigh, r: rKnee },
  ], 14); upper.add(th);
  const knee = sphere(mat, rKnee * 0.98, 12); knee.position.y = -thigh; upper.add(knee);
  const lower = new THREE.Group(); lower.position.y = -thigh;
  const sh = loft(mat, [                                                          // 小腿:膝→踝漸細,小腿肚微鼓
    { x: 0, y: 0.05, r: rKnee }, { x: 0, y: -shin * 0.35, r: rKnee * 0.9, rz: 1.05 },
    { x: 0, y: -shin * 0.8, r: rAnkle * 1.15 }, { x: 0, y: -shin, r: rAnkle },
  ], 12); lower.add(sh);
  const ankle = sphere(mat, rAnkle * 1.05, 10); ankle.position.y = -shin; lower.add(ankle);
  const foot = ellip(mat, rAnkle * 1.6, rAnkle * 0.7, rAnkle * 2.3, 12); foot.position.set(0, -shin + rAnkle * 0.1, rAnkle * 0.75); lower.add(foot);
  upper.add(lower); group.add(upper);
  return { group, upper, lower };
}

/** 主入口。 */
export function buildDino(sp) {
  const mat = skinMat(sp);
  let model;
  switch (sp.build) {
    case 'theropod': model = theropod(sp, mat); break;
    case 'raptor': model = raptor(sp, mat); break;
    case 'sauropod': model = sauropod(sp, mat, false); break;
    case 'diplodocid': model = sauropod(sp, mat, true); break;
    case 'prosauropod': model = prosauropod(sp, mat); break;
    case 'earlytheropod': model = earlytheropod(sp, mat); break;
    case 'ceratopsian': model = ceratopsian(sp, mat); break;
    case 'stegosaur': model = stegosaur(sp, mat); break;
    case 'hadrosaur': model = hadrosaur(sp, mat); break;
    case 'ankylosaur': model = ankylosaur(sp, mat); break;
    case 'pterosaur': model = pterosaur(sp, mat); break;
    // 非恐龍生物(寒武 → 冰河):
    case 'trilobite': model = trilobite(sp, mat); break;
    case 'anomalocaris': model = anomalocaris(sp, mat); break;
    case 'opabinia': model = opabinia(sp, mat); break;
    case 'dragonfly': model = dragonfly(sp, mat); break;
    case 'millipede': model = millipede(sp, mat); break;
    case 'amphibian': model = amphibian(sp, mat); break;
    case 'sailback': case 'synapsid': case 'dicynodont': case 'beast': model = beast(sp, mat); break;
    case 'snake': model = snake(sp, mat); break;
    default: model = theropod(sp, mat);
  }
  model.userData.species = sp;
  model.traverse((o) => { o.userData.dinoRoot = model; });
  return model;
}

/* ================= 各科造型 ================= */

// 大型獸腳類(暴龍、異特龍):水平背、深胸、粗尾平衡、大頭利齒、雙足。
function theropod(sp, mat) {
  const g = new THREE.Group();
  const parts = { legs: [] };
  const body = loft(mat, [
    { x: 5.7, y: 4.5, r: 0.16 },
    { x: 5.2, y: 4.55, r: 0.5, ry: 0.95, rz: 0.8 },
    { x: 4.5, y: 4.75, r: 0.9, ry: 1.15, rz: 0.92 },   // 頭
    { x: 3.85, y: 4.55, r: 0.62 },                      // 頸接頭
    { x: 3.2, y: 4.2, r: 0.9, ry: 1.15 },               // 頸
    { x: 2.4, y: 3.95, r: 1.32, rz: 1.05 },             // 肩
    { x: 1.2, y: 3.8, r: 1.55, rz: 1.1 },               // 胸
    { x: 0.0, y: 3.72, r: 1.48, rz: 1.06 },             // 腹
    { x: -1.3, y: 3.85, r: 1.2 },                       // 髖
    { x: -2.6, y: 3.98, r: 0.9 },
    { x: -4.1, y: 3.98, r: 0.58 },
    { x: -5.7, y: 3.85, r: 0.32 },
    { x: -7.6, y: 3.65, r: 0.08 },                      // 尾尖
  ]);
  g.add(body);
  // 頭部細節(下顎、利齒、眼、眉脊)。
  const head = new THREE.Group(); head.position.set(4.7, 4.7, 0);
  const jaw = box(mat, 1.7, 0.42, 0.8); jaw.position.set(-0.05, -0.72, 0); head.add(jaw);
  const teethMat = new THREE.MeshStandardMaterial({ color: 0xf1e8d2, roughness: 0.5 });
  for (let i = 0; i < 7; i++) { const t = cone(teethMat, 0.07, 0.32, 6); t.position.set(0.75 - i * 0.26, -0.5, 0.42); t.rotation.x = Math.PI; head.add(t); const t2 = t.clone(); t2.position.z = -0.42; head.add(t2); }
  for (const s of [1, -1]) { const brow = box(mat, 0.5, 0.18, 0.24); brow.position.set(0.1, 0.42, s * 0.42); head.add(brow); }
  addEyes(head, 0.15, 0.28, 0.46, 0.12);
  g.add(head);
  // 短前肢。
  for (const s of [1, -1]) { const arm = tcyl(mat, 0.18, 0.1, 1.0); arm.position.set(2.0, 3.35, s * 0.95); arm.rotation.z = 0.7; arm.rotation.x = s * 0.2; g.add(arm); }
  // 雙腿。
  for (const s of [1, -1]) {
    const leg = legTapered(mat, 2.0, 1.75, 0.62, 0.42, 0.3); leg.group.position.set(-0.7, 3.72, s * 0.95);
    g.add(leg.group); parts.legs.push(leg);
  }
  const scale = sp.heightM / 3.72;
  g.scale.setScalar(scale);
  g.userData.parts = parts; g.userData.hipY = 3.72 * scale;
  return g;
}

// 小型早期獸腳類(始盜龍、腔骨龍):纖細、長尾、輕盈雙足。
function earlytheropod(sp, mat) {
  const g = new THREE.Group();
  const parts = { legs: [] };
  const body = loft(mat, [
    { x: 2.05, y: 1.3, r: 0.05 },
    { x: 1.8, y: 1.38, r: 0.14, ry: 1.0 },              // 吻
    { x: 1.55, y: 1.46, r: 0.2 },                       // 頭
    { x: 1.3, y: 1.36, r: 0.13 },                       // 頸
    { x: 1.0, y: 1.22, r: 0.2 },
    { x: 0.6, y: 1.16, r: 0.31, rz: 1.0 },              // 肩
    { x: 0.15, y: 1.14, r: 0.36 },                      // 身
    { x: -0.3, y: 1.12, r: 0.31 },
    { x: -0.8, y: 1.16, r: 0.24 },                      // 髖
    { x: -1.6, y: 1.24, r: 0.16 },
    { x: -2.6, y: 1.28, r: 0.08 },
    { x: -3.7, y: 1.2, r: 0.03 },                       // 長尾尖
  ], 12);
  g.add(body);
  const head = new THREE.Group(); head.position.set(1.6, 1.44, 0);
  const snout = tcyl(mat, 0.1, 0.16, 0.4); snout.rotation.z = -Math.PI / 2; snout.position.set(0.28, -0.04, 0); head.add(snout);
  addEyes(head, 0.02, 0.1, 0.16, 0.05);
  g.add(head);
  for (const s of [1, -1]) { const arm = tcyl(mat, 0.06, 0.03, 0.5); arm.position.set(0.5, 1.0, s * 0.22); arm.rotation.z = 0.8; g.add(arm); }
  for (const s of [1, -1]) {
    const leg = legTapered(mat, 0.62, 0.55, 0.16, 0.1, 0.07); leg.group.position.set(-0.45, 1.14, s * 0.22);
    g.add(leg.group); parts.legs.push(leg);
  }
  const scale = sp.heightM / 1.14;
  g.scale.setScalar(scale);
  g.userData.parts = parts; g.userData.hipY = 1.14 * scale;
  return g;
}

// 馳龍(伶盜龍):披羽、長僵直尾、後腳鐮刀爪。
function raptor(sp, mat) {
  const g = new THREE.Group();
  const parts = { legs: [] };
  const body = loft(mat, [
    { x: 2.0, y: 1.42, r: 0.06 },
    { x: 1.72, y: 1.5, r: 0.17, ry: 1.0 },              // 頭(較長)
    { x: 1.42, y: 1.5, r: 0.2 },
    { x: 1.15, y: 1.38, r: 0.16 },                      // 頸(S 形)
    { x: 0.9, y: 1.24, r: 0.24 },
    { x: 0.5, y: 1.2, r: 0.34 },                        // 肩
    { x: 0.05, y: 1.2, r: 0.38 },                       // 身
    { x: -0.4, y: 1.2, r: 0.32 },
    { x: -0.9, y: 1.26, r: 0.24 },                      // 髖
    { x: -1.7, y: 1.36, r: 0.15 },                      // 尾(上舉僵直)
    { x: -2.7, y: 1.46, r: 0.08 },
    { x: -3.7, y: 1.54, r: 0.03 },
  ], 12);
  g.add(body);
  const head = new THREE.Group(); head.position.set(1.72, 1.5, 0);
  const snout = tcyl(mat, 0.12, 0.17, 0.5); snout.rotation.z = -Math.PI / 2; snout.position.set(0.34, -0.03, 0); head.add(snout);
  addEyes(head, 0.05, 0.12, 0.15, 0.055);
  g.add(head);
  // 羽毛:沿背、臂、尾的薄板(accent 色)。
  const featherMat = new THREE.MeshStandardMaterial({ color: sp.accent, roughness: 1, side: THREE.DoubleSide });
  for (let i = 0; i < 6; i++) { const f = box(featherMat, 0.02, 0.34, 0.5); f.position.set(-1.7 - i * 0.32, 1.42 + i * 0.03, 0); f.rotation.z = 0.3; g.add(f); }
  for (const s of [1, -1]) { const wing = box(featherMat, 0.6, 0.02, 0.42); wing.position.set(0.5, 1.15, s * 0.4); wing.rotation.x = s * 0.35; wing.rotation.z = 0.2; g.add(wing); }
  const clawMat = new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.5 });
  for (const s of [1, -1]) {
    const leg = legTapered(mat, 0.7, 0.62, 0.2, 0.13, 0.09); leg.group.position.set(-0.5, 1.2, s * 0.32);
    const claw = cone(clawMat, 0.05, 0.28, 6); claw.position.set(0.22, -1.34, 0); claw.rotation.z = -1.1; leg.lower.add(claw);
    g.add(leg.group); parts.legs.push(leg);
  }
  const scale = sp.heightM / 1.2 * 1.6;   // 伶盜龍矮但別太小,略放大方便觀察
  g.scale.setScalar(scale);
  g.userData.parts = parts; g.userData.hipY = 1.2 * scale;
  return g;
}

// 蜥腳類(腕龍=脖子上舉 / 梁龍=水平長鞭尾)。
function sauropod(sp, mat, horizontal) {
  const g = new THREE.Group();
  const parts = { legs: [] };
  let spine, refY, frontHi;
  if (horizontal) {
    // 梁龍:低身、水平長頸、超長鞭尾。
    spine = [
      { x: 9.6, y: 5.0, r: 0.28 },
      { x: 9.0, y: 5.05, r: 0.5, ry: 0.9 },              // 頭
      { x: 8.2, y: 5.1, r: 0.64 },                       // 頸
      { x: 7.0, y: 5.15, r: 0.82 },
      { x: 5.7, y: 5.15, r: 1.05 },
      { x: 4.2, y: 5.1, r: 1.85, rz: 1.02 },             // 肩
      { x: 2.3, y: 5.0, r: 2.35 },                       // 身
      { x: 0.2, y: 4.9, r: 2.4 },                        // 腹
      { x: -1.9, y: 4.95, r: 2.1 },                      // 髖
      { x: -4.3, y: 5.05, r: 1.45 },                     // 尾
      { x: -7.3, y: 5.05, r: 0.85 },
      { x: -10.6, y: 4.95, r: 0.42 },
      { x: -14.6, y: 4.8, r: 0.1 },                      // 鞭尾尖
    ];
    refY = 5.15; frontHi = false;
  } else {
    // 腕龍:前肢長、肩高於臀、脖子高舉。
    spine = [
      { x: 6.7, y: 12.7, r: 0.36 },
      { x: 6.2, y: 12.3, r: 0.6, ry: 0.9 },              // 頭
      { x: 5.75, y: 11.3, r: 0.72 },                     // 頸(上舉)
      { x: 5.2, y: 9.6, r: 0.88 },
      { x: 4.6, y: 7.9, r: 1.05 },
      { x: 4.0, y: 6.6, r: 1.5 },                        // 頸基
      { x: 3.0, y: 6.4, r: 2.55, rz: 1.02 },             // 肩(高)
      { x: 1.3, y: 6.0, r: 3.0 },                        // 身
      { x: -0.5, y: 5.6, r: 2.95 },                      // 腹
      { x: -2.3, y: 5.5, r: 2.45 },                      // 髖
      { x: -4.2, y: 5.7, r: 1.7 },                       // 尾
      { x: -6.5, y: 5.85, r: 1.05 },
      { x: -9.1, y: 5.8, r: 0.5 },
      { x: -11.7, y: 5.6, r: 0.14 },
    ];
    refY = 12.7; frontHi = true;
  }
  g.add(loft(mat, spine, 18));
  // 頭部細節。
  const hx = spine[1].x, hy = spine[1].y;
  const head = new THREE.Group(); head.position.set(hx, hy, 0);
  if (frontHi) { const crest = ellip(mat, 0.35, 0.4, 0.3); crest.position.set(-0.1, 0.5, 0); head.add(crest); }  // 腕龍鼻脊
  addEyes(head, -0.15, 0.15, horizontal ? 0.42 : 0.5, horizontal ? 0.09 : 0.11);
  g.add(head);
  // 四柱腿:腕龍前腿更長。
  const shoulderX = frontHi ? 3.0 : 4.0, hipX = frontHi ? -1.6 : -1.6;
  const frontLen = frontHi ? [3.6, 3.0] : [2.7, 2.4], backLen = frontHi ? [2.9, 2.7] : [2.6, 2.5];
  const rr = horizontal ? [1.0, 0.7, 0.55] : [1.15, 0.8, 0.62];
  for (const zx of [1, -1]) {
    const fl = legTapered(mat, frontLen[0], frontLen[1], rr[0], rr[1], rr[2]); fl.group.position.set(shoulderX, frontHi ? 6.4 : 5.1, zx * (horizontal ? 1.9 : 2.0)); g.add(fl.group); parts.legs.push(fl);
    const bl = legTapered(mat, backLen[0], backLen[1], rr[0] * 1.05, rr[1], rr[2]); bl.group.position.set(hipX, frontHi ? 5.5 : 5.0, zx * (horizontal ? 2.0 : 2.1)); g.add(bl.group); parts.legs.push(bl);
  }
  const scale = sp.heightM / refY;
  g.scale.setScalar(scale);
  g.userData.parts = parts; g.userData.hipY = (frontHi ? 5.5 : 5.0) * scale; g.userData.quadruped = true;
  return g;
}

// 原蜥腳類(板龍):中型、半直立、拇指爪。
function prosauropod(sp, mat) {
  const g = new THREE.Group();
  const parts = { legs: [] };
  g.add(loft(mat, [
    { x: 3.5, y: 3.3, r: 0.16 },
    { x: 3.2, y: 3.3, r: 0.3, ry: 0.9 },                 // 頭
    { x: 2.9, y: 3.0, r: 0.34 },                         // 頸
    { x: 2.5, y: 2.6, r: 0.5 },
    { x: 2.0, y: 2.35, r: 0.85, rz: 1.0 },               // 肩
    { x: 1.0, y: 2.25, r: 1.1 },                         // 身
    { x: 0.0, y: 2.2, r: 1.15 },                         // 腹
    { x: -1.0, y: 2.28, r: 0.98 },                       // 髖
    { x: -2.2, y: 2.45, r: 0.66 },                       // 尾
    { x: -3.6, y: 2.55, r: 0.4 },
    { x: -5.3, y: 2.5, r: 0.14 },
  ]));
  const head = new THREE.Group(); head.position.set(3.2, 3.3, 0);
  addEyes(head, 0.02, 0.1, 0.24, 0.06);
  g.add(head);
  // 後腿大於前腿(可半直立)。
  for (const zx of [1, -1]) {
    const fl = legTapered(mat, 1.3, 1.1, 0.34, 0.22, 0.16); fl.group.position.set(1.7, 2.3, zx * 0.85); g.add(fl.group); parts.legs.push(fl);
    const bl = legTapered(mat, 1.7, 1.4, 0.44, 0.28, 0.2); bl.group.position.set(-0.7, 2.3, zx * 0.95); g.add(bl.group); parts.legs.push(bl);
  }
  const scale = sp.heightM / 3.3;
  g.scale.setScalar(scale);
  g.userData.parts = parts; g.userData.hipY = 2.3 * scale; g.userData.quadruped = true;
  return g;
}

// 角龍(三角龍):粗壯四足、大頭+頸盾+三角+喙。
function ceratopsian(sp, mat) {
  const g = new THREE.Group();
  const parts = { legs: [] };
  g.add(loft(mat, [
    { x: 3.4, y: 2.55, r: 0.5, ry: 1.0 },                // 臉(頭另外做)
    { x: 2.85, y: 2.5, r: 0.85 },                        // 頸
    { x: 2.2, y: 2.6, r: 1.45, rz: 1.05 },               // 肩(高聳)
    { x: 0.9, y: 2.55, r: 1.68 },                        // 身
    { x: -0.5, y: 2.5, r: 1.6 },                         // 腹
    { x: -1.9, y: 2.5, r: 1.32 },                        // 髖
    { x: -3.1, y: 2.5, r: 0.85 },                        // 尾
    { x: -4.4, y: 2.45, r: 0.5 },
    { x: -5.4, y: 2.4, r: 0.18 },
  ]));
  // 頭:臉、喙、頸盾、三角。
  const head = new THREE.Group(); head.position.set(3.6, 2.55, 0);
  const face = ellip(mat, 0.85, 0.7, 0.65); face.position.set(0.2, 0, 0); head.add(face);
  const beakMat = new THREE.MeshStandardMaterial({ color: 0x6a5a44, roughness: 0.7 });
  const beak = cone(beakMat, 0.34, 0.8, 8); beak.rotation.z = -Math.PI / 2; beak.position.set(1.15, -0.18, 0); head.add(beak);
  // 頸盾:大而略凹的圓盤,微向後上。
  const frillMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(sp.color).lerp(new THREE.Color(sp.accent), 0.5), roughness: 0.8, side: THREE.DoubleSide });
  const frill = new THREE.Mesh(new THREE.CircleGeometry(1.7, 22), frillMat);
  frill.position.set(-0.95, 0.5, 0); frill.rotation.y = Math.PI / 2; frill.rotation.x = -0.3; frill.scale.set(1, 1.15, 1); frill.castShadow = true; head.add(frill);
  // 盾緣骨突。
  for (let i = 0; i < 9; i++) { const a = (i / 8 - 0.5) * Math.PI * 1.1; const bump = cone(frillMat, 0.14, 0.4, 6); bump.position.set(-0.95 + Math.cos(a) * 0.1, 0.5 + Math.sin(a) * 1.75, 0); bump.rotation.z = -a; head.add(bump); }
  const hornMat = new THREE.MeshStandardMaterial({ color: 0xdccfb2, roughness: 0.55 });
  const nose = cone(hornMat, 0.16, 0.55, 8); nose.position.set(0.85, 0.42, 0); nose.rotation.z = -0.2; head.add(nose);
  for (const s of [1, -1]) { const brow = cone(hornMat, 0.16, 1.3, 8); brow.position.set(0.35, 0.7, s * 0.42); brow.rotation.z = -0.35; brow.rotation.x = -s * 0.15; head.add(brow); }
  addEyes(head, 0.45, 0.15, 0.6, 0.1);
  g.add(head);
  for (const sx of [1, -1]) for (const zx of [1, -1]) {
    const leg = legTapered(mat, sx > 0 ? 1.55 : 1.35, sx > 0 ? 1.2 : 1.05, 0.5, 0.34, 0.26);
    leg.group.position.set(sx > 0 ? 1.7 : -1.6, 2.45, zx * 1.15); g.add(leg.group); parts.legs.push(leg);
  }
  const scale = sp.heightM / 2.6;
  g.scale.setScalar(scale);
  g.userData.parts = parts; g.userData.hipY = 2.45 * scale; g.userData.quadruped = true;
  return g;
}

// 劍龍:拱背(臀最高)、小頭低垂、兩排交錯直立骨板、尾端四尖刺。
function stegosaur(sp, mat) {
  const g = new THREE.Group();
  const parts = { legs: [] };
  g.add(loft(mat, [
    { x: 3.6, y: 1.35, r: 0.26 },                        // 小頭
    { x: 3.15, y: 1.55, r: 0.4 },                        // 頸
    { x: 2.5, y: 2.05, r: 0.85 },                        // 肩
    { x: 1.4, y: 2.6, r: 1.35 },                         // 背
    { x: 0.2, y: 3.0, r: 1.6 },                          // 拱背頂(臀前)
    { x: -1.1, y: 2.9, r: 1.45 },                        // 髖
    { x: -2.4, y: 2.55, r: 0.95 },                       // 尾
    { x: -3.9, y: 2.4, r: 0.55 },
    { x: -5.4, y: 2.35, r: 0.16 },
  ]));
  const head = new THREE.Group(); head.position.set(3.7, 1.32, 0);
  const snout = box(mat, 0.5, 0.28, 0.32); snout.position.set(0.25, -0.03, 0); head.add(snout);
  addEyes(head, 0.0, 0.1, 0.22, 0.05);
  g.add(head);
  // 背板(招牌):兩排交錯直立風箏板,中段最大。
  const plateCol = new THREE.Color(sp.accent).lerp(new THREE.Color(0x7a5236), 0.45);
  const plateMat = new THREE.MeshStandardMaterial({ color: plateCol, roughness: 0.75, side: THREE.DoubleSide });
  const N = 11;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const px = -3.0 + t * 5.9;
    const backY = 1.5 + Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.9) * 1.75;   // 沿拱背
    const bulge = Math.sin(t * Math.PI);
    const h = 0.4 + bulge * 1.15, w = 0.4 + bulge * 0.95;
    const plate = stegoPlate(plateMat, w, h);
    plate.position.set(px, backY, (i % 2 ? 0.16 : -0.16));
    plate.rotation.y = (i % 2 ? 0.14 : -0.14);
    g.add(plate);
  }
  // 尾端四尖刺。
  const spikeMat = new THREE.MeshStandardMaterial({ color: 0xd8cbb0, roughness: 0.55 });
  for (const s of [1, -1]) for (const o of [0, 0.5]) { const spk = cone(spikeMat, 0.12, 1.1, 7); spk.position.set(-4.7 - o, 2.55 + 0.35, s * 0.4); spk.rotation.z = -0.5; spk.rotation.x = s * 0.5; g.add(spk); }
  // 腿:後腿高於前腿。
  for (const sx of [1, -1]) for (const zx of [1, -1]) {
    const isBack = sx > 0;
    const leg = legTapered(mat, isBack ? 1.9 : 1.15, isBack ? 1.3 : 0.8, isBack ? 0.55 : 0.42, isBack ? 0.4 : 0.3, isBack ? 0.3 : 0.24);
    leg.group.position.set(isBack ? -1.0 : 2.2, isBack ? 2.9 : 2.0, zx * 1.05);
    g.add(leg.group); parts.legs.push(leg);
  }
  const scale = sp.heightM / 3.0;
  g.scale.setScalar(scale);
  g.userData.parts = parts; g.userData.hipY = 2.9 * scale; g.userData.quadruped = true;
  return g;
}

// 劍龍骨板:直立風箏形薄板(XY 平面,寬面朝側 ±Z)。
function stegoPlate(mat, w, h) {
  const s = new THREE.Shape();
  s.moveTo(-w * 0.30, 0); s.lineTo(-w * 0.50, h * 0.42); s.lineTo(-w * 0.16, h * 0.9);
  s.lineTo(0, h); s.lineTo(w * 0.16, h * 0.9); s.lineTo(w * 0.50, h * 0.42); s.lineTo(w * 0.30, 0); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: false }); geo.translate(0, 0, -0.07);
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m;
}

// 鴨嘴龍(副櫛龍):鴨嘴、後彎中空冠管、可雙足。
function hadrosaur(sp, mat) {
  const g = new THREE.Group();
  const parts = { legs: [] };
  g.add(loft(mat, [
    { x: 3.6, y: 3.7, r: 0.3, ry: 0.9 },                 // 頭前
    { x: 3.15, y: 3.5, r: 0.42 },                        // 頸
    { x: 2.6, y: 3.05, r: 0.6 },
    { x: 2.0, y: 2.85, r: 1.0, rz: 1.0 },                // 肩
    { x: 0.9, y: 2.85, r: 1.28 },                        // 身
    { x: -0.4, y: 2.82, r: 1.2 },                        // 腹
    { x: -1.6, y: 2.9, r: 1.0 },                         // 髖
    { x: -2.9, y: 3.0, r: 0.72 },                        // 尾(粗、平衡)
    { x: -4.3, y: 3.0, r: 0.42 },
    { x: -5.8, y: 2.85, r: 0.14 },
  ]));
  const head = new THREE.Group(); head.position.set(3.6, 3.7, 0);
  const bill = box(mat, 0.7, 0.24, 0.66); bill.position.set(0.4, -0.14, 0); head.add(bill);    // 鴨嘴
  // 冠管:向後上的中空長管(副櫛龍招牌)。
  const crestMat = new THREE.MeshStandardMaterial({ color: sp.accent, roughness: 0.7 });
  const crest = tcyl(crestMat, 0.16, 0.22, 1.5); crest.position.set(-0.55, 0.55, 0); crest.rotation.z = 1.05; head.add(crest);
  const crestTip = sphere(crestMat, 0.2); crestTip.position.set(-1.0, 1.1, 0); head.add(crestTip);
  addEyes(head, 0.15, 0.15, 0.3, 0.07);
  g.add(head);
  // 後腿粗壯、前肢細短(半四足)。
  for (const s of [1, -1]) { const leg = legTapered(mat, 1.9, 1.55, 0.5, 0.32, 0.24); leg.group.position.set(-1.0, 2.85, s * 0.75); g.add(leg.group); parts.legs.push(leg); }
  for (const s of [1, -1]) { const arm = tcyl(mat, 0.22, 0.14, 1.3); arm.position.set(1.9, 2.4, s * 0.6); arm.rotation.z = 0.35; g.add(arm); }
  const scale = sp.heightM / 3.7;
  g.scale.setScalar(scale);
  g.userData.parts = parts; g.userData.hipY = 2.85 * scale;
  return g;
}

// 甲龍:寬扁低伏、背覆骨甲、尾端骨錘。
function ankylosaur(sp, mat) {
  const g = new THREE.Group();
  const parts = { legs: [] };
  g.add(loft(mat, [
    { x: 3.2, y: 1.2, r: 0.5, ry: 0.85, rz: 1.15 },      // 頭(寬)
    { x: 2.6, y: 1.25, r: 0.75, rz: 1.2 },               // 頸
    { x: 1.9, y: 1.4, r: 1.3, ry: 0.85, rz: 1.5 },       // 肩(寬扁)
    { x: 0.6, y: 1.5, r: 1.7, ry: 0.82, rz: 1.65 },      // 背(最寬)
    { x: -0.9, y: 1.5, r: 1.6, ry: 0.82, rz: 1.6 },      // 髖
    { x: -2.2, y: 1.45, r: 0.9, ry: 0.85, rz: 1.0 },     // 尾基
    { x: -3.5, y: 1.5, r: 0.5 },
    { x: -4.7, y: 1.55, r: 0.34 },                       // 尾(接骨錘)
  ], 18));
  const head = new THREE.Group(); head.position.set(3.35, 1.2, 0);
  const armorMat = new THREE.MeshStandardMaterial({ color: sp.accent, roughness: 0.9 });
  for (const s of [1, -1]) { const horn = cone(armorMat, 0.18, 0.5, 6); horn.position.set(-0.35, 0.05, s * 0.5); horn.rotation.x = s * 0.7; horn.rotation.z = 0.5; head.add(horn); }
  addEyes(head, 0.2, 0.05, 0.42, 0.06);
  g.add(head);
  // 背甲:成排骨突。
  for (let row = 0; row < 4; row++) for (let s of [1, -1]) {
    for (let i = 0; i < 4; i++) {
      const px = 1.5 - i * 1.0 - row * 0.15;
      const bump = ellip(armorMat, 0.28, 0.2, 0.34); bump.position.set(px, 1.5 + 0.5 - row * 0.28, s * (0.4 + row * 0.42)); g.add(bump);
    }
  }
  // 中脊骨突。
  for (let i = 0; i < 5; i++) { const b = ellip(armorMat, 0.3, 0.28, 0.34); b.position.set(1.4 - i * 0.9, 2.05, 0); g.add(b); }
  // 尾錘。
  const club = ellip(armorMat, 0.75, 0.6, 0.7); club.position.set(-5.5, 1.55, 0); g.add(club);
  const tcon = tcyl(mat, 0.34, 0.5, 1.0); tcon.rotation.z = Math.PI / 2; tcon.position.set(-5.0, 1.55, 0); g.add(tcon);
  for (const sx of [1, -1]) for (const zx of [1, -1]) {
    const leg = legTapered(mat, 0.85, 0.7, 0.42, 0.32, 0.28); leg.group.position.set(sx > 0 ? 1.4 : -1.2, 1.35, zx * 1.35); g.add(leg.group); parts.legs.push(leg);
  }
  const scale = sp.heightM / 1.7;
  g.scale.setScalar(scale);
  g.userData.parts = parts; g.userData.hipY = 1.35 * scale; g.userData.quadruped = true;
  return g;
}

// 翼龍(風神翼龍):長喙、頭冠、細長頸、巨翼。
function pterosaur(sp, mat) {
  const g = new THREE.Group();
  const parts = { wings: [] };
  // 身體+頸+頭 放樣成一條。
  g.add(loft(mat, [
    { x: 3.4, y: 1.1, r: 0.28 },                         // 頭後
    { x: 2.9, y: 0.95, r: 0.24 },                        // 頸上
    { x: 2.2, y: 0.6, r: 0.26 },
    { x: 1.5, y: 0.3, r: 0.34 },                         // 頸基
    { x: 0.7, y: 0.1, r: 0.5, rz: 1.0 },                 // 肩
    { x: 0.0, y: 0.0, r: 0.55 },                         // 胸
    { x: -0.8, y: 0.0, r: 0.42 },                        // 腹
    { x: -1.6, y: 0.05, r: 0.26 },                       // 尾基
    { x: -2.4, y: 0.1, r: 0.1 },
  ], 14));
  // 頭:長喙 + 頭冠。
  const head = new THREE.Group(); head.position.set(3.4, 1.1, 0);
  const beak = cone(mat, 0.2, 2.4, 8); beak.rotation.z = -Math.PI / 2 + 0.15; beak.position.set(1.15, -0.05, 0); head.add(beak);
  const crest = new THREE.Mesh(new THREE.CircleGeometry(0.7, 14, 0, Math.PI), new THREE.MeshStandardMaterial({ color: sp.accent, side: THREE.DoubleSide, roughness: 0.7 }));
  crest.rotation.y = Math.PI / 2; crest.position.set(-0.15, 0.35, 0); head.add(crest);
  addEyes(head, 0.35, 0.12, 0.16, 0.07);
  g.add(head);
  // 巨翼:上臂骨 + 翼指 + 三角翼膜。
  const membraneMat = new THREE.MeshStandardMaterial({ color: sp.color, roughness: 1, side: THREE.DoubleSide, transparent: true, opacity: 0.96 });
  for (const s of [1, -1]) {
    const wing = new THREE.Group(); wing.position.set(0.3, 0.1, s * 0.4);
    const arm = tcyl(mat, 0.16, 0.08, 5.0); arm.rotation.x = -Math.PI / 2; arm.position.set(0, 0, s * 2.5); wing.add(arm);
    const shape = new THREE.Shape();
    shape.moveTo(0.6, 0); shape.lineTo(-1.8, s * 5.4); shape.lineTo(1.2, s * 5.2); shape.lineTo(1.0, 0); shape.closePath();
    const mem = new THREE.Mesh(new THREE.ShapeGeometry(shape), membraneMat); mem.rotation.x = -Math.PI / 2; mem.castShadow = true; wing.add(mem);
    g.add(wing); parts.wings.push(wing);
  }
  // 站立長腿(收在下方,飛行時不明顯)。
  for (const s of [1, -1]) { const leg = tcyl(mat, 0.12, 0.07, 2.2); leg.position.set(-0.6, -1.1, s * 0.35); g.add(leg); }
  const scale = (sp.heightM || 5) / 3.4;
  g.scale.setScalar(scale);
  g.userData.parts = parts; g.userData.hipY = 0; g.userData.flyer = true;
  return g;
}

/* ================= 非恐龍生物(寒武 → 冰河) ================= */

// 通用四足獸/獸孔類:哺乳類(始祖馬/巨犀/長毛象/劍齒虎/披毛犀/大地懶)與二疊紀似哺乳爬行類。
// 由 sp.model 旗標決定特徵(trunk 象鼻 / tusks 長牙 / noseHorn 犀角 / sabers 劍齒 / claws 巨爪 / hump 肩峰 / fur 毛 / neck 頸長 …)。
function beast(sp, mat) {
  const g = new THREE.Group(); const parts = { legs: [] };
  const o = sp.model || {}, build = sp.build;
  const neck = o.neck ?? (build === 'dicynodont' ? 0.4 : 0.7), hs = o.headSize ?? 1.0;
  const hipY = 2.4, hump = o.hump ? 0.55 : 0;
  const headX = 3.0 + neck, headY = hipY + 0.15 + neck * 0.5;
  const spine = [
    { x: headX + 0.55 * hs, y: headY - 0.05, r: 0.26 * hs },
    { x: headX, y: headY + 0.05, r: 0.5 * hs, ry: 1.0, rz: 0.95 },
    { x: headX - 0.55, y: headY - 0.25 - neck * 0.15, r: 0.4 },
    { x: 2.55, y: hipY + 0.25, r: 0.72 },
    { x: 1.85, y: hipY + 0.35 + hump, r: 1.15, rz: 1.05 },
    { x: 0.6, y: hipY + 0.2 + hump * 0.5, r: 1.32, rz: 1.08 },
    { x: -0.7, y: hipY + 0.15, r: 1.24, rz: 1.05 },
    { x: -1.95, y: hipY + 0.2, r: 0.95 },
    { x: -2.9, y: hipY + 0.28, r: 0.5 },
    { x: -3.8, y: hipY + 0.32, r: 0.26 },
    { x: -4.7, y: hipY + 0.3, r: 0.08 },
  ];
  if (o.shortTail) spine.splice(8, 3, { x: -2.7, y: hipY + 0.2, r: 0.3 }, { x: -3.3, y: hipY + 0.2, r: 0.1 });
  g.add(loft(mat, spine, 16));

  const head = new THREE.Group(); head.position.set(headX, headY, 0);
  addEyes(head, 0.32 * hs, 0.18 * hs, 0.3 * hs, 0.07 * hs);
  if (o.ear) for (const s of [1, -1]) { const ear = box(mat, 0.1, 0.32, 0.05); ear.position.set(-0.05, 0.42, s * 0.28); head.add(ear); }
  if (o.trunk) { let px = 0.6, py = 0.0, pr = 0.22; for (let i = 0; i < 5; i++) { const seg = tcyl(mat, pr, pr * 0.82, 0.5); seg.position.set(px, py, 0); seg.rotation.z = -0.5 - i * 0.28; head.add(seg); px += 0.3; py -= 0.36; pr *= 0.82; } }
  if (o.tusks) { const tk = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.5 }); for (const s of [1, -1]) { const t = tcyl(tk, 0.12, 0.03, o.tusks === 'curved' ? 2.6 : 1.6); t.position.set(0.7, -0.2, s * 0.28); t.rotation.z = o.tusks === 'curved' ? -2.0 : -1.2; t.rotation.x = s * 0.15; if (o.tusks === 'curved') t.rotation.y = s * 0.25; head.add(t); } }
  if (o.sabers || build === 'synapsid') { const tk = new THREE.MeshStandardMaterial({ color: 0xf0e8d0, roughness: 0.45 }); for (const s of [1, -1]) { const t = tcyl(tk, 0.09, 0.02, 1.1); t.position.set(0.6, -0.4, s * 0.18); t.rotation.z = -0.15; head.add(t); } }
  if (o.noseHorn) { const hn = new THREE.MeshStandardMaterial({ color: 0xcdbfa2, roughness: 0.55 }); const horn = cone(hn, 0.16, o.noseHorn === 'long' ? 1.5 : 0.9, 8); horn.position.set(0.75, 0.4, 0); horn.rotation.z = -0.35; head.add(horn); const h2 = cone(hn, 0.1, 0.6, 8); h2.position.set(0.3, 0.55, 0); h2.rotation.z = -0.2; head.add(h2); }
  if (build === 'dicynodont') { const tk = new THREE.MeshStandardMaterial({ color: 0xe8dcc0 }); const beak = cone(new THREE.MeshStandardMaterial({ color: 0x6a5a44, roughness: 0.7 }), 0.22, 0.5, 8); beak.rotation.z = -Math.PI / 2; beak.position.set(0.65, -0.1, 0); head.add(beak); for (const s of [1, -1]) { const t = tcyl(tk, 0.06, 0.02, 0.45); t.position.set(0.45, -0.3, s * 0.18); t.rotation.z = -1.4; head.add(t); } }
  g.add(head);

  if (build === 'sailback') {                       // 異齒龍背帆
    const sm = new THREE.MeshStandardMaterial({ color: sp.accent, roughness: 0.85, side: THREE.DoubleSide });
    const shape = new THREE.Shape(); shape.moveTo(1.9, 0);
    for (let i = 0; i <= 12; i++) { const t = i / 12, px = 1.9 - t * 3.7, h = Math.sin(t * Math.PI) * 2.6; shape.lineTo(px, h); }
    shape.lineTo(-1.8, 0); shape.closePath();
    const sail = new THREE.Mesh(new THREE.ShapeGeometry(shape), sm); sail.position.set(0, hipY + 0.7, 0); sail.castShadow = true; g.add(sail);
  }
  if (o.fur) { const fm = new THREE.MeshStandardMaterial({ color: sp.color, roughness: 1, side: THREE.DoubleSide }); for (let i = 0; i < 16; i++) { const s = i < 8 ? 1 : -1, px = -2.2 + (i % 8) * 0.62; const f = box(fm, 0.55, 0.04, 0.85); f.position.set(px, hipY - 0.55, s * 0.95); f.rotation.z = 1.45; g.add(f); } }

  const ll = o.longLegs ? 1.5 : 1.0, th = 1.15 * ll, sh = 1.05 * ll;
  for (const sx of [1, -1]) for (const zx of [1, -1]) {
    const isBack = sx > 0;
    const leg = legTapered(mat, isBack ? th : th * 0.92, isBack ? sh : sh * 0.92, 0.34, 0.24, 0.2 * (o.claws && !isBack ? 1.4 : 1));
    leg.group.position.set(isBack ? -1.7 : 1.9, hipY, zx * 0.95);
    if (o.claws && !isBack) { const cm = new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.5 }); for (let c = 0; c < 3; c++) { const cl = cone(cm, 0.06, 0.42, 6); cl.position.set(0.12, -th - sh + 0.1, (c - 1) * 0.14); cl.rotation.z = -1.3; leg.lower.add(cl); } }
    g.add(leg.group); parts.legs.push(leg);
  }
  const scale = sp.heightM / 2.4; g.scale.setScalar(scale);
  g.userData.parts = parts; g.userData.hipY = hipY * scale; g.userData.quadruped = true;
  return g;
}

// 三葉蟲:低伏三葉背甲 + 頭甲/尾甲 + 兩側小腳(海床爬行)。
function trilobite(sp, mat) {
  const g = new THREE.Group(); const parts = { legs: [] };
  const shell = mat;
  const body = ellip(shell, 1.0, 0.38, 0.72); body.position.set(0, 0.38, 0); g.add(body);
  const ridge = ellip(shell, 1.05, 0.5, 0.26); ridge.position.set(0, 0.4, 0); g.add(ridge);      // 中葉
  const head = ellip(shell, 0.5, 0.42, 0.82); head.position.set(0.95, 0.38, 0); g.add(head);
  const tail = ellip(shell, 0.5, 0.3, 0.52); tail.position.set(-1.0, 0.36, 0); g.add(tail);
  for (const s of [1, -1]) { const e = sphere(EYE, 0.08, 6); e.position.set(1.02, 0.58, s * 0.38); g.add(e); }
  for (let i = 0; i < 6; i++) for (const s of [1, -1]) { const leg = tcyl(mat, 0.05, 0.03, 0.5); leg.position.set(0.7 - i * 0.28, 0.14, s * 0.6); leg.rotation.x = s * 1.0; g.add(leg); }
  const scale = Math.max(sp.heightM / 0.7, 0.5); g.scale.setScalar(scale);
  g.userData.parts = parts; g.userData.hipY = 0.1 * scale;
  return g;
}

// 奇蝦:分節長身 + 兩側肉鰭 + 前端一對抓握附肢 + 柄眼(游泳)。
function anomalocaris(sp, mat) {
  const g = new THREE.Group(); const parts = { wings: [] };
  g.add(loft(mat, [
    { x: 2.2, y: 0, r: 0.28, ry: 0.9 },
    { x: 1.5, y: 0, r: 0.42, ry: 0.85 },
    { x: 0.7, y: 0, r: 0.5, ry: 0.8 },
    { x: -0.2, y: 0, r: 0.46, ry: 0.8 },
    { x: -1.1, y: 0, r: 0.36, ry: 0.8 },
    { x: -2.0, y: 0, r: 0.22 },
    { x: -2.8, y: 0, r: 0.08 },
  ], 14));
  const finMat = new THREE.MeshStandardMaterial({ color: sp.accent, roughness: 0.9, side: THREE.DoubleSide });
  const fins = new THREE.Group();
  for (let i = 0; i < 6; i++) for (const s of [1, -1]) { const f = box(finMat, 0.5, 0.02, 0.36); f.position.set(1.0 - i * 0.55, -0.05, s * 0.5); f.rotation.x = s * 0.4; fins.add(f); }
  g.add(fins); parts.wings.push(fins);
  for (const s of [1, -1]) { let px = 2.4, py = -0.1; for (let i = 0; i < 4; i++) { const seg = tcyl(mat, 0.09, 0.06, 0.4); seg.position.set(px, py, s * 0.18); seg.rotation.z = -0.6 + i * 0.3; g.add(seg); px += 0.28; py -= 0.18; } }
  for (const s of [1, -1]) { const e = sphere(EYE, 0.12, 8); e.position.set(2.0, 0.35, s * 0.22); g.add(e); }
  const scale = (sp.heightM || 0.3) / 0.3; g.scale.setScalar(scale);
  g.userData.parts = parts; g.userData.hipY = 0; g.userData.flyer = true;
  return g;
}

// 歐巴賓海蠍:小分節身 + 五隻眼 + 前端長吻爪(游泳)。
function opabinia(sp, mat) {
  const g = new THREE.Group(); const parts = { wings: [] };
  g.add(loft(mat, [
    { x: 1.0, y: 0, r: 0.2 }, { x: 0.5, y: 0, r: 0.3 }, { x: -0.1, y: 0, r: 0.32 },
    { x: -0.7, y: 0, r: 0.26 }, { x: -1.3, y: 0, r: 0.16 }, { x: -1.9, y: 0, r: 0.05 },
  ], 12));
  const finMat = new THREE.MeshStandardMaterial({ color: sp.accent, roughness: 0.9, side: THREE.DoubleSide });
  const fins = new THREE.Group();
  for (let i = 0; i < 5; i++) for (const s of [1, -1]) { const f = box(finMat, 0.34, 0.02, 0.26); f.position.set(0.5 - i * 0.42, -0.02, s * 0.32); f.rotation.x = s * 0.35; fins.add(f); }
  g.add(fins); parts.wings.push(fins);
  for (let i = 0; i < 5; i++) { const e = sphere(EYE, 0.07, 6); e.position.set(1.0 - i * 0.12, 0.3, (i - 2) * 0.12); g.add(e); }
  let px = 1.1, py = 0.1; for (let i = 0; i < 4; i++) { const seg = tcyl(mat, 0.06, 0.05, 0.32); seg.position.set(px, py, 0); seg.rotation.z = -0.4 + i * 0.35; g.add(seg); px += 0.24; py -= 0.14; }
  const scale = Math.max(sp.heightM / 0.32, 0.45); g.scale.setScalar(scale);
  g.userData.parts = parts; g.userData.hipY = 0; g.userData.flyer = true;
  return g;
}

// 巨脈蜻蜓:胸腹細長 + 大複眼 + 四片長翅(飛行)。
function dragonfly(sp, mat) {
  const g = new THREE.Group(); const parts = { wings: [] };
  g.add(loft(mat, [
    { x: 0.9, y: 0, r: 0.22 },
    { x: 0.5, y: 0, r: 0.28 },
    { x: 0.1, y: 0, r: 0.22 },
    { x: -0.6, y: 0, r: 0.14 },
    { x: -1.6, y: 0, r: 0.11 },
    { x: -2.8, y: 0, r: 0.07 },
    { x: -3.6, y: 0, r: 0.03 },
  ], 12));
  for (const s of [1, -1]) { const e = sphere(new THREE.MeshStandardMaterial({ color: sp.accent, roughness: 0.3, metalness: 0.2 }), 0.16, 8); e.position.set(0.95, 0.05, s * 0.14); g.add(e); }
  const wm = new THREE.MeshStandardMaterial({ color: 0xbfe6df, roughness: 0.3, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
  for (const s of [1, -1]) for (const fwd of [0.35, -0.15]) {
    const wing = new THREE.Group(); wing.position.set(fwd, 0.08, 0);
    const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(0.2, s * 2.3); shape.lineTo(-0.2, s * 2.2); shape.closePath();
    const w = new THREE.Mesh(new THREE.ShapeGeometry(shape), wm); w.rotation.x = -Math.PI / 2; wing.add(w);
    g.add(wing); parts.wings.push(wing);
  }
  const scale = Math.max((sp.heightM || 0.1) / 0.1 * 0.6, 1.5); g.scale.setScalar(scale);
  g.userData.parts = parts; g.userData.hipY = 0; g.userData.flyer = true;
  return g;
}

// 節胸蜈蚣:超長分節管身 + 兩側成排小腳(爬行)。
function millipede(sp, mat) {
  const g = new THREE.Group(); const parts = { legs: [] };
  const nodes = []; const N = 16;
  for (let i = 0; i <= N; i++) { const t = i / N; const r = 0.45 * (1 - Math.abs(t - 0.45) * 0.7); nodes.push({ x: 2.4 - t * 5.0, y: 0.4, r: Math.max(0.08, r) }); }
  g.add(loft(mat, nodes, 12));
  const head = ellip(mat, 0.4, 0.4, 0.45); head.position.set(2.5, 0.42, 0); g.add(head);
  for (const s of [1, -1]) { const e = sphere(EYE, 0.06, 6); e.position.set(2.7, 0.55, s * 0.2); g.add(e); }
  for (let i = 0; i < 14; i++) for (const s of [1, -1]) { const leg = tcyl(mat, 0.05, 0.03, 0.5); leg.position.set(2.0 - i * 0.32, 0.15, s * 0.4); leg.rotation.x = s * 1.1; g.add(leg); }
  const scale = sp.heightM / 0.4; g.scale.setScalar(scale);
  g.userData.parts = parts; g.userData.hipY = 0.2 * scale;
  return g;
}

// 早期兩棲類(引螈):低伏寬身 + 寬扁大頭 + 四肢向兩側伸展(貼地)。
function amphibian(sp, mat) {
  const g = new THREE.Group(); const parts = { legs: [] };
  g.add(loft(mat, [
    { x: 2.6, y: 0.5, r: 0.45, ry: 0.7, rz: 1.2 },
    { x: 1.9, y: 0.5, r: 0.6, ry: 0.7, rz: 1.15 },
    { x: 0.9, y: 0.5, r: 0.75, ry: 0.72, rz: 1.1 },
    { x: -0.3, y: 0.5, r: 0.7, ry: 0.72, rz: 1.05 },
    { x: -1.5, y: 0.5, r: 0.5, ry: 0.75 },
    { x: -2.8, y: 0.5, r: 0.28 },
    { x: -4.2, y: 0.5, r: 0.08 },
  ], 14));
  const head = new THREE.Group(); head.position.set(2.6, 0.5, 0);
  addEyes(head, 0.0, 0.28, 0.32, 0.09);
  g.add(head);
  for (const sx of [1, -1]) for (const zx of [1, -1]) {
    const leg = legTapered(mat, 0.5, 0.45, 0.16, 0.11, 0.09);
    leg.group.position.set(sx > 0 ? 1.4 : -1.0, 0.5, zx * 0.9);
    leg.group.rotation.x = zx * 0.7;
    g.add(leg.group); parts.legs.push(leg);
  }
  const scale = sp.heightM / 0.9; g.scale.setScalar(scale);
  g.userData.parts = parts; g.userData.hipY = 0.5 * scale; g.userData.quadruped = true;
  return g;
}

// 巨蛇(泰坦巨蟒):沿 S 形曲線放樣的超長身 + 頭,無腿。
function snake(sp, mat) {
  const g = new THREE.Group(); const parts = { legs: [] };
  const nodes = []; const N = 24;
  for (let i = 0; i <= N; i++) {
    const t = i / N, x = 5.5 - t * 12;
    const z = Math.sin(t * Math.PI * 2.2) * 2.2;
    nodes.push({ x, y: 0.55, z, r: Math.max(0.06, i < 2 ? 0.5 : 0.62 * (1 - t * 0.85)) });
  }
  g.add(loft(mat, nodes, 14));
  const head = new THREE.Group(); head.position.set(5.5, 0.6, 0);
  const jaw = ellip(mat, 0.5, 0.3, 0.42); jaw.position.set(0.2, 0, 0); head.add(jaw);
  addEyes(head, 0.15, 0.15, 0.28, 0.08);
  g.add(head);
  const scale = (sp.heightM || 0.7) / 0.7; g.scale.setScalar(scale);
  g.userData.parts = parts; g.userData.hipY = 0.5 * scale;
  return g;
}
