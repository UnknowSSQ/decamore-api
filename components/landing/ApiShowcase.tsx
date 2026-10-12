/** 展示哪些接口、每张卡占几列几行都由后台「网站设置 · 首页 Live 卡片布局」决定，
 *  卡片本体复用广场的 PlazaCard */
'use client';

import { useState } from 'react';

import { Reveal } from '@/components/shared/Reveal';
import { PlazaCard } from '@/components/plaza/PlazaCard';
import type { ApiCatalogItem, CardSpan } from '@/types';

interface LiveCardEntry {
  item: ApiCatalogItem;
  span: CardSpan;
}

export function ApiShowcase({ entries }: { entries: readonly LiveCardEntry[] }) {
  // 与 PlazaBoard 同一套刷新机制：seed 自增驱动 demo 重新生成
  const [seeds, setSeeds] = useState<Record<string, number>>({});
  const refresh = (id: string) => setSeeds((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));

  return (
    <section className="bg-bg-soft py-[104px]" id="apis">
      <div className="wrap">
        <Reveal>
          <div className="mb-12 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="kicker kicker--line mb-3.5 text-[11px]">Live APIs</p>
              <h2 className="mb-0 text-[clamp(30px,3.4vw,42px)] font-medium leading-[1.25] tracking-[-0.045em] text-ink">
                实时接口广场
              </h2>
            </div>
            <p className="mb-0 max-w-[380px] text-[13px] leading-[1.85] text-muted">
              不止看响应，更看接口真正做了什么——下面都是会动的真实演示。
            </p>
          </div>
        </Reveal>

        {entries.length === 0 ? (
          <Reveal>
            <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-[28px] border border-dashed border-line bg-surface px-6 text-center">
              <p className="mb-0 text-[13px] font-medium text-ink">首页暂未选择要展示的接口</p>
              <p className="mb-0 text-[12px] leading-relaxed text-muted">
                在控制台「网站设置 · 首页 Live 卡片布局」里从接口车单加入即可。
              </p>
            </div>
          </Reveal>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-12">
            {entries.map(({ item, span }, index) => (
              <PlazaCard
                key={item.id}
                item={item}
                seed={seeds[item.id] ?? 0}
                onRefresh={() => refresh(item.id)}
                index={index}
                keyword=""
                span={span}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
