/** 壁纸：pc / mobile 扫站内目录，bing 取必应当日图并把原图与缩略图镜像进 public/assets/wallpaper/bing */
import 'server-only';

import { access, mkdir, open, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { siteUrl } from '@/env';
import { UPSTREAM_TIMEOUT_MS } from './upstream';
import { createBoardCache } from './board-cache';
import { ERROR_CODE, type WallpaperItem, type WallpaperType } from '@/types';
import { ApiError } from './errors';

const PUBLIC_ROOT = path.join(process.cwd(), 'public');
const ASSET_ROOT = path.join(PUBLIC_ROOT, 'assets');
/** 对外 type 与站内目录名不同名：pc 对应 desktop/ */
const LOCAL_DIR: Record<'pc' | 'mobile', 'desktop' | 'mobile'> = { pc: 'desktop', mobile: 'mobile' };
const BING_DIR = path.join(ASSET_ROOT, 'wallpaper', 'bing');
/** 实测只有这两个后缀变体返 200，_480x270.jpg 与 &w= 查询串形式都是 404 */
const BING_FULL_SUFFIX = '_1920x1080.jpg';
const BING_THUMB_SUFFIX = '_640x480.jpg';
const BING_FEED_URL = 'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN';
const BING_TTL_MS = 60 * 60 * 1000;
/** 只读文件头解析尺寸：跳过 EXIF / ICC 段后 SOF 一般落在前 512 KB 内 */
/** 只读文件头取宽高：PNG 尺寸在前 24 字节、JPEG 的 SOF 极少落在几十 KB 之后，读不出就回 null */
const HEADER_BYTES = 64 * 1024;
const BING_UNAVAILABLE = '必应壁纸暂时取不到';

interface BingFeed {
  urlbase?: string;
  title?: string;
  copyright?: string;
  startdate?: string;
}

function unavailable(description: string): ApiError {
  return new ApiError(503, ERROR_CODE.SERVICE_UNAVAILABLE, BING_UNAVAILABLE, { description });
}

/** 站内绝对路径 → 对外绝对 URL */
function assetUrl(absFile: string): string {
  const rel = path.relative(PUBLIC_ROOT, absFile).split(path.sep).join('/');
  return `${siteUrl().replace(/\/$/, '')}/${rel}`;
}

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

/** JPEG / PNG 头部尺寸解析；读不出时返回 null，不猜分辨率 */
function parseDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length > 24 && buffer.subarray(1, 4).toString('latin1') === 'PNG') {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer.length < 12 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;

  for (let i = 2; i + 9 < buffer.length; ) {
    if (buffer[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buffer[i + 1] as number;
    // 独立标记（无长度段）与填充字节
    if (marker === 0x00 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) return { height: buffer.readUInt16BE(i + 5), width: buffer.readUInt16BE(i + 7) };
    // 进了压缩数据段就没头可读，别再往后扫
    if (marker === 0xda) return null;
    i += 2 + buffer.readUInt16BE(i + 2);
  }
  return null;
}

async function readDimensions(file: string): Promise<{ width: number; height: number } | null> {
  let handle;
  try {
    handle = await open(file, 'r');
    const buffer = Buffer.alloc(HEADER_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, HEADER_BYTES, 0);
    return parseDimensions(buffer.subarray(0, bytesRead));
  } catch {
    return null;
  } finally {
    await handle?.close();
  }
}

/** urlbase 形如 /th?id=OHR.MayotteOctopus_ZH-CN2837659998，取出用于站内文件名 */
function bingImageId(urlbase: string): string {
  const raw = /(?:^|[?&])id=([^&]+)/.exec(urlbase)?.[1] ?? '';
  // 白名单校验：文件名只认字母数字与 . _ -，且首字符必须是字母数字（挡掉 ../ 之类）
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(raw)) {
    throw unavailable(`HPImageArchive 返回的图片 id 不符合预期：${raw || '(空)'}`);
  }
  return raw;
}

/** 20261007 → 2026-10-07 */
function bingDate(startdate?: string): string | null {
  return startdate && /^\d{8}$/.test(startdate)
    ? `${startdate.slice(0, 4)}-${startdate.slice(4, 6)}-${startdate.slice(6, 8)}`
    : null;
}

/** 下载并落盘；已存在则直接复用。失败返回 false，调用方回落到上游直链 */
async function mirror(remote: string, target: string): Promise<boolean> {
  if (await exists(target)) return true;
  try {
    // 6 秒：镜像失败会回落到上游直链，不值得为落盘把整条请求顶到客户端 15 秒预算之外
    const res = await fetch(remote, { redirect: 'follow', signal: AbortSignal.timeout(6_000) });
    if (!res.ok) return false;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.byteLength < 1024) return false;
    await mkdir(path.dirname(target), { recursive: true });
    // 先写带 pid 的临时文件再 rename，避免并发写出半个文件
    const tmp = `${target}.${process.pid}.tmp`;
    await writeFile(tmp, bytes);
    await rename(tmp, target);
    return true;
  } catch {
    return false;
  }
}

type LocalPool = Record<'pc' | 'mobile', WallpaperItem[]>;

/** 挂 globalThis：每个 route chunk 各扫一遍目录的话，本地池会被重复构建 */
const globalStore = globalThis as typeof globalThis & {
  __decamoreWallpaperPool?: LocalPool | null;
  __decamoreWallpaperPoolPending?: Promise<LocalPool> | null;
};

/**
 * 镜像只增不减的话，每天 2 个文件（约 400KB）会一路把仓库顶到几百 MB，
 * 而历史 blob 再也收不回来。落地新对之后清掉 N 天前的：bing 每天只服务当日一张。
 */
const BING_KEEP_DAYS = 7;

