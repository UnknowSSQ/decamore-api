/**
 * 已撰写文档的接口 id（同时是 /docs/<slug> 的 slug）。
 * 单独成模块是因为后台「接口管理」只要一个 includes 判断：从 registry 取会连带全部文档正文，
 * 而正文经 apiUrl() 拖进 @/env 与 zod，把私有 env schema 也送进浏览器。
 * 类型用 ImplementedApiId：写错 id 或给没实现的接口写文档，编译期就报。
 */
import type { ImplementedApiId } from '@/constants/api-catalog';

export const AUTHORED_DOC_SLUGS: readonly ImplementedApiId[] = [
  'hitokoto',
  'answerbook',
  'wallpaper',
  'hotsearch',
  'hotmusic',
  'hotplay',
  'hotchart',
  'emoji',
  'avatar',
  'images',
  'poetry',
  'idioms',
  'soulsoup',
  'kfc',
  'netease',
  'typhoon',
  'weather',
  'exchange',
  'gold',
  'stock',
  'warning',
];

/** 后台可编辑目录里的 id 是运行时 string，includes 的字面量联合签名接不住，判定收在这里 */
export function hasAuthoredDoc(id: string): boolean {
  return (AUTHORED_DOC_SLUGS as readonly string[]).includes(id);
}
