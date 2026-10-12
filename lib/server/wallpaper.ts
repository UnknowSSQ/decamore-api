/** 壁纸：pc / mobile 扫站内目录，bing 与 nasa 各取当日一张并镜像进 public/assets/wallpaper/<来源> */
import 'server-only';

import { access, mkdir, open, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { siteUrl } from '@/env';
import { WALLPAPER_TYPES } from '@/lib/zod/public.schema';
import { UPSTREAM_TIMEOUT_MS, browserHeaders } from './upstream';
import { createBoardCache } from './board-cache';
import { type WallpaperItem, type WallpaperType } from '@/types';
import { UpstreamUnavailableError } from './errors';
import { pickOne } from '@/utils/random';

const PUBLIC_ROOT = path.join(process.cwd(), 'public');
const ASSET_ROOT = path.join(PUBLIC_ROOT, 'assets');
/** 对外 type 与站内目录名不同名：pc 对应 desktop/ */
const LOCAL_DIR: Record<'pc' | 'mobile', 'desktop' | 'mobile'> = { pc: 'desktop', mobile: 'mobile' };
const MIRROR_ROOT = path.join(ASSET_ROOT, 'wallpaper');
const BING_DIR = path.join(MIRROR_ROOT, 'bing');
const NASA_DIR = path.join(MIRROR_ROOT, 'nasa');
/** 实测只有这两个后缀变体返 200，_480x270.jpg 与 &w= 查询串形式都是 404 */
const BING_FULL_SUFFIX = '_1920x1080.jpg';
const BING_THUMB_SUFFIX = '_640x480.jpg';
const BING_FEED_URL = 'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN';
/**
 * NASA APOD 走 science.nasa.gov 的 WordPress REST：免 cookie 免签名免 key（api.nasa.gov 那个
 * 同名接口已经把每日图坏了，只回站点 logo）。per_page=1 拿最新一条，列表按日期倒序。
 */
const NASA_FEED_URL = 'https://science.nasa.gov/wp-json/wp/v2/apod-basic?per_page=1';
/**
 * 站内落盘的两个档位。上游的 dynamicimage 会真的从源图重采样：实测这张 4:3 的
 * 4000×3000 源图，w=0&h=0 只给 1280×960，w=1920&h=1080 给 1440×1080 / 281KB，
 * w=640&h=480 给 640×480 / 64KB（尺寸都按源图比例内接，不会拉成方）。
 */
const NASA_FULL_QUERY = '?w=1920&h=1080&fit=clip';
const NASA_THUMB_QUERY = '?w=640&h=480&fit=clip';
const NASA_THUMB_SUFFIX = '_640x480';
const UPSTREAM_TTL_MS = 60 * 60 * 1000;
const MIRROR_TIMEOUT_MS = 6_000;
/** 只读文件头取宽高：PNG 尺寸在前 24 字节、JPEG 的 SOF 极少落在几十 KB 之后，读不出就回 null */
const HEADER_BYTES = 64 * 1024;

interface BingFeed {
  urlbase?: string;
  title?: string;
  copyright?: string;
  /** 实测当日在架的那张 startdate 是昨天、enddate 是今天，所以生效日期取 enddate */
  enddate?: string;
}

interface ApodEntry {
  /** YYYY-MM-DD，也是这条记录对外能用的稳定标识 */
  date?: string;
  title?: string;
  media_type?: string;
  credit?: string;
  /** 上游给的是文章页直链而不是图片，图片在 hdurl */
  hdurl?: string;
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
    throw new UpstreamUnavailableError('必应壁纸', `HPImageArchive 返回的图片 id 不符合预期：${raw || '(空)'}`);
  }
  return raw;
}

