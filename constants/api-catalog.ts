/**
 * 静态种子：运行时真值是 lib/server/catalog.ts 的进程内车单（后台可编辑），这里只负责播种与广场首屏兜底。
 * 只登记已有服务端路由的接口，未实现的进货单会让广场出现点不开的死路。
 */
import type { ApiCatalogItem } from '@/types';

export const API_CATALOG: readonly ApiCatalogItem[] = [
  {
    id: 'hitokoto',
    name: '一言',
    en: 'Hitokoto',
    path: '/api/v1/hitokoto',
    cat: '内容',
    method: 'GET',
    desc: '随机返回一句中文短句，附带出处与作者。',
    kw: '随机 文案 句子 名言 hitokoto quote yan',
    hint: '点击刷新 ↻',
    demo: 'quote',
  },
  {
    id: 'answerbook',
    name: '答案之书',
    en: 'Answer Book',
    path: '/api/v1/answerbook',
    cat: '内容',
    method: 'GET',
    desc: '写下疑问后翻开封页，随机给出一句中英对照的回答。',
    kw: '答案 之书 抉择 随机 回复 answerbook answer daemon',
    hint: '翻一翻 ↻',
    demo: 'answerbook',
  },
  {
    id: 'wallpaper',
    name: '随机壁纸',
    en: 'Wallpaper',
    path: '/api/v1/wallpaper',
    cat: '图片',
    method: 'GET',
    desc: '按类型（pc / mobile / bing）随机返回一张壁纸的原图与缩略图直链。',
    kw: '图片 背景 图床 高清 必应 wallpaper image bg bing pc mobile',
    hint: '点击换一张 ↻',
    demo: 'wallpaper',
  },
  {
    id: 'hotsearch',
    name: '热搜榜',
    en: 'Hot Search',
    path: '/api/v1/hotsearch',
    cat: '内容',
    method: 'GET',
    desc: '实时抓取微博 / 抖音 / 百度 / 知乎的官方热榜，返回排名、标题、热度与链接。',
    kw: '热点 榜单 微博 抖音 百度 知乎 新闻 hot search trend weibo douyin baidu zhihu',
    hint: '点击换下一个平台 ↻',
    demo: 'hot',
  },
  {
    id: 'hotmusic',
    name: '热歌榜',
    en: 'Hot Music',
    path: '/api/v1/hotmusic',
    cat: '内容',
    method: 'GET',
    desc: '实时抓取 QQ 音乐 / 网易云 / 酷狗的热歌榜，返回歌名、歌手、专辑、时长与站内链接。',
    kw: '音乐 歌曲 榜单 热歌 流行 music song qq netease kugou wangyigou',
    hint: '点击换下一个平台 ↻',
    demo: 'music',
  },
  {
    id: 'hotplay',
    name: '热播榜',
    en: 'Hot Play',
    path: '/api/v1/hotplay',
    cat: '内容',
    method: 'GET',
    desc: '电视剧 / 电影 / 综艺的大屏实时播出榜，返回排名、标题、播放指数、评分与播出平台。',
    kw: '影视 剧集 电影 综艺 榜单 播出 热播 hot play tv movie variety 欢网',
    hint: '点击换下一类榜 ↻',
    demo: 'play',
  },
  {
    id: 'hotchart',
    name: '热映榜',
    en: 'Hot Chart',
    path: '/api/v1/hotchart',
    cat: '数据',
    method: 'GET',
    desc: '猫眼专业版的实时票房榜，返回影片名、当日票房与占比、累计票房、场次与上座率。',
    kw: '电影 票房 热映 院线 排片 上座率 hot chart box office maoyan 猫眼',
    hint: '点击刷新 ↻',
    demo: 'chart',
  },
  {
    id: 'emoji',
    name: '表情包',
    en: 'Emoji',
    path: '/api/v1/emoji',
    cat: '图片',
    method: 'GET',
    desc: '返回表情包目录里的贴图清单与访问地址，目前只有 menhera 一类。',
    kw: '表情包 贴图 梗图 动图 emoji sticker menhera 猫娘',
    hint: '点击换一批 ↻',
    demo: 'emoji',
  },
  {
    id: 'avatar',
    name: '头像',
    en: 'Avatar',
    path: '/api/v1/avatar',
    cat: '图片',
    method: 'GET',
    desc: '返回头像资源清单与访问地址，按 boy / girl / anime 三类分目录存放。',
    kw: '头像 男生 女生 动漫 默认头像 avatar boy girl anime',
    hint: '点击换一批 ↻',
    demo: 'avatar',
  },
  {
    id: 'images',
    name: '图片',
    en: 'Images',
    path: '/api/v1/images',
    cat: '图片',
    method: 'GET',
    desc: '返回图库资源清单与访问地址，按 beauty / pretty 两类分目录存放。',
    kw: '图片 图库 人像 美女 写真 images tuku beauty pretty',
    hint: '点击换一张 ↻',
    demo: 'image',
  },
];

/** 数组顺序即 chip 渲染顺序 */
export const API_CATEGORIES = ['内容', '图片', '数据'] as const;

/** 已有 app/api/v1/<id>/route.ts 的接口 id；文档状态与服务端状态都以此为准，避免后台、广场、文档三处口径不一 */
export const IMPLEMENTED_API_IDS: readonly string[] = [
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

/** 传入后台可编辑的目录即可复用到非种子数据 */
export function categoryCounts(items: readonly ApiCatalogItem[] = API_CATALOG): Record<string, number> {
  const map: Record<string, number> = {};
  for (const item of items) map[item.cat] = (map[item.cat] ?? 0) + 1;
  return map;
}

export function findApiById(id: string): ApiCatalogItem | undefined {
  return API_CATALOG.find((item) => item.id === id);
}
