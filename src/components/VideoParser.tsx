'use client';

import React, { useState, useEffect } from 'react';

const parsers = [
  { id: 1, name: '接口1', url: 'https://jx.xmflv.com/?url=' },
  { id: 2, name: '接口2', url: 'https://www.8090kzy.com/jiexi/?url=' },
  { id: 3, name: '接口3', url: 'https://jx.jsonplayer.com/player/?url=' },
  { id: 4, name: '接口4', url: 'https://jx.parwix.com:4433/player/?url=' },
  { id: 5, name: '接口5', url: 'https://jx.bozrc.com:4433/player/?url=' },
  { id: 6, name: '接口6', url: 'https://jx.m3u8.tv/jiexi/?url=' },
  { id: 7, name: '接口7', url: 'https://jx.playerjy.com/?url=' },
  { id: 8, name: '接口8', url: 'https://jx.aidouer.net/?url=' },
];

const platforms = [
  { id: 'qq', name: '腾讯视频', icon: '🎥', example: 'https://v.qq.com/x/cover/xxx.html' },
  { id: 'iqiyi', name: '爱奇艺', icon: '📺', example: 'https://www.iqiyi.com/v_xxx.html' },
  { id: 'youku', name: '优酷', icon: '🎬', example: 'https://v.youku.com/v_show/xxx.html' },
  { id: 'bilibili', name: '哔哩哔哩', icon: '📹', example: 'https://www.bilibili.com/video/xxx' },
  { id: 'mgtv', name: '芒果TV', icon: '🍋', example: 'https://www.mgtv.com/b/xxx/xxx.html' },
  { id: 'sohu', name: '搜狐视频', icon: '🦊', example: 'https://tv.sohu.com/xxx.html' },
];

