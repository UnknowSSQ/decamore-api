/**
 * 只覆盖示例代码这一封闭集合（curl / fetch / requests / JSON / 状态行），不做完整语法解析。
 * 扫描优先级为 字符串 > 注释 > URL > 数字 > 单词 > 标点，URL 里的 // 和 : 才不会被误判成注释或键名。
 */

export type HighlightLang = 'bash' | 'js' | 'py' | 'json' | 'http' | 'text';

/** 与 CSS class `.tok-<kind>` 一一对应，加类型要同步 globals.css */
export type TokenKind =
  | 'cmt'
  | 'key'
  | 'val'
  | 'num'
  | 'punc'
  | 'url'
  | 'method'
  | 'status'
  | 'kw'
  | 'fn'
  | 'lit'
  | 'prop'
  | 'flag'
  | 'plain';

export interface Token {
  kind: TokenKind;
  text: string;
}

/** js 与 py 的关键字混在一张表里，按词匹配不区分语言 */
const KEYWORDS: ReadonlySet<string> = new Set([
  'const',
  'let',
  'var',
  'function',
  'return',
  'await',
  'async',
  'if',
  'else',
  'new',
  'import',
  'from',
  'export',
  'try',
  'catch',
  'finally',
  'for',
  'while',
  'in',
  'of',
  'def',
  'class',
  'lambda',
  'with',
  'as',
  'not',
  'and',
  'or',
]);

const LITERALS: ReadonlySet<string> = new Set([
  'true',
  'false',
  'null',
  'undefined',
  'None',
  'True',
  'False',
  'NaN',
]);

const HTTP_METHODS: ReadonlySet<string> = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

const URL_PATTERN = /https?:\/\/[^\s"']+|\/v1\/[A-Za-z0-9_/-]+/y;
const NUMBER_PATTERN = /-?\d+(?:\.\d+)?/y;
const WORD_PATTERN = /[A-Za-z_$][\w$-]*/y;
const SPACE_PATTERN = /\s+/y;
const FLAG_PATTERN = /--?[A-Za-z][\w-]*/y;

/** 正则都带 /y 粘性标志，只在 pos 处试匹配 */
function matchAt(pattern: RegExp, input: string, pos: number): { text: string; end: number } | null {
  pattern.lastIndex = pos;
  const hit = pattern.exec(input);
  if (!hit || hit.index !== pos) return null;
  return { text: hit[0], end: pos + hit[0].length };
}

/** 跳过空白后的下一个非空白字符 */
function peekNonSpace(input: string, pos: number): string {
  let i = pos;
  while (i < input.length && /\s/.test(input[i] as string)) i += 1;
  return input[i] ?? '';
}

function readQuoted(input: string, pos: number): { text: string; end: number; quote: string } | null {
  const quote = input[pos];
  if (quote !== '"' && quote !== "'" && quote !== '`') return null;
  let i = pos + 1;
  while (i < input.length) {
    const ch = input[i] as string;
    if (ch === '\\') {
      i += 2;
      continue;
    }
    if (ch === quote) return { text: input.slice(pos, i + 1), end: i + 1, quote };
    i += 1;
  }
  // 未闭合（示例里不会出现），按到行尾处理
  return { text: input.slice(pos), end: input.length, quote };
}

/** 跳过空白后是否为冒号，即「键名」位置 */
function isKeyPosition(input: string, end: number): boolean {
  return peekNonSpace(input, end) === ':';
}

/** 最后一个有效 token，用于点号后的属性 / 函数名判定 */
function prevMeaningful(tokens: readonly Token[]): string {
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    const t = tokens[i];
    if (!t || t.kind === 'plain') continue;
    return t.text.trim();
  }
  return '';
}

