/**
 * /docs 与 /docs/[slug] 的唯一数据入口，输入是接口车单。
 * 名称 / 路径 / 分类 / 方法一律以车单为准，后台改名后文档标题与索引同步；
 * 未撰写文档的接口由车单推导骨架页，保证每个接口都有稳定 URL。
 * 新接口：写 apis/<slug>.ts → 加进 API_DOCS →（服务端实现后）补进 IMPLEMENTED_API_IDS。
 */
import { API_CATEGORIES, IMPLEMENTED_API_IDS } from '@/constants/api-catalog';
import { docApiHref } from '@/constants/app';
import type { ApiCatalogItem } from '@/types';

import { frag, para, text } from './fragments';
import { answerbookDoc } from './apis/answerbook';
import { avatarDoc } from './apis/avatar';
import { emojiDoc } from './apis/emoji';
import { hitokotoDoc } from './apis/hitokoto';
import { hotchartDoc } from './apis/hotchart';
import { hotmusicDoc } from './apis/hotmusic';
import { hotplayDoc } from './apis/hotplay';
import { hotsearchDoc } from './apis/hotsearch';
import { imagesDoc } from './apis/images';
import { wallpaperDoc } from './apis/wallpaper';
import type { ApiDoc, CodePaneData, DocSection, MetaRow, SiblingApi, TocItem } from './types';

const API_DOCS: readonly ApiDoc[] = [
  hitokotoDoc,
  answerbookDoc,
  wallpaperDoc,
  hotsearchDoc,
  hotmusicDoc,
  hotplayDoc,
  hotchartDoc,
  emojiDoc,
  avatarDoc,
  imagesDoc,
];

/** 供后台「接口管理」显示文档状态 */
export const AUTHORED_DOC_SLUGS: readonly string[] = API_DOCS.map((doc) => doc.slug);

const TODO_CALLOUT = (what: string) => ({
  kind: 'callout' as const,
  tone: 'info' as const,
  mark: 'i',
  strong: `${what}待补充。`,
  fragments: text('该接口尚未撰写文档，字段结构会在服务端实现后按 curl 实测结果补全，请勿提前依赖。'),
});

function skeletonSections(item: ApiCatalogItem): DocSection[] {
  const pending = !IMPLEMENTED_API_IDS.includes(item.id);

  return [
    {
      id: 'overview',
      title: '接口说明',
      content: [
        para(...text(item.desc), ...frag`接口路径：${item.path}。`),
        ...(pending
          ? [
              {
                kind: 'callout' as const,
                tone: 'warn' as const,
                mark: '!',
                strong: '服务端路由尚未实现。',
                fragments: text(
                  `当前 app/api/v1 下没有 ${item.path}，接口广场里的同名卡片走的是前端本地演示逻辑，不代表线上可调用。`,
                ),
              },
            ]
          : []),
      ],
    },
    {
      id: 'request',
      title: '请求方式',
      content: [
        {
          kind: 'table' as const,
          variant: 'request' as const,
          rows: [
            {
              item: '请求方法',
              value: item.method,
              description: text('以接口车单登记为准，实现后若有变更会同步本页。'),
            },
            { item: '站内路径', value: item.path, description: text('同源页面可相对路径调用。') },
            {
              item: '鉴权',
              value: '规划免鉴权',
              description: text('趣味与工具类接口计划全部匿名可调用，按 IP 限频。'),
            },
          ],
        },
      ],
    },
    { id: 'params', title: '请求参数', content: [TODO_CALLOUT('请求参数')] },
    { id: 'response', title: '返回参数', content: [TODO_CALLOUT('返回字段')] },
    { id: 'headers', title: '响应头', content: [TODO_CALLOUT('响应头')] },
    {
      id: 'errors',
      title: '错误码',
      content: [
        para(...text('实现后将继承全站统一的失败信封与错误码；届时以实测响应填写，不预先约定未验证的码值。')),
      ],
    },
    {
      id: 'limits',
      title: '速率与缓存',
      content: [
        para(
          ...text(
            '接口一旦实现即自动继承统一限流（按 IP + 方法 + 路径的 60 秒固定窗口，阈值取自 RATE_LIMIT_PER_MIN）。',
          ),
        ),
      ],
    },
    {
      id: 'changelog',
      title: '更新日志',
      content: [
        {
          kind: 'table' as const,
          variant: 'changelog' as const,
          rows: [
            {
              date: '—',
              version: '待发布',
              description: text('该接口文档尚未撰写，暂无变更记录。'),
            },
          ],
        },
      ],
    },
  ];
}

