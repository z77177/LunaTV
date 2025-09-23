'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const Grid = dynamic(
  () => import('react-window').then(mod => ({ default: mod.Grid })),
  {
    ssr: false,
    loading: () => <div className="animate-pulse h-96 bg-gray-200 dark:bg-gray-800 rounded-lg" />
  }
);

import { useResponsiveGrid } from '@/hooks/useResponsiveGrid';

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
  onItemClick?: (item: TMDBResultItem) => void;
}

// 渐进式加载配置
const INITIAL_BATCH_SIZE = 20;
const LOAD_MORE_BATCH_SIZE = 10;
const LOAD_MORE_THRESHOLD = 5;

// TMDB卡片组件
const TMDBCard: React.FC<{
  item: TMDBResultItem;
  contentType: 'movie' | 'tv';
  onClick?: () => void;
}> = ({ item, contentType, onClick }) => {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer h-full flex flex-col"
      onClick={onClick}
    >
      <div className="aspect-[3/4] relative flex-shrink-0">
        {item.poster ? (
          <img
            src={item.poster}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder-movie.png';
            }}
          />
        ) : (
          <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <span className="text-gray-400 text-sm">暂无海报</span>
          </div>
        )}

        {/* 评分标签 */}
        {item.rate && item.rate !== '0.0' && (
          <div className="absolute top-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-xs font-medium">
            ⭐ {item.rate}
          </div>
        )}

        {/* 年份标签 */}
        {item.year && (
          <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
            {item.year}
          </div>
        )}
      </div>

      <div className="p-3 flex-1 flex flex-col">
        <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100 line-clamp-2 mb-2 flex-shrink-0">
          {item.title}
        </h3>

        <div className="flex-1 flex flex-col justify-between">
          <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
            {/* 角色信息 */}
            {item.character && (
              <div className="line-clamp-1">饰演: {item.character}</div>
            )}

            {/* 集数信息（电视剧） */}
            {contentType === 'tv' && item.episode_count && (
              <div>{item.episode_count} 集</div>
            )}

            {/* 语言 */}
            {item.original_language && (
              <div>语言: {item.original_language.toUpperCase()}</div>
            )}
          </div>

          {/* 底部信息 */}
          <div className="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
            {item.popularity && (
              <span>人气: {item.popularity.toFixed(1)}</span>
            )}
            {item.vote_count && (
              <span>{item.vote_count} 票</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const VirtualTMDBGrid: React.FC<VirtualTMDBGridProps> = ({
  results,
  isLoading,
  searchQuery,
  contentType,
  onItemClick,
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
    onItemClick: cellOnItemClick,
  }: any) => {
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
          <TMDBCard
            item={item}
            contentType={cellContentType}
            onClick={() => cellOnItemClick?.(item)}
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
            onItemClick,
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