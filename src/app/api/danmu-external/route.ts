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

// 从caiji.cyou API搜索视频链接
async function searchFromCaijiAPI(title: string, episode?: string | null): Promise<PlatformUrl[]> {
  try {
    console.log(`🔎 在caiji.cyou搜索: "${title}", 集数: ${episode || '未指定'}`);
    
    const searchUrl = `https://www.caiji.cyou/api.php/provide/vod/?wd=${encodeURIComponent(title)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) {
      console.log('❌ Caiji API搜索失败:', response.status);
      return [];
    }
    
    const data: any = await response.json();
    if (!data.list || data.list.length === 0) {
      console.log('📭 Caiji API未找到匹配内容');
      return [];
    }
    
    console.log(`🎬 找到 ${data.list.length} 个匹配结果`);
    
    // 获取第一个匹配结果的详细信息
    const firstResult: any = data.list[0];
    const detailUrl = `https://www.caiji.cyou/api.php/provide/vod/?ac=detail&ids=${firstResult.vod_id}`;
    
    const detailResponse = await fetch(detailUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!detailResponse.ok) return [];
    
    const detailData: any = await detailResponse.json();
    if (!detailData.list || detailData.list.length === 0) return [];
    
    const videoInfo: any = detailData.list[0];
    console.log(`🎭 视频详情: "${videoInfo.vod_name}" (${videoInfo.vod_year})`);
    
    const urls: PlatformUrl[] = [];
    
    // 解析播放链接
    if (videoInfo.vod_play_url) {
      const playUrls = videoInfo.vod_play_url.split('#');
      console.log(`📺 找到 ${playUrls.length} 集`);
      
      // 如果指定了集数，尝试找到对应集数的链接
      let targetUrl = '';
      if (episode && parseInt(episode) > 0) {
        const episodeNum = parseInt(episode);
        const targetEpisode = playUrls.find((url: string) => url.startsWith(`${episodeNum}$`));
        if (targetEpisode) {
          targetUrl = targetEpisode.split('$')[1];
          console.log(`🎯 找到第${episode}集: ${targetUrl}`);
        }
      }
      
      // 如果没有指定集数或找不到指定集数，使用第一集
      if (!targetUrl && playUrls.length > 0) {
        targetUrl = playUrls[0].split('$')[1];
        console.log(`📺 使用第1集: ${targetUrl}`);
      }
      
      if (targetUrl) {
        // 根据URL判断平台
        let platform = 'unknown';
        if (targetUrl.includes('bilibili.com')) {
          platform = 'bilibili_caiji';
        } else if (targetUrl.includes('v.qq.com')) {
          platform = 'tencent_caiji';
        } else if (targetUrl.includes('iqiyi.com')) {
          platform = 'iqiyi_caiji';
        } else if (targetUrl.includes('youku.com')) {
          platform = 'youku_caiji';
        }
        
        urls.push({
          platform: platform,
          url: targetUrl,
        });
      }
    }
    
    console.log(`✅ Caiji API返回 ${urls.length} 个播放链接`);
    return urls;
    
  } catch (error) {
    console.error('❌ Caiji API搜索失败:', error);
    return [];
  }
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
    
    if (!response.ok) {
      console.log(`❌ 豆瓣页面请求失败: ${response.status}`);
      return [];
    }
    
    const html = await response.text();
    console.log(`📄 豆瓣页面HTML长度: ${html.length}`);
    const urls: PlatformUrl[] = [];

    // 提取豆瓣跳转链接中的各种视频平台URL
    
    // 腾讯视频
    const doubanLinkMatches = html.match(/play_link:\s*"[^"]*v\.qq\.com[^"]*"/g);
    if (doubanLinkMatches && doubanLinkMatches.length > 0) {
      console.log(`🎬 找到 ${doubanLinkMatches.length} 个腾讯视频链接`);
      const match = doubanLinkMatches[0];
      const urlMatch = match.match(/https%3A%2F%2Fv\.qq\.com[^"&]*/);
      if (urlMatch) {
        const decodedUrl = decodeURIComponent(urlMatch[0]).split('?')[0];
        console.log(`🔗 腾讯视频链接: ${decodedUrl}`);
        urls.push({ platform: 'tencent', url: decodedUrl });
      }
    }

    // 爱奇艺
    const iqiyiMatches = html.match(/play_link:\s*"[^"]*iqiyi\.com[^"]*"/g);
    if (iqiyiMatches && iqiyiMatches.length > 0) {
      console.log(`📺 找到 ${iqiyiMatches.length} 个爱奇艺链接`);
      const match = iqiyiMatches[0];
      const urlMatch = match.match(/https?%3A%2F%2F[^"&]*iqiyi\.com[^"&]*/);
      if (urlMatch) {
        const decodedUrl = decodeURIComponent(urlMatch[0]).split('?')[0];
        console.log(`🔗 爱奇艺链接: ${decodedUrl}`);
        urls.push({ platform: 'iqiyi', url: decodedUrl });
      }
    }

    // 优酷
    const youkuMatches = html.match(/play_link:\s*"[^"]*youku\.com[^"]*"/g);
    if (youkuMatches && youkuMatches.length > 0) {
      console.log(`🎞️ 找到 ${youkuMatches.length} 个优酷链接`);
      const match = youkuMatches[0];
      const urlMatch = match.match(/https?%3A%2F%2F[^"&]*youku\.com[^"&]*/);
      if (urlMatch) {
        const decodedUrl = decodeURIComponent(urlMatch[0]).split('?')[0];
        console.log(`🔗 优酷链接: ${decodedUrl}`);
        urls.push({ platform: 'youku', url: decodedUrl });
      }
    }

    // 直接提取腾讯视频链接
    const qqMatches = html.match(/https:\/\/v\.qq\.com\/x\/cover\/[^"'\s]+/g);
    if (qqMatches && qqMatches.length > 0) {
      console.log(`🎭 找到直接腾讯链接: ${qqMatches[0]}`);
      urls.push({
        platform: 'tencent_direct',
        url: qqMatches[0].split('?')[0],
      });
    }

    // B站链接提取（直接链接）
    const biliMatches = html.match(/https:\/\/www\.bilibili\.com\/video\/[^"'\s]+/g);
    if (biliMatches && biliMatches.length > 0) {
      console.log(`📺 找到B站直接链接: ${biliMatches[0]}`);
      urls.push({
        platform: 'bilibili', 
        url: biliMatches[0].split('?')[0],
      });
    }

    // B站链接提取（豆瓣跳转链接）
    const biliDoubanMatches = html.match(/play_link:\s*"[^"]*bilibili\.com[^"]*"/g);
    if (biliDoubanMatches && biliDoubanMatches.length > 0) {
      console.log(`📱 找到 ${biliDoubanMatches.length} 个B站豆瓣链接`);
      const match = biliDoubanMatches[0];
      const urlMatch = match.match(/https?%3A%2F%2F[^"&]*bilibili\.com[^"&]*/);
      if (urlMatch) {
        const decodedUrl = decodeURIComponent(urlMatch[0]).split('?')[0];
        console.log(`🔗 B站豆瓣链接: ${decodedUrl}`);
        urls.push({ platform: 'bilibili_douban', url: decodedUrl });
      }
    }

    console.log(`✅ 总共提取到 ${urls.length} 个平台链接`);
    return urls;
  } catch (error) {
    console.error('❌ 提取平台链接失败:', error);
    return [];
  }
}

// 从danmu.icu获取弹幕数据
async function fetchDanmuFromAPI(videoUrl: string): Promise<DanmuItem[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 增加超时时间
  
  try {
    const apiUrl = `https://api.danmu.icu/?url=${encodeURIComponent(videoUrl)}`;
    console.log('🌐 正在请求弹幕API:', apiUrl);
    
    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://danmu.icu/',
      },
    });
    
    clearTimeout(timeoutId);
    console.log('📡 API响应状态:', response.status, response.statusText);

    if (!response.ok) {
      console.log('❌ API响应失败:', response.status);
      return [];
    }

    const responseText = await response.text();
    console.log('📄 API原始响应:', responseText.substring(0, 500) + '...');
    
    let data: DanmuApiResponse;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ JSON解析失败:', parseError);
      console.log('响应内容:', responseText.substring(0, 200));
      return [];
    }
    
    if (!data.danmuku || !Array.isArray(data.danmuku)) return [];

    // 转换为Artplayer格式
    // API返回格式: [时间, 位置, 颜色, "", 文本, "", "", "字号"]
    console.log(`获取到 ${data.danmuku.length} 条原始弹幕数据`);
    
    const danmuList = data.danmuku.map((item: any[], index: number) => {
      // 正确解析时间 - 第一个元素就是时间(秒)
      const time = parseFloat(item[0]) || 0;
      const text = (item[4] || '').toString().trim();
      const color = item[2] || '#FFFFFF';
      
      // 转换位置: top=1顶部, bottom=2底部, right=0滚动
      let mode = 0;
      if (item[1] === 'top') mode = 1;
      else if (item[1] === 'bottom') mode = 2;
      else mode = 0; // right 或其他都是滚动

      return {
        text: text,
        time: time,
        color: color,
        mode: mode,
      };
    }).filter(item => {
      const valid = item.text.length > 0 && 
                   !item.text.includes('弹幕正在赶来') && 
                   !item.text.includes('官方弹幕库') &&
                   item.time >= 0;
      return valid;
    }).sort((a, b) => a.time - b.time); // 按时间排序

    // 显示时间分布统计
    const timeStats = danmuList.reduce((acc, item) => {
      const timeRange = Math.floor(item.time / 60); // 按分钟分组
      acc[timeRange] = (acc[timeRange] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    console.log('📊 弹幕时间分布(按分钟):', timeStats);
    console.log('📋 前10条弹幕:', danmuList.slice(0, 10).map(item => 
      `${item.time}s: "${item.text.substring(0, 20)}"`
    ));
    
    return danmuList;

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
  const episode = searchParams.get('episode'); // 新增集数参数

  console.log('=== 弹幕API请求参数 ===');
  console.log('豆瓣ID:', doubanId);
  console.log('标题:', title);
  console.log('年份:', year);
  console.log('集数:', episode);

  if (!doubanId && !title) {
    return NextResponse.json({ 
      error: 'Missing required parameters: douban_id or title' 
    }, { status: 400 });
  }

  try {
    let platformUrls: PlatformUrl[] = [];

    // 优先使用caiji.cyou API搜索内容
    if (title) {
      console.log('🔍 使用caiji.cyou API搜索内容...');
      const caijiUrls = await searchFromCaijiAPI(title, episode);
      if (caijiUrls.length > 0) {
        platformUrls = caijiUrls;
        console.log('📺 Caiji API搜索结果:', platformUrls);
      }
    }

    // 如果caiji API没有结果，尝试豆瓣页面提取
    if (platformUrls.length === 0 && doubanId) {
      console.log('🔍 尝试从豆瓣页面提取链接...');
      platformUrls = await extractPlatformUrls(doubanId);
      console.log('📝 豆瓣提取结果:', platformUrls);
    }

    // 如果豆瓣ID没有找到链接，使用标题构建测试链接
    if (platformUrls.length === 0 && title) {
      console.log('📺 使用标题构建测试链接...');
      const searchQuery = encodeURIComponent(title);
      
      // 直接使用已知的测试链接
      platformUrls = [
        {
          platform: 'tencent_test',
          url: 'https://v.qq.com/x/cover/mzc00200vkqr54u/u4100l66fas.html', // 测试链接
        },
        {
          platform: 'bilibili_test',
          url: 'https://www.bilibili.com/video/BV1xx411c7mD', // 测试链接
        },
      ];
      console.log('🧪 使用测试链接:', platformUrls);
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