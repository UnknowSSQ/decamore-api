/**
 * 气象预警的码表。上游 nmc 的 findAlarm 只认中文筛选值——这些值是从
 * www.nmc.cn/publish/alarm.html 页面上三个 select 的 option value 里抓的（2026-10-11 实测：
 * 类型 13 项、等级 4 项、区域 31 项）。本站沿用「URL 里不出现汉字」的口径，对外给拼音键，
 * 服务端再翻成中文，所以加一项要同时改 types/domain.ts 的联合类型。
 */
import type { WarningLevel, WarningSignalType } from '@/types';

export const WARNING_SIGNAL_TYPES = [
  { key: 'typhoon', value: '台风' },
  { key: 'rainstorm', value: '暴雨' },
  { key: 'snowstorm', value: '暴雪' },
  { key: 'coldwave', value: '寒潮' },
  { key: 'gale', value: '大风' },
  { key: 'duststorm', value: '沙尘暴' },
  { key: 'hightemp', value: '高温' },
  { key: 'drought', value: '干旱' },
  { key: 'thunder', value: '雷电' },
  { key: 'hail', value: '冰雹' },
  { key: 'frost', value: '霜冻' },
  { key: 'fog', value: '大雾' },
  { key: 'roadice', value: '道路结冰' },
] as const satisfies readonly { key: WarningSignalType; value: string }[];

export const WARNING_LEVELS = [
  { key: 'blue', value: '蓝色' },
  { key: 'yellow', value: '黄色' },
  { key: 'orange', value: '橙色' },
  { key: 'red', value: '红色' },
] as const satisfies readonly { key: WarningLevel; value: string }[];

export const WARNING_REGIONS = [
  { key: 'beijing', value: '北京市' },
  { key: 'shanghai', value: '上海市' },
  { key: 'tianjin', value: '天津市' },
  { key: 'chongqing', value: '重庆市' },
  { key: 'heilongjiang', value: '黑龙江省' },
  { key: 'jilin', value: '吉林省' },
  { key: 'liaoning', value: '辽宁省' },
  { key: 'neimenggu', value: '内蒙古自治区' },
  { key: 'hebei', value: '河北省' },
  // 山西与陕西同拼音，上游按全称区分，这里也让陕西多一个 a，免得两个省撞键
  { key: 'shanxi', value: '山西省' },
  { key: 'shaanxi', value: '陕西省' },
  { key: 'shandong', value: '山东省' },
  { key: 'xinjiang', value: '新疆维吾尔自治区' },
  { key: 'xizang', value: '西藏自治区' },
  { key: 'qinghai', value: '青海省' },
  { key: 'gansu', value: '甘肃省' },
  { key: 'ningxia', value: '宁夏回族自治区' },
  { key: 'henan', value: '河南省' },
  { key: 'jiangsu', value: '江苏省' },
  { key: 'hubei', value: '湖北省' },
  { key: 'zhejiang', value: '浙江省' },
  { key: 'anhui', value: '安徽省' },
  { key: 'fujian', value: '福建省' },
  { key: 'jiangxi', value: '江西省' },
  { key: 'hunan', value: '湖南省' },
  { key: 'guizhou', value: '贵州省' },
  { key: 'sichuan', value: '四川省' },
  { key: 'guangdong', value: '广东省' },
  { key: 'yunnan', value: '云南省' },
  { key: 'guangxi', value: '广西壮族自治区' },
  { key: 'hainan', value: '海南省' },
] as const satisfies readonly { key: string; value: string }[];

export type WarningRegionKey = (typeof WARNING_REGIONS)[number]['key'];

/** 反查表：筛选时键翻成中文交给上游，回来的标题再翻成键 */
export const SIGNAL_TYPE_BY_VALUE = new Map<string, WarningSignalType>(
  WARNING_SIGNAL_TYPES.map((one) => [one.value, one.key]),
);
export const LEVEL_BY_VALUE = new Map<string, WarningLevel>(WARNING_LEVELS.map((one) => [one.value, one.key]));
