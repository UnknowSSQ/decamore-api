/**
 * 已撰写文档的接口 id（同时是 /docs/<slug> 的 slug）。
 * 单独成模块是因为后台列表只要一个 includes 判断：从 registry 取会连带 10 篇文档正文，
 * 而正文经 apiUrl() 拖进 @/env 与 zod，把私有 env schema 也送进浏览器。
 */
export const AUTHORED_DOC_SLUGS: readonly string[] = [
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
];
