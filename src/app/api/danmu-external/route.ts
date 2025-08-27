/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';

interface PlatformUrl {
  platform: string;
  url: string;
}

interface DanmuApiResponse {
  code: number;
  name: string;
  danum: number;
  danmuku: any[];
}

interface DanmuItem {
  text: string;
  time: number;
  color?: string;
  mode?: number;
}

// 从豆瓣页面提取平台视频链接
async function extractPlatformUrls(doubanId: string): Promise<PlatformUrl[]> {
  if (!doubanId) return [];

  try {
    const response = await fetch(`https://movie.douban.com/subject/${doubanId}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) return [];
    
    const html = await response.text();
    const urls: PlatformUrl[] = [];

    // 腾讯视频链接提取
    const qqMatches = html.match(/https:\/\/v\.qq\.com\/x\/cover\/[^"'\s]+/g);
    if (qqMatches && qqMatches.length > 0) {
      urls.push({
        platform: 'tencent',
        url: qqMatches[0].split('?')[0], // 移除参数
      });
    }

    // B站链接提取
    const biliMatches = html.match(/https:\/\/www\.bilibili\.com\/video\/[^"'\s]+/g);
    if (biliMatches && biliMatches.length > 0) {
      urls.push({
        platform: 'bilibili', 
        url: biliMatches[0].split('?')[0],
      });
    }

    return urls;
  } catch (error) {
    console.error('提取平台链接失败:', error);
    return [];
  }
}

// 从danmu.icu获取弹幕数据
async function fetchDanmuFromAPI(videoUrl: string): Promise<DanmuItem[]> {
  try {
    const apiUrl = `https://api.danmu.icu/?url=${encodeURIComponent(videoUrl)}`;
    const response = await fetch(apiUrl, {
      timeout: 10000,
    });

    if (!response.ok) return [];

    const data: DanmuApiResponse = await response.json();
    
    if (!data.danmuku || !Array.isArray(data.danmuku)) return [];

    // 转换为Artplayer格式
    return data.danmuku.map((item: any[]) => {
      const time = parseFloat(item[0]) || 0;
      const text = item[4] || '';
      const color = item[2] || '#FFFFFF';
      const mode = item[1] === 'top' ? 1 : item[1] === 'bottom' ? 2 : 0;

      return {
        text: text.toString(),
        time: time,
        color: color,
        mode: mode,
      };
    }).filter(item => item.text.length > 0); // 过滤空弹幕

  } catch (error) {
    console.error('获取弹幕失败:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const doubanId = searchParams.get('douban_id');
  const title = searchParams.get('title');
  const year = searchParams.get('year');

  if (!doubanId && !title) {
    return NextResponse.json({ 
      error: 'Missing required parameters: douban_id or title' 
    }, { status: 400 });
  }

  try {
    let platformUrls: PlatformUrl[] = [];

    // 优先使用豆瓣ID提取链接
    if (doubanId) {
      platformUrls = await extractPlatformUrls(doubanId);
    }

    // 如果豆瓣ID没有找到链接，使用标题构建搜索链接
    if (platformUrls.length === 0 && title) {
      const searchQuery = encodeURIComponent(title);
      platformUrls = [
        {
          platform: 'tencent_search',
          url: `https://v.qq.com/x/search/?q=${searchQuery}`,
        },
        {
          platform: 'bilibili_search', 
          url: `https://search.bilibili.com/all?keyword=${searchQuery}`,
        },
      ];
    }

    if (platformUrls.length === 0) {
      return NextResponse.json({ 
        danmu: [],
        message: '未找到支持的视频平台链接'
      });
    }

    // 并发获取多个平台的弹幕
    const danmuPromises = platformUrls.map(async ({ platform, url }) => {
      const danmu = await fetchDanmuFromAPI(url);
      return { platform, danmu, url };
    });

    const results = await Promise.allSettled(danmuPromises);
    
    // 合并所有成功的弹幕数据
    let allDanmu: DanmuItem[] = [];
    const platformInfo: any[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.danmu.length > 0) {
        allDanmu = allDanmu.concat(result.value.danmu);
        platformInfo.push({
          platform: result.value.platform,
          url: result.value.url,
          count: result.value.danmu.length,
        });
      }
    });

    // 按时间排序
    allDanmu.sort((a, b) => a.time - b.time);

    return NextResponse.json({
      danmu: allDanmu,
      platforms: platformInfo,
      total: allDanmu.length,
    });

  } catch (error) {
    console.error('外部弹幕获取失败:', error);
    return NextResponse.json({ 
      error: '获取外部弹幕失败',
      danmu: []
    }, { status: 500 });
  }
}