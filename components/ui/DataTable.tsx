'use client';
/** 排序、分页都只发事件，数据与状态由调用方（或服务端）持有 */
import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';
import type { SortState, TableColumn } from '@/types';
import { EmptyState, Skeleton } from './Panel';

export interface DataTableProps<T> {
  columns: readonly TableColumn<T>[];
  rows: readonly T[];
  rowKey: (keyof T & string) | ((row: T, index: number) => string);
  sort?: SortState;
  onSortChange?: (next: SortState) => void;
  loading?: boolean;
  skeletonRows?: number;
  emptyTitle?: ReactNode;
  emptyDescription?: ReactNode;
  emptyAction?: ReactNode;
  onRowClick?: (row: T, index: number) => void;
  className?: string;
  dense?: boolean;
}

/** T 约束用 object 而不是 Record<string, unknown>：后者要求索引签名，CallLog 这类 interface 不满足，
 *  调用方被迫写成 DataTable<CallLog & Record<string, unknown>>；取行值处本来就有 ?? 兜底 */
export function DataTable<T extends object>({
  columns,
  rows,
  rowKey,
  sort,
  onSortChange,
  loading = false,
  skeletonRows = 6,
  emptyTitle = '暂无数据',
  emptyDescription,
  emptyAction,
  onRowClick,
  className,
  dense,
}: DataTableProps<T>) {
  const keyOf = (row: T, index: number): string =>
    typeof rowKey === 'function'
      ? rowKey(row, index)
      : String((row as Partial<Record<typeof rowKey, unknown>>)[rowKey] ?? index);

  const toggleSort = (key: string) => {
    if (!onSortChange) return;
    // 同列只切方向，换列默认倒序（数值列倒序更常看）
    onSortChange(sort?.key === key ? { key, order: sort.order === 'asc' ? 'desc' : 'asc' } : { key, order: 'desc' });
  };

  if (!loading && rows.length === 0) {
    return (
      <div className={cn('rounded-lg border border-line bg-surface p-2', className)}>
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      </div>
    );
  }

  return (
    <div className={cn('overflow-x-auto rounded-lg border border-line bg-surface', className)}>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => {
              const active = sort?.key === col.key;
              return (
                <th key={col.key} className={cn(col.widthClass, col.align === 'right' && 'text-right', col.align === 'center' && 'text-center')}>
                  {col.sortable && onSortChange ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      aria-label={`按${col.title}排序`}
                      className={cn('inline-flex items-center gap-1 uppercase transition-colors hover:text-primary', active && 'text-primary')}
                    >
                      {col.title}
                      <span aria-hidden className="text-[9px]">
                        {active ? (sort.order === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </button>
                  ) : (
                    col.title
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: skeletonRows }, (_, i) => (
                <tr key={`sk-${i}`}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      <Skeleton className={cn(dense ? 'h-3' : 'h-3.5', 'w-[70%]')} />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row, index) => (
                <tr
                  key={keyOf(row, index)}
                  onClick={onRowClick ? () => onRowClick(row, index) : undefined}
                  className={cn(onRowClick && 'cursor-pointer')}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        dense && 'py-2',
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center',
                      )}
                    >
                      {col.render
                        ? col.render(row, index)
                        : (((row as Partial<Record<string, unknown>>)[col.dataIndex ?? ''] as ReactNode) ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [12, 24, 48],
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: readonly number[];
  className?: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1 && !onPageSizeChange) return null;

  // 当前页居中最多铺 5 个，首尾页恒定可达
  const windowPages: number[] = [];
  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  for (let p = start; p <= Math.min(pageCount, start + 4); p += 1) windowPages.push(p);

  const pageBtn = 'grid h-7 min-w-7 place-items-center rounded-full border text-[12px] transition-colors';

  return (
    <nav aria-label="分页" className={cn('flex flex-wrap items-center justify-between gap-3 text-[12px] text-muted', className)}>
      <span>
        共 {total} 条 · 第 {page}/{pageCount} 页
      </span>
      <div className="flex items-center gap-1.5">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={cn(pageBtn, 'border-line hover:border-primary disabled:opacity-40')}>
          ‹
        </button>
        {windowPages[0] === 2 && (
          <button type="button" onClick={() => onPageChange(1)} className={cn(pageBtn, 'border-line hover:border-primary')}>
            1
          </button>
        )}
        {windowPages.map((p) => (
          <button
            key={p}
            type="button"
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onPageChange(p)}
            className={cn(pageBtn, p === page ? 'border-primary bg-primary text-surface' : 'border-line hover:border-primary')}
          >
            {p}
          </button>
        ))}
        {windowPages[windowPages.length - 1] === pageCount - 1 && (
          <button type="button" onClick={() => onPageChange(pageCount)} className={cn(pageBtn, 'border-line hover:border-primary')}>
            {pageCount}
          </button>
        )}
        <button type="button" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} className={cn(pageBtn, 'border-line hover:border-primary disabled:opacity-40')}>
          ›
        </button>
        {onPageSizeChange && (
          <select
            aria-label="每页条数"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="ml-1 h-7 rounded-full border border-line bg-surface px-2 text-[12px] text-ink"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} 条/页
              </option>
            ))}
          </select>
        )}
      </div>
    </nav>
  );
}
