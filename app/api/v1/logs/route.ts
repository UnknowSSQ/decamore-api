import { defineRoute, ok, paged } from '@/lib/server';
import { logListQuerySchema, type LogListQuery } from '@/lib/zod/admin.schema';
import type { CallLog } from '@/types';
import { findAllLogs } from '@/lib/server/mock/logs';
import { PERMISSIONS } from '@/constants/auth';

export const GET = defineRoute(
  {
    auth: true,
    permission: PERMISSIONS.logRead,
    query: logListQuerySchema,
    route: '/api/v1/logs',
  },
  (_req, { query }) => {
    const {
      page,
      pageSize,
      keyword,
      path,
      method,
      status,
      statusFamily,
      ip,
      cacheMissOnly,
      from,
      to,
      sort,
      order,
    } = query!;

    let items = findAllLogs();

    if (keyword) {
      const kw = keyword.toLowerCase();
      items = items.filter(
        (i) =>
          i.path.toLowerCase().includes(kw) ||
          i.ip.includes(kw) ||
          i.caller.toLowerCase().includes(kw),
      );
    }

    if (path) items = items.filter((i) => i.path === path);

    if (method) items = items.filter((i) => i.method === method);

    if (status) items = items.filter((i) => i.status === status);

    if (statusFamily) {
      const prefix = statusFamily.replace('xx', '');
      items = items.filter((i) => String(i.status).startsWith(prefix));
    }

    if (ip) items = items.filter((i) => i.ip === ip);

    if (cacheMissOnly) items = items.filter((i) => !i.cacheHit);

    // from / to 允许 "YYYY-MM-DD HH:mm:ss"，补成 T 分隔才能被 Date 解析
    if (from) {
      const fromMs = new Date(from.replace(' ', 'T')).getTime();
      items = items.filter((i) => new Date(i.time).getTime() >= fromMs);
    }
    if (to) {
      const toMs = new Date(to.replace(' ', 'T')).getTime();
      items = items.filter((i) => new Date(i.time).getTime() <= toMs);
    }

    // sort 取值与 CallLog 字段名不同（latency → latencyMs、time 是字符串时间戳），只能显式映射
    const comparators: Record<LogListQuery['sort'], (a: CallLog, b: CallLog) => number> = {
      time: (a, b) => Date.parse(a.time) - Date.parse(b.time),
      latency: (a, b) => a.latencyMs - b.latencyMs,
      status: (a, b) => a.status - b.status,
    };
    const compare = comparators[sort];
    items.sort((a, b) => (order === 'asc' ? compare(a, b) : -compare(a, b)));

    const total = items.length;
    const start = (page - 1) * pageSize;
    const paged_items = items.slice(start, start + pageSize);

    return ok(paged(paged_items, total, page, pageSize));
  },
);
