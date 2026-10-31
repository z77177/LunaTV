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

### 1.2 全项目关键安全加固与播放器稳定性升级 (2026-10-31)
- **播放业务体验与内存泄漏防护 (Tier 2)**:
  * 移除 `handleSourceChange` 中误删历史播放记录的逻辑，切源时保留原有历史播放记录，避免新源加载失败或用户对比画质时进度丢失。
  * 换源时当新源集数不足降级时（`targetIndex !== currentEpisodeIndex`），显式将 `isEpisodeChangingRef.current` 设为 `true` 并清空 `resumeTimeRef.current = 0`，防止将旧集的播放时间戳错误应用到新集数。
  * 播放器内部进度条防冲突拖动事件（`mousemove`/`mouseup`）及定时重置 `setInterval` 在 ArtPlayer `destroy` 钩子中完全解除挂载与清除，消除播放页内存泄漏隐患。
  * 修复 `/lite` 页面的原生链接，解决全局唯一的 `@next/next/no-html-link-for-pages` ESLint 编译报错，恢复 0 Errors。
- **核心漏洞防御与鉴权封堵 (Tier 1)**:
  * 中间件 `src/proxy.ts` 移除客户端 Cookie 自声明 `trustedNetwork: true` 放行漏洞；强制基于服务端当前底层客户端真实 IP 进行授信判定，并使用 `ipaddr.js` 实现完整的 IPv4/IPv6 CIDR 标准匹配。
  * 封堵 `/api/server-config` 敏感信任 IP 配置外泄：非内部密钥授权请求禁止读取 `TrustedNetworkConfig`。
  * 修复 Telegram Webhook 劫持与 Host 头注入：完全移除运行时外部请求触发 `autoSetWebhook` 的逻辑，并增加 `TELEGRAM_WEBHOOK_SECRET` 标头校验。
  * 增加全站 SSRF 私网 IP 拦截：在 `src/lib/ssrf.ts` 集中封装 `isSafePublicUrl`，对 `/api/lite-stream`、`/api/image-proxy`、`/api/video-proxy` 进行私网网段与云元数据拦截。
  * 修复登录与注册页面的 Open Redirect 开放重定向漏洞，增加 `getSafeRedirectUrl` 相对路径校验。
  * `/api/cron` 定时任务增加凭据校验，禁止匿名高频请求消耗系统资源。
- **代码收敛与冗余依赖剔除 (Tier 3)**:
  * 统一将散落于 5 处 API 的 `generateSignature`、`verifySignature`、`generateAuthCookie` 收敛至 `src/lib/auth.ts`。
  * 平替并剔除全站仅在直播页使用 1 次的 `@mui/material`、`@emotion/react`、`@emotion/styled`，以及全站 0 引用的 `@vidstack/react`、`vidstack`、`media-icons` 与 `webpack-obfuscator`，大幅降低包体积。

### 1.3 深度鉴权防篡改、数据库加盐哈希与性能稳定性测试闭环 (2026-10-31)
- **会话防篡改与时效强校验**:
  * `src/proxy.ts` 与 `src/app/api/change-password/route.ts` 接入 `verifyAuthSignature`，将会话中的 `username:role:timestamp` 整体作为 HMAC 载荷校验，防止客户端私自修改 cookie 中的 `role` 越权或提权；
  * 中间件增加基于 `authInfo.timestamp` 的过期拦截，彻底杜绝会话重放与超期攻击。
