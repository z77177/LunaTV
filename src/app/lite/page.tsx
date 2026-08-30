/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
import type { Metadata } from 'next';
import Link from 'next/link';

import { getAvailableApiSites, getConfig } from '@/lib/config';
import { generateSearchVariants, getDetailFromApi, searchFromApi } from '@/lib/downstream';
import { SearchResult } from '@/lib/types';
import { cleanHtmlTags } from '@/lib/utils';
import { yellowWords } from '@/lib/yellow';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '极简点播 - 布鲁克林影视 Lite',
  description: '专为老旧设备与极速播放设计的极简点播页',
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LitePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const source = typeof params.source === 'string' ? params.source : '';
  const id = typeof params.id === 'string' ? params.id : '';
  const ep = typeof params.ep === 'string' ? params.ep : '0';
  const mode = typeof params.mode === 'string' ? params.mode : 'proxy'; // 默认走中继代理，解决混合内容与跨域

  const config = await getConfig();
  const siteName = config.SiteConfig?.SiteName || '布鲁克林影视';
  const apiSites = await getAvailableApiSites('guest');

  let searchResults: SearchResult[] = [];
  let detail: SearchResult | null = null;
  let errorMsg = '';

  // 1. 获取剧集详情
  if (source && id) {
    const currentSite = apiSites.find((s) => s.key === source);
    if (currentSite) {
      try {
        detail = await getDetailFromApi(currentSite, id);
      } catch (err: any) {
        console.error('Lite 获取详情失败:', err);
        errorMsg = '获取剧集详情失败，该源可能已失效，请尝试其他来源。';
      }
    } else {
      errorMsg = `未找到视频源 [${source}]，请返回重新搜索。`;
    }
  }

  // 2. 执行服务端搜索
  if (q && (!detail || searchResults.length === 0)) {
    try {
      const searchVariants = generateSearchVariants(q);
      const searchPromises = apiSites.map((site) =>
        Promise.race([
          searchFromApi(site, q, searchVariants),
          new Promise<SearchResult[]>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 10000)
          ),
        ]).catch(() => [] as SearchResult[])
      );

      const settled = await Promise.allSettled(searchPromises);
      const allResults: SearchResult[] = [];
      const seen = new Set<string>();

      for (const res of settled) {
        if (res.status === 'fulfilled' && Array.isArray(res.value)) {
          for (const item of res.value) {
            const key = `${item.source}_${item.id}`;
            if (!seen.has(key)) {
              seen.add(key);
              allResults.push(item);
            }
          }
        }
      }

      let filtered = allResults;
      if (!config.SiteConfig?.DisableYellowFilter) {
        filtered = filtered.filter((item) => {
          const typeName = item.type_name || '';
          return !yellowWords.some((word: string) => typeName.includes(word));
        });
      }

      searchResults = filtered;
    } catch (err: any) {
      console.error('Lite 搜索失败:', err);
    }
  }

  // 处理当前播放集数
  const episodes = detail?.episodes || [];
  const episodeTitles = detail?.episodes_titles || [];
  const currentEpIndex = Math.max(
    0,
    Math.min(parseInt(ep, 10) || 0, episodes.length > 0 ? episodes.length - 1 : 0)
  );
  const currentRawUrl = episodes[currentEpIndex] || '';
  const currentEpTitle =
    episodeTitles[currentEpIndex] || (episodes.length > 0 ? `第 ${currentEpIndex + 1} 集` : '');

  // 计算播放器实际加载的视频流 URL（中继代理 vs 直连）
  const proxiedStreamUrl = currentRawUrl
    ? `/api/lite-stream?url=${encodeURIComponent(currentRawUrl)}`
    : '';
  const activePlayUrl = mode === 'direct' ? currentRawUrl : proxiedStreamUrl;

  // VLC 唤醒链接（支持官方 x-callback 协议与纯域名协议）
  const vlcCallbackUrl = currentRawUrl
    ? `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(currentRawUrl)}`
    : '';
  const vlcDirectUrl = currentRawUrl
    ? `vlc://${currentRawUrl.replace(/^https?:\/\//, '')}`
    : '';
  const nplayerUrl = currentRawUrl ? `nplayer-${currentRawUrl}` : '';

  // 热门搜索关键词
  const hotKeywords = ['庆余年', '柯南', '三体', '繁花', '凡人修仙传', '间谍过家家', '狂飙', '甄嬛传'];

  return (
    <div className='lite-page-root'>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          /* 兼容 iOS 9.3.5 / 老旧 WebKit 引擎的标准 CSS */
          .lite-page-root {
            margin: 0;
            padding: 0;
            background-color: #121212;
            color: #e0e0e0;
            font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
            font-size: 15px;
            line-height: 1.5;
            min-height: 100vh;
            box-sizing: border-box;
          }
          .lite-page-root * { box-sizing: border-box; -webkit-tap-highlight-color: rgba(0,0,0,0); }
          .lite-page-root a { color: #4da3ff; text-decoration: none; }
          .lite-page-root a:active { opacity: 0.7; }
          .lite-container {
            max-width: 900px;
            margin: 0 auto;
            padding: 12px 14px 40px;
          }
          .lite-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: 12px;
            border-bottom: 1px solid #2a2a2a;
            margin-bottom: 14px;
          }
          .lite-logo {
            font-size: 18px;
            font-weight: bold;
            color: #ffffff;
          }
          .lite-badge {
            font-size: 11px;
            background: #2563eb;
            color: #fff;
            padding: 2px 6px;
            border-radius: 4px;
            margin-left: 6px;
            font-weight: normal;
            vertical-align: middle;
          }
          .lite-nav-link {
            font-size: 14px;
            color: #aaa;
            padding: 4px 8px;
            border: 1px solid #333;
            border-radius: 4px;
            background: #1e1e1e;
          }
          /* 搜索表单 */
          .lite-search-box {
            margin-bottom: 16px;
            background: #1e1e1e;
            padding: 10px;
            border-radius: 8px;
            border: 1px solid #333;
          }
          .lite-search-form {
            display: flex;
            gap: 8px;
          }
          .lite-search-input {
            flex: 1;
            height: 40px;
            padding: 0 12px;
            background: #2a2a2a;
            border: 1px solid #444;
            border-radius: 6px;
            color: #fff;
            font-size: 16px;
            outline: none;
          }
          .lite-search-input:focus {
            border-color: #2563eb;
          }
          .lite-search-btn {
            height: 40px;
            padding: 0 18px;
            background: #2563eb;
            color: #fff;
            border: none;
            border-radius: 6px;
            font-size: 15px;
            font-weight: bold;
            cursor: pointer;
          }
          .lite-hot-tags {
            margin-top: 8px;
            font-size: 12px;
            color: #888;
          }
          .lite-tag {
            display: inline-block;
            margin-right: 8px;
            margin-top: 4px;
            padding: 2px 8px;
            background: #282828;
            color: #bbb;
            border-radius: 4px;
          }
          /* 播放器区域 */
          .lite-player-card {
            background: #1a1a1a;
            border-radius: 8px;
            border: 1px solid #333;
            overflow: hidden;
            margin-bottom: 16px;
          }
          .lite-video-wrap {
            position: relative;
            background: #000;
            text-align: center;
            width: 100%;
          }
          .lite-video-wrap video {
            width: 100%;
            max-height: 480px;
            display: block;
            background: #000;
          }
          .lite-player-controls-bar {
            padding: 12px;
            background: #222;
            border-top: 1px solid #333;
          }
          .lite-now-playing {
            font-size: 16px;
            font-weight: bold;
            color: #fff;
            margin-bottom: 8px;
          }
          .lite-mode-switch {
            display: inline-flex;
            gap: 6px;
            margin-bottom: 10px;
            background: #161616;
            padding: 3px;
            border-radius: 6px;
            border: 1px solid #333;
          }
          .lite-mode-btn {
            padding: 3px 8px;
            font-size: 12px;
            border-radius: 4px;
            color: #888;
          }
          .lite-mode-btn.active {
            background: #2563eb;
            color: #fff;
            font-weight: bold;
          }
          .lite-action-buttons {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          .lite-btn {
            display: inline-block;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: bold;
            text-align: center;
            cursor: pointer;
          }
          .lite-btn-vlc {
            background: #ea580c;
            color: #fff !important;
          }
          .lite-btn-nplayer {
            background: #059669;
            color: #fff !important;
          }
          .lite-btn-link {
            background: #333;
            color: #ddd !important;
            border: 1px solid #444;
          }
          .lite-btn-back {
            background: #2563eb;
            color: #fff !important;
          }
          /* 选集网格 */
          .lite-section-title {
            font-size: 15px;
            font-weight: bold;
            color: #fff;
            margin: 14px 0 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .lite-ep-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-bottom: 16px;
          }
          .lite-ep-item {
            display: inline-block;
            min-width: 54px;
            padding: 8px 6px;
            background: #242424;
            border: 1px solid #383838;
            border-radius: 6px;
            text-align: center;
            color: #ddd;
            font-size: 13px;
            text-decoration: none;
          }
          .lite-ep-item.active {
            background: #2563eb;
            color: #fff;
            border-color: #3b82f6;
            font-weight: bold;
          }
          /* 搜索结果列表 */
          .lite-results-list {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 10px;
          }
          .lite-result-card {
            width: calc(25% - 9px);
            min-width: 120px;
            background: #1e1e1e;
            border: 1px solid #333;
            border-radius: 8px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            text-decoration: none;
          }
          @media (max-width: 600px) {
            .lite-result-card {
              width: calc(50% - 6px);
            }
          }
          .lite-poster-wrap {
            width: 100%;
            padding-top: 140%;
            position: relative;
            background: #2a2a2a;
          }
          .lite-poster-img {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .lite-card-info {
            padding: 8px;
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .lite-card-title {
            font-size: 13px;
            font-weight: bold;
            color: #fff;
            margin-bottom: 4px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .lite-card-meta {
            font-size: 11px;
            color: #888;
          }
          .lite-card-source {
            display: inline-block;
            background: #333;
            color: #aaa;
            padding: 1px 4px;
            border-radius: 3px;
            font-size: 10px;
            margin-top: 4px;
          }
          /* 详情与简介 */
          .lite-detail-desc {
            background: #1a1a1a;
            border: 1px solid #2a2a2a;
            padding: 12px;
            border-radius: 8px;
            font-size: 13px;
            color: #aaa;
            margin-bottom: 16px;
          }
          .lite-tips-box {
            background: #1c2438;
            border: 1px solid #2563eb;
            padding: 12px;
            border-radius: 8px;
            font-size: 13px;
            color: #93c5fd;
            margin-top: 16px;
          }
          .lite-tips-box strong { color: #fff; }
          .lite-error-box {
            background: #451a1a;
            border: 1px solid #dc2626;
            padding: 12px;
            border-radius: 8px;
            color: #fca5a5;
            margin-bottom: 14px;
          }
        `,
        }}
      />
      <div className='lite-container'>
        {/* 顶部导航 */}
        <div className='lite-header'>
          <div className='lite-logo'>
            <Link href='/lite' style={{ color: '#ffffff' }}>
              🌕 {siteName}
              <span className='lite-badge'>Lite 极简版</span>
            </Link>
          </div>
          <div>
            <a href='/' className='lite-nav-link' title='返回完整版主站'>
              🖥️ 完整版
            </a>
          </div>
        </div>

        {/* 搜索框 (纯原生 GET 表单，0 JS 依赖) */}
        <div className='lite-search-box'>
          <form method='GET' action='/lite' className='lite-search-form'>
            <input
              type='text'
              name='q'
              defaultValue={q}
              placeholder='输入电影、电视剧、动漫名称搜索...'
              className='lite-search-input'
              autoComplete='off'
            />
            <button type='submit' className='lite-search-btn'>
              搜索
            </button>
          </form>
          <div className='lite-hot-tags'>
            <span>大家都在搜：</span>
            {hotKeywords.map((kw) => (
              <a key={kw} href={`/lite?q=${encodeURIComponent(kw)}`} className='lite-tag'>
                {kw}
              </a>
            ))}
          </div>
        </div>

        {/* 错误提示 */}
        {errorMsg && <div className='lite-error-box'>{errorMsg}</div>}

        {/* 详情与播放区 */}
        {detail && (
          <div className='lite-player-card'>
            {/* 原生视频播放器 */}
            <div className='lite-video-wrap'>
              {activePlayUrl ? (
                <video
                  controls
                  playsInline
                  preload='auto'
                  src={activePlayUrl}
                  poster={detail.poster}
                  key={activePlayUrl}
                >
                  <p style={{ color: '#fff', padding: '20px' }}>
                    您的浏览器不支持原生 HTML5 视频播放，请点击下方「在 VLC 中播放」。
                  </p>
                </video>
              ) : (
                <div style={{ padding: '40px 20px', color: '#888' }}>
                  暂无有效播放地址，请尝试切换其他播放源。
                </div>
              )}
            </div>

            {/* 播放控制与快捷功能 */}
            <div className='lite-player-controls-bar'>
              <div className='lite-now-playing'>
                {detail.title} - <span style={{ color: '#4da3ff' }}>{currentEpTitle}</span>
              </div>

              {/* 播放模式切换 (中继代理 vs 原画直连) */}
              <div className='lite-mode-switch'>
                <a
                  href={`/lite?source=${encodeURIComponent(source)}&id=${encodeURIComponent(id)}&ep=${ep}&q=${encodeURIComponent(q)}&mode=proxy`}
                  className={`lite-mode-btn ${mode !== 'direct' ? 'active' : ''}`}
                >
                  🛡️ 中继流代理 (推荐，防拦截)
                </a>
                <a
                  href={`/lite?source=${encodeURIComponent(source)}&id=${encodeURIComponent(id)}&ep=${ep}&q=${encodeURIComponent(q)}&mode=direct`}
                  className={`lite-mode-btn ${mode === 'direct' ? 'active' : ''}`}
                >
                  ⚡ 原画直连 (直连视频源)
                </a>
              </div>

              <div className='lite-action-buttons'>
                {currentRawUrl && (
                  <>
                    <a href={vlcCallbackUrl} className='lite-btn lite-btn-vlc'>
                      🚀 VLC 播放 (协议1)
                    </a>
                    <a href={vlcDirectUrl} className='lite-btn lite-btn-vlc'>
                      🚀 VLC 播放 (协议2)
                    </a>
                    <a href={nplayerUrl} className='lite-btn lite-btn-nplayer'>
                      📱 nPlayer 播放
                    </a>
                    <a
                      href={currentRawUrl}
                      target='_blank'
                      rel='noreferrer'
                      className='lite-btn lite-btn-link'
                    >
                      🔗 M3U8 直链
                    </a>
                  </>
                )}
                {q && (
                  <a href={`/lite?q=${encodeURIComponent(q)}`} className='lite-btn lite-btn-back'>
                    ↩ 返回搜索列表
                  </a>
                )}
              </div>
            </div>

            {/* 选集网格 */}
            {episodes.length > 0 && (
              <div style={{ padding: '0 12px 12px' }}>
                <div className='lite-section-title'>
                  <span>选集播放（共 {episodes.length} 集）</span>
                  <span style={{ fontSize: '12px', color: '#888' }}>
                    来源: {detail.source_name || detail.source}
                  </span>
                </div>
                <div className='lite-ep-grid'>
                  {episodes.map((_, i) => (
                    <a
                      key={i}
                      href={`/lite?source=${encodeURIComponent(source)}&id=${encodeURIComponent(id)}&ep=${i}&q=${encodeURIComponent(q || detail?.title || '')}&mode=${mode}`}
                      className={`lite-ep-item ${i === currentEpIndex ? 'active' : ''}`}
                    >
                      {episodeTitles[i] || `${i + 1}`}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* 影片简介 */}
            {detail.desc && (
              <div style={{ padding: '0 12px 12px' }}>
                <div className='lite-detail-desc'>
                  <div style={{ fontWeight: 'bold', color: '#fff', marginBottom: '4px' }}>
                    剧情简介：
                  </div>
                  {cleanHtmlTags(detail.desc)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 搜索结果列表 */}
        {searchResults.length > 0 && (
          <div>
            <div className='lite-section-title'>
              <span>
                搜索结果（共 {searchResults.length} 条{q ? `，关键词: "${q}"` : ''}）
              </span>
            </div>
            <div className='lite-results-list'>
              {searchResults.map((item) => (
                <a
                  key={`${item.source}_${item.id}`}
                  href={`/lite?source=${encodeURIComponent(item.source)}&id=${encodeURIComponent(item.id)}&ep=0&q=${encodeURIComponent(q)}`}
                  className='lite-result-card'
                >
                  <div className='lite-poster-wrap'>
                    {item.poster ? (
                      <img
                        src={item.poster}
                        alt={item.title}
                        className='lite-poster-img'
                        loading='lazy'
                      />
                    ) : (
                      <div
                        style={{
                          position: 'absolute',
                          top: '40%',
                          width: '100%',
                          textAlign: 'center',
                          color: '#666',
                          fontSize: '12px',
                        }}
                      >
                        暂无封面
                      </div>
                    )}
                  </div>
                  <div className='lite-card-info'>
                    <div className='lite-card-title' title={item.title}>
                      {item.title}
                    </div>
                    <div className='lite-card-meta'>
                      <span>{item.year || item.type_name || '点播'}</span>
                      <div>
                        <span className='lite-card-source'>{item.source_name || item.source}</span>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 如果既没有详情也没有搜索结果 */}
        {!detail && searchResults.length === 0 && q && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
            未找到与 &quot;{q}&quot; 相关的影视资源，请尝试缩短或更换搜索关键词。
          </div>
        )}

        {/* 老旧设备使用说明指南 */}
        {!detail && !q && (
          <div className='lite-tips-box'>
            <strong>💡 老旧设备（iPad / 旧平板 / 电视）观影指南：</strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: '20px', lineHeight: '1.7' }}>
              <li>
                <strong>原生硬件加速秒播</strong>：在上方搜索任意电影或电视剧，点击剧集即可直接在
                Safari 中通过原生播放器全屏观看（默认开启中继代理，解决跨域与拦截，零发热、不卡顿）。
              </li>
              <li>
                <strong>多协议唤醒 VLC / nPlayer</strong>：支持直接点击「VLC 播放 (协议1/2)」或「nPlayer 播放」唤醒 App 全屏播放。
              </li>
              <li>
                <strong>收藏本页</strong>：建议在 Safari 中点击分享按钮，选择「添加到主屏幕」，老 iPad 桌面就会生成独立点播图标。
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
