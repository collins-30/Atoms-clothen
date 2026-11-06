// Turns a garment photo on a plain (white / light grey) background into a
// clean cut-out for the clothing rail, entirely in the admin's browser:
//
//   1. The background colour is read from the photo's edges.
//   2. A flood fill from the edges removes the background (it can't leak
//      through thin outlines into pale garments).
//   3. Optional: soft shadows on the background are removed too.
//   4. Specks and small leftover islands are dropped; the outline is smoothed.
//   5. Edge pixels are "decontaminated": the background colour that was mixed
//      into them is taken out and they get a matching transparency, so there
//      is no white fringe around dark garments.
//   6. The image is trimmed to the garment, and the neckline / shoulders are
//      measured so the hanger can be fitted (see detectHang).
//
// Photos that are already transparent (PNG/WebP cut-outs) are only cleaned
// of specks, trimmed and measured.

export type CutoutOptions = {
  /** 4-60: how different from the background a pixel must be to count as garment. */
  tolerance: number;
  /** Also clear background-coloured patches enclosed by the garment (e.g. between arm and body). */
  clearEnclosed: boolean;
  /** Also remove soft grey shadows cast on the background. */
  removeShadow: boolean;
};

import type { Hang } from "@/lib/media";
export type { Hang };

export type Cutout = { canvas: HTMLCanvasElement; aspect: number; hadTransparency: boolean; hang: Hang };

const MAX_SIDE = 1400;

export async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    // decode() has finished, the pixels are in memory
    URL.revokeObjectURL(url);
  }
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 255;
}

/**
 * A starting tolerance for this photo: just above how much the background
 * itself varies (JPEG noise, uneven light). A clean studio background gets a
 * low value, which keeps white and pale garments intact.
 */
export function suggestTolerance(img: HTMLImageElement): number {
  const scale = Math.min(1, 600 / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  const border: [number, number, number][] = [];
  const at = (x: number, y: number) => {
    const o = (y * w + x) * 4;
    border.push([px[o], px[o + 1], px[o + 2]]);
  };
  for (let x = 0; x < w; x += 2) {
    at(x, 0);
    at(x, 1);
    at(x, h - 1);
    at(x, h - 2);
  }
  for (let y = 0; y < h; y += 2) {
    at(0, y);
    at(1, y);
    at(w - 1, y);
    at(w - 2, y);
  }
  const bg = [0, 1, 2].map((k) => median(border.map((b) => b[k])));
  const d = border.map((b) => Math.max(Math.abs(b[0] - bg[0]), Math.abs(b[1] - bg[1]), Math.abs(b[2] - bg[2]))).sort((a, b) => a - b);
  const noise = d[Math.floor(d.length * 0.9)] ?? 0;
  return Math.round(Math.min(40, Math.max(5, noise * 1.5 + 3)));
}

/** 4-connected neighbours of pixel i in a w×h grid. */
function forNeighbours(i: number, w: number, n: number, fn: (j: number) => void) {
  const x = i % w;
  if (x > 0) fn(i - 1);
  if (x < w - 1) fn(i + 1);
  if (i >= w) fn(i - w);
  if (i < n - w) fn(i + w);
}

/** Keeps the largest connected shape (and any piece at least 1.5% of its size); returns the cleaned mask. */
function dropSpecks(fg: Uint8Array, w: number, h: number): Uint8Array {
  const n = w * h;
  const label = new Int32Array(n).fill(-1);
  const sizes: number[] = [];
  const queue = new Int32Array(n);
  for (let s = 0; s < n; s++) {
    if (!fg[s] || label[s] >= 0) continue;
    const id = sizes.length;
    let head = 0;
    let tail = 0;
    queue[tail++] = s;
    label[s] = id;
    while (head < tail) {
      const i = queue[head++];
      forNeighbours(i, w, n, (j) => {
        if (fg[j] && label[j] < 0) {
          label[j] = id;
          queue[tail++] = j;
        }
      });
    }
    sizes.push(tail);
  }
  if (sizes.length <= 1) return fg;
  const biggest = Math.max(...sizes);
  const keep = sizes.map((s) => s >= biggest * 0.015);
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (fg[i] && keep[label[i]]) out[i] = 1;
  return out;
}

/** One pass of a 3×3 majority filter: removes one-pixel spurs and notches from the outline. */
function smooth(fg: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(fg);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      let c = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) c += fg[i + dy * w + dx];
      out[i] = c >= 5 ? 1 : 0;
    }
  }
  return out;
}

/**
 * Measures where a hanger would sit in a trimmed cut-out: the centre of the
 * neckline (its topmost part), and the shoulder line a little below where the
 * garment spreads out from the collar. Works for front and back views; for
 * trousers / skirts it sits the bar just inside the waistband.
 */