async function pruneBingMirrors(): Promise<void> {
  const names = await readdir(BING_DIR).catch(() => [] as string[]);
  const cutoff = Date.now() - BING_KEEP_DAYS * 86_400_000;
  await Promise.all(
    names.map(async (name) => {
      if (!/\.(jpe?g|png|webp)$/i.test(name)) return;
      const full = path.join(BING_DIR, name);
      const info = await stat(full).catch(() => null);
      if (info?.isFile() && info.mtimeMs < cutoff) await unlink(full).catch(() => {});
    }),
  );
}

async function buildLocalType(type: 'pc' | 'mobile'): Promise<WallpaperItem[]> {
  const dir = LOCAL_DIR[type];
  const fullDir = path.join(ASSET_ROOT, 'wallpaper', dir);
  /** 缩略图与原图分属两个目录 */
  const thumbDir = path.join(ASSET_ROOT, 'wallpaper-thumb', dir);

  const names = await readdir(fullDir).catch(() => [] as string[]);
  // 派生图目录一次读完：逐文件 exists 的话 desktop + mobile 32 项就是 32 次串行往返
  const thumbs = new Set(await readdir(thumbDir).catch(() => [] as string[]));

  const built = await Promise.all(
    names.sort().map(async (name): Promise<WallpaperItem | null> => {
      if (!/\.(jpe?g|png)$/i.test(name)) return null;
      const base = name.replace(/\.[a-z0-9]+$/i, '');
      const thumbName = `${base}.webp`;
      // 没有同名缩略图的不进池子：接口必须保证 thumb 一定拿得到
      if (!thumbs.has(thumbName)) return null;
      const full = path.join(fullDir, name);
      const dims = await readDimensions(full);
      return {
        type,
        url: assetUrl(full),
        thumb: assetUrl(path.join(thumbDir, thumbName)),
        id: base,
        width: dims?.width ?? null,
        height: dims?.height ?? null,
        title: null,
        copyright: null,
        date: null,
      };
    }),
  );
  return built.filter((item): item is WallpaperItem => item !== null);
}

function loadLocalPool(): Promise<LocalPool> {
  const cached = globalStore.__decamoreWallpaperPool;
  if (cached) return Promise.resolve(cached);

  const pending = (globalStore.__decamoreWallpaperPoolPending ??= (async () => {
    const [pc, mobile] = await Promise.all([buildLocalType('pc'), buildLocalType('mobile')]);
    if (pc.length === 0 || mobile.length === 0) {
      throw new Error('壁纸目录为空，请检查 public/assets/wallpaper/{desktop,mobile}');
    }
    const pool: LocalPool = { pc, mobile };
    globalStore.__decamoreWallpaperPool = pool;
    return pool;
  })().finally(() => {
    globalStore.__decamoreWallpaperPoolPending = null;
  }));
  return pending;
}

async function localItems(type: 'pc' | 'mobile'): Promise<WallpaperItem[]> {
  const pool = globalStore.__decamoreWallpaperPool ?? (await loadLocalPool());
  return pool[type];
}

/** 当日结果缓存 1 小时；已有镜像不再回源，并发请求合并成一次抓取 */
const resolveBing = createBoardCache<'today', WallpaperItem, WallpaperItem>({
  slot: '__decamoreBingShot',
  ttlMs: BING_TTL_MS,
  fetch: loadBing,
  toResult: (_key, item) => item,
});

async function loadBing(): Promise<WallpaperItem> {
  let feed: BingFeed | undefined;
  try {
    const res = await fetch(BING_FEED_URL, { redirect: 'follow', signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`HPImageArchive HTTP ${res.status}`);
    const json = (await res.json()) as { images?: BingFeed[] };
    feed = json.images?.[0];
  } catch (error) {
    throw unavailable(error instanceof Error ? error.message : String(error));
  }
  if (!feed?.urlbase) throw unavailable('HPImageArchive 当日没有返回图片');

  const id = bingImageId(feed.urlbase);
  const remoteFull = `https://www.bing.com${feed.urlbase}${BING_FULL_SUFFIX}`;
  const remoteThumb = `https://www.bing.com${feed.urlbase}${BING_THUMB_SUFFIX}`;
  const [mirroredFull, mirroredThumb] = await Promise.all([
    mirror(remoteFull, path.join(BING_DIR, `${id}${BING_FULL_SUFFIX}`)),
    mirror(remoteThumb, path.join(BING_DIR, `${id}${BING_THUMB_SUFFIX}`)),
  ]);
  await pruneBingMirrors();
  // 只有落到站内的文件才读尺寸；回落到上游直链时不报分辨率
  const dims = mirroredFull ? await readDimensions(path.join(BING_DIR, `${id}${BING_FULL_SUFFIX}`)) : null;

  return {
    type: 'bing',
    url: mirroredFull ? assetUrl(path.join(BING_DIR, `${id}${BING_FULL_SUFFIX}`)) : remoteFull,
    thumb: mirroredThumb ? assetUrl(path.join(BING_DIR, `${id}${BING_THUMB_SUFFIX}`)) : remoteThumb,
    id,
    width: dims?.width ?? null,
    height: dims?.height ?? null,
    title: feed.title || null,
    copyright: feed.copyright || null,
    date: bingDate(feed.startdate),
  };
}

const ALL_TYPES: readonly WallpaperType[] = ['pc', 'mobile', 'bing'];

/** type 缺省时三类等概率随机 */
export async function pickWallpaper(type?: WallpaperType): Promise<WallpaperItem> {
  const picked = type ?? ALL_TYPES[Math.floor(Math.random() * ALL_TYPES.length)]!;
  if (picked === 'bing') return resolveBing('today');

  const items = await localItems(picked);
  return items[Math.floor(Math.random() * items.length)]!;
}
