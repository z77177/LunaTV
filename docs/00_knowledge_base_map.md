# 项目全局文档地图 (Knowledge Base Map)

> 本文件是 BrooklynTV (MoonTV) 项目的唯一知识总索引与架构决策真理源泉。

---

## 一、 核心架构与性能优化决策记录

### 1.1 播放页平滑换源与 PC 网页端性能优化 (2026-10-30)

- **换源状态保持（禁止同剧换源强制销毁组件）**:
  - [`PlayPageClientWrapper`](file:///d:/Projects/brooklyntv/src/app/play/page.tsx#L6682) 的 React `key` 仅响应显式的 `_reload` 参数，不再绑定 `source` 与 `id`。同剧切换播放源时复用当前组件实例与内存中的 `availableSources`，通过 ArtPlayer `switchQuality` 原地平滑切换流并保持播放进度。
  - [`handleSourceChange`](file:///d:/Projects/brooklyntv/src/app/play/page.tsx#L3160) 统一使用 `String(...)` 归一化比对 `source` 与 `id`，当内存列表缺失集数时自动调用 `fetchSourceDetail` 异步兜底并同步 `title` 至 URL 参数；若目标源彻底失效且当前已有播放画面，仅弹出播放器提示而不销毁整页状态。
- **PC 网页端主线程减负与防卡顿**:
  - 移除返回顶部按钮的 `requestAnimationFrame` 常驻死循环，统一使用 `{ passive: true }` 的原生 `scroll` 事件监听。
  - `video:timeupdate` 事件对 `currentPlayTime` 和 `videoDuration` 按整秒（`Math.floor`）节流更新，配合 [`EpisodeSelector`](file:///d:/Projects/brooklyntv/src/components/EpisodeSelector.tsx) 的 `React.memo` 包装与稳定引用，彻底消除播放期间每 250ms 触发的顶层巨型组件全量重渲染风暴。
  - 弹幕插件 `beforeVisible` 中的 DOM 查询（`.art-danmuku [data-state="emit"]`）增加 500ms 缓存节流，避免高密度弹幕下逐条触发同步重排。
  - 桌面端测速 `fullSpeedTest` 与换源面板批量测速并发度收敛至 2，支持 1080p 高速源早停；选集分类横向滚轮监听收敛至局部容器 `categoryContainerRef`，解除对全局 `document` 的非被动阻塞。

### 1.2 全项目关键安全加固与播放器稳定性升级 (2026-10-31)

- **播放业务体验与内存泄漏防护 (Tier 2)**:
  - 移除 `handleSourceChange` 中误删历史播放记录的逻辑，切源时保留原有历史播放记录，避免新源加载失败或用户对比画质时进度丢失。
  - 换源时当新源集数不足降级时（`targetIndex !== currentEpisodeIndex`），显式将 `isEpisodeChangingRef.current` 设为 `true` 并清空 `resumeTimeRef.current = 0`，防止将旧集的播放时间戳错误应用到新集数。
  - 播放器内部进度条防冲突拖动事件（`mousemove`/`mouseup`）及定时重置 `setInterval` 在 ArtPlayer `destroy` 钩子中完全解除挂载与清除，消除播放页内存泄漏隐患。
  - 修复 `/lite` 页面的原生链接，解决全局唯一的 `@next/next/no-html-link-for-pages` ESLint 编译报错，恢复 0 Errors。
- **核心漏洞防御与鉴权封堵 (Tier 1)**:
  - 中间件 `src/proxy.ts` 移除客户端 Cookie 自声明 `trustedNetwork: true` 放行漏洞；强制基于服务端当前底层客户端真实 IP 进行授信判定，并使用 `ipaddr.js` 实现完整的 IPv4/IPv6 CIDR 标准匹配。
  - 封堵 `/api/server-config` 敏感信任 IP 配置外泄：非内部密钥授权请求禁止读取 `TrustedNetworkConfig`。
  - 修复 Telegram Webhook 劫持与 Host 头注入：完全移除运行时外部请求触发 `autoSetWebhook` 的逻辑，并增加 `TELEGRAM_WEBHOOK_SECRET` 标头校验。
  - 增加全站 SSRF 私网 IP 拦截：在 `src/lib/ssrf.ts` 集中封装 `isSafePublicUrl`，对 `/api/lite-stream`、`/api/image-proxy`、`/api/video-proxy` 进行私网网段与云元数据拦截。
  - 修复登录与注册页面的 Open Redirect 开放重定向漏洞，增加 `getSafeRedirectUrl` 相对路径校验。
  - `/api/cron` 定时任务增加凭据校验，禁止匿名高频请求消耗系统资源。
- **代码收敛与冗余依赖剔除 (Tier 3)**:
  - 统一将散落于 5 处 API 的 `generateSignature`、`verifySignature`、`generateAuthCookie` 收敛至 `src/lib/auth.ts`。
  - 平替并剔除全站仅在直播页使用 1 次的 `@mui/material`、`@emotion/react`、`@emotion/styled`，以及全站 0 引用的 `@vidstack/react`、`vidstack`、`media-icons` 与 `webpack-obfuscator`，大幅降低包体积。

### 1.3 深度鉴权防篡改、数据库加盐哈希与性能稳定性测试闭环 (2026-10-31)

- **会话防篡改与时效强校验**:
  - `src/proxy.ts` 与 `src/app/api/change-password/route.ts` 接入 `verifyAuthSignature`，将会话中的 `username:role:timestamp` 整体作为 HMAC 载荷校验，防止客户端私自修改 cookie 中的 `role` 越权或提权；
  - 中间件增加基于 `authInfo.timestamp` 的过期拦截，彻底杜绝会话重放与超期攻击。
- **修改密码安全性升级**:
  - 前端 [`UserMenu.tsx`](file:///d:/Projects/brooklyntv/src/components/UserMenu.tsx) 修改密码模态框增加“原密码”必填输入，服务端 [`change-password`](file:///d:/Projects/brooklyntv/src/app/api/change-password/route.ts) 强制核验 `await db.verifyUser(username, oldPassword)`，彻底封堵免密修改他人账户风险。
- **数据库加盐哈希与登录平滑自动升级**:
  - [`redis-base.db.ts`](file:///d:/Projects/brooklyntv/src/lib/redis-base.db.ts) 与 [`upstash.db.ts`](file:///d:/Projects/brooklyntv/src/lib/upstash.db.ts) 彻底废除明文密码保存，改用 `sha256:${salt}:${hash}` 强加盐存储；
  - `verifyUser` 与 `verifyUserV2` 兼容加盐哈希、旧纯 SHA-256 及历史明文，在用户正常登录校验通过时异步自动升级为最新加盐哈希落盘；
  - 移除 [`export/route.ts`](file:///d:/Projects/brooklyntv/src/app/api/admin/data_migration/export/route.ts) 中覆盖导出站长明文密码的高危漏洞。
- **Upstash Redis 阻塞与配额熔断消除**:
  - 在 [`upstash.db.ts`](file:///d:/Projects/brooklyntv/src/lib/upstash.db.ts) 封装无阻塞的 `scanKeys`，将全站 10 处 `this.client.keys(...)` 全量平替为分批 `SCAN` 游标检索，防止高并发下数据库线程阻塞与 Upstash API 配额打爆。
- **工程统一与单元测试闭环**:
  - 移除废弃的 `.eslintrc.js`，避免 ESLint 9 报双重配置警告；
  - 新增自动化单元测试：[`auth.test.ts`](file:///d:/Projects/brooklyntv/src/__tests__/auth.test.ts)、[`ssrf.test.ts`](file:///d:/Projects/brooklyntv/src/__tests__/ssrf.test.ts)、[`utils.test.ts`](file:///d:/Projects/brooklyntv/src/__tests__/utils.test.ts)，涵盖签名防篡改、SSRF 私网 IP 防御、Open Redirect 相对路径校验，23 项测试用例全部通过。

### 1.4 全站代理接口 SSRF 全面封堵、网关 RBAC 拦截与 Webhook 安全加固 (2026-10-31)

- **Telegram 登录 Webhook 防劫持**:
  - 移除 [`send-magic-link`](file:///d:/Projects/brooklyntv/src/app/api/telegram/send-magic-link/route.ts) 中任何由客户端未登录请求附带任意 Host 头自动更新 Telegram Webhook 的漏洞逻辑；
  - 为 [`set-webhook`](file:///d:/Projects/brooklyntv/src/app/api/telegram/set-webhook/route.ts) 增加 `ensureAdmin` 强鉴权与 `isSafePublicUrl` 域名安全检验。
- **全站代理与观影室 SSRF 盲打彻底防御**:
  - 为 [`proxy/shortdrama`](file:///d:/Projects/brooklyntv/src/app/api/proxy/shortdrama/route.ts)、[`proxy/cms`](file:///d:/Projects/brooklyntv/src/app/api/proxy/cms/route.ts)、[`proxy/logo`](file:///d:/Projects/brooklyntv/src/app/api/proxy/logo/route.ts)、[`proxy/m3u8`](file:///d:/Projects/brooklyntv/src/app/api/proxy/m3u8/route.ts)、[`proxy/segment`](file:///d:/Projects/brooklyntv/src/app/api/proxy/segment/route.ts)、[`proxy/stream`](file:///d:/Projects/brooklyntv/src/app/api/proxy/stream/route.ts) 全面注入 `isSafePublicUrl` 校验，阻断针对内网与云服务器元数据地址的探测；
  - 为 [`watch-room/test-connection`](file:///d:/Projects/brooklyntv/src/app/api/watch-room/test-connection/route.ts) 与 [`watch-room/stats`](file:///d:/Projects/brooklyntv/src/app/api/watch-room/stats/route.ts) 增加 `ensureAdmin` 校验和 URL 安全过滤。
- **网关层 RBAC 权限控制与 TVBox / OIDC 会话防伪造**:
  - [`src/proxy.ts`](file:///d:/Projects/brooklyntv/src/proxy.ts) 在网关层强行核验角色：访问 `/admin` 或 `/api/admin` 时若非 `admin`/`owner` 角色则直接拒绝放行；
  - 修正 `proxy.ts` 对 TVBox 的前缀排除正则，并在 [`tvbox-config`](file:///d:/Projects/brooklyntv/src/app/api/tvbox-config/route.ts) 中增加 `verifyAuthSignature` 签名验证，封堵专属配置窃取漏洞；
  - [`oidc/callback`](file:///d:/Projects/brooklyntv/src/app/api/auth/oidc/callback/route.ts) 与 [`complete-register`](file:///d:/Projects/brooklyntv/src/app/api/auth/oidc/complete-register/route.ts) 增加 HMAC 签名，杜绝客户端伪造 `oidc_session` 注册会话；
  - [`tvbox/diagnose`](file:///d:/Projects/brooklyntv/src/app/api/tvbox/diagnose/route.ts) 私网判断统一平替为标准的 `isSafeIp`；
  - 单元测试用例扩充至 24 项，100% 通过。

### 1.5 第二轮全量深度审计：流缓冲 OOM 消除、Telegram/网关鉴权加固、SSRF IPv6 防御与前端风暴治理 (2026-10-31)

- **消除全局 Fetch 拦截器全量缓冲 OOM 与敏感凭据泄漏**:
  - [`fetch-interceptor.ts`](file:///d:/Projects/brooklyntv/src/lib/fetch-interceptor.ts) 与 [`external-traffic-monitor.ts`](file:///d:/Projects/brooklyntv/src/lib/external-traffic-monitor.ts) 移除 `await response.clone().text()` 全量内存缓冲，改用读取 `content-length` 响应头，并增加 `isInterceptorInitialized` 幂等锁与敏感 Query 参数（`api_key`、`token`、`secret` 等）脱敏。
- **Telegram 魔法链接未授权登录绕过与旧版签名越权提权封堵**:
  - [`telegram-tokens.ts`](file:///d:/Projects/brooklyntv/src/lib/telegram-tokens.ts)、[`send-magic-link`](file:///d:/Projects/brooklyntv/src/app/api/telegram/send-magic-link/route.ts)、[`webhook`](file:///d:/Projects/brooklyntv/src/app/api/telegram/webhook/route.ts) 与 [`verify`](file:///d:/Projects/brooklyntv/src/app/api/telegram/verify/route.ts) 强制要求 `verified: true` 且核验点击 `/start` 的用户与申请用户名一致，校验封禁状态并签发完整 `username:role:timestamp` 签名；
  - [`auth.ts`](file:///d:/Projects/brooklyntv/src/lib/auth.ts) 限制旧版仅签名用户名的兜底逻辑仅允许 `role === 'user'`，阻断篡改 `role: 'owner'` 提权。
- **网关中间件 `/adult/` 绕过、后台鉴权伪造与暴露路由收口**:
  - [`admin-auth.ts`](file:///d:/Projects/brooklyntv/src/lib/admin-auth.ts) 增加 HMAC 签名与有效期核验；[`src/proxy.ts`](file:///d:/Projects/brooklyntv/src/proxy.ts) 修复 `/adult/` 重写提前返回导致的 `/adult/admin` 绕过与 Rewrite 丢失、收紧 `api/cron` 正则并移除 `api/watch-room/` 豁免；[`watch-room/config`](file:///d:/Projects/brooklyntv/src/app/api/watch-room/config/route.ts) 增加会话校验。
- **SSRF IPv6 方括号绕过修复、Spider JAR 缓存投毒防御与 7 处盲区补齐**:
  - [`ssrf.ts`](file:///d:/Projects/brooklyntv/src/lib/ssrf.ts) 剥离 IPv6 方括号 `[::1]` 与末尾点号 `localhost.`；[`spiderJar.ts`](file:///d:/Projects/brooklyntv/src/lib/spiderJar.ts) 增加 SSRF 校验并禁止 `customUrl` 污染全局缓存；补齐 [`proxy/key`](file:///d:/Projects/brooklyntv/src/app/api/proxy/key/route.ts)、[`video-proxy`](file:///d:/Projects/brooklyntv/src/app/api/video-proxy/route.ts) `HEAD`、[`tvbox/health`](file:///d:/Projects/brooklyntv/src/app/api/tvbox/health/route.ts)、[`live/precheck`](file:///d:/Projects/brooklyntv/src/app/api/live/precheck/route.ts)、[`oidc-discover`](file:///d:/Projects/brooklyntv/src/app/api/admin/oidc-discover/route.ts)、[`config_subscription/fetch`](file:///d:/Projects/brooklyntv/src/app/api/admin/config_subscription/fetch/route.ts)、[`ai-recommend/test`](file:///d:/Projects/brooklyntv/src/app/api/admin/ai-recommend/test/route.ts) 的 SSRF 与管理员鉴权。
- **数据库/缓存层 Bug 与后台 RBAC 漏洞修复**:
  - 修复 [`redis-base.db.ts`](file:///d:/Projects/brooklyntv/src/lib/redis-base.db.ts) 空对象真值判断、[`upstash.db.ts`](file:///d:/Projects/brooklyntv/src/lib/upstash.db.ts) `mget(...keys)` 展开参数与 `deleteUser` OIDC 映射清理顺序、[`database-cache.ts`](file:///d:/Projects/brooklyntv/src/lib/database-cache.ts) `scanKeys` 替代 `keys`、[`api/cache`](file:///d:/Projects/brooklyntv/src/app/api/cache/route.ts) 与 [`skipconfigs`](file:///d:/Projects/brooklyntv/src/app/api/skipconfigs/route.ts) 越权读写；
  - 修复 [`admin/user`](file:///d:/Projects/brooklyntv/src/app/api/admin/user/route.ts)、[`user-tvbox-token`](file:///d:/Projects/brooklyntv/src/app/api/admin/user-tvbox-token/route.ts)、[`shortdrama`](file:///d:/Projects/brooklyntv/src/app/api/admin/shortdrama/route.ts)、[`danmu-api`](file:///d:/Projects/brooklyntv/src/app/api/admin/danmu-api/route.ts)、[`source/validate`](file:///d:/Projects/brooklyntv/src/app/api/admin/source/validate/route.ts)、[`tvbox/search`](file:///d:/Projects/brooklyntv/src/app/api/tvbox/search/route.ts) 及 [`start.js`](file:///d:/Projects/brooklyntv/start.js) 稳定性问题。
- **前端 `<VideoCard>` N+1 大模型风暴消除、XSS 与観影室/直播页修复**:
  - [`VideoCard.tsx`](file:///d:/Projects/brooklyntv/src/components/VideoCard.tsx) 模块级共享 AI 可用性探测 Promise 并包裹 `startTransition`，[`ai-recommend`](file:///d:/Projects/brooklyntv/src/app/api/ai-recommend/route.ts) 对 `ping` 请求零 Token 快速响应；
  - 修复 [`layout.tsx`](file:///d:/Projects/brooklyntv/src/app/layout.tsx) JSON 注入与 [`live/page.tsx`](file:///d:/Projects/brooklyntv/src/app/live/page.tsx) 搜索高亮 XSS、[`ImmersivePlayerOverlay.tsx`](file:///d:/Projects/brooklyntv/src/components/ImmersivePlayerOverlay.tsx) 全屏右侧遮挡、[`SkipController.tsx`](file:///d:/Projects/brooklyntv/src/components/SkipController.tsx) SSR 报错与 0 秒片头、[`useWatchRoom.ts`](file:///d:/Projects/brooklyntv/src/hooks/useWatchRoom.ts) / [`useVoiceChat.ts`](file:///d:/Projects/brooklyntv/src/hooks/useVoiceChat.ts) 语音与房主判定、以及 [`shortdrama`](file:///d:/Projects/brooklyntv/src/app/shortdrama/page.tsx) / [`search`](file:///d:/Projects/brooklyntv/src/app/search/page.tsx) / [`douban`](file:///d:/Projects/brooklyntv/src/app/douban/page.tsx) 的 60fps `rAF` 空转循环。

### 1.6 第三轮全量深度审计：配置重置封堵、HMAC 信任会话签名、SSRF 302 重定向校验、离线下载状态机与并发防雪崩 (2026-10-31)

- **配置自检用户权限重置与信任网络免密签名绕过封堵 (Tier 1 P0)**:
  - [`src/lib/config.ts`](file:///d:/Projects/brooklyntv/src/lib/config.ts): 在 `configSelfCheck()` 迁移与合并配置时，严格保留原有 V1 用户密码与角色字段（`existingUserConfig?.role`、`existingUserConfig?.banned`、`existingUserConfig?.showAdultContent`），杜绝服务重启或配置加载时用户角色被静默降级或解封；为环境变量 `process.env.USERNAME` 增加非空有效校验。
  - [`src/lib/admin-auth.ts`](file:///d:/Projects/brooklyntv/src/lib/admin-auth.ts) & [`src/proxy.ts`](file:///d:/Projects/brooklyntv/src/proxy.ts) & [`src/app/api/watch-room/config/route.ts`](file:///d:/Projects/brooklyntv/src/app/api/watch-room/config/route.ts): 彻底移除对客户端 `authInfo.trustedNetwork === true` 的无条件验签放行逻辑，在服务端统一为其生成带真实 HMAC 签名的信任网络会话 Token，杜绝客户端通过伪造 `trustedNetwork: true` 伪造管理员权限。
- **服务端 SSRF 302 重定向链多跳拦截与 8 处盲区全量接入 (Tier 1 P0)**:
  - [`src/lib/ssrf.ts`](file:///d:/Projects/brooklyntv/src/lib/ssrf.ts): 实现并导出服务端安全请求包装器 `safeFetch`，强制采用 `redirect: 'manual'` 对每一跳 301/302/303/307/308 重定向目标 URL 进行 `isSafePublicUrl` 校验，彻底阻断利用外网 302 跨协议或跳向 127.0.0.1/私网的 SSRF 绕过；
  - 全量接入 `safeFetch` 与 `isSafePublicUrl` 校验：[`src/lib/spiderJar.ts`](file:///d:/Projects/brooklyntv/src/lib/spiderJar.ts)、[`src/lib/live.ts`](file:///d:/Projects/brooklyntv/src/lib/live.ts)（包含直播订阅 URL、TVBox 配置解析与 `epgCache` 限制 20 条防内存溢出）、[`live/merged`](file:///d:/Projects/brooklyntv/src/app/api/live/merged/route.ts)、[`live/epg-debug`](file:///d:/Projects/brooklyntv/src/app/api/live/epg-debug/route.ts)、[`admin/live`](file:///d:/Projects/brooklyntv/src/app/api/admin/live/route.ts)、[`admin/danmu-api`](file:///d:/Projects/brooklyntv/src/app/api/admin/danmu-api/route.ts)、[`danmu-external`](file:///d:/Projects/brooklyntv/src/app/api/danmu-external/route.ts)、[`shortdrama/episode-count`](file:///d:/Projects/brooklyntv/src/app/api/shortdrama/episode-count/route.ts)、[`ai-recommend`](file:///d:/Projects/brooklyntv/src/app/api/ai-recommend/route.ts)、[`netdisk/search`](file:///d:/Projects/brooklyntv/src/app/api/netdisk/search/route.ts)、[`proxy-status`](file:///d:/Projects/brooklyntv/src/app/api/proxy-status/route.ts)（对普通用户脱敏底层代理真实 URL）、以及 [`admin/oidc-discover`](file:///d:/Projects/brooklyntv/src/app/api/admin/oidc-discover/route.ts)（严格校验 URL 协议并阻断参数拼接注入）。
- **离线下载并发任务丢失、闭包陈旧与 AES 解密越界修复 (Tier 1 P0)**:
  - [`DownloadContext.tsx`](file:///d:/Projects/brooklyntv/src/contexts/DownloadContext.tsx): 通过 `tasksRef` 保持任务状态同步，`startTask(taskId, newTask)` 消除添加新任务时的 React 闭包陈旧导致任务无法启动的严重缺陷；组件卸载时自动 abort 活跃下载请求；存在失败分片时标记为 `pause` 状态防误判完成；
  - [`m3u8-downloader.ts`](file:///d:/Projects/brooklyntv/src/lib/download/m3u8-downloader.ts): 重试时保留已成功分片；修复大写 `0X` 校验与 16 字节默认全零 IV；AES 解密增加 `Math.max(0, sigBytes)` 防越界负值；
  - [`stream-saver.ts`](file:///d:/Projects/brooklyntv/src/lib/download/stream-saver.ts): 增加 `typeof window !== 'undefined'` SSR 环境守卫，关闭时安全调用 `URL.revokeObjectURL` 并释放切片内存。
- **数据库/缓存架构健壮性与管理端脱敏防御 (Tier 2 P1)**:
  - [`db.client.ts`](file:///d:/Projects/brooklyntv/src/lib/db.client.ts) & [`client-cache.ts`](file:///d:/Projects/brooklyntv/src/lib/client-cache.ts): 在 `clearUserCache` 时同步清理内存缓存；服务端运行环境下动态直连数据库，彻底解决 TMDB 缓存调用报错；
  - [`cache/route.ts`](file:///d:/Projects/brooklyntv/src/app/api/cache/route.ts): 增加鉴权校验、禁止游客写入并在删除时限定用户身份前缀，限制最长 TTL 为 30 天；
  - [`redis-base.db.ts`](file:///d:/Projects/brooklyntv/src/lib/redis-base.db.ts) & [`upstash.db.ts`](file:///d:/Projects/brooklyntv/src/lib/upstash.db.ts): 将 `multi()` 流水线创建移入 `withRetry` 重试回调内防重试失效，更新 V2 密码时同步清理残留的 V1 明文 `pwd` 字段；`upstash.db.ts` 实现分批 `pipeline().hgetall()` 提取批量用户信息；
  - [`db.ts`](file:///d:/Projects/brooklyntv/src/lib/db.ts): 为 `storage` 增加全量防御性空值检查；
  - [`video-cache.ts`](file:///d:/Projects/brooklyntv/src/lib/video-cache.ts): 异步初始化并等待 Kvrocks 连接，过滤缓存文件路径中的非法字符；
  - [`admin/config`](file:///d:/Projects/brooklyntv/src/app/api/admin/config/route.ts): 对非站长管理员脱敏屏蔽 `botToken`、`clientSecret`、`apiKey` 等关键凭据；
  - [`data_migration/import`](file:///d:/Projects/brooklyntv/src/app/api/admin/data_migration/import/route.ts) & [`export`](file:///d:/Projects/brooklyntv/src/app/api/admin/data_migration/export/route.ts): 严格要求 `owner` 超管权限，设置解压最大 100MB 缓冲区防止 ZipBomb，校验有效性后再执行清库；
  - [`admin/site`](file:///d:/Projects/brooklyntv/src/app/api/admin/site/route.ts) & [`skipconfigs`](file:///d:/Projects/brooklyntv/src/app/api/skipconfigs/route.ts): 强制执行 `ensureAdmin` 与 `getAdminRoleFromRequest`；
  - [`parse/route.ts`](file:///d:/Projects/brooklyntv/src/app/api/parse/route.ts): 对解析器健康度上报增加 60 秒冷却机制；
  - [`oidc/login`](file:///d:/Projects/brooklyntv/src/app/api/auth/oidc/login/route.ts)、[`callback`](file:///d:/Projects/brooklyntv/src/app/api/auth/oidc/callback/route.ts)、[`session-info`](file:///d:/Projects/brooklyntv/src/app/api/auth/oidc/session-info/route.ts): 严格校验 Host 与协议，校验 `oidcSession.sig` 防篡改；
  - [`playrecords/route.ts`](file:///d:/Projects/brooklyntv/src/app/api/playrecords/route.ts): 对游客请求跳过 `db.savePlayRecord`，仅保留轻量级匿名播放统计。
- **网络流、反爬防死锁与时间解析容错 (Tier 2 P1)**:
  - [`downstream.ts`](file:///d:/Projects/brooklyntv/src/lib/downstream.ts): 修复 `vod_year` 为数字时 `.match` 崩溃，过滤非法字符并在生成详情链接时使用 `encodeURIComponent`；
  - [`ai-recommend.client.ts`](file:///d:/Projects/brooklyntv/src/lib/ai-recommend.client.ts): 增加跨 TCP Chunk 分包缓冲，解决大模型流式推荐丢帧丢链接缺陷；
  - [`douban-anti-crawler.ts`](file:///d:/Projects/brooklyntv/src/lib/douban-anti-crawler.ts): PoW 碰撞循环增加 50 万次硬上限与 15 秒超时防死锁，严格校验重定向域名必须为 `sec.douban.com`；
  - [`time.ts`](file:///d:/Projects/brooklyntv/src/lib/time.ts): 优先匹配 XMLTV/EPG 紧凑格式，彻底解决带负时区字符串（如 `-0400`）被判定为减号导致解析成 `Invalid Date` 的严重缺陷；`formatTime` 增加对 `NaN` 与负数秒的防御。
- **前端交互组件内存泄漏、状态错位与水合异常修复 (Tier 3 P2)**:
  - [`ModernNav.tsx`](file:///d:/Projects/brooklyntv/src/components/ModernNav.tsx) 移除多余的底部占位 div 修复双重上边距；[`VirtualDoubanGrid.tsx`](file:///d:/Projects/brooklyntv/src/components/VirtualDoubanGrid.tsx) 移除无限滚动追加时的误触发回顶；[`Sidebar.tsx`](file:///d:/Projects/brooklyntv/src/components/Sidebar.tsx) 与 [`MobileBottomNav.tsx`](file:///d:/Projects/brooklyntv/src/components/MobileBottomNav.tsx) 修复路由与标签高亮匹配；
  - [`source-browser/page.tsx`](file:///d:/Projects/brooklyntv/src/app/source-browser/page.tsx): 消除双重触发请求，合并可选年份，增加异步防竞态序列号；
  - [`release-calendar/page.tsx`](file:///d:/Projects/brooklyntv/src/app/release-calendar/page.tsx): 全局去重并在多视图间复用 `filteredItems`，修复时区本地日期比对；
  - [`douban/page.tsx`](file:///d:/Projects/brooklyntv/src/app/douban/page.tsx): 切换分类与星期时重置页码，将 `localStorage` 访问移入 `useEffect`；
  - [`AcgSearch.tsx`](file:///d:/Projects/brooklyntv/src/components/AcgSearch.tsx): 增加请求序号防旧请求覆盖，外部链接严格校验 `https?://`；
  - [`admin/page.tsx`](file:///d:/Projects/brooklyntv/src/app/admin/page.tsx): 修复 `FluidSearch` 的 `|| true` 短路 Bug，为 `AlertModal` 添加 `clearTimeout` 清理；
  - [`login/page.tsx`](file:///d:/Projects/brooklyntv/src/app/login/page.tsx)、[`register/page.tsx`](file:///d:/Projects/brooklyntv/src/app/register/page.tsx)、[`oidc-register/page.tsx`](file:///d:/Projects/brooklyntv/src/app/oidc-register/page.tsx): 将 `VersionDisplay` 中的身份提取移入 `useEffect` 彻底解决 SSR 水合不一致，移除污染全局子元素背景的 `<style jsx>`；
  - [`DownloadEpisodeSelector.tsx`](file:///d:/Projects/brooklyntv/src/components/download/DownloadEpisodeSelector.tsx): 在打开弹窗或切换视频时同步重置已选集数与分页状态；
  - [`DirectYouTubePlayer.tsx`](file:///d:/Projects/brooklyntv/src/components/DirectYouTubePlayer.tsx) & [`NetDiskSearchResults.tsx`](file:///d:/Projects/brooklyntv/src/components/NetDiskSearchResults.tsx): 对外部超链接实施 `https?://` 白名单过滤；
  - [`DanmuSettingsPanel.tsx`](file:///d:/Projects/brooklyntv/src/components/play/DanmuSettingsPanel.tsx)、[`GlobalErrorIndicator.tsx`](file:///d:/Projects/brooklyntv/src/components/GlobalErrorIndicator.tsx)、[`SessionTracker.tsx`](file:///d:/Projects/brooklyntv/src/components/SessionTracker.tsx): 为动画 `rAF` 与定时器补充卸载与重置清理函数。
- **单元测试扩充与全量代码验证**:
  - 单元测试用例扩充至 34 项（覆盖 302 深度 SSRF 阻断与跳转安全、负时区 XMLTV 时间解析与异常秒数格式化），通过率 100%；
  - 全站 TypeScript 严格检查与 ESLint 静态代码检查达到 0 错误（0 errors）。

### 1.7 移动端从历史记录进入电视剧集数回退与竞态覆盖彻底修复 (2026-11-09)
- **卡片跳转路由元数据补全与首屏直达**:
  - [`VideoCard.tsx`](file:///d:/Projects/brooklyntv/src/components/VideoCard.tsx): 当 `from === 'playrecord'` 且存在有效已播集数 `currentEpisode`（1 基）时，在 `handleClick` 与 `handlePlayInNewTab` 中为 `/play` 路由拼接 `&index=${currentEpisode - 1}`，消除了历史卡片跳转丢失选集信息导致播放页默认以第 1 集加载的缺陷；
  - [`play-stats/page.tsx`](file:///d:/Projects/brooklyntv/src/app/play-stats/page.tsx): 在最近播放列表中点击 `handlePlayRecord` 时，补齐 `index`（0 基）、`source`、`id` 与 `t`（已播秒数）完整路由参数。
- **播放页生命周期确定性选集预载与覆盖防御**:
  - [`play/page.tsx`](file:///d:/Projects/brooklyntv/src/app/play/page.tsx): 在 `initAll()` 获取详情后、调用 `setDetail(detailData)` 启动播放流之前，若 URL 缺少 `index` 参数，立即通过 `getAllPlayRecords()` 确定性预查历史选集索引 `targetIndex` 与播放时间 `play_time`；在首帧渲染前提前设置 `currentEpisodeIndex` 与 `resumeTimeRef.current`，彻底消除了由于移动端网络或 IndexedDB 延迟导致的“先以第 1 集初始化播放流、后异步切流”的竞态抖动与回退；
  - [`play/page.tsx`](file:///d:/Projects/brooklyntv/src/app/play/page.tsx): 在 `saveCurrentPlayProgress` 中增加守卫，在 `isEpisodeChangingRef.current`、`isSourceChangingRef.current`、`loading` 或 `currentTime < 2` 期间严禁保存进度，彻底杜绝了加载第 1 集时误将数据库历史集数篡改为第 1 集的致命数据破坏 Bug；
  - [`play/page.tsx`](file:///d:/Projects/brooklyntv/src/app/play/page.tsx): 在 `handlePreviousEpisode`、`handleNextEpisode` 及 `video:ended` 自动播放下一集时，同步通过 `history.replaceState` 维持 URL 中的 `index` 参数最新。
- **服务端历史统计元数据增强**:
  - [`play-stats/route.ts`](file:///d:/Projects/brooklyntv/src/app/api/admin/play-stats/route.ts)、[`redis-base.db.ts`](file:///d:/Projects/brooklyntv/src/lib/redis-base.db.ts)、[`upstash.db.ts`](file:///d:/Projects/brooklyntv/src/lib/upstash.db.ts): 在提取用户最近播放记录 `recentRecords` 时，从字典键解析并挂载 `key`、`source` 与 `id` 元数据，确保前端具备直接唤起精准定位播放的能力。

### 1.8 PC 网页端全链路卡顿根治与弹幕按需动态加载架构升级 (2026-11-09)
- **播放源测速彻底轻量化与带宽/硬解通道保护**:
  - [`play/page.tsx`](file:///d:/Projects/brooklyntv/src/app/play/page.tsx): 彻底废除桌面端启动时并发创建 2~6 个后台隐藏 `<video>` 与 `new Hls()` 实例拉流测速的 `fullSpeedTest`，全端统一采用轻量级 HTTP HEAD ping 优选（`lightweightPreference`）。彻底消除了开播时并发下载其他源切片争抢带宽的问题，同时释放了全部浏览器硬件视频解码器通道（Hardware Decoder）。
- **弹幕默认关闭、零首屏开销与按需动态挂载**:
  - [`play/page.tsx`](file:///d:/Projects/brooklyntv/src/app/play/page.tsx): 弹幕默认设为关闭；播放器初始化时完全不引入 `artplayer-plugin-danmuku` 插件，首屏零弹幕网络请求、零 DOM 节点与零内存消耗。
  - 控制栏提供轻量级“弹幕: 关 / 弹幕: 开”切换按钮，仅当用户主动点击后，才异步动态 `import('artplayer-plugin-danmuku')` 并通过 `art.plugins.add(...)` 动态挂载到运行中的播放器实例上，拉取数据后平滑显示；
  - 彻底关闭 `antiOverlap: false`，杜绝了每帧遍历 DOM 执行 `getBoundingClientRect()` 引发的严重强制同步重排（Layout Thrashing）与主线程卡死。
- **HLS.js 缓冲与空洞秒级自愈收紧**:
  - [`play/page.tsx`](file:///d:/Projects/brooklyntv/src/app/play/page.tsx): 电脑端最大缓冲长度 `maxMaxBufferLength` 从贪婪的 180s 降至 60s，最大缓冲区限制为 60MB~100MB，避免持续向 SourceBuffer 塞入巨量切片导致 Chromium GC 停顿与第三方采集 CDN 频控限速；
  - 空洞容错阈值 `maxBufferHole` 从 0.5s 收紧至 0.1s，遇到切片非连续微小时间戳空洞（0.1s~0.3s）时，播放器立即自动微调跳过，避免长时间假死挂起。
- **GPU 渲染性能减负与 CSS 优化**:
  - [`artplayer-liquid-glass.css`](file:///d:/Projects/brooklyntv/src/styles/artplayer-liquid-glass.css): 将控制栏上的昂贵 `backdrop-filter: blur(12px/16px)` 替换为高质量暗黑半透明底色 `rgba(20, 20, 25, 0.92)`，免去 GPU 对硬解视频帧的昂贵离屏高斯模糊卷积计算；
  - 移除高开销的 `.artplayer-plugin-liquid-glass:has(.art-liquid-glass:hover)` 选择器，杜绝高刷新率鼠标移动时触发的全 DOM 树样式重算。

### 1.9 第四轮全量深度审查：安全漏洞阻断、流媒体与OOM根治、用户认证融合与体验优化 (2026-11-09)
- **严重级安全漏洞拦截与特权提权阻断 (Tier 1 P0)**:
  - [`proxy.ts`](file:///d:/Projects/brooklyntv/src/proxy.ts) & [`networkDetection.ts`](file:///d:/Projects/brooklyntv/src/lib/networkDetection.ts): 彻底重构 `getClientIP` 解析顺序（优先原生 TCP 连接 `request.ip`、Cloudflare `cf-connecting-ip` 及 Nginx 覆写的 `x-real-ip`；对 `x-forwarded-for` 仅采用末尾直连反代 IP），彻底阻断外网攻击者在 HTTP 请求头伪造 `X-Forwarded-For: 192.168.1.1` 自动获取受信任网络站长 `owner` 权限 Cookie 的高危漏洞 (SEC-01)；
  - [`ssrf.ts`](file:///d:/Projects/brooklyntv/src/lib/ssrf.ts) & 全站代理路由: 全面在 [`image-proxy`](file:///d:/Projects/brooklyntv/src/app/api/image-proxy/route.ts)、[`video-proxy`](file:///d:/Projects/brooklyntv/src/app/api/video-proxy/route.ts)、[`lite-stream`](file:///d:/Projects/brooklyntv/src/app/api/lite-stream/route.ts)、[`proxy/cms`](file:///d:/Projects/brooklyntv/src/app/api/proxy/cms/route.ts)、[`proxy/m3u8`](file:///d:/Projects/brooklyntv/src/app/api/proxy/m3u8/route.ts)、[`proxy/stream`](file:///d:/Projects/brooklyntv/src/app/api/proxy/stream/route.ts)、[`proxy/segment`](file:///d:/Projects/brooklyntv/src/app/api/proxy/segment/route.ts)、[`proxy/shortdrama`](file:///d:/Projects/brooklyntv/src/app/api/proxy/shortdrama/route.ts)、[`proxy/key`](file:///d:/Projects/brooklyntv/src/app/api/proxy/key/route.ts)、[`proxy/logo`](file:///d:/Projects/brooklyntv/src/app/api/proxy/logo/route.ts)、[`watch-room/test-connection`](file:///d:/Projects/brooklyntv/src/app/api/watch-room/test-connection/route.ts)、[`watch-room/stats`](file:///d:/Projects/brooklyntv/src/app/api/watch-room/stats/route.ts) 将原生 `fetch` 与 `redirect: 'follow'` 升级为逐跳过滤的 `safeFetch`，彻底封堵利用公网 302 重定向穿透内网或探测云元数据服务的 SSRF 绕过 (SEC-02)；
  - [`admin/reset`](file:///d:/Projects/brooklyntv/src/app/api/admin/reset/route.ts): 破坏性重置接口全面废除 `GET` 改为 `POST`，并强制执行 `ensureAdmin` HMAC 防篡改与 `role === 'owner'` 校验，彻底消除外部钓鱼 CSRF 风险；并在 [`admin/page.tsx`](file:///d:/Projects/brooklyntv/src/app/admin/page.tsx) 同步更新为 POST 请求 (SEC-03)；
  - [`admin/config`](file:///d:/Projects/brooklyntv/src/app/api/admin/config/route.ts): 非站长管理员读取配置时，补齐对 `SiteConfig.TMDBApiKey`、`YouTubeConfig.apiKey`、`DoubanConfig.cookies`、`TVBoxSecurityConfig.token`、`WatchRoomConfig.authKey`、`DanmuApiConfig.customToken`、`AIRecommendConfig.tavilyApiKeys` 及 `UserConfig.Users[].tvboxToken` 的脱敏清洗 (`******`)，防止次级管理员越权窃取敏感密钥 (SEC-04)；
  - [`tvbox/search`](file:///d:/Projects/brooklyntv/src/app/api/tvbox/search/route.ts) & [`tvbox/spider-status`](file:///d:/Projects/brooklyntv/src/app/api/tvbox/spider-status/route.ts): 为 TVBox 搜索接口接入严格的 Token 校验与 IP 白名单/CIDR 校验，为 Spider 状态刷新 POST 接口增加 `ensureAdmin` 鉴权 (SEC-05)；
  - [`upstash.db.ts`](file:///d:/Projects/brooklyntv/src/lib/upstash.db.ts): 修复 `scanKeys` 中 Upstash REST 返回数值 `0` 游标导致 `while (cursor !== '0')` 永不终止的无限死循环与 API 配额耗尽缺陷，增加最大 500 次批次熔断保护 (DB-01)；
  - [`video-proxy`](file:///d:/Projects/brooklyntv/src/app/api/video-proxy/route.ts) & [`video-cache.ts`](file:///d:/Projects/brooklyntv/src/lib/video-cache.ts): 废除 `Buffer.from(await videoResponse.arrayBuffer())` 全量内存缓冲，采用 `videoResponse.body.tee()` 结合 `cacheVideoStream` 流水线分块写入磁盘，实现直通响应与异步磁盘缓存，彻底杜绝大视频文件导致的 V8 堆内存 OOM 崩溃 (STREAM-01)。
- **核心数据层、用户体系与流媒体深度修复 (Tier 2 P1)**:
  - [`redis-base.db.ts`](file:///d:/Projects/brooklyntv/src/lib/redis-base.db.ts) & [`upstash.db.ts`](file:///d:/Projects/brooklyntv/src/lib/upstash.db.ts): 在 `verifyUser` 中优先校验 V2 哈希 `verifyUserV2`、回退校验 V1 独立键，在 `checkUserExist` 中同时检查 V1/V2 键，彻底解决带标签组的 V2 用户无法登录和修改密码的缺陷 (DB-05)；
  - [`data_migration/export`](file:///d:/Projects/brooklyntv/src/app/api/admin/data_migration/export/route.ts)、[`import`](file:///d:/Projects/brooklyntv/src/app/api/admin/data_migration/import/route.ts)、[`redis-base.db.ts`](file:///d:/Projects/brooklyntv/src/lib/redis-base.db.ts)、[`upstash.db.ts`](file:///d:/Projects/brooklyntv/src/lib/upstash.db.ts): 导出备份时同时读取 V2 与 V1 用户哈希；在 `createUserV2` 与 `registerUser` 中识别已有 `sha256:` 哈希并跳过加盐，实现密码幂等导入，彻底杜绝备份恢复时密码丢失或被二次加盐破坏 (DB-02)；
  - [`play/page.tsx`](file:///d:/Projects/brooklyntv/src/app/play/page.tsx): 选集切换成功后，优先恢复 `resumeTimeRef.current` 记录的历史播放进度并置空引用，仅在无历史记录时才归零，解决换集时历史进度被硬编码重置的体验缺陷 (STREAM-02)；
  - [`play/page.tsx`](file:///d:/Projects/brooklyntv/src/app/play/page.tsx): `customType.m3u8` 增加 `Hls.isSupported()` 检测；在不支持 MSE 的 iOS Safari 等环境中自动降级为原生 `video.canPlayType('application/vnd.apple.mpegurl')` 播放并移除 MSE 模式下的 `<source>` 标签直接注入，彻底解决 iOS Safari 偶发白屏 (STREAM-03)；
  - [`proxy/shortdrama`](file:///d:/Projects/brooklyntv/src/app/api/proxy/shortdrama/route.ts): 重新实现独立的 `HEAD` 请求处理器，仅向上游发起 HEAD 并转发响应头，返回空响应体，严格符合 RFC 7231 规范 (STREAM-04)；
  - [`VirtualSearchGrid.tsx`](file:///d:/Projects/brooklyntv/src/components/VirtualSearchGrid.tsx): 从置顶 Effect 依赖项中移除 `totalItemCount`，仅在搜索关键词或视图变化时置顶，解决流式搜索分批加载时用户被强制拉回顶部的严重体验缺陷 (FE-02)。
- **水合治理、交互竞态、样式性能与观影室治理 (Tier 3 P2)**:
  - [`live/page.tsx`](file:///d:/Projects/brooklyntv/src/app/live/page.tsx) & [`search/page.tsx`](file:///d:/Projects/brooklyntv/src/app/search/page.tsx): 移除 `useState` 初始化工厂函数中对 `localStorage` 的直接访问，改用安全固定默认值并在挂载后 `useEffect` 中安全同步，彻底杜绝 SSR 水合不一致报错 (FE-01)；
  - [`douban/page.tsx`](file:///d:/Projects/brooklyntv/src/app/douban/page.tsx): 移除反模式的 `flushSync` 强制同步渲染，恢复 React 18 自动批处理；在大分类或 Tab 切换时即时重置页码与数据，避免跨分类错误请求第 3 页数据 (FE-03, FE-05)；
  - [`globals.css`](file:///d:/Projects/brooklyntv/src/app/globals.css): 移除全量通配否定选择器 `*:not(.artplayer):not(.artplayer *)`，收敛至 `.scrollbar-hide` 与 `html, body` 规则，消除全局高频 DOM 变更时的样式重算风暴 (FE-06)；
  - [`useWatchRoom.ts`](file:///d:/Projects/brooklyntv/src/hooks/useWatchRoom.ts) & [`useWatchRoomSync.ts`](file:///d:/Projects/brooklyntv/src/app/play/hooks/useWatchRoomSync.ts): 废除 500ms 定时器解除广播锁，改为监听原生异步 `seeked` 事件完成回调；创建房间时将房主标识持久化至 `sessionStorage`并在离开房间时自动清理，杜绝异步缓冲时发生的乒乓 Seek 风暴与房主凭据丢失 (STREAM-05)；
  - [`redis-base.db.ts`](file:///d:/Projects/brooklyntv/src/lib/redis-base.db.ts) & [`upstash.db.ts`](file:///d:/Projects/brooklyntv/src/lib/upstash.db.ts): `verifyHashedPassword` 增加对空密码/空存储字符串的直接拒绝防护 (DB-04)；
  - [`client-cache.ts`](file:///d:/Projects/brooklyntv/src/lib/client-cache.ts): `clearExpiredLocalCache` 严格限定在有匹配前缀时才在异常时清理，保护用户其他非 JSON 类型的 localStorage 键不被误删 (DB-06)。

### 1.10 敏感接口 IP 频率限制与防暴力破解加固 (2026-11-09)
- **统一轻量级频率限制模块 ([src/lib/rate-limit.ts](file:///d:/Projects/brooklyntv/src/lib/rate-limit.ts))**:
  - 构建高可用双模限频核心：优先基于 Redis/Upstash/Kvrocks 分布式缓存，在 `localstorage` 单机无数据库模式下自动降级至进程级内存 `Map` 配合定时过期清理；
  - 具备原生 Fail-open 容错机制：当数据库发生超时或网络断开时，自动降级放行并告警，绝不阻断合法用户的业务请求；
  - 提供 `createRateLimitResponse` 统一封装 RFC 标准 429 响应，输出 `Retry-After`、`X-RateLimit-Limit`、`X-RateLimit-Remaining` 与 `X-RateLimit-Reset` 响应头。
- **登录接口防字典爆破 ([/api/login](file:///d:/Projects/brooklyntv/src/app/api/login/route.ts))**:
  - 基于真实客户端 IP 实施限制：单个 IP 每 60 秒最多允许 10 次登录尝试，超出立即阻断并返回 429。
- **注册接口防批量注册 ([/api/register](file:///d:/Projects/brooklyntv/src/app/api/register/route.ts))**:
  - 基于真实客户端 IP 实施限制：单个 IP 每 10 分钟最多允许 5 次注册操作，抵御自动化脚本批量灌水。
- **TVBox 接口频率限制重构 ([/api/tvbox](file:///d:/Projects/brooklyntv/src/app/api/tvbox/route.ts))**:
  - 移除原先冗余的内联缓存逻辑，接入统一模块，解决其在 `localstorage` 单机模式下因 `db.getCache` 返回 `null` 导致的限频静默失效缺陷。
- **修改密码接口防爆破限频 ([/api/change-password](file:///d:/Projects/brooklyntv/src/app/api/change-password/route.ts))**:
  - 接入 IP 频率限制：单个 IP 每分钟最多尝试 5 次原密码核验，防范攻击者利用泄露会话字典穷举原密码。
- **定时任务自动化灾备与每日滚动快照 ([/api/cron](file:///d:/Projects/brooklyntv/src/app/api/cron/route.ts))**:
  - 自动化每日备份：每天首次执行 cron 时自动将管理员配置与全量用户数据（播放记录、收藏、追剧、自定义跳过）导出并写入 `backup:snapshot:${today}`，设置 7 天滚动 TTL，解决依赖人工手动导出的单点风险。
- **标准化基础设施健康巡检接口 ([/api/health](file:///d:/Projects/brooklyntv/src/app/api/health/route.ts))**:
  - 新建轻量级健康巡检端点，集成数据库 Ping 往返延迟、进程 Uptime、内存占用 (Heap/RSS) 指标，支持 HTTP 200/503 探测与 60次/分 IP 频控，友好兼容 Docker HEALTHCHECK 与 Kubernetes 探针。
- **播放器移动端双击寻道与死链友好反馈 ([src/app/play/page.tsx](file:///d:/Projects/brooklyntv/src/app/play/page.tsx))**:
  - 移动端手势升级：双击屏幕左侧 35% 触发快退 10 秒提示，双击右侧 35% 触发快进 10 秒提示，中间区域保留默认暂停/播放；
  - 播放死链反馈：首播遇到 403/404 等加载失败时，自动弹出浮层提示引导用户换源，彻底解决黑屏假死无反馈。

### 1.11 PC 网页端快进/后退死循环卡顿根治与 HLS 寻道管道优化 (2026-11-10)
- **消除 `BUFFER_STALLED_ERROR` 外部死循环微寻道 ([play/page.tsx](file:///d:/Projects/brooklyntv/src/app/play/page.tsx))**:
  - 彻底移除错误监听器中对停顿错误强制执行 `video.currentTime += 0.1` 的反模式逻辑。消除快进/后退至未缓冲时间戳时触发的“等待分片 -> 抛出停顿 -> 强制改时间戳 -> MSE 抛弃解封装管道 -> 再次停顿”的恶性死循环寻道风暴。
- **恢复 Hls.js 标准空洞容差阈值 ([play/page.tsx](file:///d:/Projects/brooklyntv/src/app/play/page.tsx))**:
  - 将 `maxBufferHole` 从过严的 0.1s 恢复至官方推荐值 0.5s，`highBufferWatchdogPeriod` 设为 3s；容许第三方切片音视频 GOP 关键帧之间正常的 0.1s~0.3s 微小时间戳偏差，避免播放中高频触发伪空洞 Nudge 告警。
- **放宽桌面端后向保留长度实现零等待回退 ([play/page.tsx](file:///d:/Projects/brooklyntv/src/app/play/page.tsx))**:
  - 桌面端 `backBufferLength` 由 15s 放宽至 60s（强力模式 90s）；用户回退 10~30 秒时直接命中已缓存在 SourceBuffer 内存中的切片，实现免网络请求的零等待瞬时平滑回退。
- **按键快进/快退高频连击聚合防抖调度 ([play/page.tsx](file:///d:/Projects/brooklyntv/src/app/play/page.tsx))**:
  - 规范使用 `art.seek` 替代原生 `currentTime += 10`；实现 150ms 连击聚合防抖调度器 `scheduleKeyboardSeek`，在连按右/左箭头键时即时更新 UI 浮层时间提示，停止敲击后向底层管道提交单次精准 Seek，彻底消除连续按键造成的 SourceBuffer 阻塞。

---

## 二、 项目文档资产索引

- **[项目总览]** [README.md](file:///d:/Projects/brooklyntv/README.md)
  - **职责描述:** 项目核心功能介绍、部署方式与环境变量配置总览。
  - **当前状态:** `[已定档]`
  - **维护者/相关人:** Core Team / AI Agent
- **[AI 功能]** [AI_FEATURES.md](file:///d:/Projects/brooklyntv/AI_FEATURES.md)
  - **职责描述:** AI 影视推荐与智能助手功能的配置与接口说明。
  - **当前状态:** `[已定档]`
  - **维护者/相关人:** Core Team
- **[去广告配置]** [CUSTOM_AD_FILTER.md](file:///d:/Projects/brooklyntv/CUSTOM_AD_FILTER.md)
  - **职责描述:** M3U8 切片广告过滤规则与自定义过滤函数指南。
  - **当前状态:** `[已定档]`
  - **维护者/相关人:** Core Team
- **[离线下载]** [DOWNLOAD_FEATURES.md](file:///d:/Projects/brooklyntv/DOWNLOAD_FEATURES.md)
  - **职责描述:** 视频分片下载、并发控制与本地合并功能说明。
  - **当前状态:** `[已定档]`
  - **维护者/相关人:** Core Team
- **[认证鉴权]** [OIDC_SETUP.md](file:///d:/Projects/brooklyntv/OIDC_SETUP.md)
  - **职责描述:** OIDC 单点登录集成与回调配置文档。
  - **当前状态:** `[已定档]`
  - **维护者/相关人:** Core Team
- **[代理配置]** [PROXY_CONFIG.md](file:///d:/Projects/brooklyntv/PROXY_CONFIG.md)
  - **职责描述:** 视频流与接口代理转发配置指南。
  - **当前状态:** `[已定档]`
  - **维护者/相关人:** Core Team
- **[片头片尾]** [SKIP_CONTROLLER_GUIDE.md](file:///d:/Projects/brooklyntv/SKIP_CONTROLLER_GUIDE.md)
  - **职责描述:** 自动跳过片头片尾及自动连播下一集控制器说明。
  - **当前状态:** `[已定档]`
  - **维护者/相关人:** Core Team
- **[电报登录]** [TELEGRAM_AUTH.md](file:///d:/Projects/brooklyntv/TELEGRAM_AUTH.md)
  - **职责描述:** Telegram 认证登录配置说明。
  - **当前状态:** `[已定档]`
  - **维护者/相关人:** Core Team
- **[信任网络]** [TRUSTED_NETWORK.md](file:///d:/Projects/brooklyntv/TRUSTED_NETWORK.md)
  - **职责描述:** 局域网/授信 IP 免密自动登录配置指南。
  - **当前状态:** `[已定档]`
  - **维护者/相关人:** Core Team
- **[TVBox 集成]** [TVBOX.md](file:///d:/Projects/brooklyntv/TVBOX.md)
  - **职责描述:** TVBox 订阅源输出与客户端接入文档。
  - **当前状态:** `[已定档]`
  - **维护者/相关人:** Core Team
- **[TVBox 安全]** [TVBOX_SECURITY.md](file:///d:/Projects/brooklyntv/TVBOX_SECURITY.md)
  - **职责描述:** TVBox 接口 Token 鉴权与安全防护策略。
  - **当前状态:** `[已定档]`
  - **维护者/相关人:** Core Team
- **[虚拟滚动]** [VIRTUAL_SCROLL_GUIDE.md](file:///d:/Projects/brooklyntv/VIRTUAL_SCROLL_GUIDE.md)
  - **职责描述:** 搜索结果与大列表虚拟滚动性能优化说明。
  - **当前状态:** `[已定档]`
  - **维护者/相关人:** Core Team
- **[观影室部署]** [WATCH_ROOM_DEPLOYMENT.md](file:///d:/Projects/brooklyntv/WATCH_ROOM_DEPLOYMENT.md)
  - **职责描述:** 多人同步观影室服务部署与状态同步机制文档。
  - **当前状态:** `[已定档]`
  - **维护者/相关人:** Core Team

- **[频率限制]** [rate-limit.ts](file:///d:/Projects/brooklyntv/src/lib/rate-limit.ts)
  *   **职责描述:** 敏感接口 (登录/注册/TVBox) IP 频率限制与防爆破核心模块，支持分布式与单机双模及 Fail-open。
  *   **当前状态:** `[已定档]`
  *   **维护者/相关人:** Core Team / AI Agent

- **[系统健康]** [health/route.ts](file:///d:/Projects/brooklyntv/src/app/api/health/route.ts)
  *   **职责描述:** 标准轻量级健康巡检 API，支持数据库延迟、Uptime、内存使用与 HTTP 200/503 探测。
  *   **当前状态:** `[已定档]`
  *   **维护者/相关人:** Core Team / AI Agent
