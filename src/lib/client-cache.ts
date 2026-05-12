import { fetchFromApi } from './db.client';

export class ClientCache {
  static async get(key: string): Promise<any | null> {
    try {
      const data = await fetchFromApi<{ data: any }>(`/api/cache?key=${encodeURIComponent(key)}`);
      return data?.data;
    } catch (error) {
      console.error('获取缓存失败:', error);
      return null;
    }
  }

  static async set(key: string, data: any, expireSeconds?: number): Promise<void> {
    try {
      await fetchFromApi('/api/cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, data, expireSeconds }),
      });
    } catch (error) {
      console.error('设置缓存失败:', error);
      throw error;
    }
  }

  static async delete(key: string): Promise<void> {
    try {
      await fetchFromApi(`/api/cache?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('删除缓存失败:', error);
      throw error;
    }
  }

  static async clearExpired(prefix?: string): Promise<void> {
    try {
      const url = prefix ? `/api/cache?prefix=${encodeURIComponent(prefix)}` : '/api/cache';
      await fetchFromApi(url, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('清理过期缓存失败:', error);
      throw error;
    }
  }
}