const SKELETON_PANES: CodePaneData[] = [
  {
    value: 'curl',
    label: 'cURL',
    lang: 'bash',
    code: `# 待接口实现后补充可用示例
# 目前仅记录车单里登记的路径与方法`,
  },
];

function toDoc(item: ApiCatalogItem): ApiDoc {
  const authored = API_DOCS.find((doc) => doc.slug === item.id);
  const implemented = IMPLEMENTED_API_IDS.includes(item.id);

  const identity = {
    slug: item.id,
    name: item.name,
    en: item.en,
    category: item.cat,
    method: item.method,
    path: item.path,
    implemented,
  };

  if (authored) return { ...authored, ...identity, documented: true };

  const metaRows: MetaRow[] = [
    { label: '文档状态', value: '待撰写' },
    { label: '服务端', value: implemented ? '已实现' : '未实现' },
    { label: '接口分类', value: item.cat },
    { label: '计费', value: '¥0 · 免费' },
  ];

  return {
    ...identity,
    documented: false,
    eyebrow: `${item.cat} API · v1`,
    lede: item.desc,
    facts: [
      implemented ? '服务端已实现' : '前端演示中 · 服务端待实现',
      `${item.method} ${item.path}`,
      '返回 JSON',
    ],
    metaRows,
    sections: skeletonSections(item),
    requestPanes: SKELETON_PANES,
    responsePanes: [],
  };
}

export function buildDocs(catalog: readonly ApiCatalogItem[]): ApiDoc[] {
  return catalog.map(toDoc);
}

export function getDoc(catalog: readonly ApiCatalogItem[], slug: string): ApiDoc | undefined {
  const item = catalog.find((entry) => entry.id === slug);
  return item ? toDoc(item) : undefined;
}

export function tocOf(doc: ApiDoc): TocItem[] {
  return doc.sections.map((section) => ({ id: section.id, label: section.title }));
}

/** 同组接口：不足 4 个时用其它分类补齐 */
export function siblingsOf(catalog: readonly ApiCatalogItem[], doc: ApiDoc): SiblingApi[] {
  const docs = buildDocs(catalog);
  const sameCategory = docs.filter((other) => other.slug !== doc.slug && other.category === doc.category);
  const others = sameCategory.length >= 4 ? sameCategory : docs.filter((other) => other.slug !== doc.slug);
  return others.slice(0, 4).map((other) => ({
    label: other.name,
    path: other.path,
    href: docApiHref(other.slug),
  }));
}

export function pagerOf(catalog: readonly ApiCatalogItem[], slug: string): { prev?: ApiDoc; next?: ApiDoc } {
  const docs = buildDocs(catalog);
  const index = docs.findIndex((doc) => doc.slug === slug);
  return {
    prev: index > 0 ? docs[index - 1] : undefined,
    next: index >= 0 && index < docs.length - 1 ? docs[index + 1] : undefined,
  };
}

export function docsByCategory(catalog: readonly ApiCatalogItem[]): { category: ApiCatalogItem['cat']; docs: ApiDoc[] }[] {
  const docs = buildDocs(catalog);
  return API_CATEGORIES.map((category) => ({
    category,
    docs: docs.filter((doc) => doc.category === category),
  })).filter((group) => group.docs.length > 0);
}
