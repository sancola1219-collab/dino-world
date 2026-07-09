// models.js — 載入真實 3D 恐龍模型(Quaternius CC0,glTF/GLB)取代程序化恐龍。
// 覆蓋範圍:主要恐龍(暴龍/異特龍/三角龍/劍龍/蜥腳類/馳龍類/副櫛龍);其餘生物仍用程序化 dino.js。
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';

// species id → { file: GLB 檔名, rot: 讓模型朝 +X(本專案前向)的 Y 旋轉 }
// 一個模型可對應多個相近物種(異特龍借暴龍、始盜/腔骨借馳龍、蜥腳類共用)。
const MODEL_MAP = {
  trex: { file: 'trex', rot: -Math.PI / 2 },
  allo: { file: 'trex', rot: -Math.PI / 2 },
  trike: { file: 'trike', rot: -Math.PI / 2 },
  stego: { file: 'stego', rot: -Math.PI / 2 },
  brachio: { file: 'apato', rot: -Math.PI / 2 },
  diplo: { file: 'apato', rot: -Math.PI / 2 },
  plateo: { file: 'apato', rot: -Math.PI / 2 },
  velo: { file: 'velo', rot: -Math.PI / 2 },
  eoraptor: { file: 'velo', rot: -Math.PI / 2 },
  coelo: { file: 'velo', rot: -Math.PI / 2 },
  para: { file: 'para', rot: -Math.PI / 2 },
};

const _cache = {};   // file → gltf

export function hasModel(id) { return !!MODEL_MAP[id]; }

/** 載入所有需要的 GLB(每個檔只載一次)。onProgress(done01, name)。 */
export async function loadModels(onProgress) {
  const loader = new GLTFLoader();
  const files = [...new Set(Object.values(MODEL_MAP).map((m) => m.file))];
  let done = 0;
  for (const f of files) {
    try {
      const gltf = await loader.loadAsync(`./vendor/models/${f}.glb`);
      gltf.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
      _cache[f] = gltf;
    } catch (e) { console.warn('模型載入失敗', f, e); }
    onProgress && onProgress(++done / files.length, f);
  }
  return Object.keys(_cache).length;
}

const _v = new THREE.Vector3();
// 用「骨骼世界座標」量 skinned 模型的真實包圍盒。
// (為何:Quaternius 模型幾何存在極小空間、靠 300× 骨架放大;直接 Box3.setFromObject 用幾何 bbox 會量錯高度。)
function boneBox(inst) {
  const box = new THREE.Box3();
  inst.updateWorldMatrix(true, true);
  inst.traverse((o) => { if (o.isSkinnedMesh && o.skeleton) o.skeleton.bones.forEach((b) => { b.getWorldPosition(_v); box.expandByPoint(_v); }); });
  return box;
}

/** 建一隻模型恐龍(靜態綁定姿勢;不掛 AnimationMixer——動畫會讓 clone+縮放後的 skinned mesh 崩塌)。 */
export function buildModelDino(sp) {
  const m = MODEL_MAP[sp.id]; if (!m) return null;
  const gltf = _cache[m.file]; if (!gltf) return null;
  const root = new THREE.Group();
  const pivot = new THREE.Group();
  const inst = skeletonClone(gltf.scene);
  root.add(pivot); pivot.add(inst);
  inst.traverse((o) => { if (o.isSkinnedMesh && o.skeleton) o.skeleton.pose(); });   // 確保回綁定姿勢

  // 依骨骼高度縮放到 heightM,再置中落地。
  const box = boneBox(inst);
  const H0 = box.getSize(_v).y || 1;
  inst.scale.setScalar((sp.heightM || 2) / H0);
  const box2 = boneBox(inst);
  const c = box2.getCenter(new THREE.Vector3());
  inst.position.x -= c.x; inst.position.z -= c.z; inst.position.y -= box2.min.y;

  pivot.rotation.y = m.rot;                        // 朝 +X
  root.userData.parts = { legs: [] };
  root.userData.isModel = true;
  root.userData.species = sp;
  root.traverse((o) => { if (o.isMesh) o.frustumCulled = false; o.userData.dinoRoot = root; });
  return root;
}
