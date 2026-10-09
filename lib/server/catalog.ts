/** 接口车单单一数据源：广场卡片、/docs 文档页、后台接口管理读同一份记录 */
import 'server-only';

import { API_CATALOG } from '@/constants/api-catalog';
import type { ApiCatalogItem, HttpMethod, ManagedApi } from '@/types';
import type { CreateApiInput } from '@/lib/zod/admin.schema';
import { routeCallStats } from './stats';

interface CatalogRecord extends ApiCatalogItem {
  authRequired: boolean;
  rateLimited: boolean;
  status: ManagedApi['status'];
  updatedAt: string;
}

const nowIso = () => new Date().toISOString();

/** Next 把页面与各 route handler 编成独立 chunk，模块级变量每个 chunk 一份、写入互不可见，只能挂 globalThis 才能进程内共享 */
const globalStore = globalThis as typeof globalThis & {
  __decamoreCatalog?: CatalogRecord[];
  __decamoreCatalogSeed?: string;
};

/** 静态目录内容变更时递增这一版本触发重新播种，进程内的编辑结果会被覆盖 */
const SEED_VERSION = '2026-10-09.real-route-metrics';

/** id 指纹能活过 dev 热重载：新增接口时变化并重播种，后台只改名称/描述则不会冲掉编辑结果 */
const seedSignature = `${SEED_VERSION}|${API_CATALOG.map((item) => item.id).join('|')}`;

/**
 * 10 个公开接口一律免鉴权、都受频控，种子值必须与 /docs 与 README 的口径一致；
 * 之前按 index 取模生成 authRequired/status 会让后台显示「需鉴权」「已降级」，而线上根本不是那样。
 */
function seedRecords(): CatalogRecord[] {
  const seededAt = nowIso();
  return API_CATALOG.map((item) => ({
    ...item,
    authRequired: false,
    rateLimited: true,
    status: 'online',
    updatedAt: seededAt,
  }));
}

if (globalStore.__decamoreCatalogSeed !== seedSignature) {
  globalStore.__decamoreCatalogSeed = seedSignature;
  globalStore.__decamoreCatalog = seedRecords();
}

const records: CatalogRecord[] = globalStore.__decamoreCatalog!;

/**
 * 指标取自 lib/server/stats 的调用环形缓冲：数字是本进程窗口内的真实计数，
 * 没有记录就是 0（0 表示「没观测到」，不再用下标编出一个看起来像流量的数）。
 */
function metrics(path: string) {
  const stat = routeCallStats()[path];
  if (!stat) return { calls24h: 0, avgLatencyMs: 0, errorRate: 0 };
  return {
    calls24h: stat.count,
    avgLatencyMs: stat.avgDurationMs,
    errorRate: stat.count === 0 ? 0 : Math.round((stat.errorCount / stat.count) * 10_000) / 100,
  };
}

function toManaged(record: CatalogRecord): ManagedApi {
  return {
    id: record.id,
    path: record.path,
    name: record.name,
    description: record.desc,
    method: record.method,
    category: record.cat,
    status: record.status,
    authRequired: record.authRequired,
    rateLimited: record.rateLimited,
    updatedAt: record.updatedAt,
    ...metrics(record.path),
  };
}

function toCatalogItem(record: CatalogRecord): ApiCatalogItem {
  return {
    id: record.id,
    name: record.name,
    en: record.en,
    path: record.path,
    cat: record.cat,
    method: record.method,
    desc: record.desc,
    kw: record.kw,
    hint: record.hint,
    demo: record.demo,
  };
}

export function listCatalogItems(): ApiCatalogItem[] {
  return records.map(toCatalogItem);
}

export function findCatalogItem(id: string): ApiCatalogItem | undefined {
  const record = records.find((item) => item.id === id);
  return record ? toCatalogItem(record) : undefined;
}

export function listManagedApis(): ManagedApi[] {
  return records.map((record) => toManaged(record));
}

export function findManagedApi(id: string): ManagedApi | undefined {
  const index = records.findIndex((record) => record.id === id);
  return index < 0 ? undefined : toManaged(records[index]!);
}

export interface CatalogPatch {
  name?: string;
  path?: string;
  method?: HttpMethod;
  category?: ApiCatalogItem['cat'];
  description?: string;
  authRequired?: boolean;
  rateLimited?: boolean;
  status?: ManagedApi['status'];
}

/** 只覆盖传入的字段；编辑结果仅存进程内，重启或 id 指纹变化都会被种子冲掉 */
export function patchCatalogItem(id: string, patch: CatalogPatch): ManagedApi | undefined {
  const index = records.findIndex((record) => record.id === id);
  if (index < 0) return undefined;
  const record = records[index]!;

  if (patch.name !== undefined) record.name = patch.name;
  if (patch.path !== undefined) record.path = patch.path;
  if (patch.method !== undefined) record.method = patch.method;
  if (patch.category !== undefined) record.cat = patch.category;
  if (patch.description !== undefined) record.desc = patch.description;
  if (patch.authRequired !== undefined) record.authRequired = patch.authRequired;
  if (patch.rateLimited !== undefined) record.rateLimited = patch.rateLimited;
  if (patch.status !== undefined) record.status = patch.status;
  record.updatedAt = nowIso();

  return toManaged(record);
}

/** 取路径末段作 id，它同时是 /docs/<slug> 的 slug；重名时追加序号 */
function deriveId(path: string): string {
  const base = path.split('/').filter(Boolean).pop() ?? 'api';
  if (!records.some((record) => record.id === base)) return base;
  let suffix = 2;
  while (records.some((record) => record.id === `${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export function createCatalogItem(input: CreateApiInput): ManagedApi {
  const record: CatalogRecord = {
    id: deriveId(input.path),
    name: input.name,
    en: '',
    path: input.path,
    cat: input.category,
    method: input.method,
    desc: input.description,
    // 新建接口没有关键词，广场搜索只能按名称与路径命中
    kw: '',
    hint: '点击刷新 ↻',
    demo: null,
    authRequired: input.authRequired,
    rateLimited: input.rateLimited,
    status: input.status,
    updatedAt: nowIso(),
  };
  records.push(record);
  return toManaged(record);
}

export function deleteCatalogItem(id: string): boolean {
  const index = records.findIndex((record) => record.id === id);
  if (index < 0) return false;
  records.splice(index, 1);
  return true;
}
