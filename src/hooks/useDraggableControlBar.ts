import { useEffect, useRef } from 'react';

export function useDraggableControlBar(
  artPlayerRef: React.MutableRefObject<any>,
  isFullscreen: boolean,
  enabled: boolean,
  opacity: number,
  hideTimeout: number
) {
  const dragState = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    minX: -Infinity,
    maxX: Infinity,
    minY: -Infinity,
    maxY: Infinity,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const art = artPlayerRef.current;
    if (!art || !art.template || !art.template.$bottom || !art.template.$player) return;

    const bottomNode = art.template.$bottom as HTMLElement;
    const playerNode = art.template.$player as HTMLElement;
    let dragHandle = bottomNode.querySelector('.art-custom-drag-handle') as HTMLElement;

    if (isFullscreen && enabled) {
      // 1. 设置沉浸式外观
      // 1. 设置透明度变量给 CSS 使用
      bottomNode.style.setProperty('--glass-opacity', opacity.toString());
      
      // 穿透底部的无形容器，只让实际内容（liquidGlass）响应点击
      bottomNode.style.pointerEvents = 'none';
      
      const liquidGlass = bottomNode.querySelector('.art-liquid-glass') as HTMLElement;
      if (liquidGlass) {
        liquidGlass.style.pointerEvents = 'auto';
        // 为拖拽手柄留出左侧空间
        liquidGlass.style.paddingLeft = '34px';
      }

      const syncTransforms = (x: number, y: number) => {
        const transform = `translate(${x}px, ${y}px)`;
        bottomNode.style.transform = transform;
        if (art.template.$info) art.template.$info.style.transform = transform;
        
        const contextMenu = playerNode.querySelector('.art-contextmenu') as HTMLElement;
        if (contextMenu) contextMenu.style.transform = transform;
      };
      
      // 我们通过覆盖 opacity 来实现自定义的 hideTimeout，不依赖于 ArtPlayer 的 .art-hover
      bottomNode.style.transition = dragState.current.isDragging ? 'none' : 'opacity 0.3s ease, background-color 0.3s ease, visibility 0.3s ease';

      const showBar = () => {
        bottomNode.style.opacity = '1';
        bottomNode.style.visibility = 'visible';
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          // 🚀 额外防护：当弹幕输入框处于聚焦状态，或者鼠标悬停在控制栏/进度条区域上，或者正在拖拽时，绝对不能隐藏控制栏！
          const danmakuInput = bottomNode.querySelector('.apd-danmaku-input') as HTMLInputElement;
          const isInputFocused = danmakuInput && document.activeElement === danmakuInput;
          const isBottomHovered = bottomNode.matches(':hover');

          if (!dragState.current.isDragging && !isBottomHovered && !isInputFocused) {
            bottomNode.style.opacity = '0';
            bottomNode.style.visibility = 'hidden';
            // 同步关闭设置菜单
            if (art.setting && art.setting.show) {
              art.setting.show = false;
            }
          }
        }, hideTimeout);
      };

      const handlePlayerMouseMove = () => {
        showBar();
      };

      const handleBottomMouseLeave = () => {
        // 当鼠标移出控制栏区域时，重新触发 showBar 以再次计时 hideTimeout 并顺利在延时后隐藏控制栏
        showBar();
      };

      playerNode.addEventListener('mousemove', handlePlayerMouseMove);
      playerNode.addEventListener('touchstart', handlePlayerMouseMove, { passive: true });
      bottomNode.addEventListener('mouseleave', handleBottomMouseLeave);
      showBar(); // 初始化时显示

      // 2. 注入拖拽手柄，确保每次重新执行 effect 时都创建一个全新且带有正确闭包事件监听器的手柄，彻底防止旧闭包残留和重复累积监听器！
      if (dragHandle) {
        dragHandle.remove();
      }

      dragHandle = document.createElement('div');
      dragHandle.className = 'art-custom-drag-handle';
      dragHandle.innerHTML = '<span style="display:block;width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,0.4);margin-bottom:4px;"></span><span style="display:block;width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,0.4);margin-bottom:4px;"></span><span style="display:block;width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,0.4);"></span>';
      dragHandle.style.position = 'absolute';
      dragHandle.style.left = '10px';
      dragHandle.style.top = '10px';
      dragHandle.style.bottom = '10px';
      dragHandle.style.width = '24px';
      dragHandle.style.display = 'flex';
      dragHandle.style.flexDirection = 'column';
      dragHandle.style.alignItems = 'center';
      dragHandle.style.justifyContent = 'center';
      dragHandle.style.cursor = 'move';
      dragHandle.style.borderRight = '1px solid rgba(255, 255, 255, 0.05)';
      dragHandle.style.zIndex = '999';
      dragHandle.style.pointerEvents = 'auto';
      dragHandle.style.touchAction = 'none'; // 防止移动端拖拽时滚动屏幕
      dragHandle.style.borderRadius = '4px';
      
      // 鼠标悬停抓手时的特效
      dragHandle.addEventListener('mouseenter', () => {
        dragHandle.style.backgroundColor = 'rgba(255,255,255,0.1)';
      });
      dragHandle.addEventListener('mouseleave', () => {
        dragHandle.style.backgroundColor = 'transparent';
      });

      if (liquidGlass) {
        liquidGlass.appendChild(dragHandle);
      } else {
        bottomNode.appendChild(dragHandle);
      }

      // 恢复位置
      try {
        const saved = localStorage.getItem('art_bottom_pos');
        if (saved) {
          const pos = JSON.parse(saved);
          dragState.current.currentX = pos.x;
          dragState.current.currentY = pos.y;
          syncTransforms(pos.x, pos.y);
        }
      } catch(e) {}

      // 3. 拖拽核心逻辑
      const onMouseMove = (e: MouseEvent | TouchEvent) => {
        if (!dragState.current.isDragging) return;
        
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const dx = clientX - dragState.current.startX;
        const dy = clientY - dragState.current.startY;

        const rawX = dragState.current.currentX + dx;
        const rawY = dragState.current.currentY + dy;

        // 🚀 对 X 和 Y 平移坐标进行高精度夹逼边界限制，限制不能移出播放器屏幕之外
        const constrainedX = Math.max(dragState.current.minX, Math.min(dragState.current.maxX, rawX));
        const constrainedY = Math.max(dragState.current.minY, Math.min(dragState.current.maxY, rawY));

        syncTransforms(constrainedX, constrainedY);
      };

      const onMouseUp = (e: MouseEvent | TouchEvent) => {
        if (!dragState.current.isDragging) return;
        dragState.current.isDragging = false;
        bottomNode.style.transition = 'opacity 0.3s ease, background-color 0.3s ease';
        
        const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : (e as MouseEvent).clientY;

        const rawX = dragState.current.currentX + (clientX - dragState.current.startX);
        const rawY = dragState.current.currentY + (clientY - dragState.current.startY);

        const constrainedX = Math.max(dragState.current.minX, Math.min(dragState.current.maxX, rawX));
        const constrainedY = Math.max(dragState.current.minY, Math.min(dragState.current.maxY, rawY));

        dragState.current.currentX = constrainedX;
        dragState.current.currentY = constrainedY;

        // 保存位置
        try {
          localStorage.setItem('art_bottom_pos', JSON.stringify({
            x: constrainedX,
            y: constrainedY
          }));
        } catch(err) {}

        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('touchmove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('touchend', onMouseUp);
      };

      const onMouseDown = (e: MouseEvent | TouchEvent) => {
        e.preventDefault(); // 阻止选中文本
        
        // 🚀 终极可靠方案：直接解析底层的 DOMMatrix 二维/三维变换矩阵，获取 DOM 元素当前真实、实时的平移值。这百分之百解决了 React state、localStorage 或播放器第三方框架在重置控制栏样式时所产生的状态失步问题！
        const style = window.getComputedStyle(bottomNode);
        const matrix = style.transform && style.transform !== 'none' ? new DOMMatrix(style.transform) : new DOMMatrix();
        const currentX = matrix.m41;
        const currentY = matrix.m42;

        // 同步 React ref 内部的值，确保后续 move / up 阶段的所有求和与本地缓存完全精准同步
        dragState.current.currentX = currentX;
        dragState.current.currentY = currentY;

        const playerRect = playerNode.getBoundingClientRect();
        const currentRect = bottomNode.getBoundingClientRect();

        // 🚀 加上 5 像素的安全内缩边距，确保控制栏永远保留尊贵悬浮感，并且拖拽手柄绝对不会贴死边缘导致鼠标失焦无法重新抓取！
        const safetyMargin = 5;

        dragState.current.minX = playerRect.left - currentRect.left + currentX + safetyMargin;
        dragState.current.maxX = playerRect.right - currentRect.right + currentX - safetyMargin;
        dragState.current.minY = playerRect.top - currentRect.top + currentY + safetyMargin;
        dragState.current.maxY = playerRect.bottom - currentRect.bottom + currentY - safetyMargin;

        dragState.current.isDragging = true;
        dragState.current.startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        dragState.current.startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        
        bottomNode.style.transition = 'none';

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('touchmove', onMouseMove, { passive: false });
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('touchend', onMouseUp);
      };

      // 先移除可能存在的旧监听，再添加
      dragHandle.removeEventListener('mousedown', onMouseDown);
      dragHandle.removeEventListener('touchstart', onMouseDown);
      
      dragHandle.addEventListener('mousedown', onMouseDown);
      dragHandle.addEventListener('touchstart', onMouseDown, { passive: false });

      return () => {
        playerNode.removeEventListener('mousemove', handlePlayerMouseMove);
        playerNode.removeEventListener('touchstart', handlePlayerMouseMove);
        bottomNode.removeEventListener('mouseleave', handleBottomMouseLeave);
        if (timerRef.current) clearTimeout(timerRef.current);
        
        // 🚀 终极清理：不仅注销主监听器，还必须将拖拽手柄彻底移除，并注销 document 全局拖拽事件以绝对防止内存泄漏与闭包污染！
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('touchmove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('touchend', onMouseUp);

        if (dragHandle) {
          dragHandle.remove();
        }
      };
    } else {
      // 还原 ArtPlayer 原生样式
      bottomNode.style.removeProperty('--glass-opacity');
      bottomNode.style.pointerEvents = '';
      bottomNode.style.transform = '';
      
      const liquidGlass = bottomNode.querySelector('.art-liquid-glass') as HTMLElement;
      if (liquidGlass) {
        liquidGlass.style.pointerEvents = '';
        liquidGlass.style.paddingLeft = '';
      }
      if (art.template.$info) art.template.$info.style.transform = '';
      const contextMenu = playerNode.querySelector('.art-contextmenu') as HTMLElement;
      if (contextMenu) contextMenu.style.transform = '';
      bottomNode.style.transition = '';
      bottomNode.style.opacity = '';
      bottomNode.style.visibility = '';
      
      if (dragHandle) {
        dragHandle.remove();
      }
    }

  }, [artPlayerRef, isFullscreen, enabled, opacity, hideTimeout]);
}
