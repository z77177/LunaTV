'use client';

import { Check,Compass } from 'lucide-react';
import React, { memo } from 'react';

interface SafariPlayButtonProps {
  onHandoff: () => void;
  copied?: boolean;
}

/**
 * 网页外部专属：Safari 后台听剧 / 跨沙箱接续播放按钮
 * 放置在播放器上方的工具栏，与网盘、下载按钮同列，绝不干扰播放器内部画面与全屏按键
 */
export const SafariPlayButton = memo(function SafariPlayButton({
  onHandoff,
  copied = false,
}: SafariPlayButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onHandoff();
      }}
      className='flex group relative items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 min-h-[40px] sm:min-h-[44px] rounded-2xl bg-linear-to-br from-white/90 via-white/80 to-white/70 hover:from-white hover:via-white/95 hover:to-white/90 dark:from-gray-800/90 dark:via-gray-800/80 dark:to-gray-800/70 dark:hover:from-gray-800 dark:hover:via-gray-800/95 dark:hover:to-gray-800/90 backdrop-blur-md border border-white/60 dark:border-gray-700/60 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.25)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.3)] dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)] hover:scale-105 active:scale-95 transition-all duration-300 overflow-hidden shrink-0'
      title='复制当前进度并在 Safari 中后台/画中画播放'
    >
      <div className='absolute inset-0 bg-linear-to-r from-transparent via-white/0 to-transparent group-hover:via-white/30 dark:group-hover:via-white/10 transition-all duration-500'></div>
      {copied ? (
        <Check className='relative z-10 w-3.5 sm:w-4 h-3.5 sm:h-4 text-emerald-500 animate-in zoom-in duration-200' />
      ) : (
        <Compass className='relative z-10 w-3.5 sm:w-4 h-3.5 sm:h-4 text-emerald-600 dark:text-emerald-400 group-hover:rotate-45 transition-transform duration-300' />
      )}
      <span className='relative z-10 text-xs font-medium text-gray-700 dark:text-gray-300'>
        {copied ? '已复制进度' : 'Safari 听剧'}
      </span>
    </button>
  );
});

export default SafariPlayButton;
