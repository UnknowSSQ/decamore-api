/**
 * 公开接口的入参校验（免鉴权 GET），与控制台写接口的 admin.schema.ts 分开：
 * 前者的取值是对外契约的一部分，改动要同步 /docs；后者只在同源后台内部流转。
 */
import { z } from 'zod';

import type {
  AvatarType,
  EmojiType,
  HotMusicPlatform,
  HotPlayType,
  HotSearchPlatform,
  ImageType,
  WallpaperType,
} from '@/types';
import { apiCategorySchema, httpMethodSchema, keywordSchema } from './common';

/**
 * 每个取值表都写成 satisfies 领域别名的 const 元组：zod 枚举、静态资源目录白名单、
 * 返回体的联合类型共享同一份字面量，少一处重复就少一次漂移。
 */
export const WALLPAPER_TYPES = ['pc', 'mobile', 'bing'] as const satisfies readonly WallpaperType[];
export const HOT_SEARCH_PLATFORMS = ['weibo', 'douyin', 'baidu', 'zhihu'] as const satisfies readonly HotSearchPlatform[];
export const HOT_MUSIC_PLATFORMS = ['qq', 'netease', 'kugou'] as const satisfies readonly HotMusicPlatform[];
export const HOT_PLAY_TYPES = ['tv', 'movie', 'variety'] as const satisfies readonly HotPlayType[];
export const EMOJI_TYPES = ['menhera'] as const satisfies readonly EmojiType[];
export const AVATAR_TYPES = ['boy', 'girl', 'anime'] as const satisfies readonly AvatarType[];
export const IMAGE_TYPES = ['beauty', 'pretty'] as const satisfies readonly ImageType[];

/** 空串等价于不传：显式带 ?type= 的空值不该被判成非法参数 */
const optionalParam = <S extends z.ZodTypeAny>(schema: S) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

/**
 * 截断条数。刻意「可选且无默认」：不传就按全量返回，
 * 给公开接口加默认 limit 会静默改变既有调用方拿到的结果。
 */
const limitParam = optionalParam(z.coerce.number().int().min(1).max(100));

export const plazaQuerySchema = z.object({
  keyword: keywordSchema,
  category: apiCategorySchema.optional(),
  method: httpMethodSchema.optional(),
});

export const wallpaperTypeSchema = z.enum(WALLPAPER_TYPES, {
  errorMap: () => ({ message: 'type 只能是 pc、mobile 或 bing' }),
});

export const wallpaperQuerySchema = z.object({
  /** 不传时三类等概率随机；本接口一次只回一条，所以没有 limit */
  type: optionalParam(wallpaperTypeSchema),
});

export const hotsearchPlatformSchema = z.enum(HOT_SEARCH_PLATFORMS, {
  errorMap: () => ({ message: 'platform 只能是 weibo、douyin、baidu 或 zhihu' }),
});

export const hotsearchQuerySchema = z.object({
  platform: optionalParam(hotsearchPlatformSchema),
  /** 只取前 N 条；不传为全量 */
  limit: limitParam,
});

export const hotmusicPlatformSchema = z.enum(HOT_MUSIC_PLATFORMS, {
  errorMap: () => ({ message: 'platform 只能是 qq、netease 或 kugou' }),
});

export const hotmusicQuerySchema = z.object({
  platform: optionalParam(hotmusicPlatformSchema),
  /** 只取前 N 条；不传为全量 */
  limit: limitParam,
});

export const hotplayTypeSchema = z.enum(HOT_PLAY_TYPES, {
  errorMap: () => ({ message: 'type 只能是 tv、movie 或 variety' }),
});

export const hotplayQuerySchema = z.object({
  type: optionalParam(hotplayTypeSchema),
  /** 只取前 N 条；不传为全量 */
  limit: limitParam,
});

/** 热映榜没有类型参数，只有截断条数 */
export const hotchartQuerySchema = z.object({
  /** 只取前 N 条；不传为全量 */
  limit: limitParam,
});

export const emojiTypeSchema = z.enum(EMOJI_TYPES, {
  errorMap: () => ({ message: 'type 只能是 menhera（表情包目前只有这一类）' }),
});

export const avatarTypeSchema = z.enum(AVATAR_TYPES, {
  errorMap: () => ({ message: 'type 只能是 boy、girl 或 anime' }),
});

export const imageTypeSchema = z.enum(IMAGE_TYPES, {
  errorMap: () => ({ message: 'type 只能是 beauty 或 pretty' }),
});

/** 这三个接口的 type 有确定默认值，缺省即随机该类 */
export const emojiQuerySchema = z.object({
  type: z.preprocess((value) => (value === '' ? undefined : value), emojiTypeSchema.optional().default('menhera')),
  /** 只取前 N 条；不传为全量 */
  limit: limitParam,
});
export const avatarQuerySchema = z.object({
  type: z.preprocess((value) => (value === '' ? undefined : value), avatarTypeSchema.optional().default('boy')),
  /** 只取前 N 条；不传为全量 */
  limit: limitParam,
});
export const imageQuerySchema = z.object({
  type: z.preprocess((value) => (value === '' ? undefined : value), imageTypeSchema.optional().default('beauty')),
  /** 只取前 N 条；不传为全量 */
  limit: limitParam,
});
