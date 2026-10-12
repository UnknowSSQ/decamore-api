'use client';
/** 类别由 seed 取模得出，首帧 seed=0 恒为电视剧榜，SSR 与水合才算得出同一个值。
 *  右侧数字是欢网大屏的播放指数（不是网络热度）；抬头带榜单归属日期，上游通常只更新到 T-3 */
import { fetchHotPlay } from '@/lib/api';
import type { HotPlayType } from '@/types';
import type { DemoProps } from './types';
import { DEMO_ROWS, useDemoFetch } from './types';

const TYPE_ORDER: readonly HotPlayType[] = ['tv', 'movie', 'variety'];
const TYPE_NAME: Record<HotPlayType, string> = { tv: '电视剧榜', movie: '电影榜', variety: '综艺榜' };

/** 播放指数是整数，加千分位比折成「万」更不容易被误读成热度 */
function indexText(heat: number | null): string {
  return heat === null ? '' : heat.toLocaleString('en-US');
}

export function PlayDemo({ seed }: DemoProps) {
  const type = TYPE_ORDER[seed % TYPE_ORDER.length] as HotPlayType;
  const { data: board, failed } = useDemoFetch(seed, () => fetchHotPlay(type, DEMO_ROWS));

  return (
    <div className="plaza-demo-ranklist">
      <div className="plaza-demo-ranklist-head">
        {board
          ? `欢网 · ${TYPE_NAME[board.type]} · ${board.boardDate}${board.cached ? '（缓存）' : ''}`
          : failed
            ? TYPE_NAME[type]
            : `正在取${TYPE_NAME[type]}…`}
      </div>

      {board &&
        board.items.slice(0, DEMO_ROWS).map((item, index) => (
          <div key={`${item.rank}-${item.title}`} className="plaza-demo-ranklist-row">
            <span className={`plaza-demo-ranklist-rank${index < 2 ? ' plaza-demo-ranklist-rank-top' : ''}`}>
              {item.rank}
            </span>
            <span className="plaza-demo-ranklist-text">
              {item.title}
              {item.platforms.length ? ` — ${item.platforms.join('/')}` : ''}
            </span>
            <span className="plaza-demo-ranklist-meta">{indexText(item.heat)}</span>
          </div>
        ))}

      {!board && failed && (
        <div className="plaza-demo-ranklist-text">{TYPE_NAME[type]}取不到（上游 503），点击卡片换下一类</div>
      )}
    </div>
  );
}
