'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

// 定义XGPlayer实例类型（基于实际XGPlayer API）
interface XGPlayerInstance {
  destroy(): void;
  play(): Promise<void>;
  pause(): void;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  paused: boolean;
  fullscreen: boolean;
  video: HTMLVideoElement;
  danmu?: any;
  on(event: string, callback: Function): void;
  off(event: string, callback?: Function): void;
  emit(event: string, ...args: any[]): void;
  switchUrl(url: string, options?: any): void;
  [key: string]: any;
}

// 播放器类型
type PlayerType = 'live' | 'vod';

// 弹幕数据格式（XGPlayer格式）
interface DanmuComment {
  id: string;
  start: number; // 毫秒
  txt: string;
  mode?: 'scroll' | 'top' | 'bottom';
  style?: {
    color?: string;
    fontSize?: string;
  };
  [key: string]: any;
}

// 组件Props
interface XGPlayerProps {
  // 基础配置
  url: string;
  type?: PlayerType;
  poster?: string;

  // 播放器配置
  width?: number | string;
  height?: number | string;
  autoplay?: boolean;
  muted?: boolean;
  volume?: number;

  // 直播专用配置 - 使用现有hls.js
  hlsConfig?: any;

  // 点播专用配置 - 使用XGPlayer全功能
  danmuComments?: DanmuComment[];
  danmuConfig?: {
    enable?: boolean;
    area?: { start: number; end: number };
    fontSize?: number;
    opacity?: number;
    channelSize?: number;
    [key: string]: any;
  };

  // 事件回调
  onReady?: (player: XGPlayerInstance) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: any) => void;
  onTimeUpdate?: (currentTime: number) => void;
  onDanmuSend?: (comment: DanmuComment) => void;

  // 样式
  className?: string;
  style?: React.CSSProperties;
}

// HLS.js loader for live streaming (从现有代码复制)
class CustomHlsJsLoader extends Hls.DefaultConfig.loader {
  constructor(config: any) {
    super(config);
    const load = this.load.bind(this);
    this.load = function (context: any, config: any, callbacks: any) {
      // 执行原始load方法
      load(context, config, callbacks);
    };
  }
}