export default function VideoParser() {
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [selectedParser, setSelectedParser] = useState(parsers[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const [parseUrl, setParseUrl] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  // 检测移动设备和屏幕大小
  useEffect(() => {
    const checkMobile = () => {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 移动端自动全屏
  useEffect(() => {
    if (isMobile && parseUrl && !isLoading) {
      const timer = setTimeout(() => {
        const iframe = document.querySelector('iframe');
        if (iframe) {
          // 尝试各种全屏方法
          const requestFullscreen = 
            iframe.requestFullscreen ||
            (iframe as any).webkitRequestFullscreen ||
            (iframe as any).mozRequestFullScreen ||
            (iframe as any).msRequestFullscreen;
          
          if (requestFullscreen) {
            requestFullscreen.call(iframe).catch((err: Error) => {
              console.log('自动全屏失败:', err.message);
            });
          }
        }
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [parseUrl, isLoading, isMobile]);

  const handleParse = () => {
    if (!videoUrl.trim()) {
      alert('请输入视频链接！');
      return;
    }

    setIsLoading(true);
    const parser = parsers.find(p => p.id === selectedParser);
    if (parser) {
      const fullUrl = parser.url + encodeURIComponent(videoUrl);
      setParseUrl(fullUrl);
    }
    
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const handlePlatformClick = (platform: typeof platforms[0]) => {
    setSelectedPlatform(platform.id);
    setVideoUrl(platform.example);
  };

  const handleFullscreen = () => {
    const iframe = document.querySelector('iframe');
    if (iframe) {
      const requestFullscreen = 
        iframe.requestFullscreen ||
        (iframe as any).webkitRequestFullscreen ||
        (iframe as any).mozRequestFullScreen ||
        (iframe as any).msRequestFullscreen;
      
      if (requestFullscreen) {
        requestFullscreen.call(iframe).catch((err: Error) => {
          alert('全屏失败: ' + err.message);
        });
      }
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-6">
      {/* 标题 */}
      <div className="text-center px-4">
        <h1 className="text-2xl md:text-4xl font-bold mb-2 text-gray-900 dark:text-white">
          🎬 视频解析工具
        </h1>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
          多平台视频解析 | 支持腾讯、爱奇艺、优酷、B站等主流平台
        </p>
      </div>

      {/* 免责声明 */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 md:p-4 mx-4 md:mx-0">
        <p className="text-xs md:text-sm text-yellow-800 dark:text-yellow-200">
          ⚠️ <strong>免责声明：</strong>本工具仅供学习交流使用，严禁用于任何商业用途。
        </p>
      </div>

      {/* 使用提示 */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 md:p-4 mx-4 md:mx-0">
        <p className="text-xs md:text-sm text-blue-800 dark:text-blue-200">
          💡 <strong>使用提示：</strong>
          {isMobile ? '视频解析成功后会自动尝试全屏播放。' : ''}
          解析过程中可能出现广告，如遇到过多广告，请尝试切换其他解析接口。
        </p>
      </div>

      {/* 1. 选择平台 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6 mx-4 md:mx-0">
        <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-gray-900 dark:text-white">
          1. 选择视频平台
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
          {platforms.map((platform) => (
            <button
              key={platform.id}
              onClick={() => handlePlatformClick(platform)}
              className={`p-3 md:p-4 rounded-lg border-2 transition-all hover:shadow-md active:scale-95 ${
                selectedPlatform === platform.id
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
              }`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <div className="text-2xl md:text-3xl mb-1 md:mb-2">{platform.icon}</div>
              <div className="text-xs md:text-sm font-medium text-gray-900 dark:text-white">
                {platform.name}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 2. 输入链接 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6 mx-4 md:mx-0">
        <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-gray-900 dark:text-white">
          2. 输入视频链接
        </h2>
        <input
          type="text"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="请粘贴视频页面的完整链接..."
          className="w-full px-4 py-3 md:py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                   focus:ring-2 focus:ring-purple-500 focus:border-transparent 
                   dark:bg-gray-700 dark:text-white transition-all text-base"
          style={{ fontSize: '16px' }} // 防止 iOS 自动缩放
        />
      </div>

      {/* 3. 选择解析接口 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6 mx-4 md:mx-0">
        <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-gray-900 dark:text-white">
          3. 选择解析接口
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3 mb-4">
          {parsers.map((parser) => (
            <button
              key={parser.id}
              onClick={() => setSelectedParser(parser.id)}
              className={`p-3 rounded-lg border-2 transition-all active:scale-95 ${
                selectedParser === parser.id
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300'
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 text-gray-900 dark:text-white'
              } text-sm md:text-base font-medium`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {parser.name}
            </button>
          ))}
        </div>
        
        <button
          onClick={handleParse}
          disabled={isLoading || !videoUrl.trim()}
          className={`w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white 
                   ${isMobile ? 'py-4 text-lg' : 'py-3 text-base'} rounded-lg 
                   font-semibold hover:shadow-lg transition-all disabled:opacity-50 
                   disabled:cursor-not-allowed disabled:hover:shadow-none active:scale-95`}
        >
          {isLoading ? '解析中...' : '🚀 开始解析'}
        </button>
      </div>

      {/* 4. 播放视频 */}
      {parseUrl && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6 mx-4 md:mx-0">
          <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-gray-900 dark:text-white">
            4. 播放视频
          </h2>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 
                           border-purple-500 border-t-transparent"></div>
              <p className="mt-4 text-sm md:text-base text-gray-600 dark:text-gray-400">
                正在解析视频，请稍候...
              </p>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium text-sm md:text-base">
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>解析成功！</span>
                </div>
                
                {/* 手动全屏按钮（移动端） */}
                {isMobile && (
                  <button
                    onClick={handleFullscreen}
                    className="px-3 py-1.5 md:px-4 md:py-2 bg-blue-600 hover:bg-blue-700 
                             text-white rounded-lg text-xs md:text-sm font-medium 
                             transition-all active:scale-95 flex-shrink-0"
                  >
                    📱 全屏播放
                  </button>
                )}
              </div>
              
              <div className="relative w-full bg-black rounded-lg overflow-hidden" 
                   style={{ paddingTop: '56.25%' }}>
                <iframe
                  src={parseUrl}
                  className="absolute top-0 left-0 w-full h-full"
                  frameBorder="0"
                  allowFullScreen
                  allow="autoplay; fullscreen; picture-in-picture; accelerometer; gyroscope"
                  title="视频播放器"
                />
              </div>
              
              {isMobile && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  提示：如果没有自动全屏，请点击上方的"全屏播放"按钮
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
