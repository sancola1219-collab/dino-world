// world.js — 白堊紀谷地場景:地形高度場、河流、植被、岩石、天空、光照。
// 對外提供 heightAt(x,z) 供漫遊模式做地面貼合;所有幾何以真實公尺為單位。
import * as THREE from 'three';
import { fbm, noise2, clamp, lerp } from './util.js';
import { makeGroundTextures, makeCanopyTexture, makeBarkTexture } from './textures.js';

export const WORLD = {
  size: 300,        // 谷地邊長(公尺)
  seed: 7,
  riverZ: 6,        // 河流大致沿 z 走向的中心
  waterLevel: -0.6,
};

// 谷地高度場:四周山丘圍成盆地,中央平坦、有一條下切的河谷。純函數,可重現。
export function heightAt(x, z) {
  const s = WORLD.size;
  const nx = x / s, nz = z / s;
  // 邊緣抬高成環形山丘。
  const edge = Math.pow(clamp((Math.hypot(nx, nz) - 0.28) / 0.32, 0, 1), 1.6) * 26;
  // 中景起伏。
  const rolling = (fbm(nx * 6 + 10, nz * 6, 4, WORLD.seed) - 0.5) * 6;
  const detail = (noise2(nx * 40, nz * 40, WORLD.seed + 3) - 0.5) * 0.8;
  // 河谷:沿 z 軸的一條低地,河床下切。
  const riverDist = Math.abs(x - Math.sin(z / 60) * 22 - 4);
  const river = -clamp(1 - riverDist / 16, 0, 1) * 4.2;
  return edge + rolling + detail + river;
}

// 河流中心線在某 z 的 x 位置(供擺放與判斷)。
function riverCenterX(z) { return Math.sin(z / 60) * 22 + 4; }

export function buildWorld(scene, quality) {
  const group = new THREE.Group();
  const seg = quality === 'low' ? 120 : 200;
  const size = WORLD.size;

  // ---- 地形網格 ----
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, heightAt(x, z));
  }
  geo.computeVertexNormals();
  const { map, normalMap } = makeGroundTextures(WORLD.seed);
  const groundMat = new THREE.MeshStandardMaterial({
    map, normalMap, roughness: 0.95, metalness: 0.0,
    normalScale: new THREE.Vector2(0.8, 0.8),
  });
  const ground = new THREE.Mesh(geo, groundMat);
  ground.receiveShadow = true;
  ground.name = 'ground';
  group.add(ground);

  // ---- 河流水面 ----
  const waterGeo = new THREE.PlaneGeometry(size, size, 1, 1);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x2f5a63, roughness: 0.15, metalness: 0.3,
    transparent: true, opacity: 0.82,
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.y = WORLD.waterLevel;
  water.name = 'water';
  group.add(water);

  // ---- 植被 ----
  const veg = buildVegetation(quality);
  group.add(veg);

  // ---- 遠景岩層 ----
  group.add(buildRocks(quality));

  scene.add(group);
  return { group, ground, water, waterMat };
}

