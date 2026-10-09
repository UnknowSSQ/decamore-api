import { Reveal } from '@/components/shared/Reveal';

export function HeroSection() {
  return (
    <section className="wrap relative grid grid-cols-1 items-center gap-[60px] pb-16 pt-[76px] overflow-clip md:grid-cols-[1.05fr_0.95fr]">
      <Reveal>
        <div className="flex flex-col gap-6">
          <p className="kicker kicker--line text-[12px]">Small APIs, Big Fun</p>
          <h1 className="max-w-[640px] text-balance text-[clamp(46px,6vw,88px)] font-medium leading-[1.06] tracking-[-0.06em] text-ink">
            Decamore API
            <span className="block text-primary">感受纯粹的体验</span>
          </h1>
          <p className="max-w-[470px] text-[15px] leading-[1.9] text-muted">
            面向开发者打造免费轻量的多元接口能力，涵盖趣味内容与实时榜单数据，统一 JSON 格式输出，一步接入即可调用。
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <a
              href="#apis"
              className="inline-flex h-12 items-center justify-center gap-3 rounded-full bg-primary px-5 text-[13px] font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-primary-dark"
            >
              即刻探索 <span aria-hidden className="text-[17px]">↗</span>
            </a>
            <a href="#quick-start" className="text-[13px] text-[#505a52] transition-colors hover:text-primary">
              阅读文档 <span aria-hidden>→</span>
            </a>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.12}>
        <div
          className="relative min-h-[410px] overflow-hidden rounded-[28px] bg-[#e9ede5]"
          role="img"
          aria-label="由柔和绿色圆形与接口卡片组成的抽象插画"
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 78% 18%, rgba(255, 255, 255, 0.8), transparent 27%), linear-gradient(145deg, #e9ede5 5%, #dce5d9 100%)',
            }}
          />

          <div
            className="absolute right-[54px] top-[52px] h-[278px] w-[278px] rounded-full border border-[rgba(54,91,73,0.19)]"
            aria-hidden
          >
            <div className="absolute inset-6 rounded-full border border-[rgba(54,91,73,0.15)]" />
            <div className="absolute inset-[50px] rounded-full border border-[rgba(54,91,73,0.15)]" />
          </div>

          <div
            className="absolute right-[108px] top-[104px] h-[170px] w-[170px] rounded-full"
            style={{
              background: 'linear-gradient(135deg, #b7c8b4, #6c8d72)',
              boxShadow: '22px 26px 45px rgba(46, 78, 57, 0.17)',
            }}
            aria-hidden
          >
            <div
              className="absolute inset-x-[12px] inset-y-[10px] rounded-full border border-[rgba(255,255,255,0.5)]"
              style={{ transform: 'rotate(-28deg)' }}
            />
          </div>

          <div className="absolute left-[34px] top-[57px] z-10 w-[220px] rounded-[15px] border border-[rgba(255,255,255,0.8)] bg-[rgba(255,254,250,0.84)] p-5 shadow-soft backdrop-blur-xl">
            <div className="mb-3 text-[10px] tracking-[0.1em] text-[#6d756e]">REST / JSON API</div>
            <div className="mb-4 text-[14px] font-semibold">标准 JSON 格式输出</div>
            <div className="grid gap-[7px]" aria-hidden>
              <span className="block h-[5px] rounded-[8px] bg-[#e4e8e1]" />
              <span className="block h-[5px] w-[72%] rounded-[8px] bg-[#e4e8e1]" />
              <span className="block h-[5px] w-[48%] rounded-[8px] bg-[#e4e8e1]" />
            </div>
          </div>

          <div className="absolute bottom-[36px] right-[28px] z-10 w-[190px] rounded-[15px] border border-[rgba(255,255,255,0.8)] bg-[rgba(255,254,250,0.84)] p-5 shadow-soft backdrop-blur-xl">
            <div className="mb-3 text-[10px] tracking-[0.1em] text-[#6d756e]">FREE / NO SIGNIN</div>
            <div className="mb-4 text-[14px] font-semibold">免登录、免签名</div>
            <div className="grid gap-[7px]" aria-hidden>
              <span className="block h-[5px] rounded-[8px] bg-[#e4e8e1]" />
              <span className="block h-[5px] rounded-[8px] bg-[#e4e8e1]" />
            </div>
          </div>

          <span
            className="absolute right-[82px] top-[70px] h-2 w-2 rounded-full bg-[#fffefa] shadow-[0_0_0_7px_rgba(255,254,250,0.2)]"
            aria-hidden
          />
          <span
            className="absolute bottom-[116px] left-[78px] h-1.5 w-1.5 rounded-full bg-[#66826b] shadow-[0_0_0_7px_rgba(102,130,107,0.2)]"
            aria-hidden
          />

          <span className="absolute bottom-[18px] right-[30px] text-[10px] tracking-[0.12em] text-[#5d6b5f]">
            BUILD WITH CONFIDENCE
          </span>
        </div>
      </Reveal>

      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-[160px]"
        style={{
          background: 'linear-gradient(180deg, transparent, rgba(241, 241, 234, 0.55) 82%, #f1f1ea)',
        }}
        aria-hidden
      />
    </section>
  );
}
