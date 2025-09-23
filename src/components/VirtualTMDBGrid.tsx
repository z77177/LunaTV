'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

import VideoCard from '@/components/VideoCard';
import { useResponsiveGrid } from '@/hooks/useResponsiveGrid';

const Grid = dynamic(
  () => import('react-window').then(mod => ({ default: mod.Grid })),
  {
    ssr: false,
    loading: () => <div className="animate-pulse h-96 bg-gray-200 dark:bg-gray-800 rounded-lg" />
  }
);

// TMDB结果项接口
interface TMDBResultItem {
  id: string;
  title: string;
  poster: string;
  rate: string;
  year: string;
  popularity?: number;
  vote_count?: number;
  genre_ids?: number[];
  character?: string;
  episode_count?: number;
  original_language?: string;
}

interface VirtualTMDBGridProps {
  results: TMDBResultItem[];
  isLoading: boolean;
  searchQuery: string;
  contentType: 'movie' | 'tv';
}

// 渐进式加载配置
const INITIAL_BATCH_SIZE = 20;
const LOAD_MORE_BATCH_SIZE = 10;
const LOAD_MORE_THRESHOLD = 5;


export const VirtualTMDBGrid: React.FC<VirtualTMDBGridProps> = ({
  results,
  isLoading,
  searchQuery,
  contentType,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { columnCount, itemWidth, itemHeight, containerWidth } = useResponsiveGrid(containerRef);

  // 渐进式加载状态
  const [visibleItemCount, setVisibleItemCount] = useState(INITIAL_BATCH_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const totalItemCount = results.length;
  const displayItemCount = Math.min(visibleItemCount, totalItemCount);
  const displayData = results.slice(0, displayItemCount);

  // 重置可见项目数量
  useEffect(() => {
    setVisibleItemCount(INITIAL_BATCH_SIZE);
    setIsLoadingMore(false);
  }, [results, contentType]);

  // 检查是否还有更多项目
  const hasNextPage = displayItemCount < totalItemCount;

  // 加载更多
  const loadMoreItems = useCallback(() => {
    if (isLoadingMore || !hasNextPage) return;

    setIsLoadingMore(true);

    setTimeout(() => {
      setVisibleItemCount(prev => Math.min(prev + LOAD_MORE_BATCH_SIZE, totalItemCount));
      setIsLoadingMore(false);
    }, 100);
  }, [isLoadingMore, hasNextPage, totalItemCount]);

  // 网格行数计算
  const rowCount = Math.ceil(displayItemCount / columnCount);
  const isSingleRow = rowCount === 1;

  // 渲染单个网格项
  const CellComponent = useCallback(({
    ariaAttributes,
    columnIndex,
    rowIndex,
    style,
    displayData: cellDisplayData,
    displayItemCount: cellDisplayItemCount,
    columnCount: cellColumnCount,
    rowCount: cellRowCount,
    hasNextPage: cellHasNextPage,
    isLoadingMore: cellIsLoadingMore,
    loadMoreItems: cellLoadMoreItems,
    contentType: cellContentType,
  }: {
    ariaAttributes: React.AriaAttributes;
    columnIndex: number;
    rowIndex: number;
    style: React.CSSProperties;
    displayData: TMDBResultItem[];
    displayItemCount: number;
    columnCount: number;
    rowCount: number;
    hasNextPage: boolean;
    isLoadingMore: boolean;
    loadMoreItems: () => void;
    contentType: 'movie' | 'tv';
  }) => {
    const index = rowIndex * cellColumnCount + columnIndex;

    if (index >= cellDisplayItemCount) {
      return <div style={style} {...ariaAttributes} />;
    }

    const item = cellDisplayData[index];
    if (!item) {
      return <div style={style} {...ariaAttributes} />;
    }

    // 检查是否需要加载更多
    const remainingRows = cellRowCount - rowIndex;
    if (remainingRows <= LOAD_MORE_THRESHOLD && cellHasNextPage && !cellIsLoadingMore) {
      cellLoadMoreItems();
    }

    return (
      <div style={style} {...ariaAttributes} className="p-2">
        <div className="w-full h-full">
          <VideoCard
            id={item.id}
            title={item.title}
            poster={item.poster}
            year={item.year}
            rate={item.rate}
            from='tmdb'
            type={cellContentType}
          />
        </div>
      </div>
    );
  }, []);

  // 空状态
  if (!isLoading && results.length === 0) {
    return (
      <div ref={containerRef} className="flex items-center justify-center h-64">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p className="text-lg font-medium mb-2">暂无结果</p>
          <p className="text-sm">
            {searchQuery ? `没有找到关于 "${searchQuery}" 的${contentType === 'movie' ? '电影' : '电视剧'}` : '请输入演员名称进行搜索'}
          </p>
        </div>
      </div>
    );
  }

  // 加载状态
  if (isLoading) {
    return (
      <div ref={containerRef} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[3/4] bg-gray-200 dark:bg-gray-700 rounded-lg mb-2"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full">
      {containerWidth > 0 && (
        <Grid
          key={`tmdb-grid-${containerWidth}-${columnCount}`}
          cellComponent={CellComponent}
          cellProps={{
            displayData,
            displayItemCount,
            columnCount,
            rowCount,
            hasNextPage,
            isLoadingMore,
            loadMoreItems,
            contentType,
          }}
          columnCount={columnCount}
          columnWidth={itemWidth + 16}
          defaultHeight={Math.min(rowCount * itemHeight, 800)}
          defaultWidth={containerWidth}
          rowCount={rowCount}
          rowHeight={itemHeight + 16}
          overscanCount={1}
          role="grid"
          aria-label={`TMDB搜索结果列表，共${displayItemCount}个结果`}
          aria-rowcount={rowCount}
          aria-colcount={columnCount}
          style={{
            overflowX: 'hidden',
            overflowY: isSingleRow ? 'hidden' : 'auto',
          }}
        />
      )}

      {/* 加载更多指示器 */}
      {isLoadingMore && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">加载更多...</span>
        </div>
      )}

      {/* 结果统计 */}
      <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
        显示 {displayItemCount} / {totalItemCount} 个结果
        {hasNextPage && (
          <span className="ml-2">
            (还有 {totalItemCount - displayItemCount} 个)
          </span>
        )}
      </div>
    </div>
  );
};

export default VirtualTMDBGrid;