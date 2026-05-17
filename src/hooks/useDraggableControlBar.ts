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

      // 2. 注入拖拽手柄
      if (!dragHandle) {
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
      }

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
        
        // 🚀 极致稳定性与代数级精准优化：直接用代数逆向关系计算出无 transform 的天然位置，彻底杜绝 transform 临时清除导致 DOM 重排、浏览器无法同步渲染及在边缘拖拽锁死卡住的问题！
        const playerRect = playerNode.getBoundingClientRect();
        const currentRect = bottomNode.getBoundingClientRect();

        const currentX = dragState.current.currentX;
        const currentY = dragState.current.currentY;

        // X/Y 轴分别计算能向上/下/左/右平移的最大极限偏移量（代数逆向计算法）
        dragState.current.minX = playerRect.left - currentRect.left + currentX;
        dragState.current.maxX = playerRect.right - currentRect.right + currentX;
        dragState.current.minY = playerRect.top - currentRect.top + currentY;
        dragState.current.maxY = playerRect.bottom - currentRect.bottom + currentY;

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
