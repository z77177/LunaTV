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
      bottomNode.style.position = 'absolute';
      bottomNode.style.width = 'calc(100% - 80px)';
      bottomNode.style.left = '40px';
      bottomNode.style.bottom = '40px';
      bottomNode.style.top = 'auto';
      bottomNode.style.height = 'auto';
      bottomNode.style.minHeight = '50px';
      bottomNode.style.paddingTop = '0px';
      bottomNode.style.paddingLeft = '0px'; // reset base padding
      bottomNode.style.zIndex = '999';
      bottomNode.style.pointerEvents = 'none'; // let children handle clicks
      
      // 使用独立的 bgNode 处理毛玻璃，避免 backdrop-filter 裁剪内部绝对定位元素（如 tooltip 提示词）
      let bgNode = bottomNode.querySelector('.art-custom-glass-bg') as HTMLElement;
      if (!bgNode) {
        bgNode = document.createElement('div');
        bgNode.className = 'art-custom-glass-bg';
        bottomNode.insertBefore(bgNode, bottomNode.firstChild);
      }
      bgNode.style.position = 'absolute';
      bgNode.style.top = '0';
      bgNode.style.bottom = '0';
      bgNode.style.left = '0';
      bgNode.style.right = '0';
      bgNode.style.backgroundColor = `rgba(20, 20, 25, ${opacity})`;
      bgNode.style.backdropFilter = 'blur(16px)';
      bgNode.style.setProperty('-webkit-backdrop-filter', 'blur(16px)');
      bgNode.style.borderRadius = '16px';
      bgNode.style.border = '1px solid rgba(255, 255, 255, 0.1)';
      bgNode.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.5)';
      bgNode.style.zIndex = '-1';
      bgNode.style.pointerEvents = 'auto'; // 遮挡底部视频点击
      
      // 调整内部元素的 padding，给最左侧拖拽手柄留出精确空间，并对齐玻璃背景
      const progress = bottomNode.querySelector('.art-progress') as HTMLElement;
      const controls = bottomNode.querySelector('.art-controls') as HTMLElement;
      if (progress) {
        progress.style.paddingLeft = '45px';
        progress.style.paddingRight = '15px';
      }
      if (controls) {
        controls.style.paddingLeft = '45px';
        controls.style.paddingRight = '15px';
      }

      const syncTransforms = (x: number, y: number) => {
        const transform = `translate(${x}px, ${y}px)`;
        bottomNode.style.transform = transform;
        if (art.template.$setting) art.template.$setting.style.transform = transform;
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
          if (!dragState.current.isDragging) {
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

      playerNode.addEventListener('mousemove', handlePlayerMouseMove);
      playerNode.addEventListener('touchstart', handlePlayerMouseMove, { passive: true });
      showBar(); // 初始化时显示

      // 2. 注入拖拽手柄
      if (!dragHandle) {
        dragHandle = document.createElement('div');
        dragHandle.className = 'art-custom-drag-handle';
        dragHandle.innerHTML = '<span style="display:block;width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,0.4);margin-bottom:4px;"></span><span style="display:block;width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,0.4);margin-bottom:4px;"></span><span style="display:block;width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,0.4);"></span>';
        dragHandle.style.position = 'absolute';
        dragHandle.style.left = '10px';
        dragHandle.style.top = '0';
        dragHandle.style.bottom = '0';
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
        
        // 鼠标悬停抓手时的特效
        dragHandle.addEventListener('mouseenter', () => {
          dragHandle.style.backgroundColor = 'rgba(255,255,255,0.1)';
        });
        dragHandle.addEventListener('mouseleave', () => {
          dragHandle.style.backgroundColor = 'transparent';
        });

        bottomNode.appendChild(dragHandle);

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

        const newX = dragState.current.currentX + dx;
        const newY = dragState.current.currentY + dy;

        syncTransforms(newX, newY);
      };

      const onMouseUp = (e: MouseEvent | TouchEvent) => {
        if (!dragState.current.isDragging) return;
        dragState.current.isDragging = false;
        bottomNode.style.transition = 'opacity 0.3s ease, background-color 0.3s ease';
        
        const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : (e as MouseEvent).clientY;

        dragState.current.currentX += clientX - dragState.current.startX;
        dragState.current.currentY += clientY - dragState.current.startY;

        // 保存位置
        try {
          localStorage.setItem('art_bottom_pos', JSON.stringify({
            x: dragState.current.currentX,
            y: dragState.current.currentY
          }));
        } catch(err) {}

        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('touchmove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('touchend', onMouseUp);
      };

      const onMouseDown = (e: MouseEvent | TouchEvent) => {
        e.preventDefault(); // 阻止选中文本
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
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    } else {
      // 还原 ArtPlayer 原生样式
      bottomNode.style.position = '';
      bottomNode.style.width = '';
      bottomNode.style.left = '';
      bottomNode.style.bottom = '';
      bottomNode.style.borderRadius = '';
      bottomNode.style.backgroundColor = '';
      bottomNode.style.backdropFilter = '';
      bottomNode.style.removeProperty('-webkit-backdrop-filter');
      bottomNode.style.border = '';
      bottomNode.style.paddingLeft = '';
      bottomNode.style.paddingTop = '';
      bottomNode.style.boxShadow = '';
      bottomNode.style.height = '';
      bottomNode.style.minHeight = '';
      bottomNode.style.top = '';
      bottomNode.style.zIndex = '';
      bottomNode.style.pointerEvents = '';
      bottomNode.style.transform = '';
      
      const bgNode = bottomNode.querySelector('.art-custom-glass-bg');
      if (bgNode) bgNode.remove();
      
      const progress = bottomNode.querySelector('.art-progress') as HTMLElement;
      const controls = bottomNode.querySelector('.art-controls') as HTMLElement;
      if (progress) {
        progress.style.paddingLeft = '';
        progress.style.paddingRight = '';
      }
      if (controls) {
        controls.style.paddingLeft = '';
        controls.style.paddingRight = '';
      }
      if (art.template.$setting) art.template.$setting.style.transform = '';
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
