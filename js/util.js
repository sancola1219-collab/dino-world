// util.js — 種子亂數、值噪聲(value noise)、fBm、Canvas 貼圖輔助。
// 整個專案不載入任何外部資產:所有貼圖都在這些工具上程序化生成。

/** 可重現的種子亂數(mulberry32)。同一種子 → 同一個世界。 */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- 2D 值噪聲 ---------- */

function hash2(ix, iz, seed) {
  let h = (ix * 374761393 + iz * 668265263 + seed * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const smooth = (t) => t * t * (3 - 2 * t);

/** 單層值噪聲,回傳 0..1。 */
export function noise2(x, z, seed = 0) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const a = hash2(ix, iz, seed), b = hash2(ix + 1, iz, seed);
  const c = hash2(ix, iz + 1, seed), d = hash2(ix + 1, iz + 1, seed);
  const u = smooth(fx), v = smooth(fz);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** 分形布朗運動(疊噪聲),回傳約 0..1。 */
export function fbm(x, z, octaves = 4, seed = 0) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise2(x * freq, z * freq, seed + i * 101);
    norm += amp;
    amp *= 0.5; freq *= 2;
  }
  return sum / norm;
}

/* ---------- Canvas 貼圖輔助 ---------- */

/** 建一張離屏 canvas,回傳 {canvas, ctx}。 */
export function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  return { canvas, ctx: canvas.getContext('2d') };
}

/** 把 0..1 的三元組轉成 css 色字串。 */
export function rgb(r, g, b) {
  return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
}

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const lerp = (a, b, t) => a + (b - a) * t;

/** 顏色線性內插:c0/c1 為 [r,g,b](0..1)。 */
export function lerp3(c0, c1, t) {
  return [lerp(c0[0], c1[0], t), lerp(c0[1], c1[1], t), lerp(c0[2], c1[2], t)];
}
