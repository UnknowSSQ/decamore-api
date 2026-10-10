import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

// sharp 是 Next 的可选依赖，这里只借用它做一次性派生；产物是静态文件，运行时不依赖 sharp
const require = createRequire(import.meta.url);
const sharp = require('sharp');

/**
 * 宽度按版式定档：avatar 是 6 格 112px 小图，emoji / images 是铺满卡片的单图，
 * 224px 用在后者上会明显发虚，所以大版图给 448（约 2x 卡片宽）。
 *
 * wallpaper 的 640 是仓库里既有 wallpaper-thumb 的实际尺寸，别顺手改：
 * wallpaper.ts 把「缩略图存在」当作进池子的硬条件（缺 thumb 的原图直接不进列表），
 * 所以这一条必须在 TARGETS 里——漏掉的话改档位只会让壁纸静默停在旧尺寸。
 * types 限定 desktop / mobile：bing 是运行时镜像目录，没人读它的派生图。
 */
const TARGETS = [
  { src: 'avatar', dst: 'avatar-thumb', width: 224 },
  { src: 'emoji', dst: 'emoji-thumb', width: 448 },
  { src: 'images', dst: 'images-thumb', width: 448 },
  { src: 'wallpaper', dst: 'wallpaper-thumb', width: 640, types: ['desktop', 'mobile'] },
];

const QUALITY = 72;
const force = process.argv.includes('--force');

let made = 0;
let bytes = 0;
for (const { src, dst, width, types } of TARGETS) {
  const root = path.join('public', 'assets', src);
  const dirs = (await readdir(root, { withFileTypes: true })).filter((e) => e.isDirectory());
  for (const type of types ? dirs.filter((e) => types.includes(e.name)) : dirs) {
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
