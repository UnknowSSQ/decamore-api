import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { API_CATALOG, IMPLEMENTED_API_IDS } from '@/constants/api-catalog';
import { AUTHORED_DOC_SLUGS } from '@/components/docs/authored-slugs';

const API_ROOT = 'app/api/v1';

/** 一个 route.ts 是不是公开接口，看它有没有用 publicOk——这是机器可判的事实，不靠注释 */
function publicOkDirs(): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(API_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = `${API_ROOT}/${entry.name}/route.ts`;
    if (existsSync(file) && readFileSync(file, 'utf8').includes('publicOk(')) out.push(entry.name);
  }
  return out;
}

describe('接口清单的几处登记必须互相对得上', () => {
  const publics = publicOkDirs();

  it('车单里每条 path 都由 id 拼成，不出现 id 与 path 各改一半', () => {
    for (const item of API_CATALOG) assert.equal(item.path, `/api/v1/${item.id}`, `${item.id} 的 path 与 id 不一致`);
  });

  it('车单 id 与编译期那批字面量互相对应，少一个或多一个都在这里露出来', () => {
    for (const item of API_CATALOG) {
      assert.ok(
        IMPLEMENTED_API_IDS.includes(item.id as (typeof IMPLEMENTED_API_IDS)[number]),
        `${item.id} 在车单里但不在 IMPLEMENTED_API_IDS`,
      );
    }
    for (const id of IMPLEMENTED_API_IDS) {
      assert.ok(API_CATALOG.some((item) => item.id === id), `${id} 登记为实现但车单没有它`);
    }
  });

  it('每个用 publicOk 的路由都登记进了 IMPLEMENTED_API_IDS 与车单', () => {
    for (const dir of publics) {
      assert.ok(IMPLEMENTED_API_IDS.includes(dir as (typeof IMPLEMENTED_API_IDS)[number]), `${dir} 有公开路由但没登记进 IMPLEMENTED_API_IDS`);
      assert.ok(API_CATALOG.some((item) => item.id === dir), `${dir} 没进车单，广场与后台看不到它`);
    }
  });

  it('IMPLEMENTED_API_IDS 里每个 id 都真的有公开路由目录', () => {
    for (const id of IMPLEMENTED_API_IDS) {
      const file = `${API_ROOT}/${id}/route.ts`;
      assert.ok(existsSync(file), `${id} 登记为已实现，但 ${file} 不存在`);
      assert.ok(publics.includes(id), `${file} 存在但没走 publicOk，登记口径不对`);
    }
  });

  it('写了文档的接口必须同时是实现中的接口', () => {
    for (const slug of AUTHORED_DOC_SLUGS) {
      assert.ok(IMPLEMENTED_API_IDS.includes(slug), `${slug} 有文档却不在 IMPLEMENTED_API_IDS`);
    }
  });
});
