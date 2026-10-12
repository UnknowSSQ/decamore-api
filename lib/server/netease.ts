/**
 * 网易云热评：从歌单里随机抽一首，再取这首歌的一条热评。
 * 三步上游：歌单曲目（缓存 10 分钟）→ 歌曲详情 → 热评。后两步每次请求现取，
 * 因为「随机一条」不能被缓存钉死。
 *
 * 三个接口都不需要 cookie 与签名：评论走 music.163.com/api/v1/resource/comments（PC 站早先的
 * 公开读接口，与 weapi 同一份数据、同一个 total）。参考实现用的 weapi 表单签名因此没有搬过来。
 */
import 'server-only';

import { NETEASE_PLAYLISTS } from '@/constants/netease-playlists';
import { createBoardCache } from './board-cache';
import { type NeteaseComment } from '@/types';
import { UpstreamUnavailableError } from './errors';
import { asArray, asRecord, getUpstreamJson, num, postUpstreamForm, str } from './upstream';
import { pickOne } from '@/utils/random';

/** 一首歌最多试几首轮换曲；热评为空的老歌与纯音乐都不少见，参考实现是无界递归 */
const MAX_TRACK_ATTEMPTS = 3;

/** 歌单曲目列表的缓存时长：曲目变化很慢，评论不缓存 */
const TRACK_TTL_MS = 10 * 60_000;

const fetchTrackIds = createBoardCache<string, number[], number[]>({
  slot: '__decamoreNeteaseTracks',
  ttlMs: TRACK_TTL_MS,
  fetch: async (playlistId) => {
    const json = await postUpstreamForm(
      'https://music.163.com/api/v6/playlist/detail',
      { s: 100, id: playlistId, n: 100, t: 100 },
      'https://music.163.com/',
      { 'user-agent': 'NeteaseMusic/8.6.31.211201171945' },
    );
    return asArray(asRecord(json.playlist)?.trackIds)
      .map((raw) => num(asRecord(raw)?.id))
      .filter((id): id is number => id !== null);
  },
});

async function fetchSongBrief(songId: number) {
  const json = await getUpstreamJson(
    `https://music.163.com/api/song/detail/?id=${songId}&ids=%5B${songId}%5D&csrf_token=`,
    'https://music.163.com/',
  );
  const song = asRecord(asArray(json.songs)[0]);
  const name = str(song?.name);
  if (!song || !name) return null;
  return {
    song: name,
    artist: str(asArray(song.artists).map((one) => str(asRecord(one)?.name)).filter(Boolean)[0]),
    cover: str(asRecord(song.album)?.picUrl),
  };
}

/** 热评条数由上游决定：实测 48 首里 40 首给满 15 条，其余 1–13 条，limit 写 20 也只是上限 */
async function fetchHotComment(songId: number) {
  const json = await getUpstreamJson(
    `https://music.163.com/api/v1/resource/comments/R_SO_4_${songId}?total=true&limit=20&offset=0`,
    'https://music.163.com/',
  );
  const hot = asArray(json.hotComments).map(asRecord).filter((one): one is Record<string, unknown> => one !== null);
  if (hot.length === 0) return null;
  const picked = pickOne(hot);
  const user = asRecord(picked.user);
  return {
    comment: str(picked.content),
    nickname: str(user?.nickname),
    avatar: str(user?.avatarUrl),
    likedCount: num(picked.likedCount) ?? 0,
    timeLabel: str(picked.timeStr),
    commentTotal: num(json.total) ?? hot.length,
  };
}

/**
 * 从歌单里换曲重试直到拿到一条热评。热评为空是常态（纯音乐、新歌、下架歌），
 * 参考实现对此递归无界，最坏会把整条链路重跑到底栈溢出。
 */
export async function randomNeteaseComment(playlistId?: number): Promise<NeteaseComment> {
  const listId = playlistId ?? pickOne(NETEASE_PLAYLISTS).id;

  let trackIds: number[];
  try {
    trackIds = await fetchTrackIds(String(listId));
  } catch (error) {
    throw new UpstreamUnavailableError('网易云热评', error instanceof Error ? error.message : String(error));
  }
  if (trackIds.length === 0) throw new UpstreamUnavailableError('网易云热评', `歌单 ${listId} 没有可用曲目`);

  let lastReason = '';
  for (let attempt = 0; attempt < MAX_TRACK_ATTEMPTS; attempt += 1) {
    const songId = pickOne(trackIds);
    try {
      // 两个查询都只依赖 songId，串行就白等一个来回（实测省掉约 150–250ms）
      const [brief, comment] = await Promise.all([fetchSongBrief(songId), fetchHotComment(songId)]);
      if (!brief || !comment) {
        lastReason = `歌曲 ${songId} 没有可用热评`;
        continue;
      }
      return { songId, playlistId: listId, ...brief, ...comment };
    } catch (error) {
      lastReason = error instanceof Error ? error.message : String(error);
    }
  }
  throw new UpstreamUnavailableError('网易云热评', `歌单 ${listId} 连续 ${MAX_TRACK_ATTEMPTS} 首先，${lastReason}`);
}
