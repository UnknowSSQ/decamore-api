'use client';
/** 刷新机制：父组件递增 seed，子组件的 effect 依赖它重新生成，比 useImperativeHandle 少一层 ref 穿透 */

export interface DemoProps {
  seed: number;
}

export function DemoFallback({ seed: _seed }: DemoProps) {
  return (
    <div className="flex items-center justify-center text-[11px] text-muted">
      演示暂不可用
    </div>
  );
}
