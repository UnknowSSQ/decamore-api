'use client';
/** demo 之间的共用件：刷新机制、取数骨架、榜单常量与两个小格式化函数。
 *  版式不共用——十四个 demo 各画各的，共用的只有下面这些。 */
import { useEffect, useRef, useState } from 'react';

/** 刷新机制：父组件递增 seed，子组件的 effect 依赖它重新生成，比 useImperativeHandle 少一层 ref 穿透 */
export interface DemoProps {
  seed: number;
}

/** 榜单类卡片一律画六行：取数 limit 与渲染行数同源 */
export const DEMO_ROWS = 6;

/** 上游时间戳折成 HH:mm；解析不出来就留空，让抬头自己决定怎么兜底 */
export function clock(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/**
 * key 变了就重取，快速连点时旧请求的响应按 ignore 丢弃，不会覆盖新结果。
 * load 每帧都是新闭包，走 ref 才不用进依赖表。
 * 占位文案留给各 demo 传常量：首帧要渲染服务端也算得出的确定值，否则水合对不上（React #418）。
 */
export function useDemoFetch<T>(key: string | number, load: () => Promise<T>): { data: T | null; failed: boolean } {
  const [data, setData] = useState<T | null>(null);
  const [failed, setFailed] = useState(false);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let ignore = false;
    void (async () => {
      try {
        const next = await loadRef.current();
        if (ignore) return;
        setData(next);
        setFailed(false);
      } catch {
        if (!ignore) setFailed(true);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [key]);

  return { data, failed };
}

export function DemoFallback({ seed: _seed }: DemoProps) {
  return (
    <div className="flex items-center justify-center text-[11px] text-muted">
      演示暂不可用
    </div>
  );
}
