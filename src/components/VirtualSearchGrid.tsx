/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';

const Grid = dynamic(
  () => import('react-window').then(mod => ({ default: mod.Grid })),
  {
    ssr: false,
    loading: () => <div className="animate-pulse h-96 bg-gray-200 dark:bg-gray-800 rounded-lg" />
  }
);

import { SearchResult } from '@/lib/types';
import { useResponsiveGrid } from '@/hooks/useResponsiveGrid';
import { useImagePreload } from '@/hooks/useImagePreload';

import VideoCard from '@/components/VideoCard';

// 导出的 ref 接口，供父组件调用
export interface VirtualSearchGridRef {
  scrollToTop: () => void;
}

interface VirtualSearchGridProps {
  // 搜索结果数据
  allResults: SearchResult[];
  filteredResults: SearchResult[];
  aggregatedResults: [string, SearchResult[]][];
  filteredAggResults: [string, SearchResult[]][];

  // 视图模式
  viewMode: 'agg' | 'all';

  // 搜索相关
  searchQuery: string;
  isLoading: boolean;

  // VideoCard相关props
  groupRefs: React.MutableRefObject<Map<string, React.RefObject<any>>>;
  groupStatsRef: React.MutableRefObject<Map<string, any>>;
  getGroupRef: (key: string) => React.RefObject<any>;
  computeGroupStats: (group: SearchResult[]) => any;
}

// 首屏优先加载配置 - 用于图片预加载优化
const INITIAL_PRIORITY_COUNT = 24; // 首屏优先加载的卡片数量（约2-3屏）

