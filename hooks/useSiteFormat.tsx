'use client';
/**
 * 站点显示偏好（时区 / 日期格式 / 维护开关）由 app/admin/layout.tsx 在服务端读一次后注入。
 * 不让各视图自己拉 /api/v1/settings：那会让每次换页多一个必然 no-store 的往返。
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { formatClock, formatDate, formatDateTime, formatLongDate, type DisplayPrefs } from '@/utils/format';

export interface SiteDisplay extends DisplayPrefs {
  maintenanceMode: boolean;
  itemsPerPage: number;
}

const DEFAULT_DISPLAY: SiteDisplay = {
  timeZone: undefined,
  dateFormat: 'iso',
  maintenanceMode: false,
  itemsPerPage: 20,
};

const SiteDisplayContext = createContext<SiteDisplay>(DEFAULT_DISPLAY);

export function SiteDisplayProvider({ display, children }: { display: SiteDisplay; children: ReactNode }) {
  return <SiteDisplayContext.Provider value={display}>{children}</SiteDisplayContext.Provider>;
}

export function useSiteDisplay(): SiteDisplay {
  return useContext(SiteDisplayContext);
}

/** 绑好站点偏好的格式化函数，调用方不必每处重复传 prefs */
export function useSiteFormat() {
  const { timeZone, dateFormat, itemsPerPage } = useSiteDisplay();
  const formatters = useMemo(() => {
    const prefs: DisplayPrefs = { timeZone, dateFormat };
    return {
      prefs,
      fmtDate: (input: string | number | Date) => formatDate(input, prefs),
      fmtDateTime: (input: string | number | Date) => formatDateTime(input, prefs),
      fmtClock: (date: Date) => formatClock(date, timeZone),
      fmtLongDate: (date: Date) => formatLongDate(date, timeZone),
    };
  }, [timeZone, dateFormat]);

  return { ...formatters, itemsPerPage };
}
