'use client';

import React, { useState } from 'react';

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-6xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            🎬 视频解析工具
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            多平台视频解析 | 支持腾讯、爱奇艺、优酷、B站等主流平台
          </p>
        </div>

        {/* 免责声明 */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ <strong>免责声明：</strong>本工具仅供学习交流使用，严禁用于任何商业用途。
            使用本工具产生的任何法律责任由使用者自行承担。
          </p>
        </div>

        <div className="grid gap-6">
          {/* 1. 选择平台 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-900 dark:text-white">
              <span className="mr-2">1.</span>
              选择视频平台
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => handlePlatformClick(platform)}
                  className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                    selectedPlatform === platform.id
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                  }`}
                >
                  <div className="text-3xl mb-2">{platform.icon}</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{platform.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. 输入链接 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-900 dark:text-white">
              <span className="mr-2">2.</span>
              输入视频链接
            </h2>
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="请粘贴视频页面的完整链接..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* 3. 选择解析接口 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-900 dark:text-white">
              <span className="mr-2">3.</span>
              选择解析接口
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {parsers.map((parser) => (
                <button
                  key={parser.id}
                  onClick={() => setSelectedParser(parser.id)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedParser === parser.id
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                  } text-gray-900 dark:text-white`}
                >
                  {parser.name}
                </button>
              ))}
            </div>
            
            <button
              onClick={handleParse}
              disabled={isLoading}
              className="mt-4 w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '解析中...' : '🚀 开始解析'}
            </button>
          </div>

          {/* 4. 播放视频 */}
          {parseUrl && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-900 dark:text-white">
                <span className="mr-2">4.</span>
                播放视频
              </h2>
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-400">正在解析视频，请稍候...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-green-600 dark:text-green-400 font-medium">
                    ✅ 解析成功！正在加载视频...
                  </p>
                  <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                    <iframe
                      src={parseUrl}
                      className="absolute top-0 left-0 w-full h-full rounded-lg"
                      frameBorder="0"
                      allowFullScreen
                      allow="autoplay; fullscreen"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 页脚 */}
        <div className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400">
          © 2025 BrooklynTV | 仅供学习交流使用 | Made with ❤️
        </div>
      </div>
    </div>
  );
}
