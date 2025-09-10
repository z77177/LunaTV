/* eslint-disable react-hooks/exhaustive-deps */

'use client';

import React, { useEffect, useRef, useState } from 'react';

import MultiLevelSelector from './MultiLevelSelector';
import WeekdaySelector from './WeekdaySelector';

interface SelectorOption {
  label: string;
  value: string;
}

interface DoubanSelectorProps {
  type: 'movie' | 'tv' | 'show' | 'anime';
  primarySelection?: string;
  secondarySelection?: string;
  onPrimaryChange: (value: string) => void;
  onSecondaryChange: (value: string) => void;
  onMultiLevelChange?: (values: Record<string, string>) => void;
  onWeekdayChange: (weekday: string) => void;
}

const DoubanSelector: React.FC<DoubanSelectorProps> = ({
  type,
  primarySelection,
  secondarySelection,
  onPrimaryChange,
  onSecondaryChange,
  onMultiLevelChange,
  onWeekdayChange,
}) => {
  // 为不同的选择器创建独立的refs和状态
  const primaryContainerRef = useRef<HTMLDivElement>(null);
  const primaryButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [primaryIndicatorStyle, setPrimaryIndicatorStyle] = useState<{
    left: number;
    width: number;
  }>({ left: 0, width: 0 });

  const secondaryContainerRef = useRef<HTMLDivElement>(null);
  const secondaryButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [secondaryIndicatorStyle, setSecondaryIndicatorStyle] = useState<{
    left: number;
    width: number;
  }>({ left: 0, width: 0 });

  // 电影的一级选择器选项
  const moviePrimaryOptions: SelectorOption[] = [
    { label: '全部', value: '全部' },
    { label: '热门电影', value: '热门' },
    { label: '最新电影', value: '最新' },
    { label: '豆瓣高分', value: '豆瓣高分' },
    { label: '冷门佳片', value: '冷门佳片' },
  ];

  // 电影的二级选择器选项
  const movieSecondaryOptions: SelectorOption[] = [
    { label: '全部', value: '全部' },
    { label: '华语', value: '华语' },
    { label: '欧美', value: '欧美' },
    { label: '韩国', value: '韩国' },
    { label: '日本', value: '日本' },
  ];

  // 电视剧一级选择器选项
  const tvPrimaryOptions: SelectorOption[] = [
    { label: '全部', value: '全部' },
    { label: '最近热门', value: '最近热门' },
  ];

  // 电视剧二级选择器选项
  const tvSecondaryOptions: SelectorOption[] = [
    { label: '全部', value: 'tv' },
    { label: '国产', value: 'tv_domestic' },
    { label: '欧美', value: 'tv_american' },
    { label: '日本', value: 'tv_japanese' },
    { label: '韩国', value: 'tv_korean' },
    { label: '动漫', value: 'tv_animation' },
    { label: '纪录片', value: 'tv_documentary' },
  ];

  // 综艺一级选择器选项
  const showPrimaryOptions: SelectorOption[] = [
    { label: '全部', value: '全部' },
    { label: '最近热门', value: '最近热门' },
  ];

  // 综艺二级选择器选项
  const showSecondaryOptions: SelectorOption[] = [
    { label: '全部', value: 'show' },
    { label: '国内', value: 'show_domestic' },
    { label: '国外', value: 'show_foreign' },
  ];

  // 动漫一级选择器选项
  const animePrimaryOptions: SelectorOption[] = [
    { label: '每日放送', value: '每日放送' },
    { label: '番剧', value: '番剧' },
    { label: '剧场版', value: '剧场版' },
  ];

  // 快捷类型按钮选项
  const quickGenreOptions = [
    { label: '恐怖', value: 'horror' },
    { label: '动作', value: 'action' },
    { label: '科幻', value: 'sci-fi' },
    { label: '爱情', value: 'romance' },
    { label: '喜剧', value: 'comedy' },
    { label: '悬疑', value: 'suspense' },
    { label: '犯罪', value: 'crime' },
    { label: '惊悚', value: 'thriller' },
  ];

  // 处理快捷类型按钮点击
  const handleQuickGenreClick = (genreValue: string) => {
    // 自动切换到"全部"分类
    onPrimaryChange('全部');
    
    // 根据value找到对应的中文label，因为MultiLevelSelector传递的是label不是value
    const genreOption = quickGenreOptions.find(opt => opt.value === genreValue);
    const genreLabel = genreOption?.label || genreValue;
    
    // 设置对应的类型筛选 - 传递中文label，与手动筛选保持一致
    setTimeout(() => {
      onMultiLevelChange?.({ 
        type: genreLabel,  // 传递中文label，如"恐怖"而不是"horror"
        region: 'all',
        year: 'all', 
        sort: 'T'
      });
    }, 100);
  };

  // 处理多级选择器变化
  const handleMultiLevelChange = (values: Record<string, string>) => {
    onMultiLevelChange?.(values);
  };

  // 更新指示器位置的通用函数
  const updateIndicatorPosition = (
    activeIndex: number,
    containerRef: React.RefObject<HTMLDivElement>,
    buttonRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>,
    setIndicatorStyle: React.Dispatch<
      React.SetStateAction<{ left: number; width: number }>
    >
  ) => {
    if (
      activeIndex >= 0 &&
      buttonRefs.current[activeIndex] &&
      containerRef.current
    ) {
      const timeoutId = setTimeout(() => {
        const button = buttonRefs.current[activeIndex];
        const container = containerRef.current;
        if (button && container) {
          const buttonRect = button.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();

          if (buttonRect.width > 0) {
            setIndicatorStyle({
              left: buttonRect.left - containerRect.left,
              width: buttonRect.width,
            });
          }
        }
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  };

  // 组件挂载时立即计算初始位置
  useEffect(() => {
    // 主选择器初始位置
    if (type === 'movie') {
      const activeIndex = moviePrimaryOptions.findIndex(
        (opt) =>
          opt.value === (primarySelection || moviePrimaryOptions[0].value)
      );
      updateIndicatorPosition(
        activeIndex,
        primaryContainerRef,
        primaryButtonRefs,
        setPrimaryIndicatorStyle
      );
    } else if (type === 'tv') {
      const activeIndex = tvPrimaryOptions.findIndex(
        (opt) => opt.value === (primarySelection || tvPrimaryOptions[1].value)
      );
      updateIndicatorPosition(
        activeIndex,
        primaryContainerRef,
        primaryButtonRefs,
        setPrimaryIndicatorStyle
      );
    } else if (type === 'anime') {
      const activeIndex = animePrimaryOptions.findIndex(
        (opt) =>
          opt.value === (primarySelection || animePrimaryOptions[0].value)
      );
      updateIndicatorPosition(
        activeIndex,
        primaryContainerRef,
        primaryButtonRefs,
        setPrimaryIndicatorStyle
      );
    } else if (type === 'show') {
      const activeIndex = showPrimaryOptions.findIndex(
        (opt) => opt.value === (primarySelection || showPrimaryOptions[1].value)
      );
      updateIndicatorPosition(
        activeIndex,
        primaryContainerRef,
        primaryButtonRefs,
        setPrimaryIndicatorStyle
      );
    }

    // 副选择器初始位置
    let secondaryActiveIndex = -1;
    if (type === 'movie') {
      secondaryActiveIndex = movieSecondaryOptions.findIndex(
        (opt) =>
          opt.value === (secondarySelection || movieSecondaryOptions[0].value)
      );
    } else if (type === 'tv') {
      secondaryActiveIndex = tvSecondaryOptions.findIndex(
        (opt) =>
          opt.value === (secondarySelection || tvSecondaryOptions[0].value)
      );
    } else if (type === 'show') {
      secondaryActiveIndex = showSecondaryOptions.findIndex(
        (opt) =>
          opt.value === (secondarySelection || showSecondaryOptions[0].value)
      );
    }

    if (secondaryActiveIndex >= 0) {
      updateIndicatorPosition(
        secondaryActiveIndex,
        secondaryContainerRef,
        secondaryButtonRefs,
        setSecondaryIndicatorStyle
      );
    }
  }, [type]); // 只在type变化时重新计算

  // 监听主选择器变化
  useEffect(() => {
    if (type === 'movie') {
      const activeIndex = moviePrimaryOptions.findIndex(
        (opt) => opt.value === primarySelection
      );
      const cleanup = updateIndicatorPosition(
        activeIndex,
        primaryContainerRef,
        primaryButtonRefs,
        setPrimaryIndicatorStyle
      );
      return cleanup;
    } else if (type === 'tv') {
      const activeIndex = tvPrimaryOptions.findIndex(
        (opt) => opt.value === primarySelection
      );
      const cleanup = updateIndicatorPosition(
        activeIndex,
        primaryContainerRef,
        primaryButtonRefs,
        setPrimaryIndicatorStyle
      );
      return cleanup;
    } else if (type === 'anime') {
      const activeIndex = animePrimaryOptions.findIndex(
        (opt) => opt.value === primarySelection
      );
      const cleanup = updateIndicatorPosition(
        activeIndex,
        primaryContainerRef,
        primaryButtonRefs,
        setPrimaryIndicatorStyle
      );
      return cleanup;
    } else if (type === 'show') {
      const activeIndex = showPrimaryOptions.findIndex(
        (opt) => opt.value === primarySelection
      );
      const cleanup = updateIndicatorPosition(
        activeIndex,
        primaryContainerRef,
        primaryButtonRefs,
        setPrimaryIndicatorStyle
      );
      return cleanup;
    }
  }, [primarySelection]);

  // 监听副选择器变化
  useEffect(() => {
    let activeIndex = -1;
    let options: SelectorOption[] = [];

    if (type === 'movie') {
      activeIndex = movieSecondaryOptions.findIndex(
        (opt) => opt.value === secondarySelection
      );
      options = movieSecondaryOptions;
    } else if (type === 'tv') {
      activeIndex = tvSecondaryOptions.findIndex(
        (opt) => opt.value === secondarySelection
      );
      options = tvSecondaryOptions;
    } else if (type === 'show') {
      activeIndex = showSecondaryOptions.findIndex(
        (opt) => opt.value === secondarySelection
      );
      options = showSecondaryOptions;
    }

    if (options.length > 0) {
      const cleanup = updateIndicatorPosition(
        activeIndex,
        secondaryContainerRef,
        secondaryButtonRefs,
        setSecondaryIndicatorStyle
      );
      return cleanup;
    }
  }, [secondarySelection]);

  // 渲染胶囊式选择器
  const renderCapsuleSelector = (
    options: SelectorOption[],
    activeValue: string | undefined,
    onChange: (value: string) => void,
    isPrimary = false
  ) => {
    const containerRef = isPrimary
      ? primaryContainerRef
      : secondaryContainerRef;
    const buttonRefs = isPrimary ? primaryButtonRefs : secondaryButtonRefs;
    const indicatorStyle = isPrimary
      ? primaryIndicatorStyle
      : secondaryIndicatorStyle;

    return (
      <div
        ref={containerRef}
        className='relative inline-flex bg-gray-200/60 rounded-full p-0.5 sm:p-1 dark:bg-gray-700/60 backdrop-blur-sm'
      >
        {/* 滑动的白色背景指示器 */}
        {indicatorStyle.width > 0 && (
          <div
            className='absolute top-0.5 bottom-0.5 sm:top-1 sm:bottom-1 bg-white dark:bg-gray-500 rounded-full shadow-sm transition-all duration-300 ease-out'
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
            }}
          />
        )}

        {options.map((option, index) => {
          const isActive = activeValue === option.value;
          return (
            <button
              key={option.value}
              ref={(el) => {
                buttonRefs.current[index] = el;
              }}
              onClick={() => onChange(option.value)}
              className={`relative z-10 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-full transition-all duration-200 whitespace-nowrap ${
                isActive
                  ? 'text-gray-900 dark:text-gray-100 cursor-default'
                  : 'text-gray-700 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 cursor-pointer'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  };

  // 渲染快捷类型按钮
  const renderQuickGenreButtons = () => {
    return (
      <div className='space-y-2'>
        <div className='flex items-center gap-2'>
          <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap'>
            快捷分类
          </span>
          <div className='flex flex-wrap gap-1.5 sm:gap-2'>
            {quickGenreOptions.map((genre) => (
              <button
                key={genre.value}
                onClick={() => handleQuickGenreClick(genre.value)}
                className='px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-medium 
                         bg-gradient-to-r from-blue-500 to-purple-600 text-white 
                         rounded-full shadow-sm hover:shadow-md hover:from-blue-600 hover:to-purple-700
                         transition-all duration-200 transform hover:scale-105 active:scale-95
                         dark:from-blue-600 dark:to-purple-700 dark:hover:from-blue-700 dark:hover:to-purple-800'
              >
                {genre.label}
              </button>
            ))}
          </div>
        </div>
        <div className='text-xs text-gray-500 dark:text-gray-400 ml-14 sm:ml-16'>
          💡 热门类型快捷访问 · 更多类型请选择"全部"进行筛选
        </div>
      </div>
    );
  };

  return (
    <div className='space-y-4 sm:space-y-6'>
      {/* 电影类型 - 显示两级选择器 */}
      {type === 'movie' && (
        <div className='space-y-3 sm:space-y-4'>
          {/* 快捷类型按钮 - 只在电影类型时显示 */}
          {renderQuickGenreButtons()}
          
          {/* 一级选择器 */}
          <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
            <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>
              分类
            </span>
            <div className='overflow-x-auto'>
              {renderCapsuleSelector(
                moviePrimaryOptions,
                primarySelection || moviePrimaryOptions[0].value,
                onPrimaryChange,
                true
              )}
            </div>
          </div>

          {/* 二级选择器 - 只在非"全部"时显示 */}
          {primarySelection !== '全部' ? (
            <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
              <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>
                地区
              </span>
              <div className='overflow-x-auto'>
                {renderCapsuleSelector(
                  movieSecondaryOptions,
                  secondarySelection || movieSecondaryOptions[0].value,
                  onSecondaryChange,
                  false
                )}
              </div>
            </div>
          ) : (
            /* 多级选择器 - 只在选中"全部"时显示 */
            <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
              <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>
                筛选
              </span>
              <div className='overflow-x-auto'>
                <MultiLevelSelector
                  key={`${type}-${primarySelection}`}
                  onChange={handleMultiLevelChange}
                  contentType={type}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 电视剧类型 - 显示两级选择器 */}
      {type === 'tv' && (
        <div className='space-y-3 sm:space-y-4'>
          {/* 一级选择器 */}
          <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
            <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>
              分类
            </span>
            <div className='overflow-x-auto'>
              {renderCapsuleSelector(
                tvPrimaryOptions,
                primarySelection || tvPrimaryOptions[1].value,
                onPrimaryChange,
                true
              )}
            </div>
          </div>

          {/* 二级选择器 - 只在选中"最近热门"时显示，选中"全部"时显示多级选择器 */}
          {(primarySelection || tvPrimaryOptions[1].value) === '最近热门' ? (
            <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
              <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>
                类型
              </span>
              <div className='overflow-x-auto'>
                {renderCapsuleSelector(
                  tvSecondaryOptions,
                  secondarySelection || tvSecondaryOptions[0].value,
                  onSecondaryChange,
                  false
                )}
              </div>
            </div>
          ) : (primarySelection || tvPrimaryOptions[1].value) === '全部' ? (
            /* 多级选择器 - 只在选中"全部"时显示 */
            <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
              <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>
                筛选
              </span>
              <div className='overflow-x-auto'>
                <MultiLevelSelector
                  key={`${type}-${primarySelection}`}
                  onChange={handleMultiLevelChange}
                  contentType={type}
                />
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* 动漫类型 - 显示一级选择器和多级选择器 */}
      {type === 'anime' && (
        <div className='space-y-3 sm:space-y-4'>
          <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
            <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>
              分类
            </span>
            <div className='overflow-x-auto'>
              {renderCapsuleSelector(
                animePrimaryOptions,
                primarySelection || animePrimaryOptions[0].value,
                onPrimaryChange,
                true
              )}
            </div>
          </div>

          {/* 筛选部分 - 根据一级选择器显示不同内容 */}
          {(primarySelection || animePrimaryOptions[0].value) === '每日放送' ? (
            // 每日放送分类下显示星期选择器
            <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
              <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>
                星期
              </span>
              <div className='overflow-x-auto'>
                <WeekdaySelector onWeekdayChange={onWeekdayChange} />
              </div>
            </div>
          ) : (
            // 其他分类下显示原有的筛选功能
            <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
              <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>
                筛选
              </span>
              <div className='overflow-x-auto'>
                {(primarySelection || animePrimaryOptions[0].value) ===
                '番剧' ? (
                  <MultiLevelSelector
                    key={`anime-tv-${primarySelection}`}
                    onChange={handleMultiLevelChange}
                    contentType='anime-tv'
                  />
                ) : (
                  <MultiLevelSelector
                    key={`anime-movie-${primarySelection}`}
                    onChange={handleMultiLevelChange}
                    contentType='anime-movie'
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 综艺类型 - 显示两级选择器 */}
      {type === 'show' && (
        <div className='space-y-3 sm:space-y-4'>
          {/* 一级选择器 */}
          <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
            <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>
              分类
            </span>
            <div className='overflow-x-auto'>
              {renderCapsuleSelector(
                showPrimaryOptions,
                primarySelection || showPrimaryOptions[1].value,
                onPrimaryChange,
                true
              )}
            </div>
          </div>

          {/* 二级选择器 - 只在选中"最近热门"时显示，选中"全部"时显示多级选择器 */}
          {(primarySelection || showPrimaryOptions[1].value) === '最近热门' ? (
            <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
              <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>
                类型
              </span>
              <div className='overflow-x-auto'>
                {renderCapsuleSelector(
                  showSecondaryOptions,
                  secondarySelection || showSecondaryOptions[0].value,
                  onSecondaryChange,
                  false
                )}
              </div>
            </div>
          ) : (primarySelection || showPrimaryOptions[1].value) === '全部' ? (
            /* 多级选择器 - 只在选中"全部"时显示 */
            <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
              <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>
                筛选
              </span>
              <div className='overflow-x-auto'>
                <MultiLevelSelector
                  key={`${type}-${primarySelection}`}
                  onChange={handleMultiLevelChange}
                  contentType={type}
                />
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default DoubanSelector;
