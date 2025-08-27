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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  try {
    const apiUrl = `https://api.danmu.icu/?url=${encodeURIComponent(videoUrl)}`;
    
    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) return [];

    const data: DanmuApiResponse = await response.json();
    
    if (!data.danmuku || !Array.isArray(data.danmuku)) return [];

    // 转换为Artplayer格式
    // API返回格式: [时间, 位置, 颜色, "", 文本, "", "", "字号"]
    console.log(`获取到 ${data.danmuku.length} 条原始弹幕数据`);
    
    return data.danmuku.map((item: any[], index: number) => {
      const time = parseFloat(item[0]) || 0;
      const text = (item[4] || '').toString().trim();
      const color = item[2] || '#FFFFFF';
      
      // 转换位置: top=1顶部, bottom=2底部, right=0滚动
      let mode = 0;
      if (item[1] === 'top') mode = 1;
      else if (item[1] === 'bottom') mode = 2;
      else mode = 0; // right 或其他都是滚动

      if (index < 5) {
        console.log(`弹幕 ${index + 1}: 时间=${time}s, 文本="${text}", 颜色=${color}, 模式=${mode}`);
      }

      return {
        text: text,
        time: time,
        color: color,
        mode: mode,
      };
    }).filter(item => {
      const valid = item.text.length > 0 && 
                   !item.text.includes('弹幕正在赶来') && 
                   !item.text.includes('官方弹幕库');
      return valid;
    }); // 过滤空弹幕和系统提示

  } catch (error) {
    clearTimeout(timeoutId);
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