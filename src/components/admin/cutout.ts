// Turns a garment photo on a plain (white / light grey) background into a
// cut-out for the clothing rail, entirely in the admin's browser:
//
//   1. The background colour is read from the photo's edges.
//   2. Everything connected to the edges that is close to that colour becomes
//      transparent (a flood fill, so white details INSIDE the garment stay).
//   3. Edges are softened so the garment doesn't look jagged.
//   4. The image is trimmed to the garment, so the collar sits at the top
//      centre, right under the hanger.
//
// Photos that are already transparent (PNG/WebP cut-outs) are only trimmed.

export type CutoutOptions = {
  /** 4-60: how different from the background a pixel must be to count as garment. */
  tolerance: number;
  /** Also clear background-coloured patches enclosed by the garment (e.g. between arm and body). */
  clearEnclosed: boolean;
};

export type Cutout = { canvas: HTMLCanvasElement; aspect: number; hadTransparency: boolean };

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

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 255;
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

  // Already a cut-out? Then only trim it.
  let transparent = 0;
  for (let i = 3; i < px.length; i += 4 * 7) if (px[i] < 250) transparent++;
  const hadTransparency = transparent > n / 7 / 50;

  if (!hadTransparency) {
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
    const dist = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      dist[i] = Math.max(Math.abs(px[o] - bg[0]), Math.abs(px[o + 1] - bg[1]), Math.abs(px[o + 2] - bg[2]));
    }

    // 2. Flood fill from the edges through background-coloured pixels.
    //    A pixel next to (even diagonally) a garment-coloured one is not
    //    crossed, so the fill can't leak through gaps in thin, diagonal
    //    outlines into a pale garment. Those edge pixels are cleaned up after.
    const tol = opts.tolerance;
    const strong = new Uint8Array(n);
    for (let i = 0; i < n; i++) strong[i] = dist[i] > tol ? 1 : 0;
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
    while (head < tail) {
      const i = queue[head++];
      const x = i % w;
      if (x > 0) push(i - 1);
      if (x < w - 1) push(i + 1);
      if (i >= w) push(i - w);
      if (i < n - w) push(i + w);
    }
    // The background-coloured ring the fill stopped short of: clear it (2 px).
    for (let pass = 0; pass < 2; pass++) {
      const add: number[] = [];
      for (let i = 0; i < n; i++) {
        if (isBg[i] || strong[i]) continue;
        const x = i % w;
        if ((x > 0 && isBg[i - 1]) || (x < w - 1 && isBg[i + 1]) || (i >= w && isBg[i - w]) || (i < n - w && isBg[i + w])) add.push(i);
      }
      for (const i of add) isBg[i] = 1;
    }
    if (opts.clearEnclosed) {
      for (let i = 0; i < n; i++) if (dist[i] <= tol * 0.6) isBg[i] = 1;
    }

    // 3. Transparent background, soft edges next to it.
    for (let i = 0; i < n; i++) {
      const o = i * 4 + 3;
      if (isBg[i]) {
        px[o] = 0;
        continue;
      }
      const x = i % w;
      const nearBg = (x > 0 && isBg[i - 1]) || (x < w - 1 && isBg[i + 1]) || (i >= w && isBg[i - w]) || (i < n - w && isBg[i + w]);
      if (nearBg) px[o] = Math.round(255 * Math.min(1, Math.max(0.35, (dist[i] - tol) / (tol * 1.5) + 0.35)));
    }
    ctx.putImageData(data, 0, 0);
  }

  // 4. Trim to the garment.
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
  if (maxX < 0) return { canvas: src, aspect: h / w, hadTransparency };
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
  out.getContext("2d")!.drawImage(src, minX, minY, cw, ch, 0, 0, cw, ch);
  return { canvas: out, aspect: ch / cw, hadTransparency };
}

/** Encodes the cut-out as WebP (smaller) or PNG where WebP isn't supported. Both keep transparency. */
export async function cutoutFile(c: Cutout, baseName: string): Promise<File> {
  const webp = await new Promise<Blob | null>((r) => c.canvas.toBlob(r, "image/webp", 0.9));
  const blob = webp && webp.type === "image/webp" ? webp : await new Promise<Blob | null>((r) => c.canvas.toBlob(r, "image/png"));
  if (!blob) throw new Error("Could not encode the image");
  const ext = blob.type === "image/webp" ? "webp" : "png";
  return new File([blob], `${baseName}-rack.${ext}`, { type: blob.type });
}
