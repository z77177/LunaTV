/* eslint-disable no-console */

export interface DanDanPlayComment {
  cid: number;
  p: string; // 时间,类型,颜色,用户ID
  m: string; // 弹幕内容
}

export interface DanDanPlayResponse {
  code: number;
  message: string;
  comments?: DanDanPlayComment[];
}

export interface DanDanPlaySearchResult {
  animeId: number;
  animeTitle: string;
  type: string;
  episodes: Array<{
    episodeId: number;
    episodeTitle: string;
  }>;
}

export interface DanDanPlaySearchResponse {
  code: number;
  message: string;
  animes?: DanDanPlaySearchResult[];
}

// DanDanPlay免费API节点
const DANDANPLAY_API_URLS = [
  'https://dandanplay-api.933.moe',
  'http://dan.laodb.com:23333',
];

/**
 * 带重试的fetch请求
 */
async function fetchWithRetry(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'LunaTV/1.0',
        'Accept': 'application/json',
        ...options.headers,
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * 搜索匹配的番剧
 */
export async function searchDanDanPlayAnime(title: string): Promise<DanDanPlaySearchResult[]> {
  for (const baseUrl of DANDANPLAY_API_URLS) {
    try {
      const url = `${baseUrl}/api/v2/search/episodes?anime=${encodeURIComponent(title)}`;
      const response = await fetchWithRetry(url);
      
      if (!response.ok) {
        console.warn(`DanDanPlay API ${baseUrl} 返回错误:`, response.status);
        continue;
      }
      
      const data: DanDanPlaySearchResponse = await response.json();
      
      if (data.code === 0 && data.animes) {
        console.log(`从 ${baseUrl} 成功获取搜索结果`);
        return data.animes;
      }
      
      console.warn(`DanDanPlay API ${baseUrl} 返回错误码:`, data.code, data.message);
    } catch (error) {
      console.warn(`DanDanPlay API ${baseUrl} 请求失败:`, error.message);
      continue;
    }
  }
  
  console.warn('所有DanDanPlay API节点都无法访问');
  return [];
}

/**
 * 获取指定集数的弹幕
 */
export async function getDanDanPlayComments(episodeId: number): Promise<DanDanPlayComment[]> {
  for (const baseUrl of DANDANPLAY_API_URLS) {
    try {
      const url = `${baseUrl}/api/v2/comment/${episodeId}`;
      const response = await fetchWithRetry(url);
      
      if (!response.ok) {
        console.warn(`DanDanPlay API ${baseUrl} 返回错误:`, response.status);
        continue;
      }
      
      const data: DanDanPlayResponse = await response.json();
      
      if (data.code === 0 && data.comments) {
        console.log(`从 ${baseUrl} 成功获取弹幕, 共 ${data.comments.length} 条`);
        return data.comments;
      }
      
      console.warn(`DanDanPlay API ${baseUrl} 返回错误码:`, data.code, data.message);
    } catch (error) {
      console.warn(`DanDanPlay API ${baseUrl} 请求失败:`, error.message);
      continue;
    }
  }
  
  console.warn('所有DanDanPlay API节点都无法访问');
  return [];
}

/**
 * 将DanDanPlay弹幕格式转换为项目内部格式
 */
export function convertDanDanPlayToLocal(comments: DanDanPlayComment[], videoId: string): import('./types').Danmaku[] {
  return comments.map(comment => {
    const [time, type, color] = comment.p.split(',');
    
    return {
      id: `ddp_${comment.cid}`, // 使用ddp前缀标识来自DanDanPlay
      videoId,
      userId: 'DanDanPlay', // 标识为第三方弹幕
      time: parseFloat(time),
      text: comment.m,
      color: `#${parseInt(color).toString(16).padStart(6, '0')}`,
      type: parseInt(type),
      createTime: Date.now(),
    };
  });
}

/**
 * 智能匹配番剧和集数
 */
export async function getMatchedDanDanPlayComments(
  title: string,
  episode: number
): Promise<import('./types').Danmaku[]> {
  try {
    // 搜索匹配的番剧
    const animes = await searchDanDanPlayAnime(title);
    
    if (animes.length === 0) {
      console.log(`未找到匹配的番剧: ${title}`);
      return [];
    }
    
    // 选择最匹配的番剧（通常是第一个结果）
    const selectedAnime = animes[0];
    console.log(`选择番剧: ${selectedAnime.animeTitle}`);
    
    // 查找匹配的集数
    const targetEpisode = selectedAnime.episodes.find(ep => {
      // 尝试从标题中提取集数
      const episodeNum = ep.episodeTitle.match(/第?(\d+)[集话]/)?.[1];
      return episodeNum ? parseInt(episodeNum) === episode : false;
    }) || selectedAnime.episodes[episode - 1]; // 如果没找到，使用索引
    
    if (!targetEpisode) {
      console.log(`未找到第${episode}集`);
      return [];
    }
    
    console.log(`匹配集数: ${targetEpisode.episodeTitle}`);
    
    // 获取弹幕
    const comments = await getDanDanPlayComments(targetEpisode.episodeId);
    
    // 转换格式
    const videoId = `${selectedAnime.animeId}_ep${episode}`;
    return convertDanDanPlayToLocal(comments, videoId);
  } catch (error) {
    console.error('获取DanDanPlay弹幕失败:', error);
    return [];
  }
}