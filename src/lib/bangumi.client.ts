'use client';

import { fetchFromApi } from './db.client';

export interface BangumiCalendarData {
  weekday: {
    en: string;
    cn?: string;
    ja?: string;
    id?: number;
  };
  items: {
    id: number;
    name: string;
    name_cn?: string;
    rating?: {
      total?: number;
      count?: Record<string, number>;
      score?: number;
    };
    air_date?: string;
    air_weekday?: number;
    rank?: number;
    images?: {
      large?: string;
      common?: string;
      medium?: string;
      small?: string;
      grid?: string;
    };
    collection?: {
      doing?: number;
    };
    url?: string;
    type?: number;
    summary?: string;
  }[];
}

export async function GetBangumiCalendarData(): Promise<BangumiCalendarData[]> {
  try {
    const data = await fetchFromApi<BangumiCalendarData[]>('/api/proxy/bangumi?path=calendar', {}, 0);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn('获取 Bangumi 日历失败:', error);
    return [];
  }
}
