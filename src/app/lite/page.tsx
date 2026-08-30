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
  description: '专为老旧设备与极速播放设计的聚合点播页',
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// 聚合影视条目结构
interface AggregatedGroup {
  key: string;
  title: string;
  poster: string;
  year: string;
  type_name?: string;
  desc?: string;
  sources: {
    source: string;
    source_name: string;
    id: string;
    episodes_count: number;
    episodes: string[];
    episodes_titles: string[];
  }[];
}

export default async function LitePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const source = typeof params.source === 'string' ? params.source : '';
  const id = typeof params.id === 'string' ? params.id : '';
  const ep = typeof params.ep === 'string' ? params.ep : '0';
  const mode = typeof params.mode === 'string' ? params.mode : 'proxy'; // 默认走中继代理，解决跨域与混合内容

  const config = await getConfig();
  const siteName = config.SiteConfig?.SiteName || '布鲁克林影视';
  const apiSites = await getAvailableApiSites('guest');

  let rawSearchResults: SearchResult[] = [];
  let aggregatedList: AggregatedGroup[] = [];
  let detail: SearchResult | null = null;
  let errorMsg = '';

  // 1. 如果有搜索词 q，先执行全网聚合搜索
  if (q) {
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

      rawSearchResults = filtered;

      // 聚合相同片名与年份的条目
      const aggMap = new Map<string, AggregatedGroup>();
      for (const item of rawSearchResults) {
        const cleanTitle = item.title.trim().replace(/\s+/g, '');
        const aggKey = `${cleanTitle}-${item.year || 'unknown'}`;
        const existing = aggMap.get(aggKey);

        const sourceItem = {
          source: item.source,
          source_name: item.source_name || item.source,
          id: item.id,
          episodes_count: item.episodes?.length || 0,
          episodes: item.episodes || [],
          episodes_titles: item.episodes_titles || [],
        };

        if (existing) {
          if (!existing.poster && item.poster) existing.poster = item.poster;
          if (!existing.desc && item.desc) existing.desc = item.desc;
          if (!existing.sources.some((s) => s.source === item.source)) {
            existing.sources.push(sourceItem);
          }
        } else {
          aggMap.set(aggKey, {
            key: aggKey,
            title: item.title,
            poster: item.poster,
            year: item.year || '',
            type_name: item.type_name,
            desc: item.desc,
            sources: [sourceItem],
          });
        }
      }

      aggregatedList = Array.from(aggMap.values());
    } catch (err: any) {
      console.error('Lite 聚合搜索失败:', err);
    }
  }

  // 2. 如果指定了 source 和 id，获取剧集详情并播放
  if (source && id) {
    const currentSite = apiSites.find((s) => s.key === source);

    // 首先尝试在当前搜索聚合缓存中直接匹配（避免重复请求）
    const matchedFromSearch = rawSearchResults.find(
      (r) => r.source === source && r.id === id && r.episodes && r.episodes.length > 0
    );

    if (matchedFromSearch) {
      detail = matchedFromSearch;
    } else if (currentSite) {
      try {
        detail = await getDetailFromApi(currentSite, id);
      } catch (err: any) {
        console.warn(`[Lite] getDetailFromApi 失败 (${source}-${id})，尝试按标题搜索兜底:`, err.message);
        // 如果按 ID 获取失败，尝试按 q 或搜索匹配
        if (q) {
          try {
            const fallbackResults = await searchFromApi(currentSite, q);
            const found = fallbackResults.find((r) => r.id === id || r.title.includes(q));
            if (found && found.episodes.length > 0) {
              detail = found;
            }
          } catch {
            // 搜索兜底也失败
          }
        }
      }
    }

    if (!detail || !detail.episodes || detail.episodes.length === 0) {
      errorMsg = `当前视频源 [${source}] 获取剧集列表为空，请在下方点击切换其他备用播放源。`;
    }
  }

  // 计算当前播放集的各项数据
  const episodes = detail?.episodes || [];
  const episodeTitles = detail?.episodes_titles || [];
  const currentEpIndex = Math.max(
    0,
    Math.min(parseInt(ep, 10) || 0, episodes.length > 0 ? episodes.length - 1 : 0)
  );
  const currentRawUrl = episodes[currentEpIndex] || '';
  const currentEpTitle =
    episodeTitles[currentEpIndex] || (episodes.length > 0 ? `第 ${currentEpIndex + 1} 集` : '');

  // 视频流代理 URL
  const proxiedStreamUrl = currentRawUrl
    ? `/api/lite-stream?url=${encodeURIComponent(currentRawUrl)}`
    : '';
  const activePlayUrl = mode === 'direct' ? currentRawUrl : proxiedStreamUrl;

  // 外部播放器唤醒链接
  const vlcCallbackUrl = currentRawUrl
    ? `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(currentRawUrl)}`
    : '';
  const vlcDirectUrl = currentRawUrl
    ? `vlc://${currentRawUrl.replace(/^https?:\/\//, '')}`
    : '';
  const nplayerUrl = currentRawUrl ? `nplayer-${currentRawUrl}` : '';

  // 寻找当前剧集的所有同名可用源（换源使用）
  const currentAggGroup = detail
    ? aggregatedList.find(
        (g) => g.title.trim().replace(/\s+/g, '') === detail!.title.trim().replace(/\s+/g, '')
      )
    : null;

  // 热门搜索词
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
          /* 换源条 */
          .lite-source-switcher {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin: 8px 0;
            padding: 8px;
            background: #222;
            border-radius: 6px;
          }
          .lite-source-badge {
            display: inline-block;
            padding: 4px 8px;
            background: #2e2e2e;
            border: 1px solid #444;
            border-radius: 4px;
            font-size: 12px;
            color: #ccc;
          }
          .lite-source-badge.active {
            background: #2563eb;
            color: #fff;
            border-color: #3b82f6;
            font-weight: bold;
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
          /* 聚合搜索结果卡片 */
          .lite-agg-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-top: 10px;
          }
          .lite-agg-card {
            background: #1e1e1e;
            border: 1px solid #333;
            border-radius: 8px;
            padding: 12px;
            display: flex;
            gap: 12px;
          }
          .lite-agg-poster {
            width: 90px;
            height: 125px;
            background: #2a2a2a;
            border-radius: 6px;
            object-fit: cover;
            flex-shrink: 0;
          }
          .lite-agg-body {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .lite-agg-title {
            font-size: 16px;
            font-weight: bold;
            color: #fff;
            margin-bottom: 4px;
          }
          .lite-agg-meta {
            font-size: 12px;
            color: #888;
            margin-bottom: 8px;
          }
          .lite-agg-sources-label {
            font-size: 12px;
            color: #aaa;
            margin-bottom: 4px;
          }
          .lite-agg-sources-list {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          }
          .lite-source-btn {
            display: inline-block;
            padding: 4px 8px;
            background: #2b2b2b;
            border: 1px solid #444;
            color: #4da3ff;
            border-radius: 4px;
            font-size: 12px;
          }
          .lite-source-btn:active {
            background: #2563eb;
            color: #fff;
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
              <span className='lite-badge'>Lite 聚合点播</span>
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
              placeholder='输入电影、电视剧、动漫名称搜索（自动聚合多源）...'
              className='lite-search-input'
              autoComplete='off'
            />
            <button type='submit' className='lite-search-btn'>
              搜索
            </button>
          </form>
          <div className='lite-hot-tags'>
            <span>热门推荐：</span>
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
                  暂无有效播放地址，请在下方点击切换其他播放源。
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
                  href={`/lite?source=${encodeURIComponent(source)}&id=${encodeURIComponent(id)}&ep=${ep}&q=${encodeURIComponent(q || detail.title)}&mode=proxy`}
                  className={`lite-mode-btn ${mode !== 'direct' ? 'active' : ''}`}
                >
                  🛡️ 中继流代理 (推荐，防拦截)
                </a>
                <a
                  href={`/lite?source=${encodeURIComponent(source)}&id=${encodeURIComponent(id)}&ep=${ep}&q=${encodeURIComponent(q || detail.title)}&mode=direct`}
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

            {/* 聚合多源换源列表 */}
            {currentAggGroup && currentAggGroup.sources.length > 1 && (
              <div style={{ padding: '0 12px' }}>
                <div className='lite-section-title'>
                  <span>切换播放源（共聚合 {currentAggGroup.sources.length} 个来源）</span>
                </div>
                <div className='lite-source-switcher'>
                  {currentAggGroup.sources.map((s) => (
                    <a
                      key={s.source}
                      href={`/lite?source=${encodeURIComponent(s.source)}&id=${encodeURIComponent(s.id)}&ep=0&q=${encodeURIComponent(q || detail!.title)}&mode=${mode}`}
                      className={`lite-source-badge ${s.source === source ? 'active' : ''}`}
                    >
                      {s.source_name} ({s.episodes_count}集)
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* 选集网格 */}
            {episodes.length > 0 && (
              <div style={{ padding: '0 12px 12px' }}>
                <div className='lite-section-title'>
                  <span>选集播放（共 {episodes.length} 集）</span>
                  <span style={{ fontSize: '12px', color: '#888' }}>
                    当前来源: {detail.source_name || detail.source}
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

        {/* 聚合搜索结果列表 */}
        {aggregatedList.length > 0 && (
          <div>
            <div className='lite-section-title'>
              <span>
                聚合搜索结果（共 {aggregatedList.length} 部影视{q ? `，关键词: "${q}"` : ''}）
              </span>
            </div>
            <div className='lite-agg-list'>
              {aggregatedList.map((group) => {
                const primarySource = group.sources[0];
                return (
                  <div key={group.key} className='lite-agg-card'>
                    {group.poster ? (
                      <img
                        src={group.poster}
                        alt={group.title}
                        className='lite-agg-poster'
                        loading='lazy'
                      />
                    ) : (
                      <div
                        className='lite-agg-poster'
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#666',
                          fontSize: '12px',
                        }}
                      >
                        暂无封面
                      </div>
                    )}
                    <div className='lite-agg-body'>
                      <div>
                        <div className='lite-agg-title'>
                          <a
                            href={`/lite?source=${encodeURIComponent(primarySource.source)}&id=${encodeURIComponent(primarySource.id)}&ep=0&q=${encodeURIComponent(q)}`}
                            style={{ color: '#fff' }}
                          >
                            {group.title}
                          </a>
                        </div>
                        <div className='lite-agg-meta'>
                          <span>{group.year || '未知年份'}</span> ·{' '}
                          <span>{group.type_name || '点播'}</span>
                        </div>
                      </div>

                      <div>
                        <div className='lite-agg-sources-label'>
                          可用播放源（共 {group.sources.length} 个）：
                        </div>
                        <div className='lite-agg-sources-list'>
                          {group.sources.map((s) => (
                            <a
                              key={s.source}
                              href={`/lite?source=${encodeURIComponent(s.source)}&id=${encodeURIComponent(s.id)}&ep=0&q=${encodeURIComponent(q)}`}
                              className='lite-source-btn'
                            >
                              ▶ {s.source_name} ({s.episodes_count}集)
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 如果既没有详情也没有搜索结果 */}
        {!detail && aggregatedList.length === 0 && q && (
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
                <strong>全网智能聚合</strong>：在上方搜索任意电影或电视剧，系统会自动将全网几十个视频源聚合到同一部影片下，免去重复搜索与逐个排查。
              </li>
              <li>
                <strong>一键切换播放源</strong>：若某一路源播放卡顿或失效，在播放器下方点击其他来源标签（如量子、非凡、红牛等）即可秒换源。
              </li>
              <li>
                <strong>原生硬件加速秒播</strong>：默认开启中继流代理，解决跨域与拦截，调用 iPad 独立 GPU 硬解，零发热、不卡顿。
              </li>
              <li>
                <strong>多协议唤醒 VLC / nPlayer</strong>：支持直接点击「VLC 播放 (协议1/2)」或「nPlayer 播放」唤醒 App 全屏播放。
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