const XGPlayer = React.forwardRef<any, XGPlayerProps>(({
  url,
  type = 'vod',
  poster,
  width = '100%',
  height = '400px',
  autoplay = false,
  muted = false,
  volume = 0.7,
  hlsConfig = {},
  danmuComments = [],
  danmuConfig = { enable: true },
  onReady,
  onPlay,
  onPause,
  onEnded,
  onError,
  onTimeUpdate,
  onDanmuSend,
  className,
  style,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<XGPlayerInstance | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初始化播放器
  useEffect(() => {
    if (!containerRef.current || !url) return;

    const initPlayer = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 清理之前的实例
        cleanup();

        // 动态导入XGPlayer
        const XGPlayerModule = await import('xgplayer');
        const XGPlayerClass = XGPlayerModule.default || XGPlayerModule;

        if (type === 'live') {
          // 直播模式：使用XGPlayer核心 + 现有hls.js
          await initLivePlayer(XGPlayerClass);
        } else {
          // 点播模式：使用XGPlayer全功能 + 弹幕
          await initVodPlayer(XGPlayerClass);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('XGPlayer initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Player initialization failed');
        setIsLoading(false);
      }
    };

    initPlayer();

    return cleanup;
  }, [url, type]);

  // 初始化直播播放器（核心 + hls.js）
  const initLivePlayer = async (XGPlayerClass: any) => {
    if (!containerRef.current) return;

    // 基于XGPlayer真实API创建直播配置
    const playerConfig = {
      el: containerRef.current,
      width,
      height,
      poster,
      autoplay: false, // 手动控制播放
      volume,
      fluid: true,
      videoInit: true,
      playsinline: true,
      // 直播模式配置
      isLive: true,
      // 不设置url，由hls.js处理
      url: '',
      // 基于defaultConfig.js的基础插件，不包含弹幕
      plugins: [
        'play',
        'progress',
        'time',
        'volume',
        'fullscreen',
        'loading'
      ]
    };

    // 创建XGPlayer实例
    const player = new XGPlayerClass(playerConfig);
    playerRef.current = player;

    // 等待播放器就绪
    player.once('ready', () => {
      // 使用hls.js处理HLS流
      if (Hls.isSupported() && url.includes('m3u8')) {
        initHls(player.video, url);
      } else if (player.video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari原生支持
        player.video.src = url;
      } else {
        setError('HLS not supported');
        return;
      }

      bindLiveEvents(player);
      onReady?.(player);
    });
  };

  // 初始化点播播放器（全功能 + 弹幕）
  const initVodPlayer = async (XGPlayerClass: any) => {
    if (!containerRef.current) return;

    // 基于XGPlayer真实API创建配置
    const playerConfig = {
      el: containerRef.current,
      url,
      width,
      height,
      poster,
      autoplay,
      volume,
      fluid: true,
      videoInit: true,
      playsinline: true,
      // 点播模式配置
      isLive: false,
      // 基于defaultConfig.js的默认插件列表
      plugins: [
        'play',
        'progress',
        'time',
        'volume',
        'fullscreen',
        'loading',
        // 弹幕插件配置 - 基于danmu/index.js的defaultConfig
        {
          name: 'danmu',
          config: {
            comments: danmuComments || [], // 弹幕数据
            area: danmuConfig.area || { start: 0, end: 1 }, // 显示区域
            defaultOpen: danmuConfig.enable !== false, // 默认开启
            panel: true, // 显示设置面板
            fontSize: danmuConfig.fontSize || 14,
            opacity: danmuConfig.opacity || 1,
            channelSize: danmuConfig.channelSize || 24,
            mouseControl: false,
            mouseControlPause: false,
            isLive: false,
            ...danmuConfig
          }
        }
      ]
    };

    // 创建XGPlayer实例
    const player = new XGPlayerClass(playerConfig);
    playerRef.current = player;

    // 等待播放器就绪
    player.once('ready', () => {
      bindVodEvents(player);
      onReady?.(player);
      setIsLoading(false);
    });
  };

  // 初始化HLS.js（用于直播）
  const initHls = (video: HTMLVideoElement, streamUrl: string) => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
    }

    const hlsConfig = {
      debug: false,
      enableWorker: true,
      lowLatencyMode: false,
      loader: CustomHlsJsLoader,
      ...hlsConfig
    };

    const hls = new Hls(hlsConfig);
    hlsRef.current = hls;

    hls.loadSource(streamUrl);
    hls.attachMedia(video);

    // HLS事件处理
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      if (autoplay) {
        video.play().catch(console.error);
      }
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
      console.error('HLS Error:', event, data);
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            hls.recoverMediaError();
            break;
          default:
            setError('HLS fatal error');
            break;
        }
      }
    });
  };

  // 绑定直播事件
  const bindLiveEvents = (player: XGPlayerInstance) => {
    player.on('play', onPlay);
    player.on('pause', onPause);
    player.on('ended', onEnded);
    player.on('error', onError);
    player.on('timeupdate', () => {
      onTimeUpdate?.(player.currentTime);
    });
  };

  // 绑定点播事件（包含弹幕）
  const bindVodEvents = (player: XGPlayerInstance) => {
    player.on('play', onPlay);
    player.on('pause', onPause);
    player.on('ended', onEnded);
    player.on('error', onError);
    player.on('timeupdate', () => {
      onTimeUpdate?.(player.currentTime);
    });

    // 弹幕发送事件
    if (player.danmu && onDanmuSend) {
      // 这里可以监听弹幕输入框的发送事件
      // 具体实现依赖于XGPlayer的弹幕API
    }
  };

  // 清理资源
  const cleanup = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch (err) {
        console.warn('Player destroy error:', err);
      }
      playerRef.current = null;
    }
  };

  // 公开的方法
  const getPlayer = () => playerRef.current;

  const play = () => playerRef.current?.play();
  const pause = () => playerRef.current?.pause();
  const switchUrl = (newUrl: string) => {
    if (type === 'live' && hlsRef.current && newUrl.includes('m3u8')) {
      hlsRef.current.loadSource(newUrl);
    } else if (playerRef.current?.switchUrl) {
      playerRef.current.switchUrl(newUrl);
    }
  };

  // 弹幕相关方法（仅点播模式） - 基于danmu.js真实API
  const sendDanmu = (comment: DanmuComment) => {
    if (type === 'vod' && playerRef.current?.danmu) {
      // 使用danmu.js的sendComment方法
      playerRef.current.danmu.sendComment({
        id: comment.id,
        start: comment.start,
        txt: comment.txt,
        mode: comment.mode || 'scroll',
        style: comment.style || {}
      });
    }
  };

  const updateDanmuComments = (comments: DanmuComment[]) => {
    if (type === 'vod' && playerRef.current?.danmu) {
      // 使用danmu.js的updateComments方法
      playerRef.current.danmu.updateComments(comments);
    }
  };

  // 将XGPlayer实例直接暴露给父组件
  useImperativeHandle(
    ref,
    () => playerRef.current, // 直接返回XGPlayer实例
    []
  );

  return (
    <div
      className={className}
      style={{ position: 'relative', width, height, ...style }}
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#000'
        }}
      />

      {/* 加载状态 */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            fontSize: '14px'
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '8px' }}>
              {type === 'live' ? '📺 直播加载中...' : '🎬 视频加载中...'}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>
              {type === 'live' ? '使用 XGPlayer + HLS.js' : '使用 XGPlayer + 弹幕'}
            </div>
          </div>
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            fontSize: '14px'
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: '300px', padding: '20px' }}>
            <div style={{ marginBottom: '8px' }}>❌ 播放器错误</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>{error}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default XGPlayer;
export type { XGPlayerProps, XGPlayerInstance, DanmuComment };