- **修改密码安全性升级**:
  * 前端 [`UserMenu.tsx`](file:///d:/Projects/brooklyntv/src/components/UserMenu.tsx) 修改密码模态框增加“原密码”必填输入，服务端 [`change-password`](file:///d:/Projects/brooklyntv/src/app/api/change-password/route.ts) 强制核验 `await db.verifyUser(username, oldPassword)`，彻底封堵免密修改他人账户风险。
- **数据库加盐哈希与登录平滑自动升级**:
  * [`redis-base.db.ts`](file:///d:/Projects/brooklyntv/src/lib/redis-base.db.ts) 与 [`upstash.db.ts`](file:///d:/Projects/brooklyntv/src/lib/upstash.db.ts) 彻底废除明文密码保存，改用 `sha256:${salt}:${hash}` 强加盐存储；
  * `verifyUser` 与 `verifyUserV2` 兼容加盐哈希、旧纯 SHA-256 及历史明文，在用户正常登录校验通过时异步自动升级为最新加盐哈希落盘；
  * 移除 [`export/route.ts`](file:///d:/Projects/brooklyntv/src/app/api/admin/data_migration/export/route.ts) 中覆盖导出站长明文密码的高危漏洞。
- **Upstash Redis 阻塞与配额熔断消除**:
  * 在 [`upstash.db.ts`](file:///d:/Projects/brooklyntv/src/lib/upstash.db.ts) 封装无阻塞的 `scanKeys`，将全站 10 处 `this.client.keys(...)` 全量平替为分批 `SCAN` 游标检索，防止高并发下数据库线程阻塞与 Upstash API 配额打爆。
- **工程统一与单元测试闭环**:
  * 移除废弃的 `.eslintrc.js`，避免 ESLint 9 报双重配置警告；
  * 新增自动化单元测试：[`auth.test.ts`](file:///d:/Projects/brooklyntv/src/__tests__/auth.test.ts)、[`ssrf.test.ts`](file:///d:/Projects/brooklyntv/src/__tests__/ssrf.test.ts)、[`utils.test.ts`](file:///d:/Projects/brooklyntv/src/__tests__/utils.test.ts)，涵盖签名防篡改、SSRF 私网 IP 防御、Open Redirect 相对路径校验，23 项测试用例全部通过。

### 1.4 全站代理接口 SSRF 全面封堵、网关 RBAC 拦截与 Webhook 安全加固 (2026-10-31)
- **Telegram 登录 Webhook 防劫持**:
  * 移除 [`send-magic-link`](file:///d:/Projects/brooklyntv/src/app/api/telegram/send-magic-link/route.ts) 中任何由客户端未登录请求附带任意 Host 头自动更新 Telegram Webhook 的漏洞逻辑；
  * 为 [`set-webhook`](file:///d:/Projects/brooklyntv/src/app/api/telegram/set-webhook/route.ts) 增加 `ensureAdmin` 强鉴权与 `isSafePublicUrl` 域名安全检验。
- **全站代理与观影室 SSRF 盲打彻底防御**:
  * 为 [`proxy/shortdrama`](file:///d:/Projects/brooklyntv/src/app/api/proxy/shortdrama/route.ts)、[`proxy/cms`](file:///d:/Projects/brooklyntv/src/app/api/proxy/cms/route.ts)、[`proxy/logo`](file:///d:/Projects/brooklyntv/src/app/api/proxy/logo/route.ts)、[`proxy/m3u8`](file:///d:/Projects/brooklyntv/src/app/api/proxy/m3u8/route.ts)、[`proxy/segment`](file:///d:/Projects/brooklyntv/src/app/api/proxy/segment/route.ts)、[`proxy/stream`](file:///d:/Projects/brooklyntv/src/app/api/proxy/stream/route.ts) 全面注入 `isSafePublicUrl` 校验，阻断针对内网与云服务器元数据地址的探测；
  * 为 [`watch-room/test-connection`](file:///d:/Projects/brooklyntv/src/app/api/watch-room/test-connection/route.ts) 与 [`watch-room/stats`](file:///d:/Projects/brooklyntv/src/app/api/watch-room/stats/route.ts) 增加 `ensureAdmin` 校验和 URL 安全过滤。
- **网关层 RBAC 权限控制与 TVBox / OIDC 会话防伪造**:
  * [`src/proxy.ts`](file:///d:/Projects/brooklyntv/src/proxy.ts) 在网关层强行核验角色：访问 `/admin` 或 `/api/admin` 时若非 `admin`/`owner` 角色则直接拒绝放行；
  * 修正 `proxy.ts` 对 TVBox 的前缀排除正则，并在 [`tvbox-config`](file:///d:/Projects/brooklyntv/src/app/api/tvbox-config/route.ts) 中增加 `verifyAuthSignature` 签名验证，封堵专属配置窃取漏洞；
  * [`oidc/callback`](file:///d:/Projects/brooklyntv/src/app/api/auth/oidc/callback/route.ts) 与 [`complete-register`](file:///d:/Projects/brooklyntv/src/app/api/auth/oidc/complete-register/route.ts) 增加 HMAC 签名，杜绝客户端伪造 `oidc_session` 注册会话；
  * [`tvbox/diagnose`](file:///d:/Projects/brooklyntv/src/app/api/tvbox/diagnose/route.ts) 私网判断统一平替为标准的 `isSafeIp`；
  * 单元测试用例扩充至 24 项，100% 通过。

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
