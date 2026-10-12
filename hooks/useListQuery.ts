'use client';
/** 服务端分页列表的公共状态：关键词防抖、条件变化回到第一页、把当前条件汇成一份可比对的 query */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDebouncedValue } from './useUi';
import { useRequest, type UseRequestResult } from './useRequest';
import type { SortState } from '@/types';

interface ListQueryState<TFilters> {
  /** 已防抖的关键词，build 里用这个值 */
  keyword: string;
  filters: TFilters;
  sort: SortState;
  page: number;
  pageSize: number;
}

interface UseListQueryResult<TQuery, TItem, TFilters> extends Pick<
    UseRequestResult<[TQuery], TItem>,
    'data' | 'loading' | 'pending' | 'error' | 'refetch' | 'setData'
  > {
  /** 用当前条件重发一次，重试按钮与增删改后的刷新都调它 */
  reload: () => Promise<TItem | undefined>;
  keyword: string;
  setKeyword: (value: string) => void;
  filters: TFilters;
  setFilter: <K extends keyof TFilters>(key: K, value: TFilters[K]) => void;
  sort: SortState;
  setSort: (value: SortState) => void;
  page: number;
  setPage: (value: number) => void;
  pageSize: number;
  setPageSize: (value: number) => void;
}

export function useListQuery<TQuery, TItem, TFilters extends object>(options: {
  fetcher: (query: TQuery) => Promise<TItem>;
  initialFilters: TFilters;
  initialSort: SortState;
  initialPageSize?: number;
  /** 从 URL 参数带进来的初始关键词 */
  initialKeyword?: string;
  debounceMs?: number;
  /** 内部状态 → 后端入参；只做纯映射，别在这里发请求 */
  build: (state: ListQueryState<TFilters>) => TQuery;
}): UseListQueryResult<TQuery, TItem, TFilters> {
  const { fetcher, initialFilters, initialSort, initialPageSize = 20, initialKeyword = '', debounceMs = 200, build } = options;

  const [keyword, setKeywordRaw] = useState(initialKeyword);
  const [filters, setFilters] = useState<TFilters>(initialFilters);
  const [sort, setSortRaw] = useState<SortState>(initialSort);
  const [page, setPageRaw] = useState(1);
  const [pageSize, setPageSizeRaw] = useState(initialPageSize);

  const debouncedKeyword = useDebouncedValue(keyword, debounceMs);

  /** 改条件必然换一批结果，留在第 3 页看新筛选没有意义，所以只有翻页 setter 不动 page */
  const setKeyword = useCallback((value: string) => {
    setKeywordRaw(value);
    setPageRaw(1);
  }, []);
  const setFilter = useCallback(<K extends keyof TFilters>(key: K, value: TFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPageRaw(1);
  }, []);
  const setSort = useCallback((value: SortState) => {
    setSortRaw(value);
    setPageRaw(1);
  }, []);
  const setPage = useCallback((value: number) => setPageRaw(value), []);
  const setPageSize = useCallback((value: number) => {
    setPageSizeRaw(value);
    setPageRaw(1);
  }, []);

  const state: ListQueryState<TFilters> = { keyword: debouncedKeyword, filters, sort, page, pageSize };

  // build 每次渲染都是新函数，直接当依赖会让 query 每帧都变、effect 无限重发；按状态快照重算
  const buildRef = useRef(build);
  buildRef.current = build;
  const signature = JSON.stringify([debouncedKeyword, filters, sort, page, pageSize]);
  const query = useMemo(() => buildRef.current(state), [signature]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, loading, pending, error, run, refetch, setData } = useRequest<[TQuery], TItem>(fetcher);

  // 首屏与后续条件变化都走这一条路径，不需要 immediate，也不会同一页打两遍
  useEffect(() => {
    void run(query);
  }, [query, run]);

  const reload = useCallback(() => run(query), [run, query]);

  return {
    data,
    loading,
    pending,
    error,
    refetch,
    setData,
    reload,
    keyword,
    setKeyword,
    filters,
    setFilter,
    sort,
    setSort,
    page,
    setPage,
    pageSize,
    setPageSize,
  };
}