export function detectHang(alpha: Uint8ClampedArray | Uint8Array, w: number, h: number, stride = 4, offset = 3): Hang {
  const left = new Int32Array(h).fill(-1);
  const right = new Int32Array(h).fill(-1);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alpha[(y * w + x) * stride + offset] > 128) {
        if (left[y] < 0) left[y] = x;
        right[y] = x;
      }
    }
  }
  const width = (y: number) => (left[y] < 0 ? 0 : right[y] - left[y] + 1);
  let top = 0;
  while (top < h - 1 && width(top) < 2) top++;
  const upper = Math.max(top + 1, Math.round(top + h * 0.45));
  let maxW = 1;
  for (let y = top; y < upper && y < h; y++) maxW = Math.max(maxW, width(y));

  // Neckline centre: middle of the garment across its top few rows.
  const neckRows = Math.max(3, Math.round(w * 0.04));
  let sum = 0;
  let count = 0;
  for (let y = top; y < Math.min(h, top + neckRows); y++) {
    if (width(y) > 0) {
      sum += (left[y] + right[y]) / 2;
      count++;
    }
  }
  const neckX = count ? sum / count : w / 2;

  // Shoulders: first row where the garment is clearly wider than the collar,
  // then a little lower so the bar is hidden inside the shoulders.
  let shoulderTop = top;
  while (shoulderTop < upper && width(shoulderTop) < maxW * 0.45) shoulderTop++;
  const barRow = Math.min(h - 1, Math.round(shoulderTop + w * 0.09));
  const barW = Math.min(0.82, Math.max(0.3, (width(barRow) * 0.8) / w));

  return {
    x: Math.min(0.8, Math.max(0.2, neckX / w)),
    y: Math.min(1.2, Math.max(0.03, barRow / w)),
    w: barW,
  };
}

