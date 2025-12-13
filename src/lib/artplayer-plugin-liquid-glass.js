// artplayer-plugin-liquid-glass
// 毛玻璃效果控制栏插件

export default function artplayerPluginLiquidGlass(option = {}) {
  return (art) => {
    const { constructor } = art;
    const { addClass, append, createElement } = constructor.utils;
    const { $bottom, $progress, $controls, $player } = art.template;

    const $liquidGlass = createElement('div');
    addClass($player, 'artplayer-plugin-liquid-glass');
    addClass($liquidGlass, 'art-liquid-glass');

    // 🔧 关键修复：只包裹controls，不包裹progress！
    // progress保持在bottom中，避免与controls互相影响
    append($bottom, $liquidGlass);
    append($liquidGlass, $controls);

    // 移除control事件监听，完全由CSS控制宽度
    // 避免与CSS的!important冲突，防止拖动进度条时布局错乱

    return {
      name: 'artplayerPluginLiquidGlass',
    };
  };
}

// 注入样式
if (typeof document !== 'undefined') {
  const id = 'artplayer-plugin-liquid-glass';
  let $style = document.getElementById(id);
  if (!$style) {
    $style = document.createElement('style');
    $style.id = id;
    $style.textContent = `
.artplayer-plugin-liquid-glass.art-control-show {
    --art-control-height: 42px;
    --art-control-icon-size: 24px;
    --art-control-icon-scale: 1.1;
}

.artplayer-plugin-liquid-glass.art-control-show .art-bottom {
    align-items: center;
    background-image: none;
    padding-bottom: var(--art-padding);
}

.artplayer-plugin-liquid-glass.art-control-show .art-bottom .art-liquid-glass {
    border-radius: 8px;
    backdrop-filter: blur(12px);
    background-color: rgba(0, 0, 0, 0.25);
    padding: var(--art-padding) calc(var(--art-padding) * 1.5) 5px;
}

.artplayer-plugin-liquid-glass.art-control-show .art-settings {
    bottom: calc(var(--art-control-height) + var(--art-bottom-gap) + var(--art-padding));
}

.artplayer-plugin-liquid-glass.art-control-show .art-layer-auto-playback {
    bottom: calc(var(--art-control-height) + var(--art-bottom-gap) + var(--art-padding) * 4 + 10px);
}

/* 方案A + C：让按钮可自动缩小以适应所有按钮 */
.artplayer-plugin-liquid-glass .art-control {
    flex-shrink: 1 !important;  /* 覆盖ArtPlayer的flex-shrink: 0，允许按钮缩小 */
    min-width: 32px !important; /* 降低最小宽度，允许更小 */
    padding: 0 6px !important;  /* 减小内边距节省空间 */
}

/* 🔧 新方案：只包裹controls，progress独立 */
.artplayer-plugin-liquid-glass .art-controls {
    width: 100% !important;
}

/* 液态玻璃容器：居中且固定宽度 */
.artplayer-plugin-liquid-glass .art-liquid-glass {
    width: 98% !important;
    max-width: 100% !important;
    margin: 0 auto !important;
    box-sizing: border-box !important;
}

/* bottom容器确保子元素居中 */
.artplayer-plugin-liquid-glass .art-bottom {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
}

/* 移动端进一步优化 */
@media (max-width: 768px) {
    .artplayer-plugin-liquid-glass .art-control {
        padding: 0 4px !important;  /* 移动端更紧凑 */
        min-width: 28px !important;
    }

    .artplayer-plugin-liquid-glass .art-liquid-glass {
        width: 100% !important; /* 移动端使用全宽 */
    }
}
`;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        document.head.appendChild($style);
      });
    } else {
      (document.head || document.documentElement).appendChild($style);
    }
  }
}

if (typeof window !== 'undefined') {
  window.artplayerPluginLiquidGlass = artplayerPluginLiquidGlass;
}
