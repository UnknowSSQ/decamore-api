/**
 * 状态列如实标注：只有服务端已实现且文档已撰写才标「已可调用」，免得用户照着未实现的文档去接。
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteFooter } from '@/components/shared/SiteFooter';
import { SiteHeader } from '@/components/shared/SiteHeader';
import { Reveal } from '@/components/shared/Reveal';
import { MethodBadge } from '@/components/ui';
import { docsByCategory } from '@/components/docs/registry';
import { listCatalogItems } from '@/lib/server/catalog';
import type { ApiDoc } from '@/components/docs/types';
import { APP_NAME, ROUTES, docApiHref } from '@/constants/app';

export const metadata: Metadata = {
  title: '接口文档 — Decamore API',
  description:
    'Decamore API 接口文档索引：按分类列出全部接口，逐个给出请求方式、参数、返回字段、响应头、错误码与速率说明。',
  openGraph: {
    title: '接口文档 — Decamore API',
    description: '每个接口一页文档，未实现与待撰写都会如实标注。',
    type: 'website',
    locale: 'zh_CN',
  },
};

function StatusChip({ doc }: { doc: ApiDoc }) {
  if (!doc.implemented) {
    return (
      <span className="rounded-full bg-warn-soft px-2 py-[3px] text-[10.5px] font-medium text-warn">
        服务端未实现
      </span>
    );
  }
  if (!doc.documented) {
    return (
      <span className="rounded-full border border-line bg-bg-soft px-2 py-[3px] text-[10.5px] font-medium text-muted">
        文档待撰写
      </span>
    );
  }
  return (
    <span className="rounded-full border border-line bg-bg-soft px-2 py-[3px] text-[10.5px] font-medium text-ok">
      已可调用
    </span>
  );
}

export default function DocsIndexPage() {
  // 索引跟着车单走：后台新增/改名接口后，这里不需要再动文档代码
  const groups = docsByCategory(listCatalogItems());

  return (
    <>
      <SiteHeader />

      <main id="main" tabIndex={-1}>
        <section className="bg-bg-soft py-[72px]">
          <div className="wrap">
            <Reveal as="header" className="max-w-[720px]">
              <p className="kicker kicker--line mb-3.5 text-[11px]">API Docs · v1</p>
              <h1 className="mb-0 text-[clamp(34px,4.2vw,52px)] font-medium leading-[1.16] tracking-[-0.045em] text-ink">
                接口文档
              </h1>
              <p className="mt-4 mb-0 text-[14px] leading-[1.9] text-muted">
                每个接口一页：请求方式、参数、返回字段、响应头、错误码与速率说明，全部以{' '}
                <code className="rounded-[6px] border border-line bg-white/70 px-1.5 py-[1px] font-mono text-[12.5px]">
                  curl
                </code>{' '}
                实测为准。未实现的服务端与未撰写的章节都会如实标注，不给出看起来能跑的假示例。
              </p>
            </Reveal>
          </div>
        </section>

        <section className="py-[72px]">
          <div className="wrap flex flex-col gap-[44px]">
            {groups.map((group) => (
              <Reveal key={group.category} as="div">
                <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-line pb-2.5">
                  <h2 className="mb-0 text-[17px] font-semibold tracking-[-0.02em] text-ink">{group.category}类</h2>
                  <span className="font-mono text-[11.5px] text-muted">{group.docs.length} 个接口</span>
                </div>

                <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 max-[820px]:grid-cols-1">
                  {group.docs.map((doc) => (
                    <li key={doc.slug}>
                      <Link
                        href={docApiHref(doc.slug)}
                        className="group flex h-full flex-col gap-2 rounded-[16px] border border-line bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft"
                      >
                        <span className="flex flex-wrap items-center gap-2">
                          <MethodBadge method={doc.method} />
                          <span className="text-[14px] font-semibold text-ink group-hover:text-primary">
                            {doc.name}
                          </span>
                          {doc.en && <span className="text-[12px] text-muted">{doc.en}</span>}
                          <span className="ml-auto">
                            <StatusChip doc={doc} />
                          </span>
                        </span>

                        <code className="font-mono text-[11.5px] text-[#5d6b5f]">{doc.path}</code>

                        <p className="mb-0 line-clamp-2 text-[12.5px] leading-[1.7] text-muted">{doc.lede}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="bg-bg-soft py-[52px]">
          <div className="wrap flex flex-wrap items-center justify-between gap-4">
            <p className="mb-0 text-[12.5px] leading-[1.8] text-muted">
              想直接看效果？{' '}
              <Link href={ROUTES.plaza} className="font-medium text-primary hover:underline">
                接口广场
              </Link>{' '}
              的卡片可以就地试用；接入方式见{' '}
              <Link href={`${ROUTES.home}#quick-start`} className="font-medium text-primary hover:underline">
                快速开始
              </Link>
              。
            </p>
            <span className="font-mono text-[11px] text-muted">{APP_NAME} · docs v1</span>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
