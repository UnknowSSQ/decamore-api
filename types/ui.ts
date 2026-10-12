/** 与 components/ui/Toast 的 tone 对应 */
export type ToastTone = 'success' | 'error';

/** 与 components/ui/StatusBadge 对应 */
export type BadgeTone = 'ok' | 'warn' | 'danger' | 'neutral' | 'brand';

/** DataTable 的列定义 */
export interface TableColumn<TRecord> {
  key: string;
  title: string;
  /** 不传则必须提供 render */
  dataIndex?: keyof TRecord & string;
  /** Tailwind 类，如 "w-32" */
  widthClass?: string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  render?: (record: TRecord, index: number) => React.ReactNode;
}

export interface SortState {
  key: string;
  order: 'asc' | 'desc';
}
