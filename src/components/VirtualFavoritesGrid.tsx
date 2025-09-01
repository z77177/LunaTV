/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useCallback, useMemo } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { useResponsiveGrid } from '@/hooks/useResponsiveGrid';
import VideoCard from '@/components/VideoCard';

type FavoriteItem = {
  id: string;
  source: string;
  title: string;
  poster: string;
  episodes: number;
  source_name: string;
  currentEpisode?: number;
  search_title?: string;
  origin?: 'vod' | 'live';
};

interface VirtualFavoritesGridProps {
  items: FavoriteItem[];
  className?: string;
  height?: number;
}

export const VirtualFavoritesGrid: React.FC<VirtualFavoritesGridProps> = ({
  items,
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
          query={item.search_title}
          {...item}
          from='favorite'
          type={item.episodes > 1 ? 'tv' : ''}
        />
      </div>
    );
  }, [items, columnCount]);

  // 生成稳定的key
  const gridKey = useMemo(() => {
    return `favorites-grid-${columnCount}-${Math.floor(containerWidth / 100) * 100}`;
  }, [columnCount, containerWidth]);

  return (
    <div ref={containerRef} className={`w-full ${className}`}>
      {items.length === 0 ? (
        <div className='text-center text-gray-500 py-8 dark:text-gray-400'>
          暂无收藏内容
        </div>
      ) : containerWidth <= 100 ? (
        <div className='flex justify-center items-center h-40'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-green-500'></div>
          <span className='ml-2 text-sm text-gray-500'>
            初始化中... ({Math.round(containerWidth)}px)
          </span>
        </div>
      ) : (
        <Grid
          key={gridKey}
          columnCount={columnCount}
          columnWidth={itemWidth + 16}
          height={gridHeight}
          rowCount={rowCount}
          rowHeight={itemHeight + 16}
          width={containerWidth}
          overscanRowCount={2}
          overscanColumnCount={1}
          style={{
            overflowX: 'hidden',
            overflowY: 'auto',
            isolation: 'auto',
          }}
        >
          {CellComponent}
        </Grid>
      )}
    </div>
  );
};

export default VirtualFavoritesGrid;