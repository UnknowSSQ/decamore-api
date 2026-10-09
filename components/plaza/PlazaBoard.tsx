'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { API_CATALOG, API_CATEGORIES, categoryCounts } from '@/constants/api-catalog';
import { PLAZA_CARD_DEFAULT_SPAN, cardSpan } from '@/constants/card-layout';
import { rankCatalog } from '@/utils/search';
import { useDebouncedValue, useHotkey } from '@/hooks/useUi';
import { PlazaCard } from './PlazaCard';
import { EmptyState } from '@/components/ui';
import { Reveal } from '@/components/shared/Reveal';
import type { ApiCatalogItem, CardSpan } from '@/types';

interface PlazaBoardProps {
  /** 由上层 Server Component 传进来，首屏文案留在服务端 HTML 里 */
  hero?: ReactNode;
  /** 默认兜到静态目录，没传数据也能渲染（单测、旧调用点） */
  items?: readonly ApiCatalogItem[];
  /** 按 id 匹配而不是按顺序，所以筛选改变可见集合也不会串位 */
  layout?: readonly CardSpan[];
}

export function PlazaBoard({ hero, items = API_CATALOG, layout = [] }: PlazaBoardProps) {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [seeds, setSeeds] = useState<Record<string, number>>({});
  const [flashId, setFlashId] = useState<string | null>(null);
  
  const debouncedKeyword = useDebouncedValue(keyword, 180);
  const searchRef = useRef<HTMLInputElement>(null);
  const counts = useMemo(() => categoryCounts(items), [items]);
  
  const ranked = useMemo(
    () => rankCatalog(items, debouncedKeyword, category ?? undefined),
    [items, debouncedKeyword, category]
  );
  
  useHotkey('/', (e) => {
    e.preventDefault();
    searchRef.current?.focus();
    searchRef.current?.select();
  });
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    
    // 深链可能是 URL 编码的（如 /plaza#%E4%B8%80%E8%A8%80），
    // 解码后同时用于查找元素和高亮比对，否则 flashId 与 item.id 对不上。
    const targetId = decodeURIComponent(hash);
    const target = document.getElementById(targetId);
    if (!target) return;
    
    // 目标卡片可能被当前筛选藏着，先清空再滚
    setKeyword('');
    setCategory(null);
    
    setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setFlashId(targetId);
      setTimeout(() => setFlashId(null), 1800);
    }, 100);
  }, []);
  
  const refreshCard = useCallback((id: string) => {
    setSeeds((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  }, []);
  
  const clearFilters = useCallback(() => {
    setKeyword('');
    setCategory(null);
    searchRef.current?.focus();
  }, []);
  
  const isFiltering = debouncedKeyword || category;
  
  return (
    <>
      <section className="plaza-hero">
        <div className="wrap plaza-hero-inner">
          {hero}
          <Reveal delay={0.16} className="mt-[38px]">
          <div className="relative flex h-14 max-w-[620px] items-center gap-3 rounded-full border border-line bg-surface px-4 shadow-sm transition-all focus-within:border-primary/40 focus-within:shadow-md">
            <svg
              aria-hidden
              className="shrink-0 text-muted"
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M16.5 16.5L21 21" />
            </svg>
            <input
              ref={searchRef}
              type="search"
              className="min-w-0 flex-1 border-0 bg-transparent text-[14px] text-ink placeholder:text-muted/60 focus:outline-none"
              placeholder="搜索接口，如 一言 / uuid / 颜色 / 汇率 / random"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              aria-label="搜索接口"
              autoComplete="off"
              spellCheck={false}
            />
            {keyword && (
              <button
                type="button"
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-bg-soft text-[15px] text-muted transition-colors hover:bg-line hover:text-ink"
                onClick={() => setKeyword('')}
                aria-label="清空搜索"
              >
                ×
              </button>
            )}
            <span className="shrink-0 rounded-md border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted max-[760px]:hidden">
              /
            </span>
          </div>
        
          <div className="mt-5 flex flex-wrap items-center gap-2.5" role="group" aria-label="按分类筛选">
            <button
              type="button"
              className={`rounded-full border px-4 py-2 text-[12px] transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary ${
                !category ? 'bg-primary text-surface border-primary' : 'border-line bg-transparent text-[#5b635c]'
              }`}
              onClick={() => setCategory(null)}
              aria-pressed={!category}
            >
              全部
              <span className="ml-1.5 font-mono text-[10px] opacity-60">{API_CATALOG.length}</span>
            </button>
            {API_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`rounded-full border px-4 py-2 text-[12px] transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary ${
                  category === cat ? 'bg-primary text-surface border-primary' : 'border-line bg-transparent text-[#5b635c]'
                }`}
                onClick={() => setCategory(category === cat ? null : cat)}
                aria-pressed={category === cat}
              >
                {cat}
                <span className="ml-1.5 font-mono text-[10px] opacity-60">{counts[cat] ?? 0}</span>
              </button>
            ))}
          </div>
        
          <p className="mt-6 flex flex-wrap items-center gap-3 text-[12px] text-muted" aria-live="polite">
            {isFiltering ? (
              <>
                <span>
                  找到 <strong className="font-semibold text-ink">{ranked.length}</strong> 个接口
                </span>
                {debouncedKeyword && (
                  <span>· 关键词「{debouncedKeyword}」</span>
                )}
                {category && <span>· {category}</span>}
                <button
                  type="button"
                  className="font-semibold text-primary hover:underline"
                  onClick={clearFilters}
                >
                  清空筛选 ×
                </button>
              </>
            ) : (
              <span>
                共 <strong className="font-semibold text-ink">{API_CATALOG.length}</strong> 个接口 · 全部免费，无需鉴权
              </span>
            )}
          </p>
          </Reveal>
        </div>
      </section>
      
      <section
        className="bg-bg-soft pt-dsp-6 pb-dsp-7 max-[760px]:pt-[44px] max-[760px]:pb-[70px]"
        id="plaza"
        aria-labelledby="plaza-title"
      >
        <div className="wrap">
          {ranked.length === 0 ? (
            <EmptyState
              mark="⌕"
              title="没有找到匹配的接口"
              description={
                <>
                  换个关键词试试，例如「热搜」「壁纸」「榜单」，或直接搜索路径片段{' '}
                  <code className="rounded bg-bg-soft px-1 py-0.5 font-mono text-[11px]">uuid</code>。
                </>
              }
              action={
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-[13px] font-medium text-surface shadow-soft transition-all hover:-translate-y-0.5 hover:bg-primary-dark"
                  onClick={clearFilters}
                >
                  查看全部接口 <span aria-hidden>↗</span>
                </button>
              }
              className="min-h-[320px] border-dashed"
            />
          ) : (
            <div className="grid grid-cols-1 gap-3.5 min-[540px]:grid-cols-2 md:grid-cols-12">
              {ranked.map(({ item }, i) => (
                <PlazaCard
                  key={item.id}
                  item={item}
                  seed={seeds[item.id] ?? 0}
                  onRefresh={() => refreshCard(item.id)}
                  index={i}
                  keyword={debouncedKeyword}
                  flashing={flashId === item.id}
                  span={cardSpan(layout, item.id, PLAZA_CARD_DEFAULT_SPAN)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