export function makeCutout(img: HTMLImageElement, opts: CutoutOptions): Cutout {
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const src = document.createElement("canvas");
  src.width = w;
  src.height = h;
  const ctx = src.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  const n = w * h;

  // Already a cut-out? Then only clean specks and trim it.
  let transparent = 0;
  for (let i = 3; i < px.length; i += 4 * 7) if (px[i] < 250) transparent++;
  const hadTransparency = transparent > n / 7 / 50;

  if (hadTransparency) {
    const fg = new Uint8Array(n);
    for (let i = 0; i < n; i++) fg[i] = px[i * 4 + 3] > 24 ? 1 : 0;
    const keep = dropSpecks(fg, w, h);
    for (let i = 0; i < n; i++) if (!keep[i]) px[i * 4 + 3] = 0;
    ctx.putImageData(data, 0, 0);
  } else {
    // 1. Background colour = median of the border pixels.
    const rs: number[] = [];
    const gs: number[] = [];
    const bs: number[] = [];
    const sample = (x: number, y: number) => {
      const o = (y * w + x) * 4;
      rs.push(px[o]);
      gs.push(px[o + 1]);
      bs.push(px[o + 2]);
    };
    for (let x = 0; x < w; x += 3) {
      sample(x, 0);
      sample(x, h - 1);
    }
    for (let y = 0; y < h; y += 3) {
      sample(0, y);
      sample(w - 1, y);
    }
    const bg = [median(rs), median(gs), median(bs)];
    const bgL = (bg[0] + bg[1] + bg[2]) / 3;
    const dist = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      dist[i] = Math.max(Math.abs(px[o] - bg[0]), Math.abs(px[o + 1] - bg[1]), Math.abs(px[o + 2] - bg[2]));
    }

    // Soft shadow: grey (no colour of its own), darker than the background but not dark.
    const shadowish = (i: number) => {
      if (!opts.removeShadow) return false;
      const o = i * 4;
      const r = px[o];
      const g = px[o + 1];
      const b = px[o + 2];
      const l = (r + g + b) / 3;
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      const bgChroma = Math.max(...bg) - Math.min(...bg);
      return l < bgL && l > bgL * 0.62 && chroma <= bgChroma + 10;
    };

    // 2. Flood fill from the edges. A pixel next to (even diagonally) a
    //    garment-coloured one is not crossed, so the fill can't leak through
    //    gaps in thin, diagonal outlines into a pale garment.
    const tol = opts.tolerance;
    const strong = new Uint8Array(n);
    for (let i = 0; i < n; i++) strong[i] = dist[i] > tol && !shadowish(i) ? 1 : 0;
    const passable = new Uint8Array(n);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (strong[i]) continue;
        let ok = 1;
        for (let dy = -1; dy <= 1 && ok; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx >= 0 && xx < w && strong[yy * w + xx]) {
              ok = 0;
              break;
            }
          }
        }
        passable[i] = ok;
      }
    }
    const isBg = new Uint8Array(n);
    const queue = new Int32Array(n);
    let head = 0;
    let tail = 0;
    const push = (i: number) => {
      if (!isBg[i] && passable[i]) {
        isBg[i] = 1;
        queue[tail++] = i;
      }
    };
    for (let x = 0; x < w; x++) {
      push(x);
      push((h - 1) * w + x);
    }
    for (let y = 0; y < h; y++) {
      push(y * w);
      push(y * w + w - 1);
    }
    while (head < tail) forNeighbours(queue[head++], w, n, push);

    // The background-coloured ring the fill stopped short of: clear it (2 px).
    for (let pass = 0; pass < 2; pass++) {
      const add: number[] = [];
      for (let i = 0; i < n; i++) {
        if (isBg[i] || strong[i]) continue;
        let touch = false;
        forNeighbours(i, w, n, (j) => {
          if (isBg[j]) touch = true;
        });
        if (touch) add.push(i);
      }
      for (const i of add) isBg[i] = 1;
    }
    if (opts.clearEnclosed) {
      for (let i = 0; i < n; i++) if (dist[i] <= tol * 0.6) isBg[i] = 1;
    }

    // 4. Drop specks, smooth the outline.
    let fg: Uint8Array = new Uint8Array(n);
    for (let i = 0; i < n; i++) fg[i] = isBg[i] ? 0 : 1;
    fg = dropSpecks(smooth(fg, w, h), w, h);

    // 5. Edge band (within 2 px of the background): estimate how much of each
    //    pixel is garment, and take the background colour back out of it.
    const edge = new Uint8Array(n); // 1 = touches background, 2 = one further in
    for (let i = 0; i < n; i++) {
      if (!fg[i]) continue;
      forNeighbours(i, w, n, (j) => {
        if (!fg[j]) edge[i] = 1;
      });
    }
    for (let i = 0; i < n; i++) {
      if (!fg[i] || edge[i]) continue;
      forNeighbours(i, w, n, (j) => {
        if (edge[j] === 1) edge[i] = 2;
      });
    }
    const R = 4;
    const outA = new Uint8ClampedArray(n);
    const outRGB = new Uint8ClampedArray(n * 3);
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      outRGB[i * 3] = px[o];
      outRGB[i * 3 + 1] = px[o + 1];
      outRGB[i * 3 + 2] = px[o + 2];
      outA[i] = fg[i] ? 255 : 0;
    }
    for (let i = 0; i < n; i++) {
      if (!edge[i]) continue;
      const x = i % w;
      const y = (i - x) / w;
      // Local garment colour (solid pixels nearby) and local background colour.
      let fr = 0, fgc = 0, fb = 0, fc = 0;
      let br = 0, bgc = 0, bb = 0, bc = 0;
      for (let dy = -R; dy <= R; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -R; dx <= R; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const j = yy * w + xx;
          const q = j * 4;
          if (fg[j] && !edge[j]) {
            fr += px[q];
            fgc += px[q + 1];
            fb += px[q + 2];
            fc++;
          } else if (!fg[j]) {
            br += px[q];
            bgc += px[q + 1];
            bb += px[q + 2];
            bc++;
          }
        }
      }
      const B = bc ? [br / bc, bgc / bc, bb / bc] : bg;
      if (!fc) {
        // A thin part with no solid garment nearby: keep the colour, soften slightly.
        outA[i] = edge[i] === 1 ? 200 : 255;
        continue;
      }
      const F = [fr / fc, fgc / fc, fb / fc];
      const o = i * 4;
      const C = [px[o], px[o + 1], px[o + 2]];
      const fbx = F[0] - B[0], fby = F[1] - B[1], fbz = F[2] - B[2];
      const len2 = fbx * fbx + fby * fby + fbz * fbz;
      if (len2 < 30 * 30) {
        // Garment about the same colour as the background (white on white):
        // matting can't tell them apart, so keep the pixel solid.
        continue;
      }
      let a = ((C[0] - B[0]) * fbx + (C[1] - B[1]) * fby + (C[2] - B[2]) * fbz) / len2;
      a = Math.min(1, Math.max(0, a));
      if (edge[i] === 2) a = Math.max(a, 0.85);
      outA[i] = Math.round(a * 255);
      if (a > 0.04) {
        for (let k = 0; k < 3; k++) outRGB[i * 3 + k] = (C[k] - (1 - a) * B[k]) / a;
      }
    }
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      px[o] = outRGB[i * 3];
      px[o + 1] = outRGB[i * 3 + 1];
      px[o + 2] = outRGB[i * 3 + 2];
      px[o + 3] = outA[i];
    }
    ctx.putImageData(data, 0, 0);
  }

  // 6. Trim to the garment.
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] > 24) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { canvas: src, aspect: h / w, hadTransparency, hang: { x: 0.5, y: 0.135, w: 0.52 } };
  const pad = 2;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  const octx = out.getContext("2d", { willReadFrequently: true })!;
  octx.drawImage(src, minX, minY, cw, ch, 0, 0, cw, ch);
  const hang = detectHang(octx.getImageData(0, 0, cw, ch).data, cw, ch);
  return { canvas: out, aspect: ch / cw, hadTransparency, hang };
}

/** Encodes the cut-out as WebP (smaller) or PNG where WebP isn't supported. Both keep transparency. */
export async function cutoutFile(c: Cutout, baseName: string): Promise<File> {
  const webp = await new Promise<Blob | null>((r) => c.canvas.toBlob(r, "image/webp", 0.92));
  const blob = webp && webp.type === "image/webp" ? webp : await new Promise<Blob | null>((r) => c.canvas.toBlob(r, "image/png"));
  if (!blob) throw new Error("Could not encode the image");
  const ext = blob.type === "image/webp" ? "webp" : "png";
  return new File([blob], `${baseName}-rack.${ext}`, { type: blob.type });
}
