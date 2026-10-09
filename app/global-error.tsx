'use client';
/**
 * 根 layout 自身出错时（比如 globals.css 或 metadata 抛异常）只有这里能兜住，
 * 所以样式必须内联：app/error.tsx 依赖的 layout 此刻正是坏掉的那一层。
 */
import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[Decamore API] 根布局渲染失败', error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, background: '#f7f6f2', color: '#2e4e39', font: '14px/1.6 system-ui, sans-serif' }}>
        <main style={{ maxWidth: 480, margin: '18vh auto', padding: '0 24px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 18, margin: '0 0 8px' }}>站点暂时无法访问</h1>
          <p style={{ margin: 0, color: '#6b7a70' }}>
            根布局加载失败，这个页面无法渲染。刷新通常可以恢复；如果一直在报错，请把下面的编号发给管理员。
          </p>
          {error.digest ? (
            <p style={{ marginTop: 12, fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
              错误编号 {error.digest}
            </p>
          ) : null}
          <p style={{ marginTop: 24 }}>
            <button
              type="button"
              onClick={reset}
              style={{
                border: 0,
                borderRadius: 999,
                padding: '10px 20px',
                background: '#2e4e39',
                color: '#f7f6f2',
                font: 'inherit',
                cursor: 'pointer',
              }}
            >
              重新加载
            </button>
          </p>
        </main>
      </body>
    </html>
  );
}
