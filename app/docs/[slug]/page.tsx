/**
 * slug = API_CATALOG 里的接口 id；未知 slug 直接 notFound()，避免空文档页污染索引。
 * 已撰写的走完整文档，未撰写的退回由接口目录推导的骨架页。
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { BackToTop } from '@/components/shared/BackToTop';
import { SiteFooter } from '@/components/shared/SiteFooter';
import { SiteHeader } from '@/components/shared/SiteHeader';
import { Reveal } from '@/components/shared/Reveal';
import { CodeWindow, MethodBadge } from '@/components/ui';
import { CopyButton } from '@/components/docs/CopyButton';
import { DocBody } from '@/components/docs/DocBody';
import { DocsRail, DocsTocStrip } from '@/components/docs/DocsRail';
import { apiUrl, apiOrigin } from '@/components/docs/url';
import { getDoc, pagerOf, siblingsOf, tocOf } from '@/components/docs/registry';
import { listCatalogItems } from '@/lib/server/catalog';
import { APP_NAME, ROUTES, docApiHref } from '@/constants/app';

interface PageProps {
  params: Promise<{ slug: string }>;
}

/** 车单可在后台编辑，文档必须反映最新值，所以按需渲染而非构建期预渲染 */
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDoc(listCatalogItems(), slug);
  if (!doc) {
    // 组件里的 notFound() 要更晚才渲染，流式响应头已发出、状态码仍是 200，所以这里显式不收录
    return { title: '文档不存在', robots: { index: false, follow: false } };
  }

  const title = `${doc.name} · ${doc.path} — ${APP_NAME} 文档`;
  const description = `${doc.lede || `${doc.name}接口文档。`} 文档含请求方式、参数、返回字段、响应头、错误码与速率说明。`;
  return {
    title,
    description,
    openGraph: { title, description, type: 'article', locale: 'zh_CN' },
    twitter: { card: 'summary' },
    // 骨架页内容待补，不进入搜索索引；已撰写页正常收录
    robots: doc.documented ? undefined : { index: false, follow: true },
  };
}

