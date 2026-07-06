// textures.js — 程序化貼圖引擎。整個 repo 沒有任何圖片檔;所有材質都在載入時用 Canvas 畫出來。
// 效能提醒(見機器教訓):彩色 emoji fillText 光柵化很貴,這裡完全不用 emoji,只用噪聲與幾何。
import * as THREE from 'three';
import { makeCanvas, fbm, noise2, rgb, lerp3, clamp } from './util.js';

function canvasTexture(canvas, repeat = 1) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** 地表:草地、泥土、岩石依高度/噪聲混合的漫反射圖 + 對應法線圖。 */
export function makeGroundTextures(seed = 7) {
  const S = 1024;
  const { canvas, ctx } = makeCanvas(S, S);
  const img = ctx.createImageData(S, S);
  const d = img.data;

  const grass = [0.28, 0.40, 0.18];
  const grassDry = [0.52, 0.50, 0.26];
  const dirt = [0.40, 0.30, 0.19];
  const rock = [0.42, 0.40, 0.37];

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S * 8, v = y / S * 8;
      const patch = fbm(u, v, 5, seed);          // 大尺度的乾濕交錯
      const grain = noise2(u * 30, v * 30, seed + 5); // 細草紋
      const rocky = fbm(u * 2 + 40, v * 2, 4, seed + 9);

      let col = lerp3(grass, grassDry, clamp(patch * 1.6 - 0.3, 0, 1));
      col = lerp3(col, dirt, clamp((patch - 0.55) * 2.2, 0, 1) * 0.6);
      if (rocky > 0.72) col = lerp3(col, rock, clamp((rocky - 0.72) * 4, 0, 1));

      const shade = 0.82 + grain * 0.32;
      const i = (y * S + x) * 4;
      d[i] = clamp(col[0] * shade, 0, 1) * 255;
      d[i + 1] = clamp(col[1] * shade, 0, 1) * 255;
      d[i + 2] = clamp(col[2] * shade, 0, 1) * 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // 由高度場推導法線圖(讓地表在光下有微起伏質感)。
  const { canvas: ncanvas, ctx: nctx } = makeCanvas(S, S);
  const nimg = nctx.createImageData(S, S);
  const nd = nimg.data;
  const H = (x, y) => fbm((x / S) * 8, (y / S) * 8, 5, seed) + noise2((x / S) * 60, (y / S) * 60, seed + 5) * 0.15;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const hl = H((x - 1 + S) % S, y), hr = H((x + 1) % S, y);
      const hu = H(x, (y - 1 + S) % S), hd = H(x, (y + 1) % S);
      const nx = (hl - hr) * 2, ny = (hu - hd) * 2, nz = 1;
      const len = Math.hypot(nx, ny, nz);
      const i = (y * S + x) * 4;
      nd[i] = (nx / len * 0.5 + 0.5) * 255;
      nd[i + 1] = (ny / len * 0.5 + 0.5) * 255;
      nd[i + 2] = (nz / len * 0.5 + 0.5) * 255;
      nd[i + 3] = 255;
    }
  }
  nctx.putImageData(nimg, 0, 0);

  const map = canvasTexture(canvas, 14);
  const normalMap = canvasTexture(ncanvas, 14);
  normalMap.colorSpace = THREE.NoColorSpace;
  return { map, normalMap };
}

/** 恐龍皮膚:底色 + 深色斑紋 + 腹部漸亮的漫反射圖。 */
export function makeSkinTexture(baseHex, accentHex, seed = 1, scaly = true) {
  const S = 512;
  const { canvas, ctx } = makeCanvas(S, S);
  const base = hexToRgb(baseHex), accent = hexToRgb(accentHex);
  const img = ctx.createImageData(S, S);
  const d = img.data;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S, v = y / S;
      const blotch = fbm(u * 6, v * 6, 4, seed);
      const stripe = Math.sin(u * Math.PI * 7 + fbm(u * 3, v * 3, 3, seed + 2) * 4);
      let col = lerp3(base, accent, clamp((blotch - 0.5) * 2, 0, 1) * 0.7);
      if (stripe > 0.6) col = lerp3(col, accent, (stripe - 0.6) * 1.5);
      // 腹部(貼圖下半)漸亮,模擬反蔭蔽(countershading)。
      const belly = clamp((v - 0.55) * 2.2, 0, 1);
      col = lerp3(col, [col[0] * 1.5 + 0.15, col[1] * 1.5 + 0.13, col[2] * 1.4 + 0.12], belly * 0.6);
      // 鱗片顆粒。
      const scale = scaly ? (noise2(u * 90, v * 90, seed + 7) * 0.28 + 0.86) : (0.9 + fbm(u * 20, v * 20, 3, seed) * 0.2);
      const i = (y * S + x) * 4;
      d[i] = clamp(col[0] * scale, 0, 1) * 255;
      d[i + 1] = clamp(col[1] * scale, 0, 1) * 255;
      d[i + 2] = clamp(col[2] * scale, 0, 1) * 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasTexture(canvas, 1);
}

/** 樹冠貼圖:綠色葉團 + alpha,用在交叉面片的樹上。 */
export function makeCanopyTexture(seed = 3, tint = [0.24, 0.42, 0.18]) {
  const S = 256;
  const { canvas, ctx } = makeCanvas(S, S);
  const img = ctx.createImageData(S, S);
  const d = img.data;
  const cx = S / 2, cy = S / 2;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (x - cx) / cx, dy = (y - cy) / cy;
      const r = Math.hypot(dx, dy);
      const blob = fbm(x / S * 5, y / S * 5, 4, seed);
      const mask = clamp((0.95 - r) * 2 + (blob - 0.5), 0, 1);
      const shade = 0.7 + blob * 0.6;
      const col = [tint[0] * shade, tint[1] * shade, tint[2] * shade];
      const i = (y * S + x) * 4;
      d[i] = clamp(col[0], 0, 1) * 255;
      d[i + 1] = clamp(col[1], 0, 1) * 255;
      d[i + 2] = clamp(col[2], 0, 1) * 255;
      d[i + 3] = mask > 0.15 ? 255 : 0;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** 樹皮貼圖。 */
export function makeBarkTexture(seed = 11) {
  const S = 256;
  const { canvas, ctx } = makeCanvas(S, S);
  const img = ctx.createImageData(S, S);
  const d = img.data;
  const bark = [0.30, 0.22, 0.15];
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const ridge = Math.abs(Math.sin(x / S * Math.PI * 10 + fbm(x / S * 2, y / S * 6, 3, seed) * 6));
      const shade = 0.55 + ridge * 0.6 + noise2(x / S * 40, y / S * 40, seed) * 0.15;
      const i = (y * S + x) * 4;
      d[i] = clamp(bark[0] * shade, 0, 1) * 255;
      d[i + 1] = clamp(bark[1] * shade, 0, 1) * 255;
      d[i + 2] = clamp(bark[2] * shade, 0, 1) * 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasTexture(canvas, 1);
}

function hexToRgb(hex) {
  return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
}

export { rgb };