export const VirtualSearchGrid = React.forwardRef<VirtualSearchGridRef, VirtualSearchGridProps>(({
  allResults,
  filteredResults,
  aggregatedResults,
  filteredAggResults,
  viewMode,
  searchQuery,
  isLoading,
  groupRefs,
  groupStatsRef,
  getGroupRef,
  computeGroupStats,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<any>(null); // Grid ref for imperative scroll
  const { columnCount, itemWidth, itemHeight, containerWidth } = useResponsiveGrid(containerRef);

  // 选择当前显示的数据 - 直接使用全部数据，让 react-window 处理虚拟化
  const currentData = viewMode === 'agg' ? filteredAggResults : filteredResults;
  const totalItemCount = currentData.length;

  // 预加载图片 - 收集首屏及附近的图片 URLs
  const imagesToPreload = useMemo(() => {
    const urls: string[] = [];
    // 预加载前 30 个项目的图片（约首屏+1-2屏）
    const itemsToPreload = currentData.slice(0, Math.min(30, totalItemCount));

    itemsToPreload.forEach(item => {
      if (viewMode === 'agg') {
        const [, group] = item as [string, SearchResult[]];
        if (group[0]?.poster) urls.push(group[0].poster);
      } else {
        const searchItem = item as SearchResult;
        if (searchItem.poster) urls.push(searchItem.poster);
      }
    });

    return urls;
  }, [currentData, totalItemCount, viewMode]);

  useImagePreload(imagesToPreload, totalItemCount > 0);

  // 当搜索关键词或视图模式改变时，滚动到顶部
  useEffect(() => {
    if (gridRef.current?.scrollToCell && totalItemCount > 0) {
      try {
        gridRef.current.scrollToCell({
          columnIndex: 0,
          rowIndex: 0,
          align: 'start',
          behavior: 'smooth'
        });
      } catch (error) {
        // 忽略滚动错误（可能在组件卸载时发生）
        console.debug('Grid scroll error (safe to ignore):', error);
      }
    }
  }, [searchQuery, viewMode]);

  // 强制重新计算容器尺寸的useEffect
  useEffect(() => {
    const checkContainer = () => {
      const element = containerRef.current;
      const actualWidth = element?.offsetWidth || 0;
      
      console.log('VirtualSearchGrid container debug:', {
        actualWidth,
        containerWidth,
        offsetWidth: element?.offsetWidth,
        clientWidth: element?.clientWidth,
        scrollWidth: element?.scrollWidth,
        element: !!element
      });
    };
    
    checkContainer();
  }, [containerWidth]);

  // 暴露 scrollToTop 方法给父组件
  useImperativeHandle(ref, () => ({
    scrollToTop: () => {
      if (gridRef.current?.scrollToCell) {
        try {
          gridRef.current.scrollToCell({
            columnIndex: 0,
            rowIndex: 0,
            align: 'start',
            behavior: 'smooth'
          });
        } catch (error) {
          console.debug('Grid scroll to top error (safe to ignore):', error);
        }
      }
    }
  }), []);

  // 网格行数计算 - 基于全部数据
  const rowCount = Math.ceil(totalItemCount / columnCount);

  // 单行网格优化：确保单行时布局正确（react-window 2.1.1修复了相关bug）
  const isSingleRow = rowCount === 1;

  // 渲染单个网格项 - 支持react-window v2.1.0的ariaAttributes
  const CellComponent = useCallback(({
    ariaAttributes,
    columnIndex,
    rowIndex,
    style,
    currentData: cellCurrentData,
    viewMode: cellViewMode,
    searchQuery: cellSearchQuery,
    columnCount: cellColumnCount,
    totalItemCount: cellTotalItemCount,
    groupStatsRef: cellGroupStatsRef,
    getGroupRef: cellGetGroupRef,
    computeGroupStats: cellComputeGroupStats,
  }: any) => {
    const index = rowIndex * cellColumnCount + columnIndex;

    // 如果超出数据范围，返回隐藏的占位符
    if (index >= cellTotalItemCount) {
      return <div style={{ ...style, visibility: 'hidden' }} />;
    }

    const item = cellCurrentData[index];

    if (!item) {
      return <div style={{ ...style, visibility: 'hidden' }} />;
    }

    // 🎯 图片加载优化：首屏卡片使用 priority 预加载
    const isPriorityImage = index < INITIAL_PRIORITY_COUNT;

    // 根据视图模式渲染不同内容
    if (cellViewMode === 'agg') {
      const [mapKey, group] = item as [string, SearchResult[]];
      const title = group[0]?.title || '';
      const poster = group[0]?.poster || '';
      const year = group[0]?.year || 'unknown';
      const { episodes, source_names, douban_id } = cellComputeGroupStats(group);
      const type = episodes === 1 ? 'movie' : 'tv';

      // 如果该聚合第一次出现，写入初始统计
      if (!cellGroupStatsRef.current.has(mapKey)) {
        cellGroupStatsRef.current.set(mapKey, { episodes, source_names, douban_id });
      }

      return (
        <div style={{ ...style, padding: '8px' }} {...ariaAttributes}>
          <VideoCard
            ref={cellGetGroupRef(mapKey)}
            from='search'
            isAggregate={true}
            title={title}
            poster={poster}
            year={year}
            episodes={episodes}
            source_names={source_names}
            douban_id={douban_id}
            query={cellSearchQuery.trim() !== title ? cellSearchQuery.trim() : ''}
            type={type}
            remarks={group[0]?.remarks}
            priority={isPriorityImage}
          />
        </div>
      );
    } else {
      const searchItem = item as SearchResult;
      return (
        <div style={{ ...style, padding: '8px' }} {...ariaAttributes}>
          <VideoCard
            id={searchItem.id}
            title={searchItem.title}
            poster={searchItem.poster}
            episodes={searchItem.episodes.length}
            source={searchItem.source}
            source_name={searchItem.source_name}
            douban_id={searchItem.douban_id}
            query={cellSearchQuery.trim() !== searchItem.title ? cellSearchQuery.trim() : ''}
            year={searchItem.year}
            from='search'
            type={searchItem.episodes.length > 1 ? 'tv' : 'movie'}
            remarks={searchItem.remarks}
            priority={isPriorityImage}
          />
        </div>
      );
    }
  }, []);


  return (
    <div ref={containerRef} className='w-full'>
      {totalItemCount === 0 ? (
        <div className='flex justify-center items-center min-h-[300px]'>
          {isLoading ? (
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-green-500'></div>
          ) : (
            <div className='relative px-8 py-6 rounded-2xl bg-gradient-to-r from-gray-50 via-slate-50 to-gray-50 dark:from-gray-800/40 dark:via-slate-800/40 dark:to-gray-800/40 border border-gray-200/50 dark:border-gray-700/50 shadow-lg overflow-hidden'>
              {/* 装饰背景 */}
              <div className='absolute inset-0 bg-gradient-to-br from-gray-100/20 to-slate-100/20 dark:from-gray-700/10 dark:to-slate-700/10'></div>

              {/* 内容 */}
              <div className='relative flex flex-col items-center gap-3'>
                <div className='text-4xl'>🔍</div>
                <div className='text-center text-gray-600 dark:text-gray-300 font-medium'>
                  未搜索到结果
                </div>
                <div className='text-sm text-gray-500 dark:text-gray-400'>
                  试试其他关键词吧
                </div>
              </div>
            </div>
          )}
        </div>
      ) : containerWidth <= 100 ? (
        <div className='flex justify-center items-center h-40'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-green-500'></div>
          <span className='ml-2 text-sm text-gray-500'>
            初始化虚拟滑动... ({Math.round(containerWidth)}px)
          </span>
        </div>
      ) : (
        <Grid
          key={`grid-${containerWidth}-${columnCount}`}
          gridRef={gridRef}
          cellComponent={CellComponent}
          cellProps={{
            currentData,
            viewMode,
            searchQuery,
            columnCount,
            totalItemCount,
            groupStatsRef,
            getGroupRef,
            computeGroupStats,
          }}
          columnCount={columnCount}
          columnWidth={itemWidth + 16}
          rowCount={rowCount}
          rowHeight={itemHeight + 16}
          overscanCount={5}
          // 添加ARIA支持提升无障碍体验
          role="grid"
          aria-label={`搜索结果列表 "${searchQuery}"，共${totalItemCount}个结果，当前视图：${viewMode === 'agg' ? '聚合视图' : '全部结果'}`}
          aria-rowcount={rowCount}
          aria-colcount={columnCount}
          style={{
            // 确保不创建新的stacking context，让菜单能正确显示在最顶层
            isolation: 'auto',
            // 平滑滚动优化
            scrollBehavior: 'smooth',
            // 单行网格优化：防止高度异常
            ...(isSingleRow && {
              minHeight: itemHeight + 16,
              maxHeight: itemHeight + 32,
            }),
          }}
        />
      )}

      {/* 搜索加载中指示器 - 固定在屏幕底部 */}
      {isLoading && totalItemCount > 0 && (
        <div className='fixed bottom-0 left-0 right-0 z-50 flex justify-center py-3 bg-white/98 dark:bg-gray-900/98 border-t border-gray-200/80 dark:border-gray-700/80'>
          <div className='flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400'>
            {/* 旋转圈 */}
            <div className='animate-spin rounded-full h-4 w-4 border-2 border-gray-300 dark:border-gray-600 border-t-green-500 dark:border-t-green-400'></div>

            {/* 文字 */}
            <span>正在搜索更多结果...</span>
          </div>
        </div>
      )}

      {/* 搜索完成提示 */}
      {!isLoading && totalItemCount > 0 && (
        <div className='flex justify-center mt-8 py-8'>
          <div className='relative px-8 py-5 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 border border-blue-200/50 dark:border-blue-700/50 shadow-lg overflow-hidden'>
            {/* 装饰背景 */}
            <div className='absolute inset-0 bg-gradient-to-br from-blue-100/20 to-purple-100/20 dark:from-blue-800/10 dark:to-purple-800/10'></div>

            {/* 内容 */}
            <div className='relative flex flex-col items-center gap-2'>
              {/* 完成图标 */}
              <div className='relative'>
                <div className='w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg'>
                  <svg className='w-7 h-7 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2.5' d='M5 13l4 4L19 7'></path>
                  </svg>
                </div>
                <div className='absolute inset-0 rounded-full bg-blue-400/30 animate-ping'></div>
              </div>

              {/* 文字 */}
              <div className='text-center'>
                <p className='text-base font-semibold text-gray-800 dark:text-gray-200 mb-1'>
                  搜索完成
                </p>
                <p className='text-xs text-gray-600 dark:text-gray-400'>
                  共找到 {totalItemCount} 个结果
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

VirtualSearchGrid.displayName = 'VirtualSearchGrid';

export default VirtualSearchGrid;