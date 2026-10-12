'use client';
/**
 * 台风：先取编号列表，再按 seed 轮换取一个台风的路径，画最近六个时次。
 * 列表本身变化很慢，值得每次点卡片都换一条路径看看。
 */
import { fetchTyphoonList, fetchTyphoonTrack } from '@/lib/api';
import type { DemoProps } from './types';
import { DEMO_ROWS, useDemoFetch } from './types';

const PLACEHOLDER = '正在取台风列表…';

export function TyphoonDemo({ seed }: DemoProps) {
  const { data: board, failed } = useDemoFetch(seed, async () => {
    const list = await fetchTyphoonList();
    const picked = list.list[seed % list.list.length];
    if (!picked) return null;
    const track = await fetchTyphoonTrack(picked.id);
    return { picked, points: track.points.slice(-DEMO_ROWS).reverse() };
  });

  if (failed) {
    return (
      <div className="plaza-demo-ranklist">
        <div className="plaza-demo-ranklist-head">台风信息取不到（上游 503）</div>
        <div className="plaza-demo-ranklist-text">点击卡片重试</div>
      </div>
    );
  }

  return (
    <div className="plaza-demo-ranklist">
      <div className="plaza-demo-ranklist-head">
        {board
          ? `${board.picked.cname}（${board.picked.name} ${board.picked.code}）· ${board.picked.active ? '在架' : '已停编'}`
          : PLACEHOLDER}
      </div>
      {board &&
        board.points.map((point, index) => (
          <div key={point.time} className="plaza-demo-ranklist-row">
            <span className={`plaza-demo-ranklist-rank${index === 0 ? ' plaza-demo-ranklist-rank-top' : ''}`}>
              {index === 0 ? '最新' : `-${index}×3h`}
            </span>
            <span className="plaza-demo-ranklist-text">
              {point.strengthLabel ?? point.strength}
              {point.pressure !== null ? ` ${point.pressure}hPa` : ''}
            </span>
            <span className="plaza-demo-ranklist-meta">
              {point.lon.toFixed(1)}°E {point.lat.toFixed(1)}°N
            </span>
          </div>
        ))}
    </div>
  );
}
