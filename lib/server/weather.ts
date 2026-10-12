/**
 * 城市实况天气：中国天气网的 d1 端点，免 key。响应是 `var dataSK={...}`，
 * 由 upstream.ts 的 JSON 收敛负责剥壳；请求要带站内 referer，否则拿不到数据。
 */
import 'server-only';

import { WEATHER_CITIES, type WeatherCity } from '@/constants/weather-cities';
import { asRecord, getUpstreamJson, num, str } from './upstream';
import { createBoardCache } from './board-cache';
import { type WeatherNow } from '@/types';
import { UpstreamUnavailableError } from './errors';

const REFERER = 'https://www.weather.com.cn/';
/** 实况本身十几分钟才变一次，5 分钟既跟得上又不会把上游打爆 */
export const WEATHER_TTL_MS = 5 * 60_000;

const BY_KEY = new Map<string, WeatherCity>(WEATHER_CITIES.map((one) => [one.key, one]));

async function fetchNow(city: WeatherCity): Promise<WeatherNow> {
  const json = await getUpstreamJson(`https://d1.weather.com.cn/sk_2d/${city.code}.html`, REFERER, {
    'x-requested-with': 'XMLHttpRequest',
  });
  const raw = asRecord(json);
  if (!raw || !str(raw.cityname)) throw new Error(`城市码 ${city.code} 没有返回实况数据`);
  return {
    key: city.key,
    city: str(raw.cityname),
    code: str(raw.city) || city.code,
    temp: num(raw.temp),
    tempf: num(raw.tempf),
    weather: str(raw.weather),
    weatherEn: str(raw.weathere),
    windDir: str(raw.WD),
    windDirEn: str(raw.wde),
    windPower: str(raw.WS),
    windSpeed: str(raw.wse),
    humidity: str(raw.SD),
    pressure: num(raw.qy),
    visibility: str(raw.njd),
    aqi: num(raw.aqi),
    rain: str(raw.rain),
    time: str(raw.time),
    dateLabel: str(raw.date),
    limitNumber: str(raw.limitnumber),
    cached: false,
  };
}

const resolveNow = createBoardCache<string, WeatherNow, WeatherNow>({
  slot: '__decamoreWeatherNow',
  ttlMs: WEATHER_TTL_MS,
  fetch: async (key) => {
    const city = BY_KEY.get(key);
    if (!city) throw new UpstreamUnavailableError('城市实况天气', `不认识的城市键 ${key}`);
    try {
      return await fetchNow(city);
    } catch (error) {
      throw new UpstreamUnavailableError('城市实况天气', error instanceof Error ? error.message : String(error));
    }
  },
});

export function getWeatherNow(key: string): Promise<WeatherNow> {
  return resolveNow(key);
}
