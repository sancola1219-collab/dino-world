// models.js — 載入真實 3D 恐龍模型(Quaternius CC0,glTF/GLB)取代程序化恐龍。
// 覆蓋範圍:主要恐龍(暴龍/異特龍/三角龍/劍龍/蜥腳類/馳龍類/副櫛龍);其餘生物仍用程序化 dino.js。
//
// 三個踩過的坑(改這裡前必讀):
// 1) 這些模型的幾何存在極小空間、靠 Armature 300× 骨架放大 → `Box3.setFromObject` 量到的高度是錯的。
//    必須用 **skeleton.bones 的世界座標** 量(見 boneBox),否則縮放係數會把恐龍壓成微米級=隱形。
// 2) **不要縮放骨骼階層內的節點**(inst),只縮放最外層 root(剛體變換,不破壞 skinning)。
// 3) **不要掛 AnimationMixer**:Quaternius 的動畫剪輯會動到骨架縮放,一播就把 clone+縮放後的
//    skinned mesh 壓崩。改用靜態 `skeleton.pose()`(綁定姿勢)。
// 朝向:各 GLB 原生前向不同(多數 -X、三角龍 +Z),rot 由「頭骨→尾骨」向量實測校正。
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';

// species id → { file: GLB 檔名, rot: 讓模型朝 +X(本專案前向)的 Y 旋轉 }
// 一個模型可對應多個相近物種(異特龍借暴龍、始盜/腔骨借馳龍、蜥腳類共用)。
// rot 由「頭骨→尾骨」向量實測校正(見 docs/HANDOFF):多數模型原生朝 -X,三角龍朝 +Z。
const R = Math.PI / 2;
const MODEL_MAP = {
  trex: { file: 'trex', rot: R },
  allo: { file: 'trex', rot: R },
  trike: { file: 'trike', rot: 0 },
  stego: { file: 'stego', rot: R },
  brachio: { file: 'apato', rot: R },
  diplo: { file: 'apato', rot: R },
  plateo: { file: 'apato', rot: R },
  velo: { file: 'velo', rot: R },
  eoraptor: { file: 'velo', rot: R },
  coelo: { file: 'velo', rot: R },
  para: { file: 'para', rot: R },
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

  // 量原生尺寸(用骨骼世界座標;skinned mesh 的 Box3.setFromObject 會量錯)。
  const box = boneBox(root);
  const size = box.getSize(new THREE.Vector3());
  const H0 = size.y || 1;

  // 置中 + 落地放在內層(不縮放骨骼階層);朝向放 pivot。
  const c = box.getCenter(new THREE.Vector3());
  inst.position.set(-c.x, -box.min.y, -c.z);
  pivot.rotation.y = m.rot;                        // 朝 +X

  // **只縮放最外層 root**:縮放整個已綁定的子樹是剛體變換,不會破壞 skinning。
  root.scale.setScalar((sp.heightM || 2) / H0);
  root.userData.modelNativeH = H0;
  root.userData.parts = { legs: [] };
  root.userData.isModel = true;
  root.userData.species = sp;
  root.traverse((o) => { if (o.isMesh) o.frustumCulled = false; o.userData.dinoRoot = root; });
  return root;
}
