/** 静态资源目录索引：emoji / avatar / images 三个接口共用一份扫目录逻辑 */
import 'server-only';

import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

import { siteUrl } from '@/env';
import type { StaticAssetItem, StaticAssetList } from '@/types';
import { InternalError } from './errors';

export type AssetCategory = 'emoji' | 'avatar' | 'images';

export const ASSET_CACHE_TTL_MS = 10 * 60_000;

const CATEGORY_DIR: Record<AssetCategory, string> = { emoji: 'emoji', avatar: 'avatar', images: 'images' };
/** 只进错误文案 */
const CATEGORY_LABEL: Record<AssetCategory, string> = { emoji: '表情包', avatar: '头像', images: '图片' };

/** 白名单扩展名，免得目录里的 .DS_Store 之类污染列表 */
const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

function assetUrl(category: AssetCategory, type: string, file: string): string {
  const origin = siteUrl().replace(/\/$/, '');
  return `${origin}/assets/${CATEGORY_DIR[category]}/${encodeURIComponent(type)}/${encodeURIComponent(file)}`;
}

async function scanType(category: AssetCategory, type: string): Promise<StaticAssetItem[]> {
  const dir = path.join(process.cwd(), 'public', 'assets', CATEGORY_DIR[category], type);
  // 目录读不到时得到空列表，由调用侧统一转成 500
  const names = await readdir(dir).catch(() => [] as string[]);

  const items: StaticAssetItem[] = [];
  for (const name of names.sort()) {
    const ext = path.extname(name).slice(1).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) continue;
    const entry = await stat(path.join(dir, name)).catch(() => null);
    if (!entry?.isFile()) continue;
    items.push({
      id: name.replace(/\.[a-z0-9]+$/i, ''),
      file: name,
      format: ext,
      size: entry.size,
      url: assetUrl(category, type, name),
    });
  }
  return items;
}

interface CacheEntry {
  at: number;
  items: StaticAssetItem[];
}

/** 缓存挂 globalThis：Next 按 route 分包，模块级变量每个 chunk 各扫一遍 */
const globalStore = globalThis as typeof globalThis & {
  __decamoreAssetIndex?: Record<string, CacheEntry>;
};

const cache = (globalStore.__decamoreAssetIndex ??= {});
const inflight = new Map<string, Promise<StaticAssetItem[]>>();

/** allowedTypes 是 schema 之外的兜底，防止绕过枚举读到别的目录；并发首请求合并成一次磁盘扫描 */
export async function listAssets<TType extends string>(
  category: AssetCategory,
  type: TType,
  allowedTypes: readonly TType[],
): Promise<StaticAssetList<TType>> {
  if (!allowedTypes.includes(type)) {
    throw new InternalError(
      `${CATEGORY_LABEL[category]}类型不支持`,
      `public/assets/${CATEGORY_DIR[category]} 下没有 ${type} 这一类，可用取值：${allowedTypes.join(' / ')}`,
    );
  }

  const key = `${CATEGORY_DIR[category]}/${type}`;
  const hit = cache[key];
  if (hit && Date.now() - hit.at < ASSET_CACHE_TTL_MS) {
    return { type, total: hit.items.length, cached: true, items: hit.items };
  }

  let pending = inflight.get(key);
  if (!pending) {
    pending = scanType(category, type).finally(() => inflight.delete(key));
    inflight.set(key, pending);
  }
  const items = await pending;

  // 目录缺失或没有可用文件都算部署问题
  if (items.length === 0) {
    throw new InternalError(
      `${CATEGORY_LABEL[category]}资源不可用`,
      `public/assets/${CATEGORY_DIR[category]}/${type} 目录为空或不存在，请确认资源已放进仓库`,
    );
  }

  cache[key] = { at: Date.now(), items };
  return { type, total: items.length, cached: false, items };
}
