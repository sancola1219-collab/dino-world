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
      gltf.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material) o.material.side = THREE.FrontSide; } });
      _cache[f] = gltf;
    } catch (e) { console.warn('模型載入失敗', f, e); }
    onProgress && onProgress(++done / files.length, f);
  }
  return Object.keys(_cache).length;
}

/** 建一隻模型恐龍。回傳 Group(含 userData.parts / mixer),或 null(無對應模型或未載入)。 */
export function buildModelDino(sp) {
  const m = MODEL_MAP[sp.id]; if (!m) return null;
  const gltf = _cache[m.file]; if (!gltf) return null;
  const root = new THREE.Group();
  const pivot = new THREE.Group();
  const inst = skeletonClone(gltf.scene);

  // 正規化:依身高縮放、水平置中、腳貼 y=0。
  let box = new THREE.Box3().setFromObject(inst);
  const size = new THREE.Vector3(); box.getSize(size);
  const modelH = size.y || 1;
  const s = (sp.heightM || 2) / modelH;
  inst.scale.setScalar(s);
  box = new THREE.Box3().setFromObject(inst);
  const c = new THREE.Vector3(); box.getCenter(c);
  inst.position.set(-c.x, -box.min.y, -c.z);      // 水平置中、腳落地

  pivot.add(inst);
  pivot.rotation.y = m.rot;                        // 朝 +X
  root.add(pivot);

  // 動畫:優先走路,其次待機/第一個 clip。
  if (gltf.animations && gltf.animations.length) {
    const mixer = new THREE.AnimationMixer(inst);
    const clip = gltf.animations.find((a) => /walk|run/i.test(a.name))
      || gltf.animations.find((a) => /idle|stand/i.test(a.name))
      || gltf.animations[0];
    mixer.clipAction(clip).play();
    root.userData.mixer = mixer;
    root.userData.clips = gltf.animations;
  }
  root.userData.parts = { legs: [] };   // 腿由模型動畫驅動,行為系統不做程序化步態
  root.userData.isModel = true;
  root.userData.species = sp;
  root.traverse((o) => { o.userData.dinoRoot = root; });
  return root;
}
