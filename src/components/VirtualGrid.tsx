/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { useResponsiveGrid } from '@/hooks/useResponsiveGrid';

interface VirtualGridProps<T = any> {
  items: T[];
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  itemKey?: (item: T, index: number) => string | number;
  overscanCount?: number;
  className?: string;
  height?: number;
  onItemsRendered?: (params: { startIndex: number; stopIndex: number }) => void;
  isLoading?: boolean;
  hasNextPage?: boolean;
  onLoadMore?: () => void;
  loadMoreThreshold?: number;
}

const VirtualGrid = <T extends any>({
  items,
  renderItem,
  itemKey,
  overscanCount = 3,
  className = '',
  height,
  onItemsRendered,
  isLoading = false,
  hasNextPage = false,
  onLoadMore,
  loadMoreThreshold = 5,
}: VirtualGridProps<T>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { columnCount, itemWidth, itemHeight, containerWidth } = useResponsiveGrid(containerRef);
  
  // 计算网格高度
  const gridHeight = height || Math.min(
    typeof window !== 'undefined' ? window.innerHeight - 200 : 600,
    800
  );

  // 网格行数计算
  const rowCount = Math.ceil(items.length / columnCount);

  // 缓存的渲染函数 - 使用 items 中的实际数据
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
    
    // 添加 padding 到 style
    const paddedStyle = {
      ...style,
      padding: '8px',
    };

    return renderItem(item, index, paddedStyle);
  }, [items, columnCount, renderItem]);

  // 处理滚动到底部加载更多
  const handleCellsRendered = useCallback(({ 
    rowStartIndex, 
    rowStopIndex, 
    columnStartIndex, 
    columnStopIndex 
  }: {
    rowStartIndex: number;
    rowStopIndex: number;
    columnStartIndex: number;
    columnStopIndex: number;
  }) => {
    // 通知外部哪些项目被渲染了
    const startIndex = rowStartIndex * columnCount + columnStartIndex;
    const stopIndex = Math.min(rowStopIndex * columnCount + columnStopIndex, items.length - 1);
    
    onItemsRendered?.({ startIndex, stopIndex });

    // 检查是否需要加载更多
    if (
      hasNextPage && 
      !isLoading && 
      onLoadMore && 
      rowStopIndex >= rowCount - loadMoreThreshold
    ) {
      onLoadMore();
    }
  }, [columnCount, items.length, onItemsRendered, hasNextPage, isLoading, onLoadMore, rowCount, loadMoreThreshold]);

  // 生成稳定的key，避免不必要的重新创建
  const gridKey = useMemo(() => {
    return `virtual-grid-${columnCount}-${Math.floor(containerWidth / 100) * 100}`;
  }, [columnCount, containerWidth]);

  return (
    <div ref={containerRef} className={`w-full ${className}`}>
      {items.length === 0 ? (
        <div className='flex justify-center items-center h-40'>
          {isLoading ? (
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-green-500'></div>
          ) : (
            <div className='text-center text-gray-500 py-8 dark:text-gray-400'>
              暂无内容
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
            cellComponent={CellComponent}
            columnCount={columnCount}
            columnWidth={itemWidth + 16}
            defaultHeight={gridHeight}
            defaultWidth={containerWidth}
            rowCount={rowCount}
            rowHeight={itemHeight + 16}
            overscanCount={overscanCount}
            style={{
              overflowX: 'hidden',
              overflowY: 'auto',
              isolation: 'auto',
            }}
            onCellsRendered={handleCellsRendered}
          />
          
          {/* 加载更多指示器 */}
          {isLoading && (
            <div className='flex justify-center items-center py-4'>
              <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-green-500'></div>
              <span className='ml-2 text-sm text-gray-500 dark:text-gray-400'>
                加载中...
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VirtualGrid;