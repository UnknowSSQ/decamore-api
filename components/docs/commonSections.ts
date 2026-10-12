/** 各篇接口文档共用的响应头段与请求方式表：这些内容由 withApiHandler 与中间件统一产出，逐接口写的只会漂 */
import { APP_NAME, RATE_LIMIT_PER_MIN_DEFAULT } from '@/constants/app';

import { text } from './fragments';
import type {
  CalloutNode,
  ChangelogRow,
  CodePaneData,
  DocSection,
  ErrorRow,
  InlineFragment,
  LimitRow,
  ParamRow,
  ParagraphNode,
  ResponseRow,
  TableNode,
} from './types';

interface HeadersSectionOptions {
  /** 本接口的缓存语义，写进 Cache-Control 那一行 */
  cache: InlineFragment[];
  /** Cache-Control 的示例值；放开缓存的接口必须与响应头实际下发的一致 */
  cacheExample?: string;
  /** 示例请求 ID，取该接口实测响应里的值 */
  traceId: string;
}

const CODE = (value: string): InlineFragment => ({ type: 'code', value });
const TXT = (value: string): InlineFragment => ({ type: 'text', value });

/**
 * 限频那句话的唯一出处：数字取自 constants/app.ts 的默认阈值，
 * 每篇文档都引用它而不是各写一遍，改环境变量默认值时文档不会再留在旧数字上。
 */
export const rateLimitText = `${RATE_LIMIT_PER_MIN_DEFAULT} 次 / 分钟 / IP`;

export function headersSection({ cache, cacheExample, traceId }: HeadersSectionOptions): DocSection {
  return {
    id: 'headers',
    title: '响应头',
    content: [
      {
        kind: 'table',
        variant: 'headers',
        rows: [
          {
            name: 'Content-Type',
            example: 'application/json; charset=utf-8',
            description: [TXT('固定为 JSON。不支持 JSONP，没有 text/javascript 分支。')],
          },
          {
            name: 'Cache-Control',
            example: cacheExample ?? 'no-store, max-age=0',
            description: cache,
          },
          {
            name: 'Content-Encoding',
            example: 'gzip',
            description: [
              TXT('请求带 '),
              CODE('Accept-Encoding: gzip'),
              TXT(' 且响应体过一千字节时由本站压缩（实测最大那份——预警全量 264,583 字节压到 21,056 字节），不声明就原样发。'),
            ],
          },
          {
            name: 'x-trace-id',
            example: traceId,
            description: [TXT('与 '), CODE('requestId'), TXT(' 同值，用于日志检索。')],
          },
          {
            name: 'x-request-id',
            example: traceId,
            description: [TXT('由中间件生成的请求 ID，缺失时服务端另行生成。')],
          },
          {
            name: 'Retry-After',
            example: '38',
            description: [TXT('仅在 '), CODE('429'), TXT(' 时出现，单位秒。')],
          },
          {
            name: 'Access-Control-Allow-Origin',
            example: '（按需下发）',
            description: [
              TXT(
                '请求带 Origin 且该来源在后台「安全设置 · CORS」里时才会输出，同时附 Vary: Origin。不下发 Allow-Credentials，跨源只能调免鉴权的公开接口。',
              ),
            ],
          },
          {
            name: 'X-Cache / X-RateLimit-*',
            example: '（未下发）',
            description: [TXT('缓存命中与配额计数响应头尚未实现，请勿依赖。')],
          },
        ],
      },
    ],
  };
}

interface RequestSectionOptions {
  /** 站内路径，写进「站内路径」那一行 */
  path: string;
  /** 少数接口在表格前有一句导语 */
  lead?: DocSection['content'][number];
}

/** 请求方式表：五行里只有站内路径随接口变化，其余四个接口类型（鉴权 / Content-Type / 协议）都一样 */
export function requestSection({ path, lead }: RequestSectionOptions): DocSection {
  return {
    id: 'request',
    title: '请求方式',
    content: [
      ...(lead ? [lead] : []),
      {
        kind: 'table',
        variant: 'request',
        rows: [
          {
            item: '请求方法',
            value: 'GET',
            description: [
              TXT('其他方法由框架直接返回 '),
              CODE('405'),
              TXT('（无响应体，不经过业务信封）'),
            ],
          },
          { item: '站内路径', value: path, description: text('同源页面可直接相对路径调用') },
          { item: '协议', value: 'HTTP / HTTPS', description: text('/') },
          { item: '鉴权', value: '无需', description: text('匿名可调用，按 IP 限频') },
          { item: 'Content-Type', value: '—', description: text('无请求体，无需设置') },
        ],
      },
    ],
  };
}

