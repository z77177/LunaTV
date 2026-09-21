'use client';

import { Check, Compass, Copy, ExternalLink, Headphones, X } from 'lucide-react';
import React, { useMemo,useState } from 'react';
import { createPortal } from 'react-dom';

interface SafariHandoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUrl: string;
  currentTitle: string;
  episodeTitle?: string;
  currentTime: number;
  duration?: number;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function SafariHandoffModal({
  isOpen,
  onClose,
  targetUrl,
  currentTitle,
  episodeTitle,
  currentTime,
  duration,
}: SafariHandoffModalProps) {
  const [copied, setCopied] = useState(false);

  const safariAppUrl = useMemo(() => {
    if (!targetUrl) return '';
    if (targetUrl.startsWith('https://')) {
      return targetUrl.replace('https://', 'x-safari-https://');
    }
    if (targetUrl.startsWith('http://')) {
      return targetUrl.replace('http://', 'x-safari-http://');
    }
    return targetUrl;
  }, [targetUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('复制链接异常:', err);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const content = (
    <div className='fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200'>
      <div
        className='relative w-full max-w-md bg-zinc-900/95 text-white rounded-2xl border border-white/15 shadow-2xl p-5 overflow-hidden animate-in zoom-in-95 duration-200'
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部标题与关闭按钮 */}
        <div className='flex items-center justify-between pb-3 border-b border-white/10'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-emerald-500/20 text-emerald-400 rounded-xl ring-1 ring-emerald-500/30'>
              <Compass className='w-6 h-6 animate-pulse' />
            </div>
            <div>
              <h3 className='text-base font-bold text-white flex items-center gap-1.5'>
                Safari 后台/画中画播放
              </h3>
              <p className='text-xs text-zinc-400'>解开 iOS 限制 · 支持锁屏听剧</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors'
            title='关闭'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* 当前进度卡片 */}
        <div className='mt-4 p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-1.5'>
          <div className='flex items-center justify-between text-xs text-zinc-400'>
            <span className='font-medium text-white truncate max-w-[220px]'>
              {currentTitle || '当前视频'}
            </span>
            {episodeTitle && (
              <span className='px-2 py-0.5 bg-emerald-500/15 text-emerald-400 text-[11px] rounded-md border border-emerald-500/30 font-medium'>
                {episodeTitle}
              </span>
            )}
          </div>
          <div className='flex items-center justify-between text-xs'>
            <span className='text-zinc-400'>锁定接续进度</span>
            <span className='font-mono font-semibold text-emerald-400'>
              {formatTime(currentTime)}
              {duration && duration > 0 ? ` / ${formatTime(duration)}` : ''}
            </span>
          </div>
        </div>

        {/* 剪贴板状态提示 */}
        <div className='mt-3 flex items-center justify-center gap-2 py-1.5 px-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-300'>
          <Check className='w-3.5 h-3.5 text-emerald-400 shrink-0' />
          <span>播放链接与精确进度已自动复制到剪贴板</span>
        </div>

        {/* 核心操作按钮组 */}
        <div className='mt-4 space-y-2.5'>
          {/* 主按钮：在 Safari 中打开 */}
          <a
            href={targetUrl}
            target='_blank'
            rel='noopener noreferrer'
            className='w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all'
          >
            <ExternalLink className='w-4 h-4' />
            <span>在 Safari 中打开播放</span>
          </a>

          {/* 备选按钮：尝试直接唤起 Safari App */}
          {safariAppUrl && safariAppUrl !== targetUrl && (
            <a
              href={safariAppUrl}
              className='w-full py-2 px-4 bg-white/10 hover:bg-white/15 active:scale-[0.98] text-zinc-200 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-all'
            >
              <Compass className='w-3.5 h-3.5 text-emerald-400' />
              <span>尝试唤起 Safari App</span>
            </a>
          )}

          {/* 辅助按钮：手动重新复制 */}
          <button
            onClick={handleCopy}
            className='w-full py-2 px-4 bg-white/5 hover:bg-white/10 active:scale-[0.98] text-zinc-300 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 border border-white/5 transition-all'
          >
            {copied ? (
              <>
                <Check className='w-3.5 h-3.5 text-emerald-400' />
                <span className='text-emerald-400'>已重新复制链接</span>
              </>
            ) : (
              <>
                <Copy className='w-3.5 h-3.5 text-zinc-400' />
                <span>重新复制播放链接</span>
              </>
            )}
          </button>
        </div>

        {/* 贴心指引说明 */}
        <div className='mt-4 p-3 bg-zinc-800/60 rounded-xl border border-white/5 text-[11px] leading-relaxed text-zinc-400 space-y-1'>
          <div className='flex items-center gap-1 text-zinc-300 font-medium'>
            <Headphones className='w-3.5 h-3.5 text-emerald-400' />
            <span>后台听剧与画中画指南：</span>
          </div>
          <p>
            1. 在 Safari 中播放后，<strong>锁屏或上滑退回桌面</strong>，音频将持续在后台播放。
          </p>
          <p>
            2. 若点击上方按钮未自动切换，请直接打开系统 <strong>Safari 浏览器</strong>，在地址栏<strong>粘贴并前往</strong>即可无缝接续。
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

/**
 * 快捷触发按钮：用于嵌入在播放器右上角跳过设置旁边
 */
export function SafariHandoffButton({
  onClick,
  className = '',
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-xl border border-white/30 hover:border-white/50 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] hover:shadow-[0_8px_32px_0_rgba(255,255,255,0.18)] hover:scale-105 active:scale-95 transition-all duration-300 ease-out ${className}`}
      title='在 Safari 中后台/画中画播放'
      style={{
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      }}
    >
      <Compass className='w-4 h-4 text-emerald-400 drop-shadow group-hover:rotate-45 transition-transform duration-300' />
      <span className='text-xs font-medium text-white drop-shadow hidden sm:inline'>
        Safari 后台
      </span>
    </button>
  );
}
