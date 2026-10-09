import { Reveal } from '@/components/shared/Reveal';
import { CodeWindow } from '@/components/ui/CodeWindow';
import { siteUrl } from '@/env';
import { docApiHref } from '@/constants/app';

const FEATURES = [
  '没有冗余依赖和 SDK，原生 HTTP 请求即可调用',
  '统一返回 {statusCode, message, data, meta} 单层信封',
  '文档结构清晰，示例完整，新手也能快速看懂上手',
];

const CODE_EXAMPLE = `# 一句话调用「一言」接口
curl ${siteUrl()}/api/v1/hitokoto

200 OK
{
  "statusCode": 200,
  "message": "success",
  "data": {
    "content": "没有了对高处的恐惧，就体会不到高处之美。",
    "creator": "刘慈欣",
    "source": "三体II·黑暗森林"
  },
  "meta": {
    "requestId": "muy8epbv-1e4189a2",
    "serverTime": "2026-10-07T14:57:33.433Z",
    "site": "Decamore API"
  }
}`;

export function QuickStartSection() {
  return (
    <section className="bg-bg py-[104px]" id="quick-start">
      <div className="wrap grid grid-cols-1 items-center gap-16 md:grid-cols-[0.9fr_1.1fr]">
        <Reveal>
          <div className="flex flex-col">
            <p className="kicker kicker--line mb-3.5 text-[11px]">Quick Start</p>
            <h2 className="mb-0 text-[clamp(30px,3.4vw,42px)] font-medium leading-[1.25] tracking-[-0.045em] text-ink">
              一行代码，快速开始。
            </h2>
            <p className="mb-[26px] mt-[18px] max-w-[400px] text-[14px] leading-[1.85] text-muted">
              规范的接口设计与数据格式，对齐主流开发习惯，开箱即用。
            </p>
            <ul className="mb-[30px] grid gap-3.5 p-0">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-[13px] leading-[1.7] text-[#4a534c]">
                  <svg
                    className="mt-0.5 shrink-0 text-primary"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <a href={docApiHref('hitokoto')} className="text-[13px] text-[#505a52] transition-colors hover:text-primary">
              点击查看文档 <span aria-hidden>→</span>
            </a>
          </div>
        </Reveal>

        <Reveal delay={0.12}>
          <CodeWindow code={CODE_EXAMPLE} lang="bash" title="terminal — decamore api" lineNumbers />
        </Reveal>
      </div>
    </section>
  );
}
