'use client';
import { Badge, MethodBadge } from '@/components/ui';
import { Drawer } from '@/components/ui/Overlay';
import { useSiteFormat } from '@/hooks/useSiteFormat';
import { formatDuration } from '@/utils/format';
import type { CallLog } from '@/types';

export function LogDetailDrawer({ log, onClose }: { log: CallLog | null; onClose: () => void }) {
  const { fmtDateTime } = useSiteFormat();
  if (!log) return null;

  // 4xx（含 429）只标黄，红留给 5xx
  const statusTone = log.status < 300 ? 'ok' : log.status < 500 ? 'warn' : 'danger';

  return (
    <Drawer open={!!log} onClose={onClose} title="日志详情">
      <div className="flex flex-col gap-4 p-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[11px] text-muted">时间</div>
            <div className="mt-1 font-mono text-[12.5px] text-ink">{fmtDateTime(log.time)}</div>
          </div>
          <div>
            <div className="text-[11px] text-muted">接口</div>
            <div className="mt-1 flex items-center gap-2">
              <MethodBadge method={log.method} />
              <span className="font-mono text-[11.5px] text-ink">{log.path}</span>
            </div>
          </div>
          <div>
            <div className="text-[11px] text-muted">状态码</div>
            <div className="mt-1">
              <Badge tone={statusTone} mono>
                {log.status}
              </Badge>
            </div>
          </div>
          <div>
            <div className="text-[11px] text-muted">耗时</div>
            <div className="mt-1 font-mono text-[12.5px] text-ink">{formatDuration(log.latencyMs)}</div>
          </div>
        </div>

        <div className="border-t border-line pt-4">
          <div className="text-[11px] text-muted">来源</div>
          <div className="mt-1 font-mono text-[12.5px] text-ink">{log.ip}</div>
        </div>

        <div className="border-t border-line pt-4">
          <div className="text-[11px] text-muted">调用方</div>
          <div className="mt-1 text-[12.5px] text-ink">
            {log.caller === 'anonymous' ? '匿名调用' : log.caller}
          </div>
        </div>

        <div className="border-t border-line pt-4">
          <div className="text-[11px] text-muted">缓存命中</div>
          <div className="mt-1">
            {log.cacheHit === undefined ? (
              <span className="text-[12.5px] text-muted">该接口没有缓存语义</span>
            ) : (
              <Badge tone={log.cacheHit ? 'ok' : 'neutral'} mono>
                {log.cacheHit ? 'HIT' : 'MISS'}
              </Badge>
            )}
          </div>
        </div>

        <div className="border-t border-line pt-4">
          <div className="text-[11px] text-muted">User-Agent</div>
          <div className="mt-1 break-all text-[11.5px] text-ink">{log.ua}</div>
        </div>

        <div className="border-t border-line pt-4">
          <div className="text-[11px] text-muted">traceId</div>
          <div className="mt-1 break-all font-mono text-[11.5px] text-ink">{log.id}</div>
          <p className="mt-1 text-[11px] text-muted">与服务端日志、响应头 x-trace-id 同值，报障时给出它即可定位这一次调用。</p>
        </div>
      </div>
    </Drawer>
  );
}