/** 归一成 YYYY-MM-DD：必应给 20261011 这种 8 位串，APOD 已经是 ISO 前缀带时刻 */
function isoDay(raw?: string): string | null {
  if (raw && /^\d{8}$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  return raw && /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : null;
}

/** 下载并落盘；已存在则直接复用。失败返回 false，调用方回落到上游直链 */
async function mirror(remote: string, target: string, timeoutMs = MIRROR_TIMEOUT_MS): Promise<boolean> {
  if (await exists(target)) return true;
  // 同一个目标只放一个下载在跑：缓存过期边界上会有一批请求同时落到同一个文件名
  if (mirroring.has(target)) return false;
  mirroring.add(target);
  try {
    // 超时留在客户端 15 秒预算内：镜像失败只是回落到上游直链，不值得把整条请求顶爆
    const res = await fetch(remote, { redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
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
  } finally {
    mirroring.delete(target);
  }
}

const mirroring = new Set<string>();

/**
 * next start 在启动时就把 public/ 登记进了静态路由表：进程运行期间新写进去的文件
 * 要等下次启动才 serve（实测同目录下「启动后写入」404、「启动前已在」200）。
 * 所以只有启动前就落盘的文件才给站内直链；当天新镜像的那张仍给上游直链，
 * 文件照旧写下——下次启动后它就是站内直链了。按 mtime 比进程启动时刻判断，不留竞态。
 */
const BOOTED_AT_MS = Date.now();

async function servedAtBoot(target: string): Promise<boolean> {
  const info = await stat(target).catch(() => null);
  return info?.isFile() === true && info.mtimeMs < BOOTED_AT_MS;
}

/** 站内直链能用就用，用不了（没镜像成功、或这次启动前不在盘上）就回上游直链 */
async function localOrRemote(target: string, remote: string, mirrored: boolean): Promise<string> {
  return mirrored && (await servedAtBoot(target)) ? assetUrl(target) : remote;
}

type LocalPool = Record<'pc' | 'mobile', WallpaperItem[]>;

/** 挂 globalThis：每个 route chunk 各扫一遍目录的话，本地池会被重复构建 */
const globalStore = globalThis as typeof globalThis & {
  __decamoreWallpaperPool?: LocalPool | null;
  __decamoreWallpaperPoolPending?: Promise<LocalPool> | null;
};

/**
 * 镜像只增不减的话，每天 2 个文件（约 400KB）会一路把仓库顶到几百 MB，
 * 而历史 blob 再也收不回来。落地新对之后清掉 N 天前的：两个上游都只服务当日一张。
 */
const MIRROR_KEEP_DAYS = 7;

async function pruneMirrors(dir: string): Promise<void> {
  const names = await readdir(dir).catch(() => [] as string[]);
  const cutoff = Date.now() - MIRROR_KEEP_DAYS * 86_400_000;
  await Promise.all(
    names.map(async (name) => {
      if (!/\.(jpe?g|png|webp)$/i.test(name)) return;
      const full = path.join(dir, name);
      const info = await stat(full).catch(() => null);
      if (info?.isFile() && info.mtimeMs < cutoff) await unlink(full).catch(() => {});
    }),
  );
}

async function buildLocalType(type: 'pc' | 'mobile'): Promise<WallpaperItem[]> {
  const dir = LOCAL_DIR[type];
  const fullDir = path.join(MIRROR_ROOT, dir);
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
  ttlMs: UPSTREAM_TTL_MS,
  fetch: loadBing,
});

async function loadBing(): Promise<WallpaperItem> {
  let feed: BingFeed | undefined;
  try {
    const res = await fetch(BING_FEED_URL, { redirect: 'follow', signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`HPImageArchive HTTP ${res.status}`);
    const json = (await res.json()) as { images?: BingFeed[] };
    feed = json.images?.[0];
  } catch (error) {
    throw new UpstreamUnavailableError('必应壁纸', error instanceof Error ? error.message : String(error));
  }
  if (!feed?.urlbase) throw new UpstreamUnavailableError('必应壁纸', 'HPImageArchive 当日没有返回图片');

  const id = bingImageId(feed.urlbase);
  const remoteFull = `https://www.bing.com${feed.urlbase}${BING_FULL_SUFFIX}`;
  const remoteThumb = `https://www.bing.com${feed.urlbase}${BING_THUMB_SUFFIX}`;
  const fullFile = path.join(BING_DIR, `${id}${BING_FULL_SUFFIX}`);
  const thumbFile = path.join(BING_DIR, `${id}${BING_THUMB_SUFFIX}`);
  const [mirroredFull, mirroredThumb] = await Promise.all([
    mirror(remoteFull, fullFile),
    mirror(remoteThumb, thumbFile),
  ]);
  await pruneMirrors(BING_DIR);
  // 尺寸读得到就报：文件在不在本次启动的静态表里，不影响它本身就是这个分辨率
  const dims = mirroredFull ? await readDimensions(fullFile) : null;

  return {
    type: 'bing',
    url: await localOrRemote(fullFile, remoteFull, mirroredFull),
    thumb: await localOrRemote(thumbFile, remoteThumb, mirroredThumb),
    id,
    width: dims?.width ?? null,
    height: dims?.height ?? null,
    title: feed.title || null,
    copyright: feed.copyright || null,
    date: isoDay(feed.enddate),
  };
}

/** 上游的 credit 是带 <a> 的 HTML 片段，对外只给能直接显示的纯文本 */
function plainHtml(raw?: string): string | null {
  if (!raw) return null;
  const text = raw
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .trim();
  return text || null;
}

/** APOD 的响应顶层是数组，upstream.ts 的 JSON 收敛只认对象，所以这里自己取 */
async function loadApod(): Promise<ApodEntry> {
  try {
    const res = await fetch(NASA_FEED_URL, {
      headers: browserHeaders('https://science.nasa.gov/apod/'),
      redirect: 'follow',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`apod-basic HTTP ${res.status}`);
    const entries = (await res.json()) as ApodEntry[];
    // 列表按日期倒序，首条就是当日那张
    const entry = entries[0];
    if (!entry?.hdurl) throw new Error('响应里没有 hdurl 图片直链');
    return entry;
  } catch (error) {
    throw new UpstreamUnavailableError('NASA 每日图', error instanceof Error ? error.message : String(error));
  }
}

/** 当日条目缓存 1 小时；APOD 每天换一次，更快也只是重复问同一个答案 */
const resolveApod = createBoardCache<'today', ApodEntry, ApodEntry>({
  slot: '__decamoreApodShot',
  ttlMs: UPSTREAM_TTL_MS,
  fetch: loadApod,
});

async function loadNasa(): Promise<WallpaperItem> {
  const entry = await resolveApod('today');
  const date = isoDay(entry.date);
  // 站内文件名就用日期，形态不对宁可报错，也不拿一个不确定的名字去落盘
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new UpstreamUnavailableError('NASA 每日图', `APOD 的 date 不是 YYYY-MM-DD：${entry.date || '(空)'}`);
  }
  // hdurl 自己带查询串（video 封面那条是 ?w=1080&h=1350&fit=clip），拼缩略档前要先剥掉
  const base = entry.hdurl!.split('?')[0] ?? '';
  const ext = /\.(jpe?g|png|webp|gif)$/i.exec(base)?.[0]?.toLowerCase() ?? '.jpg';
  const fullFile = path.join(NASA_DIR, `${date}${ext}`);
  const thumbFile = path.join(NASA_DIR, `${date}${NASA_THUMB_SUFFIX}${ext}`);
  const remoteFull = `${base}${NASA_FULL_QUERY}`;
  const remoteThumb = `${base}${NASA_THUMB_QUERY}`;
  const [mirroredFull, mirroredThumb] = await Promise.all([
    mirror(remoteFull, fullFile),
    mirror(remoteThumb, thumbFile),
  ]);
  await pruneMirrors(NASA_DIR);
  const dims = mirroredFull ? await readDimensions(fullFile) : null;

  return {
    type: 'nasa',
    url: await localOrRemote(fullFile, remoteFull, mirroredFull),
    thumb: await localOrRemote(thumbFile, remoteThumb, mirroredThumb),
    id: date,
    width: dims?.width ?? null,
    height: dims?.height ?? null,
    title: entry.title || null,
    copyright: plainHtml(entry.credit),
    date,
  };
}

/** type 缺省时四类等概率随机 */
export async function pickWallpaper(type?: WallpaperType): Promise<WallpaperItem> {
  const picked = type ?? pickOne(WALLPAPER_TYPES);
  if (picked === 'bing') return resolveBing('today');
  if (picked === 'nasa') return loadNasa();
  return pickOne(await localItems(picked));
}
