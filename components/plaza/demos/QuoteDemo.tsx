'use client';
import { useEffect, useState } from 'react';
import { fetchHitokoto } from '@/lib/api';
import type { HitokotoLine } from '@/types';
import type { DemoProps } from './types';

/** 首帧必须是「服务端 HTML 也能算出来的确定值」，否则水合时文本对不上（React #418）。 */
const PLACEHOLDER = '正在取一句…';

export function QuoteDemo({ seed }: DemoProps) {
  const [line, setLine] = useState<HitokotoLine | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // 快速连点时丢弃过期响应，避免后到的旧句子覆盖新句子
    let ignore = false;
    void (async () => {
      try {
        const next = await fetchHitokoto();
        if (!ignore) {
          setLine(next);
          setFailed(false);
        }
      } catch {
        if (!ignore) setFailed(true);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [seed]);

  return (
    <div className="plaza-demo-quote">
      <div className="plaza-demo-quote-mark" aria-hidden="true">&ldquo;</div>
      <div className="plaza-demo-quote-text line-clamp-6">
        {line ? line.content : failed ? '一言获取失败，点击卡片重试' : PLACEHOLDER}
      </div>
      {line && (
        <div className="plaza-demo-quote-author">
          &mdash; {line.creator}
          {line.source ? ` · ${line.source}` : ''}
        </div>
      )}
    </div>
  );
}
