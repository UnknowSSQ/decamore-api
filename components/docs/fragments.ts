/** 把「文字 + `code`」的模板串编译成 InlineFragment，让 apis/*.ts 按自然语言书写 */
import type { InlineFragment, ParagraphNode } from './types';

export function frag(literals: TemplateStringsArray, ...codes: string[]): InlineFragment[] {
  const result: InlineFragment[] = [];
  for (let i = 0; i < literals.length; i++) {
    const text = literals[i] as string;
    if (text) result.push({ type: 'text', value: text });
    if (i < codes.length) result.push({ type: 'code', value: codes[i] as string });
  }
  return result;
}

export function text(value: string): InlineFragment[] {
  return [{ type: 'text', value }];
}

export function para(...fragments: InlineFragment[]): ParagraphNode {
  return { kind: 'paragraph', fragments };
}
