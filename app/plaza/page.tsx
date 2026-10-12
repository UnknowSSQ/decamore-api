import type { Metadata } from 'next';

import { Reveal } from '@/components/shared/Reveal';
import { SiteFooter } from '@/components/shared/SiteFooter';
import { SiteHeader } from '@/components/shared/SiteHeader';
import { CtaPanel } from '@/components/shared/CtaPanel';
import { BackToTop } from '@/components/shared/BackToTop';
import { PlazaBoard } from '@/components/plaza/PlazaBoard';
import { API_CATALOG } from '@/constants/api-catalog';
import { getSiteSettings } from '@/lib/server/store/settings';
import { listCatalogItems } from '@/lib/server/catalog';

export const metadata: Metadata = {
  title: '接口广场 — Decamore API',
  description:
    `Decamore API 接口广场：${API_CATALOG.length} 个实时可调的接口，卡片即演示，支持关键词模糊搜索接口名称、路径与能力标签。`,
  openGraph: {
    title: '接口广场 — Decamore API',
    description: '每一个卡片都是会动的真实演示，输入关键词即可模糊搜索。',
    type: 'website',
    locale: 'zh_CN',
  },
  twitter: {
    card: 'summary',
  },
};

export default function PlazaPage() {
  const { plazaCardLayout, contactEmail } = getSiteSettings();
  const catalog = listCatalogItems();

  return (
    <>
      <SiteHeader />
      {/* 16 张卡片约 6 屏高，滚到底再想回头看搜索结果很难受 → 右下角浮标（>400px 出现） */}
      <BackToTop threshold={400} />
      <main id="main" tabIndex={-1}>
        {/* Hero + 工具栏：源码里工具栏就在 .plaza-hero 内（靠 z-index 压住底部渐变），
            因此 hero 文案由本 Server Component 生成后作为 prop 交给客户端岛，
            既不破坏层级结构，也避免把搜索状态搬到服务端。 */}
        <PlazaBoard
          items={catalog}
          layout={plazaCardLayout}
          hero={
            <>
              <Reveal as="p" className="kicker kicker--line">
                API Plaza
              </Reveal>
              <Reveal as="h1" id="plaza-title" className="plaza-hero-title">
                接口广场
                <br />
                <span>会动的接口，先试后接。</span>
              </Reveal>
              <Reveal as="p" delay={0.08} className="plaza-hero-copy">
                每张卡片都是一个可直接调用的接口演示。输入关键词模糊搜索接口名称、路径与能力标签，
                点卡片即可刷新结果。
              </Reveal>
            </>
          }
        />

        {/* 与首页 CTA 同一张卡片，只差外层间距：文案改动只需要动 CtaPanel 的调用点 */}
        <section className="bg-bg py-dsp-7">
          <div className="wrap">
            <CtaPanel
              kicker="Missing something?"
              heading="没找到想要的接口？"
              body="告诉我们你的场景，接口清单按需求持续扩充，全部免费开放、无需鉴权。"
              email={contactEmail}
              dialogTitle="提交接口需求"
              dialogDescription="描述你的场景和想要的数据源，我会评估并排进扩充清单。"
              subject="Decamore API 接口需求"
              actionLabel="提交接口需求"
            />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
