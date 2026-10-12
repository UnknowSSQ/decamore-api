import { API_CATALOG } from '@/constants/api-catalog';
import { RATE_LIMIT_PER_MIN_DEFAULT } from '@/constants/app';
import { Reveal } from '@/components/shared/Reveal';

/** 只放能从代码里指出依据的数字：接口数取车单长度，频控取 env 默认值 */
const STATS = [
  { value: String(API_CATALOG.length), label: '公开接口，全部免鉴权' },
  { value: '60s', label: '榜单接口起算的服务端缓存' },
  { value: String(RATE_LIMIT_PER_MIN_DEFAULT), label: '每分钟单 IP 默认额度' },
  { value: '¥0', label: '所有接口，免费调用' },
];

export function StatBand() {
  return (
    <aside className="relative z-10 bg-bg-soft pb-0 pt-[42px]" aria-label="服务指标">
      <div className="wrap grid grid-cols-2 gap-x-[18px] gap-y-7 md:grid-cols-4 md:gap-6">
        {STATS.map((stat, i) => (
          <Reveal key={stat.value} delay={i * 0.08}>
            <div className="relative pl-5">
              <div
                className="absolute bottom-1.5 left-0 top-1.5 w-0.5 rounded-sm bg-accent"
                aria-hidden
              />
              <strong className="mb-[7px] block text-[clamp(24px,2.6vw,32px)] font-semibold tracking-[-0.03em] text-primary">
                {stat.value}
              </strong>
              <span className="text-[12px] tracking-[0.02em] text-muted">{stat.label}</span>
            </div>
          </Reveal>
        ))}
      </div>
    </aside>
  );
}