/** 全局限频行：阈值取自环境变量，各篇文档逐字相同，重写一遍只会和实现脱节 */
export const RATE_LIMIT_ROW: LimitRow = {
  item: '调用频率',
  limit: rateLimitText,
  description: [
    TXT('按「IP + 方法 + 路径」固定窗口计数（窗口 60 秒），阈值取自环境变量 '),
    CODE('RATE_LIMIT_PER_MIN'),
    TXT(`，默认 ${RATE_LIMIT_PER_MIN_DEFAULT}；超限返回 `),
    CODE('429'),
    TXT(' 与 Retry-After 头。'),
  ],
};

/**
 * 超时与重试行：各篇文档逐字相同（仅对 5xx 与网络错误重试，4xx 不重试）。
 * 此前每篇文档各写一遍，统一到这里后改动只发生一处。
 */
export const TIMEOUT_LIMIT_ROW: LimitRow = {
  item: '超时与重试',
  limit: '建议 3 s / 1 次',
  description: [
    TXT('仅对 '),
    CODE('5xx'),
    TXT(' 与网络错误重试，'),
    CODE('4xx'),
    TXT(' 不重试。'),
  ],
};

/** 「缓存实现 = 进程内存」：素材与榜单这七个接口这一行逐字相同，统一到这里 */
export const CACHE_IMPL_ROW: LimitRow = {
  item: '缓存实现',
  limit: '进程内存',
  description: text('单进程内存表'),
};

/**
 * 榜单那一类缓存的 cached 行（九篇共用）。加了「过期先回上一份、后台刷新」之后，
 * true 不再等于「这一份还在 TTL 内」，只说明这次没等上游——这句话各篇写一遍迟早漂，收成一处，
 * TTL 的说法由调用方按自己那份缓存给（60 秒 / 5 分钟 / 10 分钟 / 1 小时）。
 */
export function cachedRow(ttl: string): ResponseRow {
  return {
    name: 'cached',
    type: 'boolean',
    description: text(
      `true 表示这一份来自服务端缓存（${ttl}），本次没有等上游。${ttl}过后仍有一段兜底期：期间先回上一份并照标 true，刷新交给后台那一路；超出兜底期才会真的去等上游。`,
    ),
    isChild: true,
  };
}

/** 500 那一行的建议：七篇文档逐字相同的一句话，剩下七篇各有自己的上游说法 */
export const SERVER_ERROR_SUGGESTION: InlineFragment[] = [
  TXT('重试 1 次；仍失败请携带 '),
  CODE('requestId'),
  TXT(' 反馈。'),
];

/**
 * 对外信封总述段落：data 的名词随接口变化（「即业务数据」「是一份榜单」「就是这张壁纸」…），其余固定。
 * 每篇文档原本各写一遍，抽出后只传 data 从句即可。
 */
export function envelopeOverview(dataClause: string): ParagraphNode {
  return {
    kind: 'paragraph',
    fragments: [
      TXT('对外接口返回单层信封 '),
      CODE('{ statusCode, message, data, meta }'),
      TXT('：'),
      CODE('data'),
      TXT(` ${dataClause}，`),
      CODE('meta'),
      TXT(' 收敛调用元信息（'),
      CODE('requestId'),
      TXT(' / '),
      CODE('serverTime'),
      TXT(' / '),
      CODE('site'),
      TXT('）。其中 '),
      CODE('requestId'),
      TXT(' 与响应头 '),
      CODE('x-trace-id'),
      TXT(' 同值，反馈问题时提供它即可定位到服务端日志。'),
    ],
  };
}

/**
 * 错误总述段落：有参数校验的接口（会出 422）比无参数的多一句 issues 说明，其余固定。
 */
function errorsOverview(hasValidation: boolean): ParagraphNode {
  return {
    kind: 'paragraph',
    fragments: [
      TXT('失败与成功是同一个单层信封 '),
      CODE('{ statusCode, message, data: null, meta:{ requestId, serverTime, site } }'),
      TXT('：'),
      CODE('statusCode'),
      TXT(' 就是 HTTP 码，'),
      CODE('meta.requestId'),
      TXT(' 与响应头 '),
      CODE('x-trace-id'),
      TXT(' 同值，有 '),
      CODE('description'),
      TXT(' 就带上'),
      ...(hasValidation
        ? [TXT('，'), CODE('422'), TXT(' 还会多一个 '), CODE('issues'), TXT('。')]
        : [TXT('。')]),
      // 出口闸与上游故障给的 message 同形，只能靠 description 分辨，这句话每篇都要有
      CODE('503'),
      TXT(' 有两种来源：这家上游没给回数据，或是本站发往它的在途请求已排满（每个主机 6 个、最多等 1 秒）；看 '),
      CODE('description'),
      TXT(' 区分。'),
    ],
  };
}