function buildVegetation(quality) {
  const g = new THREE.Group();
  const canopyTex = makeCanopyTexture(3, [0.22, 0.40, 0.16]);
  const canopyTex2 = makeCanopyTexture(8, [0.30, 0.44, 0.20]);
  const barkTex = makeBarkTexture(11);

  const trunkMat = new THREE.MeshStandardMaterial({ map: barkTex, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({
    map: canopyTex, alphaTest: 0.4, transparent: true, side: THREE.DoubleSide, roughness: 1,
  });
  const leafMat2 = leafMat.clone(); leafMat2.map = canopyTex2;

  const treeCount = quality === 'low' ? 90 : 200;
  const trunkGeo = new THREE.CylinderGeometry(0.5, 0.9, 1, 6);
  const trunkMeshes = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  // 基礎面片為單位大小(1);實際樹冠尺寸完全由每棵樹的 instance 縮放決定。
  // (曾踩坑:基礎用 9 又再乘樹冠半徑 → 樹葉放大約 9 倍、一圈就蓋住整個畫面連天空。)
  const leafGeoA = crossPlanes(1);
  const leafGeoB = crossPlanes(1);
  const leavesA = new THREE.InstancedMesh(leafGeoA, leafMat, treeCount);
  const leavesB = new THREE.InstancedMesh(leafGeoB, leafMat2, treeCount);
  trunkMeshes.castShadow = true; leavesA.castShadow = true; leavesB.castShadow = true;

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  let placed = 0;
  for (let i = 0; placed < treeCount && i < treeCount * 6; i++) {
    const x = (noise2(i * 1.7, 3, 21) - 0.5) * WORLD.size * 0.9;
    const z = (noise2(i * 2.3, 9, 42) - 0.5) * WORLD.size * 0.9;
    // 不長在河床與谷地正中央的開闊空地(留給恐龍)。
    if (Math.abs(x - riverCenterX(z)) < 12) continue;
    if (Math.hypot(x, z) < 26) continue;
    const y = heightAt(x, z);
    if (y < WORLD.waterLevel + 0.3) continue;
    const h = 6 + noise2(i, 1, 5) * 12;
    pos.set(x, y, z);

    sc.set(1.2, h, 1.2); q.identity();
    m.compose(pos.clone().setY(y + h / 2), q, sc);
    trunkMeshes.setMatrixAt(placed, m);

    const canopyH = h * 0.7, canopyR = h * 0.5;
    sc.set(canopyR, canopyH, canopyR);
    m.compose(pos.clone().setY(y + h * 0.85), q, sc);
    (Math.floor(noise2(i, 7, 3) * 2) ? leavesA : leavesB).setMatrixAt(placed, m);
    (Math.floor(noise2(i, 7, 3) * 2) ? leavesB : leavesA).setMatrixAt(placed, new THREE.Matrix4().makeScale(0, 0, 0));
    placed++;
  }
  trunkMeshes.count = placed; leavesA.count = placed; leavesB.count = placed;
  trunkMeshes.instanceMatrix.needsUpdate = true;
  leavesA.instanceMatrix.needsUpdate = true; leavesB.instanceMatrix.needsUpdate = true;
  g.add(trunkMeshes, leavesA, leavesB);

  // 蕨叢(低矮地被)。
  const fernCount = quality === 'low' ? 200 : 500;
  const fernGeo = crossPlanes(1.2);
  const fernTex = makeCanopyTexture(15, [0.26, 0.46, 0.20]);
  const fernMat = new THREE.MeshStandardMaterial({ map: fernTex, alphaTest: 0.4, transparent: true, side: THREE.DoubleSide, roughness: 1 });
  const ferns = new THREE.InstancedMesh(fernGeo, fernMat, fernCount);
  let fp = 0;
  for (let i = 0; fp < fernCount && i < fernCount * 4; i++) {
    const x = (noise2(i * 3.1, 5, 71) - 0.5) * WORLD.size * 0.85;
    const z = (noise2(i * 1.3, 8, 91) - 0.5) * WORLD.size * 0.85;
    const y = heightAt(x, z);
    if (y < WORLD.waterLevel + 0.2) continue;
    const s = 0.8 + noise2(i, 2, 4) * 1.4;
    m.compose(new THREE.Vector3(x, y + s * 0.6, z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), noise2(i, 4, 2) * 6), new THREE.Vector3(s, s, s));
    ferns.setMatrixAt(fp, m); fp++;
  }
  ferns.count = fp; ferns.instanceMatrix.needsUpdate = true;
  g.add(ferns);

  return g;
}

// 三片交叉的面(billboard 替代),回傳合併幾何。
function crossPlanes(size) {
  const geos = [];
  for (let k = 0; k < 3; k++) {
    const p = new THREE.PlaneGeometry(size, size);
    p.rotateY((k / 3) * Math.PI);
    geos.push(p);
  }
  return mergeGeos(geos);
}

function mergeGeos(geos) {
  // 簡易合併(同屬性)。避免依賴 BufferGeometryUtils。
  let vCount = 0, iCount = 0;
  for (const g of geos) { vCount += g.attributes.position.count; iCount += g.index ? g.index.count : 0; }
  const pos = new Float32Array(vCount * 3), uv = new Float32Array(vCount * 2), nor = new Float32Array(vCount * 3);
  const idx = new Uint32Array(iCount);
  let vo = 0, io = 0, base = 0;
  for (const g of geos) {
    const gp = g.attributes.position.array, gu = g.attributes.uv.array, gn = g.attributes.normal.array;
    pos.set(gp, vo * 3); uv.set(gu, vo * 2); nor.set(gn, vo * 3);
    const gi = g.index.array;
    for (let i = 0; i < gi.length; i++) idx[io + i] = gi[i] + base;
    vo += g.attributes.position.count; io += gi.length; base = vo;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

function buildRocks(quality) {
  const g = new THREE.Group();
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x5b5750, roughness: 1, metalness: 0 });
  const count = quality === 'low' ? 14 : 30;
  for (let i = 0; i < count; i++) {
    const x = (noise2(i * 5.2, 2, 3) - 0.5) * WORLD.size * 0.95;
    const z = (noise2(i * 2.7, 6, 8) - 0.5) * WORLD.size * 0.95;
    if (Math.hypot(x, z) < WORLD.size * 0.34) continue; // 只在外緣
    const y = heightAt(x, z);
    const s = 2 + noise2(i, 1, 1) * 8;
    const geo = new THREE.DodecahedronGeometry(s, 0);
    const p = geo.attributes.position;
    for (let j = 0; j < p.count; j++) {
      const f = 1 + (noise2(p.getX(j), p.getZ(j), i) - 0.5) * 0.5;
      p.setXYZ(j, p.getX(j) * f, p.getY(j) * f, p.getZ(j) * f);
    }
    geo.computeVertexNormals();
    const rock = new THREE.Mesh(geo, rockMat);
    rock.position.set(x, y + s * 0.3, z);
    rock.castShadow = rock.receiveShadow = true;
    g.add(rock);
  }
  return g;
}

// ---- 天空與光照:依一天的時刻(0..24)給出天色、太陽方向與光強。 ----
export function buildSky(scene) {
  const geo = new THREE.SphereGeometry(WORLD.size * 1.2, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(0x24528f) },
      bottom: { value: new THREE.Color(0xbcd3e6) },
      horizon: { value: new THREE.Color(0xdfe7ee) },
    },
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      varying vec3 vP; uniform vec3 top; uniform vec3 bottom; uniform vec3 horizon;
      void main(){
        float h = normalize(vP).y;
        vec3 c = mix(horizon, top, clamp(h*1.4,0.0,1.0));
        c = mix(c, bottom, clamp(-h*2.0,0.0,1.0));
        gl_FragColor = vec4(c,1.0);
      }`,
  });
  const dome = new THREE.Mesh(geo, mat);
  dome.name = 'sky';
  scene.add(dome);
  return dome;
}

// 依 hour 回傳光照與天色設定。供 main 每次時刻改變時套用。
export function skyStateForHour(hour) {
  // 關鍵色標:深夜 / 黎明 / 正午 / 黃昏。
  const stops = [
    { h: 0,  top: 0x05070f, bot: 0x0a0e1a, hor: 0x121a2b, sun: 0x1a2233, amb: 0x0c1120, sunI: 0.05, ambI: 0.25, elev: -0.3, azi: 0.0 },
    { h: 6,  top: 0x243a63, bot: 0xd98a5a, hor: 0xe8a06a, sun: 0xffb066, amb: 0x3a3550, sunI: 0.6,  ambI: 0.45, elev: 0.03, azi: -1.4 },
    { h: 9,  top: 0x2f6bb0, bot: 0xbcd3e6, hor: 0xdfe7ee, sun: 0xfff2d8, amb: 0x8fa6bf, sunI: 1.3,  ambI: 0.7,  elev: 0.5, azi: -0.7 },
    { h: 13, top: 0x2b7bd6, bot: 0xcfe2f0, hor: 0xeef4f8, sun: 0xfffdf5, amb: 0xa9c0d6, sunI: 1.7,  ambI: 0.85, elev: 0.95, azi: 0.1 },
    { h: 17, top: 0x2f6bb0, bot: 0xc7d6e2, hor: 0xe4d6c0, sun: 0xffe9c0, amb: 0x93a4b6, sunI: 1.2,  ambI: 0.7,  elev: 0.4, azi: 0.9 },
    { h: 19, top: 0x33345f, bot: 0xd97b4a, hor: 0xe89052, sun: 0xff8a4a, amb: 0x4a3f56, sunI: 0.7,  ambI: 0.5,  elev: 0.05, azi: 1.4 },
    { h: 21, top: 0x0c1230, bot: 0x1a2038, hor: 0x232b45, sun: 0x2a3352, amb: 0x141a30, sunI: 0.12, ambI: 0.3,  elev: -0.15, azi: 1.9 },
    { h: 24, top: 0x05070f, bot: 0x0a0e1a, hor: 0x121a2b, sun: 0x1a2233, amb: 0x0c1120, sunI: 0.05, ambI: 0.25, elev: -0.3, azi: 2.4 },
  ];
  let a = stops[0], b = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (hour >= stops[i].h && hour <= stops[i + 1].h) { a = stops[i]; b = stops[i + 1]; break; }
  }
  const t = (hour - a.h) / Math.max(0.001, b.h - a.h);
  const mixC = (x, y) => new THREE.Color(x).lerp(new THREE.Color(y), t);
  const mixN = (x, y) => lerp(x, y, t);
  const elev = mixN(a.elev, b.elev), azi = mixN(a.azi, b.azi);
  const sunDir = new THREE.Vector3(
    Math.cos(elev) * Math.sin(azi),
    Math.sin(elev),
    Math.cos(elev) * Math.cos(azi),
  );
  return {
    top: mixC(a.top, b.top), bottom: mixC(a.bot, b.bot), horizon: mixC(a.hor, b.hor),
    sunColor: mixC(a.sun, b.sun), ambColor: mixC(a.amb, b.amb),
    sunIntensity: mixN(a.sunI, b.sunI), ambIntensity: mixN(a.ambI, b.ambI),
    sunDir, isNight: elev < 0.02,
  };
}
