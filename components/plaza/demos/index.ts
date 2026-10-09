'use client';
/**
 * demo 注册表。每个 demo 走 next/dynamic 单独成 chunk：
 * 广场与首页此前会把十个 demo 的取数与渲染代码整包带进首屏，而卡片要等进视口才挂载。
 * 注册表在模块作用域一次建好——getDemoComponent 若每次 render 返回新组件类型，
 * 整棵 demo 子树会重挂，seed 与用户输入态都会丢。
 */
import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

import type { DemoKind } from '@/types';
import type { DemoProps } from './types';
import { DemoFallback } from './types';

const lazy = (load: () => Promise<Record<string, unknown>>, name: string) =>
  dynamic(async () => (await load())[name] as ComponentType<DemoProps>, { ssr: false });

export const DEMO_REGISTRY: Record<DemoKind, ComponentType<DemoProps>> = {
  quote: lazy(() => import('./QuoteDemo'), 'QuoteDemo'),
  answerbook: lazy(() => import('./AnswerBookDemo'), 'AnswerBookDemo'),
  wallpaper: lazy(() => import('./WallpaperDemo'), 'WallpaperDemo'),
  hot: lazy(() => import('./HotDemo'), 'HotDemo'),
  music: lazy(() => import('./MusicDemo'), 'MusicDemo'),
  play: lazy(() => import('./PlayDemo'), 'PlayDemo'),
  chart: lazy(() => import('./HotChartDemo'), 'HotChartDemo'),
  // 三个素材类 demo 同源同文件，动态导入会合并成一个 chunk
  emoji: lazy(() => import('./AssetDemos'), 'EmojiDemo'),
  avatar: lazy(() => import('./AssetDemos'), 'AvatarDemo'),
  image: lazy(() => import('./AssetDemos'), 'ImageDemo'),
};

/** 后台新建的接口没有 demo，取不到组件时兜底而不是抛错 */
export function getDemoComponent(demo: DemoKind | null): ComponentType<DemoProps> {
  if (!demo) return DemoFallback;
  return DEMO_REGISTRY[demo] ?? DemoFallback;
}

export type { DemoProps } from './types';
export { DemoFallback } from './types';
