/**
 * 中国天气网的城市码表。官方那份 city.xml 只能取到 34 个省级单位，市表端点实测已坏
 * （返回「网页无法访问」的 HTML），所以这份表按 101 + 省码 + 市码 的规律整理，
 * 39 个码逐个实测过 d1.weather.com.cn/sk_2d 返回 200 且 cityname 与本地名字一致。
 * key 是对外参数，取拼音（上游的 nameen 有几处不一致：呼和浩特是 huhehaote、台北是 taibeixian）。
 */
export const WEATHER_CITIES = [
  { key: 'beijing', code: '101010100', name: '北京' },
  { key: 'shanghai', code: '101020100', name: '上海' },
  { key: 'tianjin', code: '101030100', name: '天津' },
  { key: 'chongqing', code: '101040100', name: '重庆' },
  { key: 'haerbin', code: '101050101', name: '哈尔滨' },
  { key: 'changchun', code: '101060101', name: '长春' },
  { key: 'shenyang', code: '101070101', name: '沈阳' },
  { key: 'dalian', code: '101070201', name: '大连' },
  { key: 'huhehaote', code: '101080101', name: '呼和浩特' },
  { key: 'shijiazhuang', code: '101090101', name: '石家庄' },
  { key: 'taiyuan', code: '101100101', name: '太原' },
  { key: 'xian', code: '101110101', name: '西安' },
  { key: 'jinan', code: '101120101', name: '济南' },
  { key: 'qingdao', code: '101120201', name: '青岛' },
  { key: 'wulumuqi', code: '101130101', name: '乌鲁木齐' },
  { key: 'lasa', code: '101140101', name: '拉萨' },
  { key: 'xining', code: '101150101', name: '西宁' },
  { key: 'lanzhou', code: '101160101', name: '兰州' },
  { key: 'yinchuan', code: '101170101', name: '银川' },
  { key: 'zhengzhou', code: '101180101', name: '郑州' },
  { key: 'nanjing', code: '101190101', name: '南京' },
  { key: 'wuhan', code: '101200101', name: '武汉' },
  { key: 'hangzhou', code: '101210101', name: '杭州' },
  { key: 'ningbo', code: '101210401', name: '宁波' },
  { key: 'hefei', code: '101220101', name: '合肥' },
  { key: 'fuzhou', code: '101230101', name: '福州' },
  { key: 'xiamen', code: '101230201', name: '厦门' },
  { key: 'nanchang', code: '101240101', name: '南昌' },
  { key: 'changsha', code: '101250101', name: '长沙' },
  { key: 'guiyang', code: '101260101', name: '贵阳' },
  { key: 'chengdu', code: '101270101', name: '成都' },
  { key: 'guangzhou', code: '101280101', name: '广州' },
  { key: 'shenzhen', code: '101280601', name: '深圳' },
  { key: 'kunming', code: '101290101', name: '昆明' },
  { key: 'nanning', code: '101300101', name: '南宁' },
  { key: 'haikou', code: '101310101', name: '海口' },
  { key: 'hongkong', code: '101320101', name: '香港' },
  { key: 'macao', code: '101330101', name: '澳门' },
  { key: 'taibei', code: '101340101', name: '台北' },
] as const;

export type WeatherCity = (typeof WEATHER_CITIES)[number];
export type WeatherCityKey = WeatherCity['key'];
