import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

// sharp 是 Next 的可选依赖，这里只借用它做一次性派生；产物是静态文件，运行时不依赖 sharp
const require = createRequire(import.meta.url);
const sharp = require('sharp');

/**
 * 宽度按 plaza 版式定档：avatar 是 6 格 112px 小图，emoji / images 是铺满卡片的单图，
 * 224px 用在后者上会明显发虚，所以大版图给 448（约 2x 卡片宽）。
 */
const TARGETS = [
  { src: 'avatar', dst: 'avatar-thumb', width: 224 },
  { src: 'emoji', dst: 'emoji-thumb', width: 448 },
  { src: 'images', dst: 'images-thumb', width: 448 },
];

const QUALITY = 72;
const force = process.argv.includes('--force');

let made = 0;
let bytes = 0;
for (const { src, dst, width } of TARGETS) {
  const root = path.join('public', 'assets', src);
  for (const type of (await readdir(root, { withFileTypes: true })).filter((e) => e.isDirectory())) {
    const typeDir = path.join(root, type.name);
    const outDir = path.join('public', 'assets', dst, type.name);
    await mkdir(outDir, { recursive: true });
    for (const file of (await readdir(typeDir)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f))) {
      const out = path.join(outDir, `${file.replace(/\.[a-z0-9]+$/i, '')}.webp`);
      if (!force) {
        const existing = await stat(out).catch(() => null);
        // 尺寸不符的旧产物要重做，否则改档位会被静默跳过
        if (existing?.isFile()) {
          const meta = await sharp(out).metadata();
          if (meta.width === width) continue;
        }
      }
      const buf = await sharp(path.join(typeDir, file)).resize({ width }).webp({ quality: QUALITY }).toBuffer();
      await writeFile(out, buf);
      made += 1;
      bytes += buf.length;
    }
  }
  console.log(`${src} -> ${dst} @${width}px 完成`);
}
console.log(`生成 ${made} 张，合计 ${(bytes / 1024 / 1024).toFixed(2)} MB`);
