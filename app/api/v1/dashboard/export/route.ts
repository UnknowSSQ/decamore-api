import { defineRoute, ok } from '@/lib/server';
import { exportReportBodySchema } from '@/lib/zod/admin.schema';
import { PERMISSIONS } from '@/constants/auth';

export const POST = defineRoute(
  {
    auth: true,
    permission: PERMISSIONS.statsRead,
    body: exportReportBodySchema,
    route: '/api/v1/dashboard/export',
  },
  async (_req, { body }) => {
    const { range, format, sections } = body!;

    void range;
    void format;
    void sections;

    // downloadUrl 只是约定路径，没有对应的下载路由；expiresIn 单位是秒
    return ok(
      {
        downloadUrl: `/api/v1/dashboard/export/download?file=report_${Date.now()}.${format}`,
        expiresIn: 3600,
      },
      { message: '报表已生成' },
    );
  },
);
