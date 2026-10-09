/** /docs/[slug] 的数据形状；Server 与 Client 组件共用，不含运行时代码 */
import type { ApiCategory, HttpMethod } from '@/types';

export type InlineFragment =
  | { type: 'text'; value: string }
  | { type: 'code'; value: string };

export type ParagraphNode = { kind: 'paragraph'; fragments: InlineFragment[] };

export type RequiredState = 'yes' | 'no' | 'na';

/** 一张表的所有变体共用这个行形状，下面 6 个可选字段按 variant 取用 */
export interface DocTableRow {
  name: string;
  type: string;
  description: InlineFragment[];
  isChild?: boolean;
  required?: RequiredState;
  defaultValue?: string;
  http?: string;
  statusCode?: string;
  suggestion?: InlineFragment[];
  example?: string;
}

/** 变体决定列数与列义，表头见 DocTable 的 getHeaders */
export type DocTableVariant =
  | 'request'    // 项目 / 取值 / 说明
  | 'params'     // 字段 / 类型 / 必填 / 默认值 / 说明
  | 'response'   // 字段 / 类型 / 说明，isChild 表示嵌套行
  | 'headers'    // 名称 / 示例值 / 说明
  | 'errors'     // HTTP / statusCode / 含义 / 处理建议
  | 'limits'     // 项目 / 限制 / 说明
  | 'changelog'; // 日期 / 版本 / 变更

export interface TableNode {
  kind: 'table';
  variant: DocTableVariant;
  rows: DocTableRow[];
}

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
