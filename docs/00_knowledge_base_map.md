# 项目全局文档地图 (Knowledge Base Map)

> 本文件是 BrooklynTV (MoonTV) 项目的唯一知识总索引与架构决策真理源泉。

---

## 一、 核心架构与性能优化决策记录

### 1.1 播放页平滑换源与 PC 网页端性能优化 (2026-10-30)
- **换源状态保持（禁止同剧换源强制销毁组件）**:
  * [`PlayPageClientWrapper`](file:///d:/Projects/brooklyntv/src/app/play/page.tsx#L6682) 的 React `key` 仅响应显式的 `_reload` 参数，不再绑定 `source` 与 `id`。同剧切换播放源时复用当前组件实例与内存中的 `availableSources`，通过 ArtPlayer `switchQuality` 原地平滑切换流并保持播放进度。
  * [`handleSourceChange`](file:///d:/Projects/brooklyntv/src/app/play/page.tsx#L3160) 统一使用 `String(...)` 归一化比对 `source` 与 `id`，当内存列表缺失集数时自动调用 `fetchSourceDetail` 异步兜底并同步 `title` 至 URL 参数；若目标源彻底失效且当前已有播放画面，仅弹出播放器提示而不销毁整页状态。
- **PC 网页端主线程减负与防卡顿**:
  * 移除返回顶部按钮的 `requestAnimationFrame` 常驻死循环，统一使用 `{ passive: true }` 的原生 `scroll` 事件监听。
  * `video:timeupdate` 事件对 `currentPlayTime` 和 `videoDuration` 按整秒（`Math.floor`）节流更新，配合 [`EpisodeSelector`](file:///d:/Projects/brooklyntv/src/components/EpisodeSelector.tsx) 的 `React.memo` 包装与稳定引用，彻底消除播放期间每 250ms 触发的顶层巨型组件全量重渲染风暴。
  * 弹幕插件 `beforeVisible` 中的 DOM 查询（`.art-danmuku [data-state="emit"]`）增加 500ms 缓存节流，避免高密度弹幕下逐条触发同步重排。
  * 桌面端测速 `fullSpeedTest` 与换源面板批量测速并发度收敛至 2，支持 1080p 高速源早停；选集分类横向滚轮监听收敛至局部容器 `categoryContainerRef`，解除对全局 `document` 的非被动阻塞。

---

## 二、 项目文档资产索引

- **[项目总览]** [README.md](file:///d:/Projects/brooklyntv/README.md)
  * **职责描述:** 项目核心功能介绍、部署方式与环境变量配置总览。
  * **当前状态:** `[已定档]`
  * **维护者/相关人:** Core Team / AI Agent
- **[AI 功能]** [AI_FEATURES.md](file:///d:/Projects/brooklyntv/AI_FEATURES.md)
  * **职责描述:** AI 影视推荐与智能助手功能的配置与接口说明。
  * **当前状态:** `[已定档]`
  * **维护者/相关人:** Core Team
- **[去广告配置]** [CUSTOM_AD_FILTER.md](file:///d:/Projects/brooklyntv/CUSTOM_AD_FILTER.md)
  * **职责描述:** M3U8 切片广告过滤规则与自定义过滤函数指南。
  * **当前状态:** `[已定档]`
  * **维护者/相关人:** Core Team
- **[离线下载]** [DOWNLOAD_FEATURES.md](file:///d:/Projects/brooklyntv/DOWNLOAD_FEATURES.md)
  * **职责描述:** 视频分片下载、并发控制与本地合并功能说明。
  * **当前状态:** `[已定档]`
  * **维护者/相关人:** Core Team
- **[认证鉴权]** [OIDC_SETUP.md](file:///d:/Projects/brooklyntv/OIDC_SETUP.md)
  * **职责描述:** OIDC 单点登录集成与回调配置文档。
  * **当前状态:** `[已定档]`
  * **维护者/相关人:** Core Team
- **[代理配置]** [PROXY_CONFIG.md](file:///d:/Projects/brooklyntv/PROXY_CONFIG.md)
  * **职责描述:** 视频流与接口代理转发配置指南。
  * **当前状态:** `[已定档]`
  * **维护者/相关人:** Core Team
- **[片头片尾]** [SKIP_CONTROLLER_GUIDE.md](file:///d:/Projects/brooklyntv/SKIP_CONTROLLER_GUIDE.md)
  * **职责描述:** 自动跳过片头片尾及自动连播下一集控制器说明。
  * **当前状态:** `[已定档]`
  * **维护者/相关人:** Core Team
- **[电报登录]** [TELEGRAM_AUTH.md](file:///d:/Projects/brooklyntv/TELEGRAM_AUTH.md)
  * **职责描述:** Telegram 认证登录配置说明。
  * **当前状态:** `[已定档]`
  * **维护者/相关人:** Core Team
- **[信任网络]** [TRUSTED_NETWORK.md](file:///d:/Projects/brooklyntv/TRUSTED_NETWORK.md)
  * **职责描述:** 局域网/授信 IP 免密自动登录配置指南。
  * **当前状态:** `[已定档]`
  * **维护者/相关人:** Core Team
- **[TVBox 集成]** [TVBOX.md](file:///d:/Projects/brooklyntv/TVBOX.md)
  * **职责描述:** TVBox 订阅源输出与客户端接入文档。
  * **当前状态:** `[已定档]`
  * **维护者/相关人:** Core Team
- **[TVBox 安全]** [TVBOX_SECURITY.md](file:///d:/Projects/brooklyntv/TVBOX_SECURITY.md)
  * **职责描述:** TVBox 接口 Token 鉴权与安全防护策略。
  * **当前状态:** `[已定档]`
  * **维护者/相关人:** Core Team
- **[虚拟滚动]** [VIRTUAL_SCROLL_GUIDE.md](file:///d:/Projects/brooklyntv/VIRTUAL_SCROLL_GUIDE.md)
  * **职责描述:** 搜索结果与大列表虚拟滚动性能优化说明。
  * **当前状态:** `[已定档]`
  * **维护者/相关人:** Core Team
- **[观影室部署]** [WATCH_ROOM_DEPLOYMENT.md](file:///d:/Projects/brooklyntv/WATCH_ROOM_DEPLOYMENT.md)
  * **职责描述:** 多人同步观影室服务部署与状态同步机制文档。
  * **当前状态:** `[已定档]`
  * **维护者/相关人:** Core Team
