import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface MobileEpisodeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  artPlayerRef: React.MutableRefObject<any>;
  isFullscreen: boolean;
  children: React.ReactNode;
}

export const MobileEpisodeDrawer: React.FC<MobileEpisodeDrawerProps> = ({
  isOpen,
  onClose,
  artPlayerRef,
  isFullscreen,
  children
}) => {
  const [targetNode, setTargetNode] = useState<HTMLElement | null>(null);

  // 挂载点查找
  useEffect(() => {
    if (isFullscreen && artPlayerRef.current && artPlayerRef.current.template.$player) {
      setTargetNode(artPlayerRef.current.template.$player);
    } else {
      setTargetNode(null);
    }
  }, [isFullscreen, artPlayerRef]);

  // 手势支持 (简单的右划关闭)
  useEffect(() => {
    if (!isOpen || !targetNode) return;

    let touchStartX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].screenX;
      if (touchEndX - touchStartX > 50) { // 向右划超过50px关闭
        onClose();
      }
    };

    targetNode.addEventListener('touchstart', handleTouchStart);
    targetNode.addEventListener('touchend', handleTouchEnd);

    return () => {
      targetNode.removeEventListener('touchstart', handleTouchStart);
      targetNode.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, targetNode, onClose]);

  if (!isFullscreen || !targetNode) {
    return null;
  }

  return createPortal(
    <div className={`absolute inset-0 z-[1000] pointer-events-none transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      {/* 遮罩层 */}
      <div 
        className={`absolute inset-0 bg-black/50 pointer-events-auto transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} 
        onClick={onClose}
      />
      
      {/* 右侧抽屉 */}
      <div 
        className={`absolute top-0 right-0 h-full w-[80%] max-w-[320px] shadow-2xl transition-transform duration-300 pointer-events-auto overflow-y-auto custom-scrollbar`}
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          backgroundColor: 'rgba(20, 20, 25, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <div className="p-4 flex justify-between items-center border-b border-white/10 sticky top-0 bg-black/20 z-10">
          <h3 className="text-white font-medium">选集与线路</h3>
          <button 
            onClick={onClose}
            className="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-2 pb-8">
          {children}
        </div>
      </div>
    </div>,
    targetNode
  );
};
