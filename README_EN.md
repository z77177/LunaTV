<div align="center">

[![English Doc](https://img.shields.io/badge/Doc-English-blue)](README_EN.md)
[![中文文档](https://img.shields.io/badge/文档-中文-blue)](README.md)

</div>

---

# LunaTV Enhanced Edition

<div align="center">
  <img src="public/logo.png" alt="LunaTV Logo" width="120">
</div>

> 🎬 **LunaTV Enhanced Edition** is a comprehensive video streaming platform deeply customized from MoonTV. Built on top of the original version, it adds **50+ major feature enhancements** including **YouTube Integration**, **Cloud Drive Search**, **AI Recommendations**, **Short Drama**, **IPTV Live TV**, **Bangumi Anime**, **Playback Statistics**, **Danmaku System**, and more, delivering the ultimate online streaming experience.

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-14.2.23-000?logo=nextdotjs)
![React](https://img.shields.io/badge/React-18.2.0-61dafb?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-4.9.5-3178c6?logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4.17-38bdf8?logo=tailwindcss)
![ArtPlayer](https://img.shields.io/badge/ArtPlayer-5.3.0-ff6b6b)
![HLS.js](https://img.shields.io/badge/HLS.js-1.6.13-ec407a)
![License](https://img.shields.io/badge/License-MIT-green)
![Docker Ready](https://img.shields.io/badge/Docker-ready-blue?logo=docker)
![Version](https://img.shields.io/badge/Version-5.5.4-orange)

</div>

---

## 📢 Project Overview

This project is a deeply customized version based on **MoonTV**, continuously developed from **v4.3.1** to the current **v5.5.4**, with **50+ major feature modules** and **300+ detailed optimizations** added. See [CHANGELOG](CHANGELOG) for all new features.

### 💡 Core Enhancement Highlights

#### 🎥 Content Ecosystem Expansion
- **YouTube Integration**: Complete YouTube search, playback, live streaming with cookieless domain support
- **Cloud Drive Search (PanSou)**: Integrated advanced filtering and cache management
- **Short Drama Features**: Search, playback, dedicated detail pages, mobile API proxy
- **IPTV Live TV**: m3u/m3u8 subscriptions, EPG program guide, source aggregation, logo proxy
- **Bangumi Anime**: Intelligent anime detection, API integration, caching mechanism

#### 🤖 AI Recommendation System
- **AI Content Recommendations**: Support for GPT-5/o series models, dynamic prompt management
- **Multiple Card Types**: Video recommendations, YouTube videos, video link parsing
- **TMDB Actor Search**: Complete actor search, filtering, and caching
- **Release Calendar**: Upcoming content preview and tracking

#### 💬 Danmaku Ecosystem
- **Third-party Danmaku API**: Integrated Tencent Video, iQiyi, Youku, Bilibili platforms
- **Smart Performance Optimization**: Device-based tiered rendering, Web Worker acceleration
- **Complete Configuration System**: Font size, speed, opacity, display area, anti-overlap adjustments
- **Smart Caching**: localStorage persistence, 30-minute cache, auto cleanup

#### 📊 User Management Enhancement
- **User Level System**: Replaces large login count numbers with friendly level display
- **Playback Statistics**: Complete viewing data statistics, analysis, visualization
- **User Group Permissions**: Fine-grained permission control for AI Assistant, YouTube features
- **Inactive User Cleanup**: Smart auto-cleanup with detailed configuration and logging

#### 🎮 Player Feature Enhancement
- **Chromecast Casting**: Smart browser detection, excludes vendor browsers
- **iPad/iOS Optimization**: HLS.js official source optimization, smart device detection, multi-attempt autoplay
- **Mobile Adaptation**: Precise danmaku panel positioning, volume control optimization, responsive controller
- **Skip Intro/Outro**: Smart detection and auto-skip, user configurable

#### 📱 Interface Experience Optimization
- **Virtual Scrolling**: react-window 2.2.0, smooth loading for massive content
- **Douban Details Enhancement**: Complete rating, cast & crew, premiere date, duration, production info
- **User Menu Features**: Update reminders, continue watching, favorites quick access
- **Login Interface Modernization**: Dynamic random wallpapers, gradient cards, responsive design

#### 🔐 Security & Storage
- **TVBox Security Integration**: IP whitelist, Token authentication, full API compatibility
- **Calendar Cache Migration**: Migrated from localStorage to database, cross-device sync support
- **Cache Optimization**: Unified cache management (YouTube, cloud drive, Douban, danmaku)
- **Enhanced Storage Modes**: Full Kvrocks/Redis/Upstash support, memory cache prevents QuotaExceededError

---

## ⚠️ Important Notices

### 📦 Project Status

- **Notice**: After deployment, this is an **empty shell project** with **no built-in video sources or live streaming sources**. You need to collect and configure them yourself.
- **Demo Site**: [https://lunatv.smone.us](https://lunatv.smone.us) for short-term testing. Database is cleaned regularly.

### 🚫 Distribution Restrictions

**Do NOT promote this project on Bilibili, Xiaohongshu (RedNote), WeChat Official Accounts, Douyin (TikTok China), Toutiao, or other Chinese mainland social platforms through videos or articles. This project does NOT authorize any "Tech Weekly/Monthly" projects or sites to include it.**

### 📜 Open Source License

This project is licensed under **CC BY-NC-SA 4.0**, with the following terms:
- ❌ **Commercial use is prohibited**
- ✅ **Personal learning and use is allowed**
- ✅ **Derivative works and distribution are allowed**
- ⚠️ **Any derivative projects must retain this project's address and be open-sourced under the same license**

---

## ✨ Complete Feature List

### 🎬 Content Aggregation
- ✅ Multi-source video aggregation search (streaming output, smart variants)
- ✅ YouTube integration (search, live streaming, iframe playback)
- ✅ Cloud drive search (PanSou integration, advanced filtering)
- ✅ Short drama features (search, playback, dedicated detail pages)
- ✅ IPTV live TV (m3u subscriptions, EPG guide, source aggregation)
- ✅ Bangumi anime (info detection, API integration)
- ✅ TMDB actor search (filtering, caching)

### 🤖 Smart Recommendations
- ✅ AI recommendation system (GPT-5/o support, dynamic prompts)
- ✅ Release calendar (upcoming content preview)
- ✅ Douban details enhancement (complete cast & crew info)
- ✅ Smart search optimization (language-aware, fuzzy matching)

### 💬 Danmaku System
- ✅ Third-party danmaku API (Tencent, iQiyi, Youku, Bilibili)
- ✅ Smart performance optimization (device tiering, Web Worker)
- ✅ Complete configuration (font size, speed, opacity, display area)
- ✅ Smart caching (localStorage, 30-min expiry)
- ✅ Danmaku input (web-only button)

### 📊 User Management
- ✅ User level system
- ✅ Playback statistics (watch time, video count, recent records)
- ✅ User group permissions (AI, YouTube feature control)
- ✅ Inactive user auto-cleanup
- ✅ Login time tracking

### 🎮 Player Enhancement
- ✅ Chromecast casting
- ✅ iPad/iOS optimization (HLS.js config, autoplay)
- ✅ Danmaku panel (mobile precise positioning)
- ✅ Volume control optimization
- ✅ Skip intro/outro
- ✅ Episode switching optimization (debounce, state management)

### 🎨 Interface Experience
- ✅ Virtual scrolling (react-window 2.2.0)
- ✅ Responsive grid (2-8 column adaptive)
- ✅ User menu enhancement (update reminders, continue watching, favorites)
- ✅ Login/register modernization (dynamic wallpapers, gradient cards)
- ✅ Mobile bottom navigation
- ✅ Back to top button

### 🔐 Security & Storage
- ✅ TVBox full API (IP whitelist, Token auth)
- ✅ Calendar cache database migration
- ✅ Unified cache management system
- ✅ Kvrocks/Redis/Upstash storage
- ✅ Memory cache prevents QuotaExceededError
- ✅ User registration system (configurable toggle)

### 🛠️ Technical Optimization
- ✅ ArtPlayer 5.3.0 + HLS.js 1.6.13
- ✅ Danmaku plugin 5.2.0 (Web Worker acceleration)
- ✅ Next.js SSR compatibility
- ✅ Docker build optimization
- ✅ TypeScript type safety
- ✅ Semantic versioning

---

## 🗺 Table of Contents

- [Tech Stack](#tech-stack)
- [Deployment](#deployment)
- [Configuration File](#configuration-file)
- [Environment Variables](#environment-variables)
- [Feature Configuration](#feature-configuration)
- [Auto Update](#auto-update)
- [Mobile App Usage](#mobile-app-usage)
- [AndroidTV / Tablet Usage](#androidtv--tablet-usage)
- [Changelog](#changelog)
- [Security & Privacy Notice](#security--privacy-notice)
- [License](#license)
- [Acknowledgments](#acknowledgments)

---

## 🔧 Tech Stack

| Category      | Main Dependencies                                                                                              |
| ------------- | -------------------------------------------------------------------------------------------------------------- |
| Frontend      | [Next.js 14.2.23](https://nextjs.org/) · App Router                                                           |
| UI & Styling  | [Tailwind CSS 3.4.17](https://tailwindcss.com/) · [Framer Motion 12](https://www.framer.com/motion/)          |
| Language      | TypeScript 4.9.5                                                                                               |
| Player        | [ArtPlayer 5.3.0](https://github.com/zhw2590582/ArtPlayer) · [HLS.js 1.6.13](https://github.com/video-dev/hls.js/) · [artplayer-plugin-danmuku 5.2.0](https://github.com/zhw2590582/ArtPlayer) |
| State Mgmt    | React Context API · React Hooks                                                                                |
| Data Storage  | Kvrocks · Redis · Upstash · localStorage                                                                       |
| Virtualization| [react-window 2.2.0](https://github.com/bvaughn/react-window) · ResizeObserver                                |
| UI Components | [@headlessui/react 2](https://headlessui.com/) · [Lucide Icons](https://lucide.dev/) · [React Icons 5](https://react-icons.github.io/react-icons/) |
| Code Quality  | ESLint · Prettier · Jest · Husky                                                                               |
| Deployment    | Docker · Docker Compose                                                                                        |

---

## 🚀 Deployment

This project **only supports Docker or Docker-based platforms** (such as Dockge, Portainer, Komodo, etc.).

### 📦 Recommended: Kvrocks Storage

Kvrocks is a persistent Redis-compatible storage based on RocksDB, recommended for production environments.

```yml
services:
  moontv-core:
    image: ghcr.io/szemeng76/lunatv:latest
    container_name: moontv-core
    restart: on-failure
    ports:
      - '3000:3000'
    environment:
      - USERNAME=admin
      - PASSWORD=your_secure_password
      - NEXT_PUBLIC_STORAGE_TYPE=kvrocks
      - KVROCKS_URL=redis://moontv-kvrocks:6666
      # Optional: Site configuration
      - SITE_BASE=https://your-domain.com
      - NEXT_PUBLIC_SITE_NAME=LunaTV Enhanced
    networks:
      - moontv-network
    depends_on:
      - moontv-kvrocks

  moontv-kvrocks:
    image: apache/kvrocks
    container_name: moontv-kvrocks
    restart: unless-stopped
    volumes:
      - kvrocks-data:/var/lib/kvrocks
    networks:
      - moontv-network

networks:
  moontv-network:
    driver: bridge

volumes:
  kvrocks-data:
```

### 🔴 Redis Storage (Risk of Data Loss)

Redis default configuration may lead to data loss. Persistence must be enabled.

```yml
services:
  moontv-core:
    image: ghcr.io/szemeng76/lunatv:latest
    container_name: moontv-core
    restart: on-failure
    ports:
      - '3000:3000'
    environment:
      - USERNAME=admin
      - PASSWORD=your_secure_password
      - NEXT_PUBLIC_STORAGE_TYPE=redis
      - REDIS_URL=redis://moontv-redis:6379
    networks:
      - moontv-network
    depends_on:
      - moontv-redis

  moontv-redis:
    image: redis:alpine
    container_name: moontv-redis
    restart: unless-stopped
    command: redis-server --save 60 1 --loglevel warning
    volumes:
      - ./data:/data
    networks:
      - moontv-network

networks:
  moontv-network:
    driver: bridge
```

### ☁️ Upstash Cloud Storage

Suitable for scenarios where self-hosted databases are not available. Fully managed Redis service.

1. Register an account at [upstash.com](https://upstash.com/) and create a Redis instance
2. Copy **HTTPS ENDPOINT** and **TOKEN**
3. Use the following configuration:

```yml
services:
  moontv-core:
    image: ghcr.io/szemeng76/lunatv:latest
    container_name: moontv-core
    restart: on-failure
    ports:
      - '3000:3000'
    environment:
      - USERNAME=admin
      - PASSWORD=your_secure_password
      - NEXT_PUBLIC_STORAGE_TYPE=upstash
      - UPSTASH_URL=https://your-instance.upstash.io
      - UPSTASH_TOKEN=your_upstash_token
```

---

## ⚙️ Configuration File

After deployment, it's an empty shell application. You need to fill in the configuration in **Admin Panel > Configuration File**.

### 📝 Configuration Format

```json
{
  "cache_time": 7200,
  "api_site": {
    "example_source": {
      "api": "http://example.com/api.php/provide/vod",
      "name": "Example Resource",
      "detail": "http://example.com"
    }
  },
  "custom_category": [
    {
      "name": "Chinese Movies",
      "type": "movie",
      "query": "华语"
    },
    {
      "name": "US TV Series",
      "type": "tv",
      "query": "美剧"
    }
  ]
}
```

### 📖 Field Description

- **cache_time**: API cache duration (seconds), recommended 3600-7200
- **api_site**: Video resource site configuration
  - `key`: Unique identifier (lowercase letters/numbers)
  - `api`: Resource site vod JSON API address (supports Apple CMS V10 format)
  - `name`: Display name in the interface
  - `detail`: (Optional) Web detail root URL for scraping episode details
- **custom_category**: Custom categories (based on Douban search)
  - `name`: Category display name
  - `type`: `movie` (movies) or `tv` (TV series)
  - `query`: Douban search keyword

### 🎯 Recommended Custom Categories

**Movie Categories**: Popular, Latest, Classic, High-rated, Hidden Gems, Chinese, Western, Korean, Japanese, Action, Comedy, Romance, Sci-Fi, Mystery, Horror, Healing

**TV Series Categories**: Popular, US Series, UK Series, Korean Drama, Japanese Drama, Chinese Drama, Hong Kong Drama, Japanese Animation, Variety Shows, Documentaries

You can also enter specific content like "Harry Potter", which works the same as Douban search.

---

## 🌐 Environment Variables

### Required Variables

| Variable                     | Description        | Example Value           |
| ---------------------------- | ------------------ | ----------------------- |
| `USERNAME`                   | Admin account      | `admin`                 |
| `PASSWORD`                   | Admin password     | `your_secure_password`  |
| `NEXT_PUBLIC_STORAGE_TYPE`   | Storage type       | `kvrocks` / `redis` / `upstash` |

### Storage Configuration

| Variable          | Description           | Example Value                   |
| ----------------- | --------------------- | ------------------------------- |
| `KVROCKS_URL`     | Kvrocks connection URL | `redis://moontv-kvrocks:6666`  |
| `REDIS_URL`       | Redis connection URL   | `redis://moontv-redis:6379`    |
| `UPSTASH_URL`     | Upstash endpoint       | `https://xxx.upstash.io`       |
| `UPSTASH_TOKEN`   | Upstash Token          | `AxxxxxxxxxxxxxxxxxxxxxxxxxxxQ==` |

### Optional Configuration

| Variable                                | Description              | Default     | Options                    |
| --------------------------------------- | ------------------------ | ----------- | -------------------------- |
| `SITE_BASE`                             | Site URL                 | Empty       | `https://example.com`      |
| `NEXT_PUBLIC_SITE_NAME`                 | Site name                | `MoonTV`    | Any string                 |
| `ANNOUNCEMENT`                          | Site announcement        | Default     | Any string                 |
| `NEXT_PUBLIC_SEARCH_MAX_PAGE`           | Max search pages         | `5`         | `1-50`                     |
| `NEXT_PUBLIC_DOUBAN_PROXY_TYPE`         | Douban data proxy type   | `direct`    | `direct` / `cors-proxy-zwei` / `cmliussss-cdn-tencent` / `cmliussss-cdn-ali` / `custom` |
| `NEXT_PUBLIC_DOUBAN_PROXY`              | Custom Douban proxy      | Empty       | URL prefix                 |
| `NEXT_PUBLIC_DOUBAN_IMAGE_PROXY_TYPE`   | Douban image proxy type  | `direct`    | `direct` / `server` / `img3` / `cmliussss-cdn-tencent` / `cmliussss-cdn-ali` / `custom` |
| `NEXT_PUBLIC_DOUBAN_IMAGE_PROXY`        | Custom image proxy       | Empty       | URL prefix                 |
| `NEXT_PUBLIC_DISABLE_YELLOW_FILTER`     | Disable adult filter     | `false`     | `true` / `false`           |
| `NEXT_PUBLIC_FLUID_SEARCH`              | Streaming search output  | `true`      | `true` / `false`           |

### Douban Proxy Options

**DOUBAN_PROXY_TYPE Options**:
- `direct`: Server directly requests Douban (may be blocked)
- `cors-proxy-zwei`: Via CORS proxy provided by [Zwei](https://github.com/bestzwei)
- `cmliussss-cdn-tencent`: Tencent Cloud CDN provided by [CMLiussss](https://github.com/cmliu)
- `cmliussss-cdn-ali`: Alibaba Cloud CDN provided by [CMLiussss](https://github.com/cmliu)
- `custom`: Custom proxy (requires `DOUBAN_PROXY`)

**DOUBAN_IMAGE_PROXY_TYPE Options**:
- `direct`: Browser directly requests Douban image domain
- `server`: Server proxies requests
- `img3`: Douban official Alibaba Cloud CDN
- `cmliussss-cdn-tencent`: CMLiussss Tencent Cloud CDN
- `cmliussss-cdn-ali`: CMLiussss Alibaba Cloud CDN
- `custom`: Custom proxy (requires `DOUBAN_IMAGE_PROXY`)

---

## 🎛️ Feature Configuration

All advanced features can be configured in the **Admin Panel** without modifying code or restarting services.

### Admin Panel Access

Visit `http://your-domain:3000/admin` and login with admin account.

### Configurable Feature Modules

#### 🎥 YouTube Integration
- **Location**: Admin Panel > Configuration > YouTube Settings
- **Options**:
  - YouTube Data API v3 key
  - Search result cache duration
  - Default search sorting
  - Content type filtering (video/live/channel)

#### 🔍 Cloud Drive Search
- **Location**: Admin Panel > Configuration > Cloud Drive Search
- **Options**:
  - PanSou API configuration
  - Search result cache strategy
  - Filtering options (file type, size)

#### 💬 Danmaku System
- **Location**: Admin Panel > Configuration > Danmaku Settings
- **Options**:
  - Third-party danmaku API toggle
  - Default danmaku source priority
  - Smart performance optimization toggle
  - Cache duration settings

#### 🤖 AI Recommendations
- **Location**: Admin Panel > Configuration > AI Settings
- **Options**:
  - OpenAI API Key
  - Model selection (GPT-4/GPT-5/o series)
  - Max Tokens setting (default 3000)
  - Dynamic prompt management

#### 📺 IPTV Live TV
- **Location**: Admin Panel > Live TV Management
- **Options**:
  - m3u/m3u8 subscription links
  - EPG program guide URL
  - Live source aggregation toggle
  - Auto refresh interval

#### 🎬 Short Drama
- **Location**: Admin Panel > Configuration > Short Drama Settings
- **Options**:
  - Short drama API endpoint
  - Cache strategy
  - Mobile proxy toggle

#### 👥 User Management
- **Location**: Admin Panel > User Management
- **Features**:
  - User group permission settings
  - Inactive user cleanup configuration
  - Registration toggle control
  - User level management

#### 📊 Playback Statistics
- **Location**: Admin Panel > Statistics Management
- **Features**:
  - Global statistics dashboard
  - User viewing behavior analysis
  - Popular content rankings
  - Data export

#### 🔐 TVBox Integration
- **Location**: User Menu > TVBox Configuration
- **Features**:
  - IP whitelist management
  - Token generation and reset
  - TVBox config file export

---

## 🔄 Auto Update

### Using Watchtower

[Watchtower](https://github.com/containrrr/watchtower) can automatically detect and update Docker containers to the latest images.

```yml
services:
  watchtower:
    image: containrrr/watchtower
    container_name: watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --interval 86400 --cleanup
    restart: unless-stopped
```

### UI Tools Auto Update

- **Dockge**: Built-in auto-update feature
- **Portainer**: Supports container image auto-update
- **Komodo**: Provides auto-update configuration options

---

## 📱 Mobile App Usage

### Selene - Official Mobile Client

[Selene](https://github.com/MoonTechLab/Selene) is the official mobile app developed by the original MoonTV author, built with Flutter and optimized for mobile phones.

#### Supported Platforms
- **Android**: 5.0+ (API 21), ARM64 architecture only
- **iOS**: 12.0+

#### Key Features
- 🎨 Modern Material Design 3 interface
- 🌗 Dark/light theme support
- 🔍 Multi-source aggregated search (with SSE real-time search)
- ▶️ High-performance FVP video player
- 📊 Smart playback tracking
- ❤️ Personal favorites management
- 🎬 Support for movies, TV series, anime, variety shows

#### Usage Instructions

1. Download the latest version from [Selene Releases](https://github.com/MoonTechLab/Selene/releases)
   - Android: Download `.apk` file
   - iOS: Download `.ipa` file (requires self-signing)
2. Install the app on your phone
3. Open the app, fill in your server domain in settings: `https://your-domain.com`
4. Login with admin or regular user account
5. All playback records and favorites will sync with the web version automatically

#### Important Notes
- ⚠️ Selene is optimized for mobile phones, **NOT compatible with tablets, TVs, emulators**
- ⚠️ For Android TV or tablets, please use OrionTV below

---

## 📺 AndroidTV / Tablet Usage

### OrionTV - Large Screen Client

This project works with [OrionTV](https://github.com/zimplexing/OrionTV) on Android TV and tablets.

#### Applicable Scenarios
- Android TV / Smart TVs
- Android tablets
- Large screen devices

#### Configuration Steps

1. Install OrionTV on your device
2. Configure backend address in OrionTV: `http://your-domain:3000`
3. Login with admin or regular user account
4. Playback records will sync with web and Selene automatically

---

## 📜 Changelog

For complete feature updates and bug fixes, see [CHANGELOG](CHANGELOG).

### Latest Version: v5.5.4 (2025-10-03)

#### Added
- 🔐 TVBox regular user access support
- 🎨 Modernized login/register interface
- 💾 Calendar cache database migration

#### Improved
- 📊 Frontend database cache optimization
- 📦 Upgraded react-window to v2.2.0

#### Fixed
- 🔄 Fixed original episodes update logic
- 🗄️ Upstash object deserialization support
- 🚫 Eliminated Next.js dynamic route warnings

### Major Milestone Versions

- **v5.5.0**: User level system, release calendar, inactive user cleanup
- **v5.4.0**: Complete short drama features, playback statistics system
- **v5.3.0**: YouTube integration, AI recommendation system, TVBox security config
- **v5.2.0**: ArtPlayer 5.3.0 upgrade, cloud drive search integration
- **v5.1.0**: Bangumi API, IPTV features, virtual scrolling support
- **v5.0.0**: Douban details engine refactoring
- **v4.3.1**: User registration, danmaku system foundation

View [Complete Changelog](CHANGELOG) for all version changes.

---

## 🔐 Security & Privacy Notice

### ⚠️ Important Security Recommendations

1. **Set Strong Password**: Use a complex `PASSWORD` environment variable
2. **Disable Public Registration**: Close user registration in admin panel
3. **Personal Use Only**: Do not publicly share or distribute your instance link
4. **Comply with Local Laws**: Ensure usage complies with local laws and regulations

### 📋 Disclaimer

- This project is for educational and personal use only
- Do not use for commercial purposes or public services
- All content comes from third-party websites, this site stores no video resources
- Users are solely responsible for legal issues arising from public sharing
- Project developers assume no legal responsibility for user actions
- **This project does not provide services in mainland China**. Legal risks and responsibilities from usage in that region are the user's personal actions, unrelated to this project

---

## 📄 License

[![CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

This project is licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).

**This means**:
- ✅ You are free to share, copy, and modify this project
- ✅ You must give appropriate credit, provide a link to the license
- ❌ You may not use this project for commercial purposes
- ⚠️ If you remix, transform, or build upon the material, you must distribute your contributions under the same license

© 2025 LunaTV Enhanced Edition & Contributors

Based on [MoonTV](https://github.com/MoonTechLab/LunaTV) with extensive customization.

---

## 🙏 Acknowledgments

### Original Projects
- [MoonTV](https://github.com/MoonTechLab/LunaTV) — Original project
- [Selene](https://github.com/MoonTechLab/Selene) — Official mobile app
- [LibreTV](https://github.com/LibreSpark/LibreTV) — Inspiration source

### Core Dependencies
- [Next.js](https://nextjs.org/) — React framework
- [ArtPlayer](https://github.com/zhw2590582/ArtPlayer) — Powerful web video player
- [HLS.js](https://github.com/video-dev/hls.js) — HLS streaming support
- [react-window](https://github.com/bvaughn/react-window) — Virtual scrolling component
- [Tailwind CSS](https://tailwindcss.com/) — CSS framework

### Data Sources & Services
- [Douban](https://movie.douban.com/) — Movie & TV info data
- [TMDB](https://www.themoviedb.org/) — Movie database
- [Bangumi](https://bangumi.tv/) — Anime information
- [Zwei](https://github.com/bestzwei) — Douban CORS proxy
- [CMLiussss](https://github.com/cmliu) — Douban CDN service

### Special Thanks
- All sites providing free video APIs
- Open source community contributors
- Users who provide feedback and suggestions

---

## 📊 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=SzeMeng76/LunaTV&type=Date)](https://www.star-history.com/#SzeMeng76/LunaTV&Date)

---

<div align="center">

**If this project helps you, please give it a ⭐ Star!**

Made with ❤️ by LunaTV Enhanced Edition Team

</div>
