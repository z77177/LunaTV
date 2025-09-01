/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useCallback, useMemo } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { useResponsiveGrid } from '@/hooks/useResponsiveGrid';
import { DoubanItem } from '@/lib/types';
import VideoCard from '@/components/VideoCard';

interface VirtualDoubanGridProps {
  items: DoubanItem[];
  type?: 'movie' | 'tv' | 'show' | 'anime' | 'custom';
  primarySelection?: string;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadMoreThreshold?: number;
  className?: string;
  height?: number;
}

export const VirtualDoubanGrid: React.FC<VirtualDoubanGridProps> = ({
  items,
  type = 'movie',
  primarySelection = '',
  isLoading = false,
  hasMore = false,
  onLoadMore,
  loadMoreThreshold = 5,
  className = '',
  height,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { columnCount, itemWidth, itemHeight, containerWidth } = useResponsiveGrid(containerRef);
  
  // 计算网格高度
  const gridHeight = height || Math.min(
    typeof window !== 'undefined' ? window.innerHeight - 200 : 600,
    800
  );

  // 网格行数计算
  const rowCount = Math.ceil(items.length / columnCount);

  // 渲染单个网格项
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
    
    // 超出范围返回空
    if (index >= items.length) {
      return <div style={style} />;
    }

    const item = items[index];
    
    return (
      <div style={{ ...style, padding: '8px' }}>
        <VideoCard
          from='douban'
          title={item.title}
          poster={item.poster}
          douban_id={Number(item.id)}
          rate={item.rate}
          year={item.year}
          type={type === 'movie' ? 'movie' : ''}
          isBangumi={type === 'anime' && primarySelection === '每日放送'}
        />
      </div>
    );
  }, [items, columnCount, type, primarySelection]);

  // 处理滚动到底部加载更多
  const handleItemsRendered = useCallback(({ 
    visibleRowStartIndex, 
    visibleRowStopIndex
  }: {
    visibleRowStartIndex: number;
    visibleRowStopIndex: number;
  }) => {
    // 检查是否需要加载更多
    if (
      hasMore && 
      !isLoading && 
      onLoadMore && 
      visibleRowStopIndex >= rowCount - loadMoreThreshold
    ) {
      onLoadMore();
    }
  }, [hasMore, isLoading, onLoadMore, rowCount, loadMoreThreshold]);

  // 生成稳定的key
  const gridKey = useMemo(() => {
    return `douban-grid-${columnCount}-${Math.floor(containerWidth / 100) * 100}`;
  }, [columnCount, containerWidth]);

  return (
    <div ref={containerRef} className={`w-full ${className}`}>
      {items.length === 0 ? (
        <div className='flex justify-center items-center h-40'>
          {isLoading ? (
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-green-500'></div>
          ) : (
            <div className='text-center text-gray-500 py-8 dark:text-gray-400'>
              暂无相关内容
            </div>
          )}
        </div>
      ) : containerWidth <= 100 ? (
        <div className='flex justify-center items-center h-40'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-green-500'></div>
          <span className='ml-2 text-sm text-gray-500'>
            初始化中... ({Math.round(containerWidth)}px)
          </span>
        </div>
      ) : (
        <>
          <Grid
            key={gridKey}
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
            onItemsRendered={handleItemsRendered}
          >
            {CellComponent}
          </Grid>
          
          {/* 加载更多指示器 */}
          {isLoading && (
            <div className='flex justify-center items-center py-4'>
              <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-green-500'></div>
              <span className='ml-2 text-sm text-gray-500 dark:text-gray-400'>
                加载中...
              </span>
            </div>
          )}
          
          {/* 没有更多数据提示 */}
          {!hasMore && items.length > 0 && !isLoading && (
            <div className='text-center text-gray-500 py-8 dark:text-gray-400'>
              已加载全部内容
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VirtualDoubanGrid;