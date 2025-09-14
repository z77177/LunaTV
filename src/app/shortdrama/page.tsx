/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, no-console */

'use client';

import { Filter, Search } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getShortDramaCategories,
  getShortDramaList,
  searchShortDramas,
} from '@/lib/shortdrama.client';
import { cleanExpiredCache } from '@/lib/shortdrama-cache';
import { ShortDramaCategory, ShortDramaItem } from '@/lib/types';

import PageLayout from '@/components/PageLayout';
import ShortDramaCard from '@/components/ShortDramaCard';

export default function ShortDramaPage() {
  const [categories, setCategories] = useState<ShortDramaCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number>(1);
  const [dramas, setDramas] = useState<ShortDramaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);

  const observer = useRef<IntersectionObserver>();
  const lastDramaElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => prevPage + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  // 获取分类列表
  useEffect(() => {
    // 清理过期缓存
    cleanExpiredCache().catch(console.error);

    const fetchCategories = async () => {
      const cats = await getShortDramaCategories();
      setCategories(cats);
    };
    fetchCategories();
  }, []);

  // 加载短剧列表
  const loadDramas = useCallback(
    async (pageNum: number, reset = false) => {
      if (!hasMore && !reset) return;

      setLoading(true);
      try {
        let result: { list: ShortDramaItem[]; hasMore: boolean };
        if (isSearchMode && searchQuery) {
          result = await searchShortDramas(searchQuery, pageNum, 20);
        } else {
          result = await getShortDramaList(selectedCategory, pageNum, 20);
        }

        if (reset) {
          setDramas(result.list);
        } else {
          setDramas((prev) => [...prev, ...result.list]);
        }
        setHasMore(result.hasMore);
      } catch (error) {
        console.error('加载短剧失败:', error);
      } finally {
        setLoading(false);
      }
    },
    [selectedCategory, searchQuery, isSearchMode, hasMore]
  );

  // 当分类变化时重新加载
  useEffect(() => {
    if (selectedCategory && !isSearchMode) {
      setPage(1);
      setHasMore(true);
      loadDramas(1, true);
    }
  }, [selectedCategory, isSearchMode]);

  // 当页码变化时加载更多
  useEffect(() => {
    if (page > 1) {
      loadDramas(page, false);
    }
  }, [page]);

  // 处理搜索
  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      setIsSearchMode(!!query);
      setPage(1);
      setHasMore(true);

      if (query) {
        const result = await searchShortDramas(query, 1, 20);
        setDramas(result.list);
        setHasMore(result.hasMore);
      } else {
        // 退出搜索模式，重新加载分类数据
        loadDramas(1, true);
      }
    },
    [loadDramas]
  );

  return (
    <PageLayout activePath="/shortdrama">
      <div className="min-h-screen bg-white dark:bg-black">
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          {/* 页面标题 */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              短剧频道
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              精彩短剧，一刷到底
            </p>
          </div>

          {/* 搜索栏 */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索短剧名称..."
                className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            {/* 缓存测试按钮 */}
            <button
              onClick={async () => {
                try {
                  // 清除ClientCache
                  await fetch('/api/cache?prefix=shortdrama-', { method: 'DELETE' });
                  // 清除localStorage
                  Object.keys(localStorage).filter(k => k.startsWith('shortdrama-')).forEach(k => localStorage.removeItem(k));
                  alert('缓存已清除，页面即将刷新');
                  window.location.reload();
                } catch (e) {
                  alert('清除缓存失败: ' + (e as Error).message);
                }
              }}
              className="mt-2 px-4 py-2 bg-red-500 text-white rounded text-sm mr-2"
            >
              🧹 清除缓存 (测试)
            </button>
            {/* 详细调试按钮 */}
            <button
              onClick={async () => {
                try {
                  console.log('🔍 开始调试API调用...');

                  // 添加随机参数避免缓存
                  const timestamp = Date.now();
                  const url = `/api/shortdrama/list?categoryId=1&page=1&size=3&_t=${timestamp}`;

                  console.log('📡 调用URL:', url);
                  const response = await fetch(url);

                  console.log('📥 响应状态:', response.status);
                  console.log('📥 响应头:', Object.fromEntries(response.headers.entries()));

                  const data = await response.json();
                  console.log('📦 响应数据:', data);

                  const firstItem = data.list?.[0];
                  const debugInfo = {
                    timestamp: new Date().toISOString(),
                    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
                    responseHeaders: Object.fromEntries(response.headers.entries()),
                    firstItem: firstItem ? {
                      id: firstItem.id,
                      name: firstItem.name,
                      update_time: firstItem.update_time
                    } : null,
                    count: data.list?.length || 0
                  };

                  alert('调试信息:\\n' + JSON.stringify(debugInfo, null, 2));
                } catch (e) {
                  console.error('调试失败:', e);
                  alert('调试失败: ' + (e as Error).message);
                }
              }}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded text-sm"
            >
              🔍 详细调试
            </button>
            {/* 绕过缓存测试 */}
            <button
              onClick={async () => {
                try {
                  // 直接绕过所有缓存层
                  const timestamp = Date.now();
                  const response = await fetch(`/api/shortdrama/list?categoryId=1&page=1&size=20&_bypass=${timestamp}`, {
                    cache: 'no-store',
                    headers: {
                      'Cache-Control': 'no-cache',
                      'Pragma': 'no-cache'
                    }
                  });

                  const data = await response.json();
                  console.log('绕过缓存的数据:', data);

                  // 记录设置前的状态
                  console.log('设置前的dramas长度:', dramas.length);
                  console.log('设置前第一条:', dramas[0]);

                  // 直接设置到页面状态
                  setDramas(data.list || []);
                  setHasMore(data.hasMore || false);

                  // 强制页面重新渲染
                  setLoading(false);

                  const newFirstItem = data.list?.[0];
                  alert(`绕过缓存成功！\n获取到 ${data.list?.length || 0} 条数据\n第一条: ${newFirstItem?.name}\n时间: ${newFirstItem?.update_time}`);
                } catch (e) {
                  alert('绕过缓存失败: ' + (e as Error).message);
                }
              }}
              className="mt-2 px-4 py-2 bg-green-500 text-white rounded text-sm ml-2"
            >
              🚀 绕过缓存
            </button>
          </div>

          {/* 分类筛选 */}
          {!isSearchMode && (
            <div className="mb-6">
              <div className="flex items-center space-x-2 mb-3">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  分类筛选
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.type_id}
                    onClick={() => setSelectedCategory(category.type_id)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      selectedCategory === category.type_id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    {category.type_name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 短剧网格 */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {dramas.map((drama, index) => (
              <div
                key={`${drama.id}-${index}`}
                ref={index === dramas.length - 1 ? lastDramaElementRef : null}
              >
                <ShortDramaCard drama={drama} />
              </div>
            ))}
          </div>

          {/* 加载状态 */}
          {loading && (
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {Array.from({ length: 12 }).map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="aspect-[2/3] w-full rounded-lg bg-gray-200 dark:bg-gray-800"></div>
                  <div className="mt-2 h-4 rounded bg-gray-200 dark:bg-gray-800"></div>
                  <div className="mt-1 h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-800"></div>
                </div>
              ))}
            </div>
          )}

          {/* 无更多数据提示 */}
          {!loading && !hasMore && dramas.length > 0 && (
            <div className="mt-8 text-center text-gray-500 dark:text-gray-400">
              已经到底了～
            </div>
          )}

          {/* 无搜索结果 */}
          {!loading && dramas.length === 0 && isSearchMode && (
            <div className="mt-8 text-center">
              <div className="text-gray-500 dark:text-gray-400">
                没有找到相关短剧
              </div>
              <button
                onClick={() => handleSearch('')}
                className="mt-2 text-blue-600 hover:text-blue-500 dark:text-blue-400"
              >
                清除搜索条件
              </button>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}