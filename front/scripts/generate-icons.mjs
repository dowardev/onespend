// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

// Generate Linux icon set from a base PNG using nearest-neighbor scaling
// Input: public/PuntoClick.png
// Output: build/icons/{16,32,48,64,128,256,512}x{size}.png
/* eslint-disable no-undef */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcPathPrimary = path.resolve(
  __dirname,
  '..',
  'public',
  'PuntoClick.png'
);
const srcPathFallback = path.resolve(__dirname, '..', 'public', 'favicon.png');
let srcPath = srcPathPrimary;

// If PuntoClick.png doesn't exist, fall back to favicon.png if available
if (!fs.existsSync(srcPathPrimary) && fs.existsSync(srcPathFallback)) {
  console.warn(
    `PuntoClick.png not found at ${srcPathPrimary}. Using favicon.png as fallback.`
  );
  srcPath = srcPathFallback;
}

const outDir = path.resolve(__dirname, '..', 'build', 'icons');

// Linux PNG sizes
const pngSizes = [16, 32, 48, 64, 128, 256, 512];
// Windows ICO entry sizes (PNG-compressed entries)
const icoSizes = [16, 24, 32, 48, 64, 128, 256];

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

function resizeNearest(srcPng, dstW, dstH) {
  const srcW = srcPng.width;
  const srcH = srcPng.height;
  const srcData = srcPng.data;
  const dst = new PNG({ width: dstW, height: dstH });
  const dstData = dst.data;

  for (let y = 0; y < dstH; y++) {
    const sy = Math.min(srcH - 1, Math.floor((y / dstH) * srcH));
    for (let x = 0; x < dstW; x++) {
      const sx = Math.min(srcW - 1, Math.floor((x / dstW) * srcW));
      const sIdx = (sy * srcW + sx) << 2;
      const dIdx = (y * dstW + x) << 2;
      dstData[dIdx] = srcData[sIdx];
      dstData[dIdx + 1] = srcData[sIdx + 1];
      dstData[dIdx + 2] = srcData[sIdx + 2];
      dstData[dIdx + 3] = srcData[sIdx + 3];
    }
  }

  return dst;
}

function packPngToBuffer(png) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    png
      .pack()
      .on('data', c => chunks.push(c))
      .on('end', () => resolve(Buffer.concat(chunks)))
      .on('error', reject);
  });
}

// Build an .ico file using PNG-compressed entries (Windows Vista+)
async function buildIcoFromPngs(entries) {
  // entries: [{ size: number, data: Buffer }]
  const count = entries.length;

  // ICO header (6 bytes) + N directory entries (16 bytes each)
  const headerSize = 6 + 16 * count;
  const imageOffsets = Array.from({ length: count });
  let curOffset = headerSize;

  // Compute offsets
  for (let i = 0; i < count; i++) {
    imageOffsets[i] = curOffset;
    curOffset += entries[i].data.length;
  }

  const totalSize = curOffset;
  const out = Buffer.alloc(totalSize);

  // ICONDIR
  out.writeUInt16LE(0, 0); // reserved
  out.writeUInt16LE(1, 2); // type = icon
  out.writeUInt16LE(count, 4); // count

  // Directory entries
  for (let i = 0; i < count; i++) {
    const { size, data } = entries[i];
    const widthByte = size === 256 ? 0 : size; // 0 == 256
    const heightByte = size === 256 ? 0 : size;
    const entryOffset = 6 + 16 * i;

    out.writeUInt8(widthByte, entryOffset + 0); // width
    out.writeUInt8(heightByte, entryOffset + 1); // height
    out.writeUInt8(0, entryOffset + 2); // colorCount (0 if >= 8bpp)
    out.writeUInt8(0, entryOffset + 3); // reserved
    out.writeUInt16LE(1, entryOffset + 4); // planes (1 is fine)
    out.writeUInt16LE(32, entryOffset + 6); // bitCount (assume 32bpp with alpha)
    out.writeUInt32LE(data.length, entryOffset + 8); // bytesInRes
    out.writeUInt32LE(imageOffsets[i], entryOffset + 12); // imageOffset
  }

  // Image data blobs (PNG data as-is)
  for (let i = 0; i < count; i++) {
    const { data } = entries[i];
    data.copy(out, imageOffsets[i]);
  }

  return out;
}

async function generate() {
  if (!fs.existsSync(srcPath)) {
    console.error(`Base icon not found at ${srcPath}`);
    if (typeof process !== 'undefined' && process?.exit) process.exit(1);
    throw new Error('Base icon not found');
  }

  await ensureDir(outDir);

  const srcPng = await new Promise((resolve, reject) => {
    fs.createReadStream(srcPath)
      .pipe(new PNG())
      .on('parsed', function () {
        resolve(this);
      })
      .on('error', reject);
  });

  // Warn if smaller than 256x256; we'll upscale but electron-builder prefers >=256 if
  if (srcPng.width < 256 || srcPng.height < 256) {
    console.warn(
      `Warning: base icon is ${srcPng.width}x${srcPng.height}. Up-scaling to required sizes.`
    );
  }

  // 1) Generate Linux PNG sizes to disk
  for (const size of pngSizes) {
    const dst = resizeNearest(srcPng, size, size);
    const outPath = path.join(outDir, `${size}x${size}.png`);
    await new Promise((resolve, reject) => {
      dst
        .pack()
        .pipe(fs.createWriteStream(outPath))
        .on('finish', resolve)
        .on('error', reject);
    });
  }

  // 2) Generate Windows ICO (PNG-compressed entries)
  const icoPngEntries = [];
  for (const size of icoSizes) {
    const dst = resizeNearest(srcPng, size, size);
    const data = await packPngToBuffer(dst);
    icoPngEntries.push({ size, data });
  }

  const icoBuffer = await buildIcoFromPngs(icoPngEntries);
  const icoPath = path.join(outDir, 'icon.ico');
  await fs.promises.writeFile(icoPath, icoBuffer);

  console.log(`Icons generated in ${outDir}`);
  console.log(`Windows ICO generated: ${icoPath}`);
}

generate().catch(err => {
  console.error(err);
  if (typeof process !== 'undefined' && process?.exit) process.exit(1);
});
