/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * YouTube功能状态检测和管理服务
 */
class YouTubeServiceManager {
  private static instance: YouTubeServiceManager;
  private apiKeyAvailable: boolean | null = null;
  private lastCheck: number = 0;
  private checkInterval = 5 * 60 * 1000; // 5分钟缓存

  static getInstance(): YouTubeServiceManager {
    if (!YouTubeServiceManager.instance) {
      YouTubeServiceManager.instance = new YouTubeServiceManager();
    }
    return YouTubeServiceManager.instance;
  }

  /**
   * 检测YouTube API是否可用
   */
  async checkAPIStatus(): Promise<boolean> {
    const now = Date.now();
    
    // 如果最近检查过且在缓存时间内，返回缓存结果
    if (this.apiKeyAvailable !== null && (now - this.lastCheck) < this.checkInterval) {
      return this.apiKeyAvailable;
    }

    try {
      // 发送测试请求检查YouTube搜索API状态
      const response = await fetch('/api/youtube/search?q=test&maxResults=1');
      const data = await response.json();
      
      // 检查是否是演示模式或API不可用
      const isAPIAvailable = response.ok && 
                             data.success && 
                             data.source !== 'demo' && 
                             data.source !== 'fallback';
      
      this.apiKeyAvailable = isAPIAvailable;
      this.lastCheck = now;
      
      console.log('YouTube API状态检测:', isAPIAvailable ? '可用' : '不可用');
      return isAPIAvailable;
    } catch (error) {
      console.warn('YouTube API状态检测失败:', error);
      this.apiKeyAvailable = false;
      this.lastCheck = now;
      return false;
    }
  }

  /**
   * 强制重新检测API状态
   */
  async forceCheckAPIStatus(): Promise<boolean> {
    this.apiKeyAvailable = null;
    this.lastCheck = 0;
    return this.checkAPIStatus();
  }

  /**
   * 获取当前API状态（不触发新的检测）
   */
  getCurrentAPIStatus(): boolean | null {
    return this.apiKeyAvailable;
  }

  /**
   * 根据API状态生成YouTube相关的操作按钮
   */
  async getYouTubeActions(url: string, title: string): Promise<YouTubeAction[]> {
    const hasAPIKey = await this.checkAPIStatus();
    
    const baseActions: YouTubeAction[] = [
      {
        type: 'play',
        label: '🎬 直接播放',
        icon: 'play',
        primary: true,
        action: () => this.embedVideo(url)
      },
      {
        type: 'open',
        label: '🔗 新窗口打开',
        icon: 'external-link',
        action: () => window.open(url, '_blank')
      }
    ];

    // 只有在有API key时才添加搜索功能
    if (hasAPIKey && title) {
      baseActions.push({
        type: 'search',
        label: '🔍 搜索相似内容',
        icon: 'search',
        action: () => this.searchSimilarContent(title)
      });
    }

    return baseActions;
  }

  /**
   * 处理AI推荐的YouTube内容
   */
  async handleAIYouTubeRecommendation(aiResponse: string): Promise<AIYouTubeResponse> {
    const hasAPIKey = await this.checkAPIStatus();
    const youtubeKeywords = this.extractYouTubeKeywords(aiResponse);

    if (hasAPIKey && youtubeKeywords.length > 0) {
      // 完整模式：AI推荐 → 自动搜索
      return this.fullModeHandler(youtubeKeywords);
    } else if (youtubeKeywords.length > 0) {
      // 降级模式：AI推荐 → 直接播放输入框
      return this.fallbackModeHandler(youtubeKeywords);
    }

    return { hasYouTubeContent: false };
  }

  /**
   * 从AI回复中提取YouTube相关关键词
   */
  private extractYouTubeKeywords(content: string): string[] {
    const youtubePatterns = [
      /YouTube/gi,
      /youtube/gi,
      /油管/gi,
      /视频网站/gi,
      /在线视频/gi,
      /视频教程/gi,
      /频道/gi
    ];

    const hasYouTubeContent = youtubePatterns.some(pattern => pattern.test(content));
    if (!hasYouTubeContent) return [];

    // 提取可能的搜索关键词
    const keywords: string[] = [];
    const titlePatterns = [
      /《([^》]+)》/g,
      /"([^"]+)"/g,
      /【([^】]+)】/g,
    ];

    titlePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        keywords.push(match[1].trim());
      }
    });

    return keywords;
  }

  /**
   * 完整模式处理器（有API Key）
   */
  private async fullModeHandler(keywords: string[]): Promise<AIYouTubeResponse> {
    try {
      const searchResults = await Promise.all(
        keywords.slice(0, 3).map(keyword => 
          fetch(`/api/youtube/search?q=${encodeURIComponent(keyword)}&maxResults=3`)
            .then(res => res.json())
        )
      );

      const videos = searchResults
        .filter(result => result.success && result.videos)
        .flatMap(result => result.videos)
        .slice(0, 6);

      return {
        hasYouTubeContent: true,
        mode: 'full',
        videos,
        message: '我为你找到了这些YouTube视频：'
      };
    } catch (error) {
      console.warn('YouTube搜索失败，降级到手动模式:', error);
      return this.fallbackModeHandler(keywords);
    }
  }

  /**
   * 降级模式处理器（无API Key）
   */
  private fallbackModeHandler(keywords: string[]): AIYouTubeResponse {
    return {
      hasYouTubeContent: true,
      mode: 'fallback',
      keywords,
      message: '我推荐了一些YouTube内容，你可以直接粘贴链接播放：',
      suggestion: '💡 提示：配置YouTube API Key可获得自动搜索功能'
    };
  }

  /**
   * 嵌入播放视频
   */
  private embedVideo(url: string): void {
    // 触发显示DirectYouTubePlayer组件
    window.dispatchEvent(new CustomEvent('youtube-embed-request', { 
      detail: { url } 
    }));
  }

  /**
   * 搜索相似内容
   */
  private searchSimilarContent(title: string): void {
    // 在YouTube搜索页面中搜索相似内容
    const searchUrl = `/search?q=${encodeURIComponent(title)}`;
    window.location.href = searchUrl;
  }
}

// 类型定义
export interface YouTubeAction {
  type: 'play' | 'open' | 'search';
  label: string;
  icon: string;
  primary?: boolean;
  action: () => void;
}

export interface AIYouTubeResponse {
  hasYouTubeContent: boolean;
  mode?: 'full' | 'fallback';
  videos?: any[];
  keywords?: string[];
  message?: string;
  suggestion?: string;
}

// 导出单例实例
export const YouTubeService = YouTubeServiceManager.getInstance();

// 工具函数：检测文本中是否包含YouTube链接
export const detectYouTubeLinks = (text: string): string[] => {
  const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;
  const matches: string[] = [];
  let match;
  
  while ((match = youtubeRegex.exec(text)) !== null) {
    matches.push(match[0]);
  }
  
  return matches;
};

// 工具函数：从YouTube链接提取视频ID
export const extractVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  
  return null;
};