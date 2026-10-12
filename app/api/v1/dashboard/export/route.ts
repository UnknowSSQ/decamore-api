import { defineRoute, ok } from '@/lib/server';
import { reportTables } from '@/lib/server/metrics';
import { exportReportBodySchema } from '@/lib/zod/admin.schema';
import { PERMISSIONS } from '@/constants/auth';

type Section = 'trend' | 'statusMix' | 'topApis' | 'logs';

const ALL_SECTIONS: readonly Section[] = ['trend', 'statusMix', 'topApis', 'logs'];

const HEADER: Record<Section, string[]> = {
  trend: ['label', 'calls', 'errors', 'avgLatencyMs'],
  statusMix: ['code', 'count', 'ratio'],
  topApis: ['path', 'calls', 'share'],
  logs: ['time', 'path', 'method', 'status', 'latencyMs', 'ip', 'caller'],
};

/** 值里的逗号、引号与换行按 RFC 4180 转义，否则路径一含逗号整列就错位 */
function csvCell(value: string | number | null): string {
  const text = value === null ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
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
    const tables = reportTables(range);
    const rowsOf = (section: Section): (string | number | null)[][] => tables[section];

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T-]/g, (ch) => (ch === 'T' ? '-' : ''));
    const fileName = `dashboard_${range}_${stamp}.${format}`;
    const rows = picked.reduce((sum, section) => sum + rowsOf(section).length, 0);

    const content =
      format === 'csv'
        ? picked
            .map((section) =>
              [section, '', HEADER[section].join(','), ...rowsOf(section).map((row) => row.map(csvCell).join(','))].join('\n'),
            )
            .join('\n\n')
        : JSON.stringify(
            Object.fromEntries(picked.map((section) => [section, { header: HEADER[section], rows: rowsOf(section) }])),
            null,
            2,
          );

    // 内容直接随信封回，前端用 Blob 落地：此前这里回的是一个不存在的 downloadUrl
    return ok({ fileName, format, rows, content }, { message: '报表已生成' });
  },
);