/**
 * 响应体里的信封字段：statusCode / message / data / meta / requestId / serverTime / site 七个固定，
 * 只有 data 的描述随接口变化，data 的子字段（业务字段）由各文档传入。
 * 每篇文档原本各写一遍这七行，抽出后顺序与父子关系由这里保证，文档只需给 data 的子字段。
 */
function envelopeResponseRows(dataDescription: string, dataChildren: ResponseRow[]): ResponseRow[] {
  return [
    {
      name: 'statusCode',
      type: 'integer',
      description: [TXT('业务状态码，成功固定为 '), CODE('200'), TXT('；失败响应结构见「错误码」。')],
    },
    { name: 'message', type: 'string', description: text('结果描述，成功时为 success。') },
    { name: 'data', type: 'object', description: text(dataDescription) },
    ...dataChildren,
    { name: 'meta', type: 'object', description: text('调用元信息，用于日志检索与时序判断。') },
    {
      name: 'requestId',
      type: 'string',
      isChild: true,
      description: [TXT('请求追踪 ID，与响应头 '), CODE('x-trace-id'), TXT(' 同值，反馈问题时请一并提供。')],
    },
    {
      name: 'serverTime',
      type: 'string',
      isChild: true,
      description: text('服务端生成响应的 ISO 8601 时间（UTC）'),
    },
    { name: 'site', type: 'string', isChild: true, description: text('站点名称') },
  ];
}

/**
 * 超时与重试行：只有会去抓上游的接口才有「服务端等待上限 8 秒」这句话，
 * 读语料与扫目录的接口用 TIMEOUT_LIMIT_ROW。8 这个数由 tests/doc-numbers.test.ts
 * 与 lib/server/upstream.ts 的 UPSTREAM_TIMEOUT_MS 对齐，改了常量这里就会红。
 */
export const UPSTREAM_TIMEOUT_ROW: LimitRow = {
  item: '超时与重试',
  limit: '建议 3 s / 1 次',
  description: [
    TXT('服务端等待上限是 8 秒；客户端只对 '),
    CODE('5xx'),
    TXT(' 与网络错误重试，'),
    CODE('4xx'),
    TXT(' 不重试。'),
  ],
};

/** 无参数接口的请求参数表：免参接口的「参数」一节都是这一个占位行 */
function noParamsTable(): TableNode {
  return {
    kind: 'table',
    variant: 'params',
    rows: [{ name: '/', type: '/', defaultValue: '/', description: text('/') }],
  };
}

/* ------------------------------------------------------------------ *
 * 分节外壳与小节常量：下面这些形状在各篇文档里逐字相同，
 * 各写一遍的后果是「改一处漏九处」——信封与限流文案已经各踩过一次。
 * ------------------------------------------------------------------ */

/** 「请求参数」一节；rows 省略时是无参数接口的占位表，lead 是表格前的导语 */
export function paramsSection(rows?: ParamRow[], callout?: CalloutNode, lead?: ParagraphNode): DocSection {
  return {
    id: 'params',
    title: '请求参数',
    content: [
      ...(lead ? [lead] : []),
      rows ? { kind: 'table', variant: 'params', rows } : noParamsTable(),
      ...(callout ? [callout] : []),
    ],
  };
}

/** 「返回参数」一节：信封七行 + 该接口的业务子字段，顺序由 envelopeResponseRows 保证 */
export function responseSection(
  dataDescription: string,
  dataChildren: ResponseRow[],
  callout?: CalloutNode,
  lead?: ParagraphNode,
): DocSection {
  return {
    id: 'response',
    title: '返回参数',
    content: [
      ...(lead ? [lead] : []),
      { kind: 'table', variant: 'response', rows: envelopeResponseRows(dataDescription, dataChildren) },
      ...(callout ? [callout] : []),
    ],
  };
}

/** 「错误码」一节：总述段 + 行表 + 可选 callout */
export function errorsSection(rows: ErrorRow[], options: { hasValidation: boolean; callout?: CalloutNode }): DocSection {
  return {
    id: 'errors',
    title: '错误码',
    content: [
      errorsOverview(options.hasValidation),
      { kind: 'table', variant: 'errors', rows },
      ...(options.callout ? [options.callout] : []),
    ],
  };
}

/** 「速率与缓存」一节 */
export function limitsSection(rows: LimitRow[]): DocSection {
  return { id: 'limits', title: '速率与缓存', content: [{ kind: 'table', variant: 'limits', rows }] };
}