export default async function ApiDocPage({ params }: PageProps) {
  const { slug } = await params;
  const catalog = listCatalogItems();
  const doc = getDoc(catalog, slug);
  if (!doc) notFound();

  const url = apiUrl(doc.path);
  const { prev, next } = pagerOf(catalog, doc.slug);

  return (
    <>
      <SiteHeader />
      {/* 文档正文很长，且 ≤900px 已有一条吸顶目录；两者互补：目录管「跳去哪」，浮标管「回哪去」 */}
      <BackToTop threshold={600} />

      <div className="mx-auto w-full max-w-docs px-6 pt-10 pb-16 max-[760px]:px-[18px]">
        <DocsTocStrip tocItems={tocOf(doc)} />

        <div className="grid grid-cols-[226px_minmax(0,1fr)_400px] gap-[44px] max-[1240px]:grid-cols-[208px_minmax(0,1fr)] max-[1240px]:gap-[34px] max-[900px]:grid-cols-[minmax(0,1fr)] max-[900px]:gap-6">
          <DocsRail tocItems={tocOf(doc)} siblingApis={siblingsOf(catalog, doc)} />

          <main id="main" tabIndex={-1} className="min-w-0 max-[1240px]:col-span-1 max-[1240px]:order-2">
            <Reveal as="header" className="doc-head">
              <p className="doc-crumb flex items-center gap-[9px] text-[11.5px] text-muted">
                <Link href={ROUTES.home} className="hover:text-primary">
                  {APP_NAME}
                </Link>
                <span className="text-line">/</span>
                <Link href={ROUTES.docs} className="hover:text-primary">
                  文档
                </Link>
                <span className="text-line">/</span>
                <span>{doc.category}类</span>
                <span className="text-line">/</span>
                <span>{doc.name}</span>
              </p>

              <p className="kicker mt-4">{doc.eyebrow}</p>

              <h1 className="mt-3 flex flex-wrap items-baseline gap-x-3 text-[38px] font-bold leading-[1.15] tracking-tight text-ink max-[900px]:text-[34px]">
                <span>{doc.name}</span>
                {doc.en && <span className="text-primary">{doc.en}</span>}
                {!doc.implemented && (
                  <span className="rounded-full bg-warn-soft px-2.5 py-1 text-[11px] font-medium text-warn">
                    服务端未实现
                  </span>
                )}
                {doc.implemented && !doc.documented && (
                  <span className="rounded-full border border-line bg-bg-soft px-2.5 py-1 text-[11px] font-medium text-muted">
                    文档待撰写
                  </span>
                )}
              </h1>

              {doc.lede && (
                <p className="doc-lede mt-4 max-w-[640px] text-[15px] leading-[1.75] text-[#4d554e]">{doc.lede}</p>
              )}

              <div className="route-bar mt-5 flex items-center gap-[13px] rounded-[15px] border border-line bg-surface px-4 py-3 shadow-soft max-[760px]:flex-wrap">
                <MethodBadge method={doc.method} />
                <span className="route-path flex items-center gap-1 font-mono text-[13px] text-ink">
                  <span className="text-muted">{apiOrigin()}</span>
                  <b className="font-semibold">{doc.path}</b>
                </span>
                <CopyButton
                  text={url}
                  className="copy-mini ml-auto flex items-center gap-1 rounded-full border border-line px-3 py-[5px] text-[11px] text-muted transition-colors hover:border-primary hover:bg-[#f2f4ee] hover:text-primary"
                />
              </div>

              {doc.facts.length > 0 && (
                <ul className="facts mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-[#555d56]">
                  {doc.facts.map((fact) => (
                    <li key={fact} className="flex items-center gap-2">
                      <span className="h-[5px] w-[5px] rounded-full bg-[#b6c4b3]" aria-hidden />
                      {fact}
                    </li>
                  ))}
                </ul>
              )}
            </Reveal>

            <DocBody sections={doc.sections} />

            <nav className="doc-pager mt-[52px] grid grid-cols-2 gap-[14px] max-[760px]:grid-cols-1" aria-label="接口翻页">
              {prev && (
                <Link
                  href={docApiHref(prev.slug)}
                  className="group flex flex-col gap-1 rounded-[18px] border border-line bg-surface p-5 transition-all hover:border-primary hover:shadow-soft"
                >
                  <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">上一个接口</span>
                  <span className="text-[15px] font-semibold text-ink group-hover:text-primary">
                    {prev.name}
                    <small className="ml-2 font-mono text-[12px] font-normal text-muted">{prev.path}</small>
                  </span>
                </Link>
              )}
              {next && (
                <Link
                  href={docApiHref(next.slug)}
                  className="group flex flex-col gap-1 rounded-[18px] border border-line bg-surface p-5 text-right transition-all hover:border-primary hover:shadow-soft"
                >
                  <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">下一个接口</span>
                  <span className="text-[15px] font-semibold text-ink group-hover:text-primary">
                    {next.name}
                    <small className="ml-2 font-mono text-[12px] font-normal text-muted">{next.path}</small>
                  </span>
                </Link>
              )}
            </nav>
          </main>

          <aside
            className="docs-aside sticky top-[var(--docs-stick)] max-h-[calc(100vh-140px)] overflow-y-auto pb-3 [scrollbar-width:thin] max-[1240px]:static max-[1240px]:max-h-none max-[1240px]:col-span-2 max-[1240px]:order-3 max-[1240px]:grid max-[1240px]:grid-cols-2 max-[1240px]:gap-4 max-[900px]:col-span-1 max-[900px]:grid-cols-1"
            aria-label="请求与响应示例"
          >
            <Reveal as="div" className="aside-block" delay={0.08}>
              <CodeWindow panes={doc.requestPanes} defaultPane={doc.requestPanes[0]?.value ?? 'curl'} />
            </Reveal>

            {doc.responsePanes.length > 0 && (
              <Reveal as="div" className="aside-block mt-4 max-[1240px]:mt-0" delay={0.14}>
                <CodeWindow panes={doc.responsePanes} defaultPane={doc.responsePanes[0]?.value ?? 'ok'} />
              </Reveal>
            )}

            <Reveal as="div" className="aside-block mt-4" delay={0.2}>
              <div className="aside-meta rounded-[15px] border border-dashed border-line bg-[rgba(255,254,250,0.7)] px-4 py-1.5">
                <div>
                  {doc.metaRows.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-baseline justify-between gap-3.5 border-b border-dashed border-line py-2.5 text-[11.5px] last:border-b-0"
                    >
                      <span className="text-muted">{row.label}</span>
                      <b className="whitespace-nowrap font-mono text-[11px] font-semibold text-ink">{row.value}</b>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                href={`/plaza#${doc.slug}`}
                className="try-link mt-4 flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-full border border-line bg-surface px-4 text-[12.5px] font-semibold text-primary transition-[transform,border-color,background] hover:-translate-y-0.5 hover:border-[#c4cec2] hover:bg-[#f2f4ee]"
              >
                在接口广场试用 <span aria-hidden>↗</span>
              </Link>
            </Reveal>
          </aside>
        </div>
      </div>

      <SiteFooter />
    </>
  );
}
