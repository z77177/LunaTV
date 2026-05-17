import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Eye, Maximize, Clock, Settings2 } from 'lucide-react';
import { useImmersiveMode } from '@/hooks/useImmersiveMode';

interface UISettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UISettingsPanel = memo(function UISettingsPanel({
  isOpen,
  onClose,
}: UISettingsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // 🚀 沉浸模式相关状态
  const { settings: immersiveSettings, toggleImmersiveMode, updateSetting: updateImmersiveSetting, isFeatureDisabled } = useImmersiveMode();
  const [sliderImmersiveOpacity, setSliderImmersiveOpacity] = useState(immersiveSettings.opacity);
  const [sliderHideTimeout, setSliderHideTimeout] = useState(immersiveSettings.hideTimeout / 1000); // UI 以秒显示

  useEffect(() => {
    setSliderImmersiveOpacity(immersiveSettings.opacity);
    setSliderHideTimeout(immersiveSettings.hideTimeout / 1000);
  }, [immersiveSettings.opacity, immersiveSettings.hideTimeout]);

  const commitImmersiveOpacity = useCallback(() => {
    if (Math.abs(sliderImmersiveOpacity - immersiveSettings.opacity) > 0.001) {
      updateImmersiveSetting('opacity', sliderImmersiveOpacity);
    }
  }, [sliderImmersiveOpacity, immersiveSettings.opacity, updateImmersiveSetting]);

  const commitHideTimeout = useCallback(() => {
    const ms = sliderHideTimeout * 1000;
    if (Math.abs(ms - immersiveSettings.hideTimeout) > 1) {
      updateImmersiveSetting('hideTimeout', ms);
    }
  }, [sliderHideTimeout, immersiveSettings.hideTimeout, updateImmersiveSetting]);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        // Prevent closing if clicking on artplayer controls (like the settings button)
        const target = event.target as Element;
        if (target.closest && target.closest('.art-control')) {
          return;
        }
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isVisible && !isOpen) return null;

  if (isFeatureDisabled) return null;

  return (
    <div
      ref={panelRef}
      className={`absolute right-4 bottom-14 w-[320px] bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden transition-all duration-300 origin-bottom-right z-[100] custom-scrollbar
        ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'}
      `}
    >
      <div className='p-4 sm:p-5 max-h-[70vh] overflow-y-auto scrollbar-hide'>
        {/* Header */}
        <div className='flex items-center gap-2 mb-4 pb-3 border-b border-white/10'>
          <Settings2 className='w-5 h-5 text-blue-400' />
          <h3 className='text-sm font-semibold text-white tracking-wide'>全屏 UI 设置</h3>
        </div>

        {/* ========================================== */}
        {/* 沉浸式播放器设置区 */}
        {/* ========================================== */}
        <div className='flex items-center justify-between py-1'>
          <div className='flex items-center gap-2'>
            <Maximize className='w-4 h-4 text-gray-400' />
            <span className='text-sm font-medium text-gray-200'>沉浸式全屏布局</span>
          </div>
          <button
            onClick={toggleImmersiveMode}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 active:scale-90`}
            style={{
              background: immersiveSettings.enabled
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : '#4b5563',
              boxShadow: immersiveSettings.enabled
                ? '0 0 16px rgba(16, 185, 129, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.2)'
                : 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
              transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <span
              className='inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-all duration-300'
              style={{
                transform: immersiveSettings.enabled ? 'translateX(22px)' : 'translateX(2px)',
                transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            />
          </button>
        </div>

        {immersiveSettings.enabled && (
          <div className='space-y-3.5 mt-3 mb-4 p-3 rounded-xl bg-white/5 border border-white/10'>
            {/* 界面透明度 */}
            <div className='flex items-center gap-3'>
              <div className='flex items-center gap-1.5 text-xs text-gray-300 w-16 shrink-0'>
                <Eye className='w-3.5 h-3.5 text-gray-400' />
                <span className="font-medium">UI透明</span>
              </div>
              <div className="relative flex-1">
                <input
                  type='range'
                  min={0.05}
                  max={1}
                  step={0.05}
                  value={sliderImmersiveOpacity}
                  onChange={(e) => setSliderImmersiveOpacity(parseFloat(e.target.value))}
                  onMouseUp={commitImmersiveOpacity}
                  onTouchEnd={commitImmersiveOpacity}
                  onBlur={commitImmersiveOpacity}
                  className='w-full h-2 rounded-full appearance-none cursor-pointer transition-all'
                  style={{
                    background: `linear-gradient(to right, #10b981 0%, #10b981 ${((sliderImmersiveOpacity - 0.05) / (1 - 0.05)) * 100}%, rgba(75, 85, 99, 0.5) ${((sliderImmersiveOpacity - 0.05) / (1 - 0.05)) * 100}%, rgba(75, 85, 99, 0.5) 100%)`,
                  }}
                />
              </div>
              <span className='text-xs text-green-400 w-12 text-right font-mono font-semibold tabular-nums'>
                {(sliderImmersiveOpacity * 100).toFixed(0)}%
              </span>
            </div>

            {/* 自动隐藏时间 */}
            <div className='flex items-center gap-3'>
              <div className='flex items-center gap-1.5 text-xs text-gray-300 w-16 shrink-0'>
                <Clock className='w-3.5 h-3.5 text-gray-400' />
                <span className="font-medium">自动隐藏</span>
              </div>
              <div className="relative flex-1">
                <input
                  type='range'
                  min={1}
                  max={10}
                  step={0.5}
                  value={sliderHideTimeout}
                  onChange={(e) => setSliderHideTimeout(parseFloat(e.target.value))}
                  onMouseUp={commitHideTimeout}
                  onTouchEnd={commitHideTimeout}
                  onBlur={commitHideTimeout}
                  className='w-full h-2 rounded-full appearance-none cursor-pointer transition-all'
                  style={{
                    background: `linear-gradient(to right, #10b981 0%, #10b981 ${((sliderHideTimeout - 1) / (10 - 1)) * 100}%, rgba(75, 85, 99, 0.5) ${((sliderHideTimeout - 1) / (10 - 1)) * 100}%, rgba(75, 85, 99, 0.5) 100%)`,
                  }}
                />
              </div>
              <span className='text-xs text-green-400 w-12 text-right font-mono font-semibold tabular-nums'>
                {sliderHideTimeout.toFixed(1)}s
              </span>
            </div>
          </div>
        )}
        <div className='mt-4 pt-3 border-t border-white/5'>
          <p className='text-[11px] text-gray-500 leading-relaxed'>
            开启后，底部进度条和选集面板可全屏自由拖拽。全局享受同一透明度及渐隐时长控制。
          </p>
        </div>
      </div>
    </div>
  );
});

export default UISettingsPanel;
