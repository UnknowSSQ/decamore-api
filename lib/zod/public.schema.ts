/**
 * 公开接口的入参校验（免鉴权 GET），与控制台写接口的 admin.schema.ts 分开：
 * 前者的取值是对外契约的一部分，改动要同步 /docs；后者只在同源后台内部流转。
 */
import { z } from 'zod';

import { GOLD_CONTRACTS, type GoldContractCode } from '@/constants/gold-contracts';
import { STOCK_MARKETS, STOCK_MAX_CODES, normalizeStockCodes } from '@/constants/stock-markets';
import { WEATHER_CITIES, type WeatherCityKey } from '@/constants/weather-cities';
import { WARNING_LEVELS, WARNING_REGIONS, WARNING_SIGNAL_TYPES } from '@/constants/warning-signals';
import type {
  AvatarType,
  EmojiType,
  HotMusicPlatform,
  HotPlayType,
  HotSearchPlatform,
  ImageType,
  PoemDynastyParam,
  WallpaperType,
  WarningLevel,
  WarningSignalType,
} from '@/types';
import { apiCategorySchema, httpMethodSchema, keywordSchema } from './common';

/**
 * 每个取值表都写成 satisfies 领域别名的 const 元组：zod 枚举、静态资源目录白名单、
 * 返回体的联合类型共享同一份字面量，少一处重复就少一次漂移。
 */
export const WALLPAPER_TYPES = ['pc', 'mobile', 'bing', 'nasa'] as const satisfies readonly WallpaperType[];
export const HOT_SEARCH_PLATFORMS = ['weibo', 'douyin', 'baidu', 'zhihu', 'bilibili', 'toutiao'] as const satisfies readonly HotSearchPlatform[];
const HOT_MUSIC_PLATFORMS = ['qq', 'netease', 'kugou'] as const satisfies readonly HotMusicPlatform[];
const HOT_PLAY_TYPES = ['tv', 'movie', 'variety'] as const satisfies readonly HotPlayType[];
export const EMOJI_TYPES = ['menhera'] as const satisfies readonly EmojiType[];
export const AVATAR_TYPES = ['boy', 'girl', 'anime'] as const satisfies readonly AvatarType[];
export const IMAGE_TYPES = ['beauty', 'pretty'] as const satisfies readonly ImageType[];
const POETRY_DYNASTIES = ['tang', 'song'] as const satisfies readonly PoemDynastyParam[];
const GOLD_CONTRACT_CODES = GOLD_CONTRACTS.map((one) => one.code);

/**
 * 参数非法时的文案由取值表生成。这几条串同时出现在 zod 的 errorMap 与各篇文档的
 * 错误码行、422 样例窗里（每篇四处），手抄一遍就多四次漂移机会——加一个平台要改五个地方。
 * 文档 import 这些常量：文档模块只被服务端组件引用，不会把 zod 带进浏览器包。
 */
const enumHint = (field: string, values: readonly string[]): string =>
  values.length === 1
    ? `${field} 只能是 ${values[0]}`
    : `${field} 只能是 ${values.slice(0, -1).join('、')} 或 ${values.at(-1)}`;

