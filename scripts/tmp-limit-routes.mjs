import fs from 'node:fs';

const edits = [
  ['app/api/v1/hotsearch/route.ts', 'getHotSearch(query?.platform ?? DEFAULT_HOT_SEARCH_PLATFORM)', 'getHotSearch(query?.platform ?? DEFAULT_HOT_SEARCH_PLATFORM, query?.limit)'],
  ['app/api/v1/hotmusic/route.ts', 'getHotMusic(query?.platform ?? DEFAULT_HOT_MUSIC_PLATFORM)', 'getHotMusic(query?.platform ?? DEFAULT_HOT_MUSIC_PLATFORM, query?.limit)'],
  ['app/api/v1/hotplay/route.ts', 'getHotPlay(query?.type ?? DEFAULT_HOT_PLAY_TYPE)', 'getHotPlay(query?.type ?? DEFAULT_HOT_PLAY_TYPE, query?.limit)'],
  ['app/api/v1/emoji/route.ts', "listAssets('emoji', query.type, EMOJI_TYPES)", "listAssets('emoji', query.type, EMOJI_TYPES, query.limit)"],
  ['app/api/v1/avatar/route.ts', "listAssets('avatar', query.type, AVATAR_TYPES)", "listAssets('avatar', query.type, AVATAR_TYPES, query.limit)"],
  ['app/api/v1/images/route.ts', "listAssets('images', query.type, IMAGE_TYPES)", "listAssets('images', query.type, IMAGE_TYPES, query.limit)'],
];

for (const [file, from, to] of edits) {
  let s = fs.readFileSync(file, 'utf8');
  if (!s.includes(from)) throw new Error(`${file} 未命中：${from}`);
  s = s.split(from).join(to);
  fs.writeFileSync(file, s);
  console.log('limit 已接：', file);
}

// hotchart 此前没有 query schema，补上并接 limit
const hc = 'app/api/v1/hotchart/route.ts';
let s = fs.readFileSync(hc, 'utf8');
const before = s;
s = s.replace(
  "import { getHotChart } from '@/lib/server/hotchart';",
  "import { hotchartQuerySchema } from '@/lib/zod/public.schema';\nimport { getHotChart } from '@/lib/server/hotchart';",
);
s = s.replace(/(\n\s+)route: '\/api\/v1\/hotchart',/, '$1query: hotchartQuerySchema,$1route: \'/api/v1/hotchart\',');
if (s === before) throw new Error('hotchart route.ts 结构不认识，需要人工看');
fs.writeFileSync(hc, s);
console.log('limit 已接：', hc);
