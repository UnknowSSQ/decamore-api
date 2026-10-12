'use client';
/** 平台由 seed 取模得出，首帧 seed=0 恒为微博，SSR 与水合才算得出同一个值。
 *  每平台服务端缓存 60 秒，抬头显示 updatedAt 和「（缓存）」，免得榜单没变被当成点击失效 */
import { fetchHotSearch } from '@/lib/api';
import type { HotSearchItem, HotSearchPlatform } from '@/types';
import type { DemoProps } from './types';
import { DEMO_ROWS, clock, useDemoFetch } from './types';

/** 轮换顺序，与接口文档里的六个平台取值一致 */
const PLATFORM_ORDER: readonly HotSearchPlatform[] = ['weibo', 'douyin', 'baidu', 'zhihu', 'bilibili', 'toutiao'];
const PLATFORM_NAME: Record<HotSearchPlatform, string> = {
  weibo: '微博',
  douyin: '抖音',
  baidu: '百度',
  zhihu: '知乎',
  bilibili: 'B 站',
  toutiao: '今日头条',
};

/** 上游给文案就用原文（知乎「2017 万热度」），给数值就折成万 / 亿 */
function heatText(item: HotSearchItem): string {
  if (item.heatLabel) return item.heatLabel;
  if (item.heat === null) return '';
  if (item.heat >= 1e8) return `${(item.heat / 1e8).toFixed(1)} 亿`;
  if (item.heat >= 1e4) return `${Math.round(item.heat / 1e4)} 万`;
  return String(item.heat);
}

export function HotDemo({ seed }: DemoProps) {
  const platform = PLATFORM_ORDER[seed % PLATFORM_ORDER.length] as HotSearchPlatform;
  const { data: board, failed } = useDemoFetch(seed, () => fetchHotSearch(platform, DEMO_ROWS));

  return (
    <div className="plaza-demo-ranklist">
      <div className="plaza-demo-ranklist-head">
        {board
          ? `${PLATFORM_NAME[board.platform]}热榜 · ${clock(board.updatedAt)} 更新${board.cached ? '（缓存）' : ''}`
          : failed
            ? `${PLATFORM_NAME[platform]}热榜`
            : `正在取${PLATFORM_NAME[platform]}榜…`}
      </div>

      {board &&
        board.items.slice(0, DEMO_ROWS).map((item, index) => (
          <div key={`${item.rank}-${item.title}`} className="plaza-demo-ranklist-row">
            <span className={`plaza-demo-ranklist-rank${index < 2 ? ' plaza-demo-ranklist-rank-top' : ''}`}>
              {item.rank}
            </span>
            <span className="plaza-demo-ranklist-text">{item.title}</span>
            <span className="plaza-demo-ranklist-meta">{heatText(item)}</span>
          </div>
        ))}

      {!board && failed && (
        <div className="plaza-demo-ranklist-text">{PLATFORM_NAME[platform]}取不到（上游 503），点击卡片换下一个</div>
      )}
    </div>
  );
}
