/** 随机取样：素材与语料类接口的「随机 N 条」都走这里，别各自抄一遍洗牌 */

/**
 * 不放回随机取 count 条，返回的顺序即抽取顺序。
 * 只做 count 轮部分 Fisher-Yates：用一张稀疏交换表代替整份数组副本，
 * 5 万条成语里抽 10 条不必把整个语料洗一遍。
 */
export function sampleUnique<T>(items: readonly T[], count: number): T[] {
  const take = Math.min(count, items.length);
  const picked: T[] = [];
  const moved = new Map<number, T>();
  const read = (index: number): T => moved.get(index) ?? items[index]!;

  for (let i = items.length - 1; i >= items.length - take; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    picked.push(read(j));
    // 位置 i 的元素被换到 j 参与后续抽取；i 本身已出列，后面不会再读
    moved.set(j, read(i));
  }
  return picked;
}

/** 等概率取一条；调用方保证数组非空（语料模块在加载时就校验过） */
export function pickOne<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}
