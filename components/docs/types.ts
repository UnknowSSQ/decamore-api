/** /docs/[slug] 的数据形状；Server 与 Client 组件共用，不含运行时代码 */
import type { ApiCategory, HttpMethod } from '@/types';

export type InlineFragment =
  | { type: 'text'; value: string }
  | { type: 'code'; value: string };

export type ParagraphNode = { kind: 'paragraph'; fragments: InlineFragment[] };

export type RequiredState = 'yes' | 'no' | 'na';

/**
 * 每种表一种行形状，字段名即列义（列定义见 DocTable 的 getHeaders）。
 * 以前七个 variant 共用一个「全部字段可选」的行形状，代价是给响应头表填 required
 * 之类的字段编译器一声不响，而错误表行里写的 name 会因为渲染层不认它而凭空消失。
 */
export interface RequestRow {
  item: string;
  value: string;
  description: InlineFragment[];
}

export interface ParamRow {
  name: string;
  type: string;
  required?: RequiredState;
  defaultValue?: string;
  /** 嵌套字段行：名称列前会画一条竖线 */
  isChild?: boolean;
  description: InlineFragment[];
}

export interface ResponseRow {
  name: string;
  type: string;
  isChild?: boolean;
  description: InlineFragment[];
}

export interface HeaderRow {
  name: string;
  example: string;
  description: InlineFragment[];
}

export interface ErrorRow {
  http: string;
  statusCode: string;
  /** 这一类错误的短标题，渲染在「含义」列开头 */
  label: string;
  description: InlineFragment[];
  suggestion?: InlineFragment[];
}

export interface LimitRow {
  item: string;
  limit: string;
  description: InlineFragment[];
}

export interface ChangelogRow {
  date: string;
  version: string;
  description: InlineFragment[];
}

/** 变体决定列数与列义，表头见 DocTable 的 getHeaders */
export type DocTableVariant = 'request' | 'params' | 'response' | 'headers' | 'errors' | 'limits' | 'changelog';

export type TableNode =
  | { kind: 'table'; variant: 'request'; rows: RequestRow[] }
  | { kind: 'table'; variant: 'params'; rows: ParamRow[] }
  | { kind: 'table'; variant: 'response'; rows: ResponseRow[] }
  | { kind: 'table'; variant: 'headers'; rows: HeaderRow[] }
  | { kind: 'table'; variant: 'errors'; rows: ErrorRow[] }
  | { kind: 'table'; variant: 'limits'; rows: LimitRow[] }
  | { kind: 'table'; variant: 'changelog'; rows: ChangelogRow[] };

export interface CalloutNode {
  kind: 'callout';
  tone: 'info' | 'warn';
  mark: string;
  strong: string;
  fragments: InlineFragment[];
}

export type SectionContent = ParagraphNode | TableNode | CalloutNode;

export interface DocSection {
  id: string;
  title: string;
  content: SectionContent[];
}

export interface CodePaneData {
  value: string;
  label: string;
  code: string;
  lang: 'bash' | 'js' | 'py' | 'json';
}

export interface MetaRow {
  label: string;
  value: string;
}

export interface TocItem {
  id: string;
  label: string;
}

export interface SiblingApi {
  label: string;
  path: string;
  href: string;
}

/** 已撰写文档由 apis/<slug>.ts 给出；未撰写的接口由 registry 按车单推导骨架页 */
export interface ApiDoc {
  /** 路由段，等于 API_CATALOG 的 id */
  slug: string;
  name: string;
  en: string;
  category: ApiCategory;
  method: HttpMethod;
  path: string;
  implemented: boolean;
  documented: boolean;
  eyebrow: string;
  lede: string;
  facts: string[];
  metaRows: MetaRow[];
  sections: DocSection[];
  requestPanes: CodePaneData[];
  responsePanes: CodePaneData[];
}
