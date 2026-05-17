import React, { useEffect, useState, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';

interface ImmersivePlayerOverlayProps {
  artPlayerRef: React.MutableRefObject<any>;
  isFullscreen: boolean;
  opacity: number;
  hideTimeout: number; // In milliseconds
  children: ReactNode;
}

// 拖拽卡片组件
interface DraggableWidgetProps {
  id: string;
  defaultPosition?: { x: number; y: number };
  opacity: number;
  children: ReactNode;
  containerRef: React.RefObject<HTMLDivElement>;
}

const DraggableWidget: React.FC<DraggableWidgetProps> = ({ id, defaultPosition = { x: 20, y: 20 }, opacity, children, containerRef }) => {
  const [position, setPosition] = useState(defaultPosition);
  const nodeRef = useRef<HTMLDivElement>(null);

  // Load saved position
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`draggable_pos_${id}`);
      if (saved) {
        setPosition(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load position', e);
    }
  }, [id]);

  const handleStop = (e: DraggableEvent, data: DraggableData) => {
    const newPos = { x: data.x, y: data.y };
    setPosition(newPos);
    try {
      localStorage.setItem(`draggable_pos_${id}`, JSON.stringify(newPos));
    } catch (err) {
      // ignore
    }
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      bounds="parent"
      handle=".drag-handle"
      position={position}
      onStop={handleStop}
    >
      <div 
        ref={nodeRef}
        className="absolute z-[999] shadow-2xl rounded-2xl overflow-hidden transition-opacity duration-300 pointer-events-auto"
        style={{ 
          backgroundColor: `rgba(20, 20, 25, ${opacity})`,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Drag Handle */}
        <div className="drag-handle w-full h-8 flex items-center justify-center cursor-move hover:bg-white/10 transition-colors border-b border-white/5">
          <div className="flex gap-1">
            <span className="w-1 h-1 rounded-full bg-white/40"></span>
            <span className="w-1 h-1 rounded-full bg-white/40"></span>
            <span className="w-1 h-1 rounded-full bg-white/40"></span>
          </div>
        </div>
        
        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </Draggable>
  );
};

// 悬浮层主容器 (处理渐隐逻辑与 Portal 挂载)
export const ImmersivePlayerOverlay: React.FC<ImmersivePlayerOverlayProps> = ({
  artPlayerRef,
  isFullscreen,
  opacity,
  hideTimeout,
  children
}) => {
  const [targetNode, setTargetNode] = useState<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 挂载点查找
  useEffect(() => {
    if (isFullscreen && artPlayerRef.current && artPlayerRef.current.template.$player) {
      setTargetNode(artPlayerRef.current.template.$player);
    } else {
      setTargetNode(null);
    }
  }, [isFullscreen, artPlayerRef]);

  // 渐隐逻辑
  useEffect(() => {
    if (!isFullscreen || !targetNode || !artPlayerRef.current) return;

    const resetTimer = () => {
      setIsVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      
      hideTimerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, hideTimeout);
    };

    const art = artPlayerRef.current;
    
    // 我们不仅监听浏览器mousemove，也监听播放器的内置状态
    const handlePlayerHover = (state: boolean) => {
      if (state) {
        resetTimer();
      } else {
        setIsVisible(false); // 播放器触发隐藏时直接跟随隐藏
      }
    };

    art.on('hover', handlePlayerHover);
    art.on('control', handlePlayerHover);
    targetNode.addEventListener('mousemove', resetTimer);
    targetNode.addEventListener('touchstart', resetTimer);
    targetNode.addEventListener('click', resetTimer);

    // Init timer
    resetTimer();

    return () => {
      art.off('hover', handlePlayerHover);
      art.off('control', handlePlayerHover);
      targetNode.removeEventListener('mousemove', resetTimer);
      targetNode.removeEventListener('touchstart', resetTimer);
      targetNode.removeEventListener('click', resetTimer);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isFullscreen, targetNode, hideTimeout, artPlayerRef]);

  if (!isFullscreen || !targetNode) {
    // 未全屏时，不显示此浮层，走原始布局
    return null; 
  }

  return createPortal(
    <div 
      ref={containerRef}
      className={`absolute inset-0 z-[500] pointer-events-none transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* 我们可以通过 React.Children.map 将子组件包装到 DraggableWidget 中，或者要求调用方自己包装。 */}
      {/* 这里为了方便，我们假设子组件已经自己是一个可拖动的卡片，或者我们在这里包装它 */}
      <DraggableWidget id="episode_selector" defaultPosition={{ x: targetNode.clientWidth - 380, y: 60 }} opacity={opacity} containerRef={containerRef}>
        <div className="w-[340px] pointer-events-auto">
          {children}
        </div>
      </DraggableWidget>
    </div>,
    targetNode
  );
};
