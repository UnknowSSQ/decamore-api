'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useClickOutside<T extends HTMLElement = HTMLDivElement>(
  handler: () => void,
  enabled = true,
) {
  const ref = useRef<T | null>(null);
  const saved = useRef(handler);
  saved.current = handler;

  useEffect(() => {
    if (!enabled) return;
    const onDocDown = (event: MouseEvent | TouchEvent) => {
      const node = ref.current;
      if (!node) return;
      if (event.target instanceof Node && !node.contains(event.target)) saved.current();
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('touchstart', onDocDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('touchstart', onDocDown);
    };
  }, [enabled]);

  return ref;
}

export function useHotkey(
  key: string,
  handler: (event: KeyboardEvent) => void,
  options: { enabled?: boolean; ignoreInputs?: boolean } = {},
) {
  const { enabled = true, ignoreInputs = true } = options;
  const saved = useRef(handler);
  saved.current = handler;

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== key || event.metaKey || event.ctrlKey || event.altKey) return;
      if (ignoreInputs) {
        const target = event.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return;
      }
      saved.current(event);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [key, enabled, ignoreInputs]);
}

export function useDebouncedValue<T>(value: T, delayMs = 180): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/** 非安全上下文（内网 http）没有 navigator.clipboard，回退 execCommand 才复制得出去 */
export function useCopyToClipboard(resetMs = 1600): { copied: string | null; copy: (text: string, key?: string) => Promise<boolean> } {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (text: string, key?: string) => {
      let ok = false;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          ok = true;
        } else {
          const area = document.createElement('textarea');
          area.value = text;
          area.setAttribute('readonly', '');
          area.style.position = 'fixed';
          area.style.opacity = '0';
          document.body.appendChild(area);
          area.select();
          ok = document.execCommand('copy');
          document.body.removeChild(area);
        }
      } catch {
        ok = false;
      }

      if (ok) {
        setCopied(key ?? text);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(null), resetMs);
      }
      return ok;
    },
    [resetMs],
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return { copied, copy };
}

export function useScrolled(threshold = 40): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        setScrolled(window.scrollY > threshold);
        raf = 0;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [threshold]);

  return scrolled;
}

/** 快到底部时收起：否则浮标压住页底右下角的 CTA 卡片，手机上尤其明显 */
export function useScrollVisible(threshold = 400, bottomGapPx = 260): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let raf = 0;
    const check = () => {
      const { scrollY, innerHeight } = window;
      const distanceToBottom = document.documentElement.scrollHeight - (scrollY + innerHeight);
      setVisible(scrollY > threshold && distanceToBottom > bottomGapPx);
      raf = 0;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [threshold, bottomGapPx]);

  return visible;
}

/** rootMargin 由调用方传：桌面 rail 与移动端粘性目录条的判定区不一样。
 *  取 intersecting entries 里 top 最小的一条（最靠上的可见章节），比 intersectRatio 稳，长表格分节时 ratio 会乱 */
export function useScrollSpy(ids: readonly string[], rootMargin = '-96px 0px -62% 0px'): string {
  const [activeId, setActiveId] = useState<string>(ids[0] ?? '');
  // ids 写进依赖会随调用方新建数组反复重建 observer，所以走 ref
  const idsRef = useRef(ids);
  idsRef.current = ids;

  useEffect(() => {
    const sections = idsRef.current
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const top = visible[0];
        if (top) setActiveId(top.target.id);
      },
      { rootMargin, threshold: [0, 1] },
    );

    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [rootMargin]);

  return activeId;
}

/** 命中一次就 unobserve，避免来回滚动反复触发 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(options?: { threshold?: number; rootMargin?: string }) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // 没有 IO（老浏览器 / SSR）时直接可见，内容不能因为动画不了就丢
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: options?.threshold ?? 0.12, rootMargin: options?.rootMargin ?? '0px 0px -40px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [options?.threshold, options?.rootMargin]);

  return { ref, visible };
}

/** fromRef 存上一次的终值：target 变了从那里续接，而不是每次从 0 重放 */
export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      fromRef.current = target;
      setValue(target);
      return;
    }

    const start = fromRef.current;
    const delta = target - start;
    if (delta === 0) return;

    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(start + delta * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

/** 返回 ready 而不是直接给 Date：SSR 与服务端的 Date 不同，首帧必须渲染占位，否则 hydration mismatch */
export function useNow(intervalMs = 1000): { now: Date; ready: boolean } {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    setTick(1);
    const timer = setInterval(() => setTick((n) => n + 1), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return { now: new Date(), ready: tick > 0 };
}
