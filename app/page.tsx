import type { Metadata } from 'next';

import { SiteHeader } from '@/components/shared/SiteHeader';
import { BackToTop } from '@/components/shared/BackToTop';
import { SiteFooter } from '@/components/shared/SiteFooter';
import { HeroSection } from '@/components/landing/HeroSection';
import { StatBand } from '@/components/landing/StatBand';
import { ApiShowcase } from '@/components/landing/ApiShowcase';
import { QuickStartSection } from '@/components/landing/QuickStartSection';
import { CtaSection } from '@/components/landing/CtaSection';
import { getSiteSettings } from '@/lib/server/store/settings';
import { listCatalogItems } from '@/lib/server/catalog';

export const metadata: Metadata = {
  title: 'Decamore API — 十倍爱你',
  description:
    'Decamore API：免费、轻量的接口集合，提供随机一言、答案之书、随机壁纸，以及热搜榜、热歌榜、热播榜、热映榜，返回干净的 JSON，一次请求即可接入。',
  openGraph: {
    title: 'Decamore API — 十倍爱你',
    description: '小接口，大用处。稳定、规范的趣味内容与工具接口，助力业务快速落地内容场景。',
    type: 'website',
    locale: 'zh_CN',
  },
  twitter: { card: 'summary' },
};

export default function HomePage() {
  const { liveCardLayout } = getSiteSettings();
  const catalog = listCatalogItems();

  // 顺序即 liveCardLayout 的数组顺序；车单里已删除的接口自动跳过
  const entries = liveCardLayout.flatMap((span) => {
    const item = catalog.find((entry) => entry.id === span.id);
    return item ? [{ item, span }] : [];
  });

  return (
    <>
      <SiteHeader />
      {/* 落地页 5 屏长，同样给一个回顶浮标（阈值 600 避开首屏 hero；接近页底会自动收起，不压 #contact CTA） */}
      <BackToTop threshold={600} />
      {/* id="main" 是根布局 skip-link 的落点；tabIndex=-1 让键盘跳转后焦点真的进入正文 */}
      <main id="main" tabIndex={-1}>
        <HeroSection />
        <StatBand />
        <ApiShowcase entries={entries} />
        <QuickStartSection />
        <CtaSection />
      </main>
      <SiteFooter />
    </>
  );
}
