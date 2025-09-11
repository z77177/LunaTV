'use client';

import { Play, ExternalLink, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { YouTubeService, detectYouTubeLinks, extractVideoId, YouTubeAction } from '@/lib/youtube-service';
import DirectYouTubePlayer from './DirectYouTubePlayer';

interface YouTubeEnhancedResponseProps {
  content: string;
  onLinkDetected?: (links: string[]) => void;
}

interface VideoInfo {
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  videoId: string;
  originalUrl: string;
}

const YouTubeEnhancedResponse = ({ content, onLinkDetected }: YouTubeEnhancedResponseProps) => {
  const router = useRouter();
  const [detectedLinks, setDetectedLinks] = useState<string[]>([]);
  const [videoInfos, setVideoInfos] = useState<VideoInfo[]>([]);
  const [actions, setActions] = useState<YouTubeAction[]>([]);
  const [showDirectPlayer, setShowDirectPlayer] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string>('');
  const [apiStatus, setApiStatus] = useState<boolean | null>(null);

  // 检测YouTube链接
  useEffect(() => {
    const links = detectYouTubeLinks(content);
    setDetectedLinks(links);
    onLinkDetected?.(links);

    if (links.length > 0) {
      fetchVideoInfos(links);
      checkAPIStatus();
    }
  }, [content, onLinkDetected]);

  // 检查API状态
  const checkAPIStatus = async () => {
    const status = await YouTubeService.checkAPIStatus();
    setApiStatus(status);
  };

  // 获取视频信息
  const fetchVideoInfos = async (links: string[]) => {
    const infos = await Promise.all(
      links.slice(0, 3).map(async (link) => { // 最多处理3个链接
        const videoId = extractVideoId(link);
        if (!videoId) return null;

        try {
          // 使用oEmbed API获取基本信息
          const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
          if (response.ok) {
            const data = await response.json();
            return {
              title: data.title || '未知视频',
              channelTitle: data.author_name || '未知频道',
              thumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
              videoId,
              originalUrl: link
            };
          }
        } catch (error) {
          console.warn('获取视频信息失败:', error);
        }

        // 降级方案：使用基本信息
        return {
          title: '直接播放的YouTube视频',
          channelTitle: '未知频道',
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          videoId,
          originalUrl: link
        };
      })
    );

    setVideoInfos(infos.filter((info): info is VideoInfo => info !== null));
  };

  // 生成操作按钮
  const generateActions = async (url: string, title: string): Promise<YouTubeAction[]> => {
    return YouTubeService.getYouTubeActions(url, title);
  };

  // 处理视频卡片点击
  const handleVideoSelect = (video: VideoInfo) => {
    setSelectedVideoUrl(video.originalUrl);
    setShowDirectPlayer(true);
  };

  // 处理操作按钮点击
  const handleAction = async (video: VideoInfo, actionType: 'play' | 'open' | 'search') => {
    switch (actionType) {
      case 'play':
        setSelectedVideoUrl(video.originalUrl);
        setShowDirectPlayer(true);
        break;
      case 'open':
        window.open(video.originalUrl, '_blank');
        break;
      case 'search':
        if (apiStatus) {
          router.push(`/search?q=${encodeURIComponent(video.title)}`);
        }
        break;
    }
  };

  // 如果没有检测到YouTube链接，返回null
  if (detectedLinks.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 space-y-4">
      {/* YouTube链接检测提示 */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 dark:bg-red-900/20 dark:border-red-800">
        <div className="flex items-center text-red-800 dark:text-red-200 mb-2">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
          <span className="font-medium">🎬 检测到YouTube视频</span>
        </div>
        <p className="text-red-700 dark:text-red-300 text-sm">
          我发现你分享了 {detectedLinks.length} 个YouTube链接，你可以：
        </p>
      </div>

      {/* 视频卡片列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {videoInfos.map((video, index) => (
          <div 
            key={index} 
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => handleVideoSelect(video)}
          >
            {/* 视频缩略图 */}
            <div className="relative aspect-video bg-gray-200 dark:bg-gray-700">
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder-video.jpg';
                }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center group">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-red-600 hover:bg-red-700 text-white rounded-full p-3">
                  <Play className="w-6 h-6" />
                </div>
              </div>
              {/* YouTube标识 */}
              <div className="absolute bottom-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded flex items-center">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                YouTube
              </div>
            </div>

            {/* 视频信息 */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2 line-clamp-2">
                {video.title}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                {video.channelTitle}
              </p>

              {/* 操作按钮 */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(video, 'play');
                  }}
                  className="flex items-center px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                >
                  <Play className="w-3 h-3 mr-1" />
                  直接播放
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(video, 'open');
                  }}
                  className="flex items-center px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  新窗口
                </button>
                {apiStatus && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction(video, 'search');
                    }}
                    className="flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                  >
                    <Search className="w-3 h-3 mr-1" />
                    搜索相似
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* API状态提示 */}
      {apiStatus === false && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 dark:bg-yellow-900/20 dark:border-yellow-800">
          <p className="text-yellow-700 dark:text-yellow-300 text-sm">
            💡 提示：配置YouTube API Key可获得自动搜索相似内容的功能
          </p>
        </div>
      )}

      {/* 直接播放器模态框 */}
      {showDirectPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" onClick={() => setShowDirectPlayer(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">YouTube播放器</h2>
                <button
                  onClick={() => setShowDirectPlayer(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <DirectYouTubePlayer initialUrl={selectedVideoUrl} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YouTubeEnhancedResponse;