import './setup';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AVATAR_TYPES, EMOJI_TYPES, IMAGE_TYPES } from '@/lib/zod/public.schema';
import { listAssets, type AssetCategory } from '@/lib/server/static-assets';

const CASES: [AssetCategory, readonly string[]][] = [
  ['avatar', AVATAR_TYPES],
  ['emoji', EMOJI_TYPES],
  ['images', IMAGE_TYPES],
];

function diskOf(url: string): string {
  return path.join(process.cwd(), 'public', decodeURIComponent(new URL(url).pathname));
}

describe('素材派生图', () => {
  for (const [category, types] of CASES) {
    it(`${category} 每个类型都下发真实存在的 thumbUrl`, async () => {
      for (const type of types) {
        const list = await listAssets(category, type, types);
        assert.ok(list.items.length > 0, `${category}/${type} 目录为空`);
        for (const item of list.items) {
          assert.ok(item.thumbUrl, `${item.file} 缺派生图：跑一次 npm run thumbs 之前别提交新素材`);
          const file = diskOf(item.thumbUrl!);
          assert.ok(existsSync(file), `thumbUrl 指向不存在的文件：${file}`);
          assert.match(item.thumbUrl!, new RegExp(`/assets/${category}-thumb/${type}/[^/]+\\.webp$`));
        }
      }
    });
  }

  it('派生图比原图小一个数量级', async () => {
    const list = await listAssets('avatar', 'boy' as (typeof AVATAR_TYPES)[number], AVATAR_TYPES);
    const [first] = list.items;
    assert.ok(first);
    const original = statSync(diskOf(first.url)).size;
    const thumb = statSync(diskOf(first.thumbUrl!)).size;
    assert.ok(thumb * 8 < original, `派生图只小了 ${(original / thumb).toFixed(1)} 倍，瘦身退化`);
  });
});
