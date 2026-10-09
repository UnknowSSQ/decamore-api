'use client';
/** 只 patch maintenanceMode 一个键，其余站点设置原样保留 */
import { useEffect, useState } from 'react';

import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/hooks/useToast';
import { fetchSiteSettings, patchSiteSettings } from '@/lib/api';

export function MaintenanceBanner() {
  const [isOn, setIsOn] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchSiteSettings()
      .then((res) => {
        setIsOn(res.maintenanceMode);
      })
      .catch(() => {
        // 失败时不显示，不阻塞页面
      });
  }, []);

  const handleClose = async () => {
    try {
      await patchSiteSettings({ maintenanceMode: false });
      setIsOn(false);
      toast.success('维护模式已关闭，前台恢复服务');
    } catch {
      toast.error('关闭维护模式失败');
    }
  };

  if (!isOn) return null;

  return (
    <div className="flex items-center gap-3 border-b border-warn/30 bg-warn-soft px-6 py-3 text-[12.5px] text-warn">
      <Icon name="warning" size={16} className="shrink-0" />
      <p className="flex-1">
        <strong className="font-semibold">维护模式已开启</strong> · 前台接口调用将统一返回 503 维护页，请前往「网站设置」调整计划。
      </p>
      <button
        type="button"
        onClick={handleClose}
        className="rounded-full border border-warn/40 bg-surface px-3 py-1 text-[11.5px] font-medium text-warn transition-colors hover:border-warn hover:bg-warn-soft"
      >
        关闭维护模式
      </button>
    </div>
  );
}
