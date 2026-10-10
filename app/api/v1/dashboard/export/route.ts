import { defineRoute, ok } from '@/lib/server';
import { findAllLogs } from '@/lib/server/mock/logs';
import { getDashboardStats } from '@/lib/server/mock/dashboard';
import { exportReportBodySchema } from '@/lib/zod/admin.schema';
import { PERMISSIONS } from '@/constants/auth';

type Section = 'trend' | 'statusMix' | 'topApis' | 'logs' | 'health';

const ALL_SECTIONS: readonly Section[] = ['trend', 'statusMix', 'topApis', 'logs', 'health'];

interface Table {
  name: Section;
  header: string[];
  rows: (string | number | null)[][];
}

function buildTables(range: '24h' | '7d' | '30d', sections: readonly Section[]): Table[] {
  const stats = getDashboardStats(range);
  const tables: Record<Section, Table> = {
    trend: { name: 'trend', header: ['label', 'calls'], rows: stats.trend.map((p) => [p.label, p.value]) },
    statusMix: {
      name: 'statusMix',
      header: ['code', 'count', 'ratio'],
      rows: stats.statusMix.map((s) => [s.code, s.count, s.ratio]),
    },
    topApis: {
      name: 'topApis',
      header: ['path', 'calls', 'share'],
      rows: stats.topApis.map((s) => [s.path, s.calls, s.share]),
    },
    health: {
      name: 'health',
      header: ['name', 'uptime', 'status'],
      rows: stats.health.map((s) => [s.name, s.uptime, s.status]),
    },
    logs: {
      name: 'logs',
      header: ['time', 'path', 'method', 'status', 'latencyMs', 'ip'],
      rows: findAllLogs().map((log) => [log.time, log.path, log.method, log.status, log.latencyMs, log.ip]),
    },
  };
  return sections.map((section) => tables[section]!);
}

/** 值里的逗号、引号与换行按 RFC 4180 转义，否则路径或备注一含逗号整列就错位 */
function csvCell(value: string | number | null): string {
  const text = value === null ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(tables: Table[]): string {
  return tables
    .map((table) => [table.name, ...[''], [table.header.join(',')], ...table.rows.map((row) => row.map(csvCell).join(','))].join('\n'))
    .join('\n\n');
}

export const POST = defineRoute(
  {
    auth: true,
    permission: PERMISSIONS.statsRead,
    body: exportReportBodySchema,
    route: '/api/v1/dashboard/export',
  },
  async (_req, { body }) => {
    const { range, format, sections } = body!;
    const picked = sections?.length ? sections : ALL_SECTIONS;
    const tables = buildTables(range, picked);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T-]/g, (ch) => (ch === 'T' ? '-' : ''));
    const fileName = `dashboard_${range}_${stamp}.${format}`;
    const rows = tables.reduce((sum, table) => sum + table.rows.length, 0);
    const content = format === 'csv' ? toCsv(tables) : JSON.stringify(Object.fromEntries(tables.map((t) => [t.name, t])), null, 2);

    // 内容直接随信封回，前端用 Blob 落地：此前这里回的是一个不存在的 downloadUrl
    return ok({ fileName, format, rows, content }, { message: '报表已生成' });
  },
);
