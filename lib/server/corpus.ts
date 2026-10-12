/**
 * 语料类数据源的共同外壳：读盘 + JSON 解析 + 全局缓存 + 并发首请求合并 + 空校验。
 * hitokoto 与 answerbook 此前各自复制了同一套逻辑（仅文件路径、类型、报错文案不同），
 * 抽到这里后只有「读什么、空了说什么」随接口变化，缓存与 single-flight 不再各写一遍。
 *
 * 缓存与进行中的请求都挂 globalThis：Next 按 route 分包，模块级变量每个 chunk 各存一份，
 * 636KB 语料若按 chunk 各解析一次就是白付 N 遍。
 */
import 'server-only';

import { readFile } from 'node:fs/promises';

import { pickOne } from '@/utils/random';

interface CorpusLoader<T> {
  /** 整份语料；并发首请求共享同一次读盘，失败会清空 pending 让下次重试 */
  load(): Promise<T[]>;
  /** 随机取一条；等价于 load 后按下标抽 */
  pick(): Promise<T>;
}

interface CorpusOptions {
  /** globalThis 上的槽位前缀，改名等于换一份缓存 */
  slot: string;
  /** 语料文件绝对路径 */
  file: string;
  /** 语料为空或不是数组时的报错文案 */
  emptyMessage: string;
}

export function createCorpusCache<T>(options: CorpusOptions): CorpusLoader<T> {
  const store = globalThis as typeof globalThis & Record<string, unknown>;
  const corpusKey = `${options.slot}.corpus`;
  const pendingKey = `${options.slot}.pending`;

  function load(): Promise<T[]> {
    const cached = store[corpusKey] as T[] | undefined;
    if (cached) return Promise.resolve(cached);

    let pending = store[pendingKey] as Promise<T[]> | undefined;
    if (!pending) {
      pending = readFile(options.file, 'utf8')
        .then((raw) => JSON.parse(raw) as T[])
        .then((lines) => {
          if (!Array.isArray(lines) || lines.length === 0) throw new Error(options.emptyMessage);
          store[corpusKey] = lines;
          return lines;
        })
        .finally(() => {
          // 失败时清空，下一次请求可以重新尝试读盘
          store[pendingKey] = undefined;
        });
      store[pendingKey] = pending;
    }
    return pending;
  }

  function pick(): Promise<T> {
    return load().then(pickOne);
  }

  return { load, pick };
}
