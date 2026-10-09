'use client';
import type { DemoKind } from '@/types';
import type { DemoProps } from './types';
import { DemoFallback } from './types';

import { QuoteDemo } from './QuoteDemo';
import { AnswerBookDemo } from './AnswerBookDemo';
import { WallpaperDemo } from './WallpaperDemo';
import { AvatarDemo, EmojiDemo, ImageDemo } from './AssetDemos';
import { HotDemo } from './HotDemo';
import { HotChartDemo } from './HotChartDemo';
import { MusicDemo } from './MusicDemo';
import { PlayDemo } from './PlayDemo';

export const DEMO_REGISTRY: Record<DemoKind, React.ComponentType<DemoProps>> = {
  quote: QuoteDemo,
  answerbook: AnswerBookDemo,
  wallpaper: WallpaperDemo,
  hot: HotDemo,
  music: MusicDemo,
  play: PlayDemo,
  chart: HotChartDemo,
  emoji: EmojiDemo,
  avatar: AvatarDemo,
  image: ImageDemo,
};

/** 后台新建的接口没有 demo，取不到组件时兜底而不是抛错 */
export function getDemoComponent(demo: DemoKind | null): React.ComponentType<DemoProps> {
  if (!demo) return DemoFallback;
  return DEMO_REGISTRY[demo] ?? DemoFallback;
}

export type { DemoProps } from './types';
export { DemoFallback } from './types';
