/**
 * 上游并发闸：每个主机最多这么多个请求在途，满了就在原地等名额，等不到就拒。
 * 现有那套限流桶的键都以来源 IP 打头（`global|ip`、`default|ip|method|route`、`rule|id|ip`），
 * 只能压住「每个来源多快」，压不住「合计打到上游多猛」——一百个来源就是把上限乘一百，
 * 伪造 x-forwarded-for 甚至不需要真有一百个来源。这里补的就是那一格：与来源无关的出口侧上限。
 *
 * 按主机分闸，是因为慢上游不该拖快上游：气象预警一次全量要 1.4–6.4 秒，
 * 行情只要十几毫秒，共用一道闸会让行情跟着垫底。
 */

/** 每个主机同时在途的上限。上游单次要 8 秒才超时，6 个已经能把一条链路占满 */
export const UPSTREAM_MAX_PARALLEL = 6;
/** 排队等多久；1 秒是客户端预算的零头，等不到就让调用方拿到一个能看懂的 503 */
export const UPSTREAM_QUEUE_WAIT_MS = 1_000;

interface UpstreamGate {
  active: number;
  /** 排队者：拿到名额时由释放方直接交接，不动 active，免得中间被人插队 */
  waiters: Array<(release: () => void) => void>;
}

/**
 * 挂 globalThis：Next 按 route 分包，模块级变量每个 chunk 各存一份，
 * 闸就会变成「每个 chunk 六道」，同进程内实际并发是 6 × chunk 数。
 */
const store = globalThis as typeof globalThis & { __decamoreUpstreamGates?: Map<string, UpstreamGate> };
const gates = (store.__decamoreUpstreamGates ??= new Map<string, UpstreamGate>());

function gateFor(host: string): UpstreamGate {
  const existing = gates.get(host);
  if (existing) return existing;
  const created: UpstreamGate = { active: 0, waiters: [] };
  gates.set(host, created);
  return created;
}

function releaseFor(gate: UpstreamGate): () => void {
  return () => {
    const next = gate.waiters.shift();
    if (next) {
      next(releaseFor(gate));
      return;
    }
    gate.active -= 1;
  };
}

/** 取到一个名额，返回它的释放函数；等不到名额抛错，此时一个名额都不占 */
export function acquireUpstreamSlot(host: string): Promise<() => void> {
  const gate = gateFor(host);

  if (gate.active < UPSTREAM_MAX_PARALLEL) {
    gate.active += 1;
    return Promise.resolve(releaseFor(gate));
  }

  return new Promise<() => void>((resolve, reject) => {
    const waiter = (release: () => void): void => {
      clearTimeout(timer);
      resolve(release);
    };
    const timer = setTimeout(() => {
      const at = gate.waiters.indexOf(waiter);
      if (at >= 0) gate.waiters.splice(at, 1);
      reject(new Error(`上游并发已满（每主机 ${UPSTREAM_MAX_PARALLEL} 个在途），等待 ${UPSTREAM_QUEUE_WAIT_MS} 毫秒仍没有名额`));
    }, UPSTREAM_QUEUE_WAIT_MS);
    gate.waiters.push(waiter);
  });
}
