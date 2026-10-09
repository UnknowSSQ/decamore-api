import './setup';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { describe, it } from 'node:test';

import tailwindConfig from '../tailwind.config';

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = `${dir}/${entry}`;
    if (statSync(p).isDirectory()) out.push(...sourceFiles(p));
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

// Config 的 colors 允许写成嵌套对象（term: { bg, fg }），类型上是联合，这里按实际结构收平
type ColorMap = Record<string, string | Record<string, string>>;
const colors = ((tailwindConfig.theme?.extend ?? {}).colors ?? {}) as unknown as ColorMap;
const palette = Object.entries(colors).flatMap(([name, value]): [string, string][] =>
  typeof value === 'string'
    ? [[name, value]]
    : Object.entries(value).map(([sub, v]): [string, string] => [sub === 'DEFAULT' ? name : `${name}-${sub}`, v]),
);

assert.ok(existsSync('app/globals.css'), '测试必须从仓库根目录运行（npm test）');

const files = [...sourceFiles('components'), ...sourceFiles('app')];
const sources = files.map((f) => readFileSync(f, 'utf8'));
const configText = readFileSync('tailwind.config.ts', 'utf8');
const css = readFileSync('app/globals.css', 'utf8');

const declared = new Map<string, string>();
for (const [, name, value] of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
  if (name && value) declared.set(name, value.trim());
}

/** 数一个变量名被引用的次数；带上结尾边界，免得 --c-ink-2 命中 --c-ink-24 */
function references(name: string, text: string): number {
  return text.split(new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z0-9-])`, 'g')).length - 1;
}

const CLASS_RE = /(?:text|bg|border|ring|fill|from|to|via|divide|outline)-(?:[a-z][a-z0-9-]*)/g;

describe('调色板', () => {
  // 棘轮：现存 9 处是首页/CTA 的装饰绿与 Callout 的赭石色，属于还没归族的第三系颜色
  const HEX_BUDGET = 9;

  it(`方括号硬编码色值不超过预算 ${HEX_BUDGET} 处`, () => {
    const hits: string[] = [];
    for (const f of files) {
      for (const m of readFileSync(f, 'utf8').matchAll(/(?:text|bg|border|ring|fill|from|to|via)-\[#[0-9a-fA-F]{3,8}\]/g)) {
        hits.push(`${f}: ${m[0]}`);
      }
    }
    assert.ok(
      hits.length <= HEX_BUDGET,
      `新增 ${hits.length - HEX_BUDGET} 处：\n${hits.slice(HEX_BUDGET).join('\n')}\n先在 globals.css + tailwind.config 登记色阶，再在类名里引用`,
    );
  });

  it('调色板每一项都指向 globals.css 里已定义的变量', () => {
    const bad: string[] = [];
    for (const [name, value] of palette) {
      const ref = /var\((--[a-z0-9-]+)\)/.exec(value)?.[1];
      if (!ref) bad.push(`${name} 的字面值不是变量引用：${value}`);
      else if (!declared.has(ref)) bad.push(`${name} 指向 ${ref}，但 globals.css 里没有定义`);
    }
    assert.deepEqual(bad, []);
  });

  it('globals.css 里的颜色变量都可达', () => {
    const orphan: string[] = [];
    for (const [name] of declared) {
      if (!/^--(c|tint)-/.test(name)) continue;
      const inConfig = configText.includes(name);
      const inCssRules = references(name, css) >= 2; // 一次是它自己的声明
      if (!inConfig && !inCssRules) orphan.push(name);
    }
    assert.deepEqual(orphan, [], '这些变量没人引用：删掉，或登记进 tailwind.config 的调色板');
  });

  it('调色板里没有哑令牌', () => {
    const all = sources.join('\n');
    const unused = palette
      .map(([name]) => name)
      .filter((name) => !new RegExp(`(?:text|bg|border|ring|fill|from|to|via|divide|outline|decoration|accent)-${name}\\b`).test(all));
    assert.deepEqual(unused, [], '定义了却没人用的令牌直接删掉');
  });

  it('类名里的颜色后缀都能落到调色板', () => {
    // 拼错的令牌 Tailwind 不报错，只是静默不产出规则。按首段筛出本项目自己的命名族
    // （ink/wash/hair/sage/line…），这些族里出现的后缀必须有对应令牌；white、lg、-2 之类
    // 属于 Tailwind 内置值，不在核对范围。
    const names = new Set(palette.map(([name]) => name));
    const stems = new Set(palette.map(([name]) => name.split('-')[0]));
    const suspicious = new Set<string>();
    for (const src of sources) {
      for (const m of src.matchAll(CLASS_RE)) {
        const cls = m[0];
        const suffix = cls.slice(cls.indexOf('-') + 1);
        if (stems.has(suffix.split('-')[0]) && !names.has(suffix)) suspicious.add(cls);
      }
    }
    assert.deepEqual([...suspicious], [], '这些类没有对应的调色板令牌，Tailwind 不会生成它们');
  });
});