function highlightLine(line: string, lang: HighlightLang): Token[] {
  if (line.length === 0) return [];

  const trimmedStart = line.trimStart();
  // 整行注释：# 只在行首视为注释（避免把 URL 片段、颜色值误判）；// 与 -- 同理
  if (lang !== 'json' && (trimmedStart.startsWith('#') || trimmedStart.startsWith('//') || trimmedStart.startsWith('--'))) {
    return [{ kind: 'cmt', text: line }];
  }
  if (lang === 'text') return [{ kind: 'plain', text: line }];

  const tokens: Token[] = [];
  const push = (kind: TokenKind, text: string): void => {
    if (!text) return;
    const last = tokens[tokens.length - 1];
    // 相邻同色片段合并，减少 DOM 节点
    if (last && last.kind === kind) last.text += text;
    else tokens.push({ kind, text });
  };

  let pos = 0;
  while (pos < line.length) {
    const space = matchAt(SPACE_PATTERN, line, pos);
    if (space) {
      push('plain', space.text);
      pos = space.end;
      continue;
    }

    const quoted = readQuoted(line, pos);
    if (quoted) {
      const inner = quoted.text.slice(1, Math.max(1, quoted.text.length - 1));
      let kind: TokenKind = 'val';
      if (isKeyPosition(line, quoted.end) && lang !== 'bash') kind = 'key';
      else if (/^https?:\/\//.test(inner)) kind = 'url';
      push(kind, quoted.text);
      pos = quoted.end;
      continue;
    }

    // curl 参数要排在 URL 之前，否则 `-` 会被吞进标点
    if (lang === 'bash') {
      const flag = matchAt(FLAG_PATTERN, line, pos);
      if (flag) {
        push('flag', flag.text);
        pos = flag.end;
        continue;
      }
    }

    const url = matchAt(URL_PATTERN, line, pos);
    if (url) {
      push('url', url.text);
      pos = url.end;
      continue;
    }

    const num = matchAt(NUMBER_PATTERN, line, pos);
    // 数字后面紧跟字母（如 42ms / 1024px）交给 word 分支处理，避免拆断单位
    if (num && !/[A-Za-z_$]/.test(line[num.end] ?? '')) {
      push('num', num.text);
      pos = num.end;
      continue;
    }

    const word = matchAt(WORD_PATTERN, line, pos);
    if (word) {
      const next = peekNonSpace(line, word.end);
      const isCall = next === '(';
      const after = line[word.end] ?? '';
      const prev = prevMeaningful(tokens);

      // bash：`key=value` 形式（curl -d type=poetry）→ 键 / 等号 / 值三段
      if (lang === 'bash' && after === '=') {
        push('key', word.text);
        push('punc', '=');
        pos = word.end + 1;
        const value = matchAt(WORD_PATTERN, line, pos) ?? matchAt(NUMBER_PATTERN, line, pos);
        if (value) {
          push('val', value.text);
          pos = value.end;
        }
        continue;
      }

      let kind: TokenKind = 'plain';
      if (lang === 'http' && HTTP_METHODS.has(word.text.toUpperCase())) kind = 'method';
      else if (lang === 'http' && /^\d{3}$/.test(word.text)) kind = 'status';
      // 点号后：`res.json()` 仍是函数，`data.from` 是属性（不能让 from 被当成关键字）
      else if (prev === '.') kind = isCall ? 'fn' : 'prop';
      // 关键字优先于「后面跟括号」的判定，否则 `if (...)` 会被当成函数调用
      else if (KEYWORDS.has(word.text)) kind = 'kw';
      else if (LITERALS.has(word.text)) kind = 'lit';
      else if (isCall) kind = 'fn';
      // 命令名：bash 行首第一个词（curl / jq）
      else if (lang === 'bash' && prev === '') kind = 'fn';
      // 未加引号的对象键：`min: 8`
      else if (next === ':' && lang !== 'bash') kind = 'key';
      push(kind, word.text);
      pos = word.end;
      continue;
    }

    // 兜底：其余单字符一律标点
    push('punc', line[pos] as string);
    pos += 1;
  }

  return tokens;
}

/** 返回每行的 token 列表，行号由渲染层负责 */
export function highlightCode(code: string, lang: HighlightLang = 'text'): Token[][] {
  return code.replace(/\n$/, '').split('\n').map((line) => highlightLine(line, lang));
}

/** 复制按钮用，去行尾空格 */
export function normalizeCode(code: string): string {
  return code
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .join('\n')
    .trim();
}