export const WALLPAPER_TYPE_HINT = enumHint('type', WALLPAPER_TYPES);
export const HOT_SEARCH_PLATFORM_HINT = enumHint('platform', HOT_SEARCH_PLATFORMS);
export const HOT_MUSIC_PLATFORM_HINT = enumHint('platform', HOT_MUSIC_PLATFORMS);
export const HOT_PLAY_TYPE_HINT = enumHint('type', HOT_PLAY_TYPES);
export const EMOJI_TYPE_HINT = `${enumHint('type', EMOJI_TYPES)}（表情包目前只有这一类）`;
export const AVATAR_TYPE_HINT = enumHint('type', AVATAR_TYPES);
export const IMAGE_TYPE_HINT = enumHint('type', IMAGE_TYPES);
export const POEM_DYNASTY_HINT = enumHint('dynasty', POETRY_DYNASTIES);
export const GOLD_CONTRACT_HINT = enumHint('contract', GOLD_CONTRACT_CODES);
export const WEATHER_CITY_HINT = `city 不在内置城市表里，用拼音键（共 ${WEATHER_CITIES.length} 个，如 beijing、hangzhou、shenzhen）`;
export const TYPHOON_ID_HINT = 'id 得是台风编号里的数字，比如列表返回的 3346033';
export const NETEASE_ID_HINT = 'id 得是数字，取网易云歌单链接里的 id';
/** 示例代码取自 constants/stock-markets.ts，加一个市场前缀这里跟着变 */
export const STOCK_CODES_HINT = `codes 是「市场前缀 + 代码」，逗号分隔最多 ${STOCK_MAX_CODES} 个，如 ${STOCK_MARKETS.map((one) => one.sample).join('、')}`;
export const WARNING_TYPE_HINT = enumHint('type', WARNING_SIGNAL_TYPES.map((one) => one.key));
export const WARNING_LEVEL_HINT = enumHint('level', WARNING_LEVELS.map((one) => one.key));
export const WARNING_REGION_HINT = `region 不在内置省级表里，用拼音键（共 ${WARNING_REGIONS.length} 个，如 beijing、guangdong、shaanxi）`;

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

const wallpaperTypeSchema = z.enum(WALLPAPER_TYPES, {
  errorMap: () => ({ message: WALLPAPER_TYPE_HINT }),
});

export const wallpaperQuerySchema = z.object({
  /** 不传时四类等概率随机；本接口一次只回一条，所以没有 limit */
  type: optionalParam(wallpaperTypeSchema),
});

const hotsearchPlatformSchema = z.enum(HOT_SEARCH_PLATFORMS, {
  errorMap: () => ({ message: HOT_SEARCH_PLATFORM_HINT }),
});

export const hotsearchQuerySchema = z.object({
  platform: optionalParam(hotsearchPlatformSchema),
  /** 只取前 N 条；不传为全量 */
  limit: limitParam,
});

const hotmusicPlatformSchema = z.enum(HOT_MUSIC_PLATFORMS, {
  errorMap: () => ({ message: HOT_MUSIC_PLATFORM_HINT }),
});

export const hotmusicQuerySchema = z.object({
  platform: optionalParam(hotmusicPlatformSchema),
  /** 只取前 N 条；不传为全量 */
  limit: limitParam,
});

