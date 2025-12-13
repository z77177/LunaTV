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
    append($bottom, $liquidGlass);
    append($liquidGlass, $progress);
    append($liquidGlass, $controls);

    art.on('control', (state) => {
      if (state) {
        $liquidGlass.style.width = option.width || '';
        $liquidGlass.style['max-width'] = option['max-width'] || '';
        $liquidGlass.style['min-width'] = option['min-width'] || '';
      } else {
        $liquidGlass.style.width = '';
        $liquidGlass.style['max-width'] = '';
        $liquidGlass.style['min-width'] = '';
      }
    });

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

/* 增大容器宽度，给按钮更多空间 */
.artplayer-plugin-liquid-glass .art-liquid-glass {
    width: 98% !important;
    max-width: 100% !important;
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
