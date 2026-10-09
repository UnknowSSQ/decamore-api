import { defineRoute, ok, noContent, NotFoundError } from '@/lib/server';
import { idParamSchema, updateApiSchema } from '@/lib/zod/admin.schema';
import { deleteCatalogItem, findManagedApi, patchCatalogItem } from '@/lib/server/catalog';
import { PERMISSIONS } from '@/constants/auth';

export const GET = defineRoute(
  {
    auth: true,
    permission: PERMISSIONS.apiRead,
    params: idParamSchema,
    route: '/api/v1/apis/[id]',
  },
  (_req, { params }) => {
    const { id } = params as { id: string };
    const api = findManagedApi(id);
    if (!api) throw new NotFoundError('接口不存在');
    return ok(api);
  },
);

export const PATCH = defineRoute(
  {
    auth: true,
    permission: PERMISSIONS.apiWrite,
    params: idParamSchema,
    body: updateApiSchema,
    route: '/api/v1/apis/[id]',
  },
  async (_req, { params, body }) => {
    const { id } = params as { id: string };
    // 只改车单：广场卡片、/docs 与后台列表下次读取即生效
    const updated = patchCatalogItem(id, body!);
    if (!updated) throw new NotFoundError('接口不存在');
    return ok(updated, { message: '接口已更新' });
  },
);

export const DELETE = defineRoute(
  {
    auth: true,
    permission: PERMISSIONS.apiWrite,
    params: idParamSchema,
    route: '/api/v1/apis/[id]',
  },
  async (_req, { params }) => {
    const { id } = params as { id: string };
    if (!deleteCatalogItem(id)) throw new NotFoundError('接口不存在');
    return noContent();
  },
);