/** 「更新日志」一节：按写作规范这里只放表格；callout 是给尚未收敛的历史页留的位 */
export function changelogSection(rows: ChangelogRow[], callout?: CalloutNode): DocSection {
  return {
    id: 'changelog',
    title: '更新日志',
    content: [{ kind: 'table', variant: 'changelog', rows }, ...(callout ? [callout] : [])],
  };
}

/** 405 那一行：各篇文档一字不差，因为它是框架行为，不是接口自己的设定 */
export const METHOD_NOT_SUPPORTED_ROW: ErrorRow = {
  http: '405',
  statusCode: '—',
  label: '方法不支持',
  description: text('由框架直接返回，响应体为空'),
  suggestion: text('使用 GET 请求。'),
};

/** 429 那一行：说明文字统一，处置建议按接口给（榜单和清单的退避理由不一样） */
export function rateLimitedRow(suggestion: InlineFragment[]): ErrorRow {
  return {
    http: '429',
    statusCode: '429',
    label: '频率限制',
    description: [
      TXT('message 为「请求过于频繁」，description 为「请在 N 秒后重试」，并带 '),
      CODE('Retry-After'),
      TXT(' 头。窗口固定 60 秒。'),
    ],
    suggestion,
  };
}

/** 422 那一行的尾巴：知道是哪个字段就点名，wallpaper 那种「可能是 type 也可能是别的」留给通用句式 */
const fieldClause = (field?: string): string => (field ? ` 指明是 ${field} 字段。` : ' 指明是哪个字段。');

/** 422 那一行：message 由接口自己的 schema 决定；field 省略时句式落到「指明是哪个字段」 */
export function validationRow(options: {
  label: string;
  message: string;
  field?: string;
  suggestion: InlineFragment[];
}): ErrorRow {
  return {
    http: '422',
    statusCode: '422',
    label: options.label,
    description: [
      TXT(`message 为「${options.message}」，并带 `),
      CODE('issues'),
      TXT(fieldClause(options.field)),
    ],
    suggestion: options.suggestion,
  };
}

const META_INDENT = '    ';

/** 信封的 meta 块：成功与失败窗共用，requestId 与 serverTime 是实测抄下来的值 */
function metaBlock(requestId: string, serverTime: string): string {
  return [
    '  "meta": {',
    `${META_INDENT}"requestId": "${requestId}",`,
    `${META_INDENT}"serverTime": "${serverTime}",`,
    `${META_INDENT}"site": "${APP_NAME}"`,
    '  }',
  ].join('\n');
}

/**
 * 成功响应窗：data 段按原样嵌入（各篇都是实测抄下来的 JSON 正文，可带行内注释），
 * 由这里单点负责 statusCode / message / meta 那几行信封文字。
 */
export function successPane(options: {
  label: string;
  dataJson: string;
  requestId: string;
  serverTime: string;
  /** 窗口切换键；同一篇里有多个成功样例时要能区分（如壁纸的 bing 样例） */
  value?: string;
}): CodePaneData {
  return {
    value: options.value ?? 'ok',
    label: options.label,
    lang: 'json',
    code: `{
  "statusCode": 200,
  "message": "success",
  "data": ${options.dataJson},
${metaBlock(options.requestId, options.serverTime)}
}`,
  };
}

/** 失败响应窗：与成功同形，只多 description / issues；trailingComment 用于点明 Retry-After 这类响应头 */
export function failurePane(options: {
  label?: string;
  statusCode: number;
  message: string;
  requestId: string;
  serverTime: string;
  description?: string;
  issues?: Array<{ field: string; message: string; code: string }>;
  value?: string;
  trailingComment?: string;
}): CodePaneData {
  const tail: string[] = [];
  if (options.description) tail.push(`  "description": "${options.description}"`);
  if (options.issues?.length) {
    const rows = options.issues.map(
      (issue) => `    { "field": "${issue.field}", "message": "${issue.message}", "code": "${issue.code}" }`,
    );
    tail.push(`  "issues": [\n${rows.join(',\n')}\n  ]`);
  }
  const head = tail.length ? `${metaBlock(options.requestId, options.serverTime)},` : metaBlock(options.requestId, options.serverTime);
  // 说明行落在闭合括号之后另起一段：样例正文保持可直接复制，注释不混进花括号里
  const comment = options.trailingComment ? `\n\n// ${options.trailingComment}` : '';

  return {
    value: options.value ?? (options.statusCode === 429 ? 'rate' : 'invalid'),
    label: options.label ?? String(options.statusCode),
    lang: 'json',
    code: `{
  "statusCode": ${options.statusCode},
  "message": "${options.message}",
  "data": null,
${head}${tail.length ? `\n${tail.join(',\n')}` : ''}
}${comment}`,
  };
}