const hotplayTypeSchema = z.enum(HOT_PLAY_TYPES, {
  errorMap: () => ({ message: HOT_PLAY_TYPE_HINT }),
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

const emojiTypeSchema = z.enum(EMOJI_TYPES, {
  errorMap: () => ({ message: EMOJI_TYPE_HINT }),
});

const avatarTypeSchema = z.enum(AVATAR_TYPES, {
  errorMap: () => ({ message: AVATAR_TYPE_HINT }),
});

const imageTypeSchema = z.enum(IMAGE_TYPES, {
  errorMap: () => ({ message: IMAGE_TYPE_HINT }),
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

const poetryDynastySchema = z.enum(POETRY_DYNASTIES, {
  errorMap: () => ({ message: POEM_DYNASTY_HINT }),
});

/** 古诗词：语料 300 首（唐 150 / 宋 150），一次给一首，所以没有 limit */
export const poetryQuerySchema = z.object({
  /** URL 里不出现汉字；南唐的五首按语料口径归在 song 下 */
  dynasty: optionalParam(poetryDynastySchema),
});

/**
 * 成语的 limit 与其它素材类接口刻意不同：不传是 1 条而不是全量，
 * 因为整份语料 5 万余条、约 1.2MB，全量不是给浏览器用的形状。
 * 常量放这里，路由与 schema 共用一个默认值。
 */
export const IDIOMS_DEFAULT_LIMIT = 1;

const idiomsLimitParam = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.coerce.number().int().min(1).max(100).default(IDIOMS_DEFAULT_LIMIT),
);

export const idiomsQuerySchema = z.object({
  limit: idiomsLimitParam,
  /** 按字数筛；语料实测只有 4–8 字，4 字占 47,246 条 */
  chars: optionalParam(z.coerce.number().int().min(4).max(8)),
});

/** 台风：不传 id 给编号列表，传 id 给该台风的路径点 */
export const typhoonQuerySchema = z.object({
  id: optionalParam(
    z.coerce
      .number({ invalid_type_error: 'id 得是台风编号里的数字，比如列表返回的 3346033' })
      .int('id 只能是整数')
      .positive('id 要大于 0'),
  ),
});

const CITY_KEYS = new Set<string>(WEATHER_CITIES.map((one) => one.key));
const GOLD_CODES = new Set<string>(GOLD_CONTRACT_CODES);

export const weatherQuerySchema = z.object({
  /** 大小写不敏感；不在表里当场 422，不兜底成北京 */
  city: optionalParam(
    z
      .string()
      .trim()
      .toLowerCase()
      .refine((value): value is WeatherCityKey => CITY_KEYS.has(value), {
        message: WEATHER_CITY_HINT,
      }),
  ),
});

export const goldQuerySchema = z.object({
  contract: optionalParam(
    z
      .string()
      .trim()
      // 查询串里裸写的 ?contract=Au(T+D) 会被解成「Au(T D)」，而六个合约名里没有一个含空格，
      // 所以把空格还原成加号再比对；否则 422 的文案会自相矛盾。
      .transform((value) => value.replace(/\s+/g, '+'))
      .refine((value): value is GoldContractCode => GOLD_CODES.has(value), {
        message: GOLD_CONTRACT_HINT,
      }),
  ),
});

/** 网易云热评：id 是歌单 id，不传即在内置歌单池里随机挑一个 */
export const neteaseQuerySchema = z.object({
  /** 非数字直接 422，不像参考实现那样悄悄退回默认池——传了 id 却拿到别的歌单更难解释 */
  id: optionalParam(
    z.coerce
      .number({ invalid_type_error: NETEASE_ID_HINT })
      .int('id 只能是整数')
      .positive('id 要大于 0'),
  ),
});

/**
 * 行情：逗号分隔的代码串先按码表规范化（补前缀、统一大写、去重），再校验条数。
 * 整串为空或一个都解析不出来都当场 422，不像上游那样回一行 v_pv_none_match 就算完。
 */
export const stockQuerySchema = z.object({
  codes: z
    .string({ required_error: STOCK_CODES_HINT, invalid_type_error: STOCK_CODES_HINT })
    .transform((value) => normalizeStockCodes(value.split(',')))
    .refine((list) => list.length > 0, { message: STOCK_CODES_HINT })
    .refine((list) => list.length <= STOCK_MAX_CODES, { message: `codes 最多 ${STOCK_MAX_CODES} 个` }),
});

const WARNING_TYPE_KEYS = new Set<string>(WARNING_SIGNAL_TYPES.map((one) => one.key));
const WARNING_LEVEL_KEYS = new Set<string>(WARNING_LEVELS.map((one) => one.key));
const WARNING_REGION_KEYS = new Set<string>(WARNING_REGIONS.map((one) => one.key));

/** 三个筛选条件都是可选的，空串等价于不传；条件之间是「与」 */
export const warningQuerySchema = z.object({
  type: optionalParam(
    z
      .string()
      .trim()
      .toLowerCase()
      .refine((value): value is WarningSignalType => WARNING_TYPE_KEYS.has(value), { message: WARNING_TYPE_HINT }),
  ),
  level: optionalParam(
    z
      .string()
      .trim()
      .toLowerCase()
      .refine((value): value is WarningLevel => WARNING_LEVEL_KEYS.has(value), { message: WARNING_LEVEL_HINT }),
  ),
  region: optionalParam(
    z
      .string()
      .trim()
      .toLowerCase()
      .refine((value) => WARNING_REGION_KEYS.has(value), { message: WARNING_REGION_HINT }),
  ),
  limit: limitParam,
});
