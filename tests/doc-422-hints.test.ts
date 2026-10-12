/**
 * 文档里那句 422 文案必须还是服务端真正返回的那句。
 * 每篇文档把它抄在四个位置（错误行、失败窗、description、issues），第十五轮加 B 站平台时
 * README 就漂过一回；文案现在由 public.schema.ts 的派生常量单源提供，这条用例守住
 * 「schema 产出的 message == 文档失败窗里的 message」这一端。
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ZodTypeAny } from 'zod';

import { avatarDoc } from '@/components/docs/apis/avatar';
import { emojiDoc } from '@/components/docs/apis/emoji';
import { goldDoc } from '@/components/docs/apis/gold';
import { hotmusicDoc } from '@/components/docs/apis/hotmusic';
import { hotplayDoc } from '@/components/docs/apis/hotplay';
import { hotsearchDoc } from '@/components/docs/apis/hotsearch';
import { imagesDoc } from '@/components/docs/apis/images';
import { neteaseDoc } from '@/components/docs/apis/netease';
import { poetryDoc } from '@/components/docs/apis/poetry';
import { stockDoc } from '@/components/docs/apis/stock';
import { typhoonDoc } from '@/components/docs/apis/typhoon';
import { wallpaperDoc } from '@/components/docs/apis/wallpaper';
import { warningDoc } from '@/components/docs/apis/warning';
import { weatherDoc } from '@/components/docs/apis/weather';
import type { AuthoredApiDoc } from '@/components/docs/types';
import {
  avatarQuerySchema,
  emojiQuerySchema,
  goldQuerySchema,
  hotmusicQuerySchema,
  hotplayQuerySchema,
  hotsearchQuerySchema,
  imageQuerySchema,
  neteaseQuerySchema,
  poetryQuerySchema,
  stockQuerySchema,
  typhoonQuerySchema,
  warningQuerySchema,
  wallpaperQuerySchema,
  weatherQuerySchema,
} from '@/lib/zod/public.schema';

/** [篇名, schema, 非法入参, 文档, 失败窗的 value（缺省 invalid）] */
const CASES: ReadonlyArray<readonly [string, ZodTypeAny, Record<string, string>, AuthoredApiDoc, string?]> = [
  ['wallpaper', wallpaperQuerySchema, { type: 'x' }, wallpaperDoc],
  ['hotsearch', hotsearchQuerySchema, { platform: 'x' }, hotsearchDoc],
  ['hotmusic', hotmusicQuerySchema, { platform: 'x' }, hotmusicDoc],
  ['hotplay', hotplayQuerySchema, { type: 'x' }, hotplayDoc],
  ['avatar', avatarQuerySchema, { type: 'x' }, avatarDoc],
  ['emoji', emojiQuerySchema, { type: 'x' }, emojiDoc],
  ['images', imageQuerySchema, { type: 'x' }, imagesDoc],
  ['poetry', poetryQuerySchema, { dynasty: 'x' }, poetryDoc],
  ['typhoon', typhoonQuerySchema, { id: 'abc' }, typhoonDoc],
  ['weather', weatherQuerySchema, { city: 'xiamenn' }, weatherDoc],
  ['gold', goldQuerySchema, { contract: 'Au50g' }, goldDoc],
  ['netease', neteaseQuerySchema, { id: 'abc' }, neteaseDoc],
  ['stock', stockQuerySchema, { codes: 'abc' }, stockDoc],
  ['warning type', warningQuerySchema, { type: 'storm' }, warningDoc],
  ['warning level', warningQuerySchema, { level: 'purple' }, warningDoc, 'level'],
  ['warning region', warningQuerySchema, { region: 'zhili' }, warningDoc, 'region'],
];

/** 失败窗按 value 找（默认 invalid），message 直接嵌在样例 JSON 里 */
function failurePaneMessage(doc: AuthoredApiDoc, name: string, value = 'invalid'): string {
  const pane = doc.responsePanes.find((one) => one.value === value);
  assert.ok(pane, `${name} 必须有 value=${value} 的失败窗`);
  const matched = /"message": "((?:[^"\\]|\\.)*)"/.exec(pane.code);
  assert.ok(matched, `${name} 的失败窗里必须能读到 message`);
  return JSON.parse(`"${matched[1]}"`) as string;
}

describe('文档 422 文案与 schema 同源', () => {
  for (const [name, schema, input, doc, value] of CASES) {
    it(`${name}：非法值 ${Object.values(input)[0]} 的提示与文档失败窗一致`, () => {
      const parsed = schema.safeParse(input);
      assert.equal(parsed.success, false, `${name} 的非法值必须被拒`);
      const issue = parsed.error.issues[0];
      assert.ok(issue, `${name} 必须产出 issues`);
      assert.equal(failurePaneMessage(doc, name, value), issue.message);
    });
  }
});
