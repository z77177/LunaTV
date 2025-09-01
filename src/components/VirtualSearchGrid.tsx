/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';

import { SearchResult } from '@/lib/types';
import { useResponsiveGrid } from '@/hooks/useResponsiveGrid';

import VideoCard from '@/components/VideoCard';

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

// 渐进式加载配置
const INITIAL_BATCH_SIZE = 12;
const LOAD_MORE_BATCH_SIZE = 8;
const LOAD_MORE_THRESHOLD = 5; // 距离底部还有5行时开始加载

export const VirtualSearchGrid: React.FC<VirtualSearchGridProps> = ({
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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { columnCount, itemWidth, itemHeight, containerWidth } = useResponsiveGrid(containerRef);
  
  // 渐进式加载状态
  const [visibleItemCount, setVisibleItemCount] = useState(INITIAL_BATCH_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 选择当前显示的数据
  const currentData = viewMode === 'agg' ? filteredAggResults : filteredResults;
  const totalItemCount = currentData.length;

  // 实际显示的项目数量（考虑渐进式加载）
  const displayItemCount = Math.min(visibleItemCount, totalItemCount);
  const displayData = currentData.slice(0, displayItemCount);

  // 重置可见项目数量（当搜索或过滤变化时）
  useEffect(() => {
    setVisibleItemCount(INITIAL_BATCH_SIZE);
    setIsLoadingMore(false);
  }, [currentData, viewMode]);

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

  // 检查是否还有更多项目可以加载
  const hasNextPage = displayItemCount < totalItemCount;

  // 加载更多项目
  const loadMoreItems = useCallback(() => {
    if (isLoadingMore || !hasNextPage) return;
    
    setIsLoadingMore(true);
    
    // 模拟异步加载
    setTimeout(() => {
      setVisibleItemCount(prev => Math.min(prev + LOAD_MORE_BATCH_SIZE, totalItemCount));
      setIsLoadingMore(false);
    }, 100);
  }, [isLoadingMore, hasNextPage, totalItemCount]);

  // 网格行数计算
  const rowCount = Math.ceil(displayItemCount / columnCount);

  // 渲染单个网格项 - 优化版本，减少 props 传递
  const CellComponent = useCallback(({ 
    columnIndex, 
    rowIndex, 
    style
  }: {
    columnIndex: number;
    rowIndex: number;
    style: React.CSSProperties;
  }) => {
    const index = rowIndex * columnCount + columnIndex;
    
    // 如果超出显示范围，返回空
    if (index >= displayItemCount) {
      return <div style={style} />;
    }

    const item = displayData[index];
    
    if (!item) {
      return <div style={style} />;
    }

    // 根据视图模式渲染不同内容
    if (viewMode === 'agg') {
      const [mapKey, group] = item as [string, SearchResult[]];
      const title = group[0]?.title || '';
      const poster = group[0]?.poster || '';
      const year = group[0]?.year || 'unknown';
      const { episodes, source_names, douban_id } = computeGroupStats(group);
      const type = episodes === 1 ? 'movie' : 'tv';

      // 如果该聚合第一次出现，写入初始统计
      if (!groupStatsRef.current.has(mapKey)) {
        groupStatsRef.current.set(mapKey, { episodes, source_names, douban_id });
      }

      return (
        <div style={{ ...style, padding: '8px' }}>
          <VideoCard
            ref={getGroupRef(mapKey)}
            from='search'
            isAggregate={true}
            title={title}
            poster={poster}
            year={year}
            episodes={episodes}
            source_names={source_names}
            douban_id={douban_id}
            query={searchQuery.trim() !== title ? searchQuery.trim() : ''}
            type={type}
          />
        </div>
      );
    } else {
      const searchItem = item as SearchResult;
      return (
        <div style={{ ...style, padding: '8px' }}>
          <VideoCard
            id={searchItem.id}
            title={searchItem.title}
            poster={searchItem.poster}
            episodes={searchItem.episodes.length}
            source={searchItem.source}
            source_name={searchItem.source_name}
            douban_id={searchItem.douban_id}
            query={searchQuery.trim() !== searchItem.title ? searchQuery.trim() : ''}
            year={searchItem.year}
            from='search'
            type={searchItem.episodes.length > 1 ? 'tv' : 'movie'}
          />
        </div>
      );
    }
  }, [displayData, viewMode, searchQuery, columnCount, displayItemCount, groupStatsRef, getGroupRef, computeGroupStats]);

  // 计算网格高度
  const gridHeight = Math.min(
    typeof window !== 'undefined' ? window.innerHeight - 200 : 600,
    800
  );

  return (
    <div ref={containerRef} className='w-full'>
      {totalItemCount === 0 ? (
        <div className='flex justify-center items-center h-40'>
          {isLoading ? (
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-green-500'></div>
          ) : (
            <div className='text-center text-gray-500 py-8 dark:text-gray-400'>
              未找到相关结果
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
          key={`grid-${Math.floor(containerWidth / 100) * 100}-${columnCount}`}
          columnCount={columnCount}
          columnWidth={itemWidth + 16}
          height={gridHeight}
          rowCount={rowCount}
          rowHeight={itemHeight + 16}
          width={containerWidth}
          overscanRowCount={3}
          overscanColumnCount={1}
          style={{
            overflowX: 'hidden',
            overflowY: 'auto',
            isolation: 'auto',
          }}
          onItemsRendered={({ visibleRowStartIndex, visibleRowStopIndex }) => {
            const visibleStopIndex = visibleRowStopIndex;
            
            if (visibleStopIndex >= rowCount - loadMoreThreshold && hasNextPage && !isLoadingMore) {
              loadMoreItems();
            }
          }}
        >
          {CellComponent}
        </Grid>
      )}
      
      {/* 加载更多指示器 */}
      {containerWidth > 100 && isLoadingMore && (
        <div className='flex justify-center items-center py-4'>
          <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-green-500'></div>
          <span className='ml-2 text-sm text-gray-500 dark:text-gray-400'>
            加载更多...
          </span>
        </div>
      )}
      
      {/* 已加载完所有内容的提示 */}
      {containerWidth > 100 && !hasNextPage && displayItemCount > INITIAL_BATCH_SIZE && (
        <div className='text-center py-4 text-sm text-gray-500 dark:text-gray-400'>
          已显示全部 {displayItemCount} 个结果
        </div>
      )}
    </div>
  );
};

export default VirtualSearchGrid;