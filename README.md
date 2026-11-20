# HaloMusic

[![CI](https://github.com/zorroe/HaloMusic/actions/workflows/ci.yml/badge.svg)](https://github.com/zorroe/HaloMusic/actions/workflows/ci.yml)

> 基于 Electron + Vue 3 的网易云音乐第三方桌面客户端。界面设计参考 [YesPlayMusic](https://github.com/qier222/YesPlayMusic)。

HaloMusic 是一个开源的网易云音乐桌面客户端，通过内置的本地代理服务调用网易云音乐接口，支持听歌、歌单、歌手、专辑、MV、搜索、每日推荐、私人 FM 等常用功能。

> ⚠️ **免责声明**：本项目仅供个人学习、研究与技术交流使用，请勿用于任何商业及非法用途。音乐版权归网易云音乐及各版权方所有。因使用本项目产生的一切后果由使用者自行承担。

## 界面预览

![首页](https://pic-lxxx.oss-cn-shanghai.aliyuncs.com/202308052004587.png)
![歌单](https://pic-lxxx.oss-cn-shanghai.aliyuncs.com/202308052004341.png)
![播放器](https://pic-lxxx.oss-cn-shanghai.aliyuncs.com/202308052005325.png)
![搜索](https://pic-lxxx.oss-cn-shanghai.aliyuncs.com/202308052012679.png)

## 功能特性

- 🎵 音乐播放：队列播放、单曲循环 / 列表循环 / 随机播放、音量记忆、音质切换、歌词同步滚动
- 🎨 全新界面（v1.3）：左侧边栏 + 顶栏 + 底部播放条的桌面音乐应用布局，统一设计令牌（圆角 / 阴影 / 间距 / 颜色）与自适应卡片网格、胶囊按钮，首页 / 发现 / 搜索 / 各详情页重构
- 📚 音乐库：歌单、专辑、歌手、排行榜、每日推荐、私人 FM、MV 播放
- 🔍 搜索：单曲 / 专辑 / 歌手 / 歌单 / MV / 用户多类型搜索
- 👤 账号：二维码 / 手机号登录，收藏与「我喜欢的音乐」同步
- 🖥️ 桌面体验：Windows 原生标题栏（应用图标 + 最小化/最大化/关闭）、系统托盘与全局媒体键、本地代理规避跨域与 Referer 限制
- 🔒 安全模型：`contextIsolation: true` + `nodeIntegration: false` + preload 桥接 + CSP 注入，渲染进程不接触 Node API
- 🌙 深色模式与本地字体（Barlow），完全离线可用，无外网字体 / 脚本依赖

## 技术栈

| 分类        | 技术                                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| 桌面框架    | Electron 45（主进程 + preload + 原生窗口）                                                                |
| 前端框架    | Vue 3.5（`<script setup>` + TypeScript）、Vue Router 4、Pinia 3                                           |
| 构建工具    | Vite 6、`vite-plugin-electron`、`vue-tsc`                                                                 |
| 样式        | Tailwind CSS 4（`@tailwindcss/postcss`）+ daisyUI 5 + SCSS                                                |
| 状态 / 工具 | `@vueuse/core`、axios、dayjs、js-cookie                                                                   |
| 本地服务    | Express（静态资源 + 反向代理）、[NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi) |
| 打包        | electron-builder（Windows NSIS / macOS DMG / Linux AppImage）+ electron-updater 自动更新                  |
| 质量        | ESLint 9（flat config）、Prettier、Vitest、@vue/test-utils + happy-dom、commitlint + lint-staged + husky  |
| CI          | GitHub Actions（Windows / Ubuntu × Node 22 / 24 矩阵）                                                    |

## 目录结构

```
HaloMusic
├─ electron/                 # Electron 主进程与 preload
│  ├─ main/index.ts          # 窗口、生命周期、IPC、CSP、本地服务编排
│  ├─ preload/index.ts       # contextBridge 暴露 window.halo
│  └─ electron-env.d.ts
├─ public/                   # 不被构建处理的静态资源（logo、favicon）
├─ src/
│  ├─ api/                   # 网易云音乐接口封装
│  ├─ assets/                # 样式（css）、字体（fonts）、图标（icons）
│  ├─ components/            # 通用组件与布局组件（Header/Footer/Menubar/Player…）
│  ├─ router/                # 路由与登录守卫
│  ├─ store/                 # Pinia store（用户、搜索、播放器）
│  ├─ types/                 # 接口数据类型定义
│  ├─ utils/                 # request、bridge、player、lyric、common
│  ├─ views/                 # 页面（首页 / 歌单 / 专辑 / 歌手 / 搜索 / MV / 我的）
│  ├─ App.vue
│  ├─ main.ts
│  └─ style.scss
├─ tests/                    # Vitest 单元测试
├─ .github/workflows/ci.yml  # CI 质量门禁（Windows / Ubuntu × Node 22 / 24）
├─ .husky/                   # Git hooks（pre-commit → lint-staged，commit-msg → commitlint）
├─ commitlint.config.mjs     # Conventional Commits 规范
├─ .lintstagedrc.json        # 暂存文件自动 lint / format
├─ index.html
├─ vite.config.ts
├─ electron-builder.json5
└─ package.json
```

## 快速开始

### 环境要求

- Node.js >= 20（推荐 22 / 24）
- npm >= 10（仓库提交 `package-lock.json`，推荐 `npm ci`）
- Windows / macOS / Linux

### 安装依赖

```bash
npm install
```

> 国内网络建议在 `.npmrc` 中保留 `electron_mirror=https://npmmirror.com/mirrors/electron/`，
> Electron 二进制在首次运行 `npm run dev` 时按需下载（Electron >= 45 不再在 install 阶段下载）。

### 开发

```bash
npm run dev
```

Vite 开发服务器监听 `http://127.0.0.1:3344`，并自动启动 Electron 主进程与 preload 构建。

### 构建与打包

```bash
npm run typecheck   # 渲染进程 + 主进程类型检查
npm run build       # typecheck + vite build + electron-builder 安装包
npm run build:dist  # 跳过类型检查，直接构建前端产物并打包
```

构建产物：

- 渲染进程：`dist/`
- 主进程 / preload：`dist-electron/`
- 安装包：`release/<version>/`

> 注意：`electron-builder` 体积大且耗时，仅在需要出安装包时执行。

### 测试与代码质量

```bash
npm test            # vitest run（单元测试）
npm run test:watch  # vitest watch 模式
npm run lint        # eslint .
npm run lint:fix    # eslint . --fix
npm run format      # prettier --write .
npm run preview     # 预览已构建的前端产物
```

组件测试使用 `@vue/test-utils` + `happy-dom`（已在 devDependencies 中，`tests/**/*.spec.ts` 统一由 Vitest 执行）。

## 质量门禁

本地与 CI 使用同一套门禁命令，提交/合并前请确保以下四项全绿：

```bash
npm run typecheck   # vue-tsc（渲染进程）+ tsc（electron 主进程/preload）
npm run lint        # ESLint 9 flat config（当前为 warn 级别，0 error 才通过）
npm test            # Vitest 单元测试
npx vite build      # 渲染进程 + electron main/preload 构建（不启动 Electron）
```

### 提交门禁（Git hooks）

`npm install` 时会通过 `prepare` 脚本自动安装 husky hooks（`core.hooksPath=.husky/_`）：

- `pre-commit` → `lint-staged`：对暂存区的 `*.{ts,vue}` 执行 `eslint --fix`，`*.{json,md,yml,scss,css}` 执行 `prettier --write`；
- `commit-msg` → `commitlint`：强制 [Conventional Commits](https://www.conventionalcommits.org/)，允许的类型为
  `feat | fix | perf | refactor | docs | chore | build | ci | test | style`。

示例：`feat: 支持歌词逐行滚动`、`fix(player): 修复切歌后进度条漂移`。

> 若在未安装 Git hooks 的环境（如 CI 容器、受限仓库）中提交，可执行 `npx husky` 手动安装；
> 不建议使用 `git commit --no-verify` 绕过门禁。

## CI（GitHub Actions）

工作流文件：[`.github/workflows/ci.yml`](.github/workflows/ci.yml)

- 触发：`push` / `pull_request`（`master`、`main`）以及手动 `workflow_dispatch`
- 矩阵：`ubuntu-latest` + `windows-latest` × Node `22` / `24`
- 步骤：`actions/checkout` → `setup-node`（npm cache）→ `npm ci` → `npm run typecheck` → `npm run lint` → `npm test` → `npx vite build`
- 设置了 `ELECTRON_SKIP_BINARY_DOWNLOAD=1`：CI 不需要 Electron 可执行文件（`vite build` 不会启动 Electron），可显著加快 `npm ci`
- `concurrency` 开启 `cancel-in-progress`：同一分支/PR 的新提交会取消旧运行
- CI 不做 `electron-builder` 打包（耗时且需要签名，见下节发布流程）

## 发布流程

发布配置在 [`electron-builder.json5`](electron-builder.json5)（`appId`、`productName`、`win/mac/linux` target、`publish: github`，仓库 `zorroe/HaloMusic`）。

```bash
# 1) 先构建前端产物（electron-builder 只会打包 dist / dist-electron）
npx vite build

# 2) 本地出包（不上传）
npm run release:win     # Windows NSIS（x64）
npm run release:mac     # macOS DMG
npm run release:linux   # Linux AppImage
npm run release         # 当前平台默认 target

# 3) 需要发布到 GitHub Releases 时（需 GH_TOKEN）
npx electron-builder --config electron-builder.json5 --publish always
```

说明：

- 打包产物输出到 `release/<version>/`，同时生成 `latest.yml` 等自动更新元数据（`generateUpdatesFilesForAllChannels: true`）。
- 上传 GitHub Release 需要 `GH_TOKEN`（或 `GITHUB_TOKEN`）环境变量；`npm run build` / `build:dist` 与 `release:*` 脚本均显式带 `--publish never`，只出包不发布，避免误传；需要发布时手动加 `--publish always`。
- **代码签名**：当前未配置 Windows/macOS 签名证书，安装包在系统上会提示"未知发布者"；正式分发前建议配置 `CSC_LINK` / `CSC_KEY_PASSWORD` 与 macOS 公证。

## 自动更新

- 运行时依赖 `electron-updater` 已加入 `dependencies`（会被 electron-builder 打进 asar），由主进程负责接线与更新策略。
- 更新源来自 `electron-builder.json5` 的 `publish`（GitHub Releases），客户端读取打包时生成的 `app-update.yml` / `latest.yml`。
- 开发模式（`npm run dev`）不启用自动更新；只有打包后的正式版本会检查更新。
- 若发布前未配置签名，自动更新仍可用（下载安装包），但 Windows/macOS 可能弹出安全提示。

## 端口说明

| 端口    | 服务                 | 说明                                                                       |
| ------- | -------------------- | -------------------------------------------------------------------------- |
| `3344`  | Vite Dev Server      | 仅开发模式使用，绑定 `127.0.0.1`，`strictPort: true`                       |
| `16666` | NeteaseCloudMusicApi | 本地网易云音乐 API 服务，主进程启动，仅监听 `127.0.0.1`                    |
| `17777` | Express 本地代理     | 生产环境加载 `dist` 静态资源并将 `/api` 代理到 `16666`，仅监听 `127.0.0.1` |

> 端口被占用时应用会通过 `dialog.showErrorBox` 明确报错并退出，不会静默失败。

## 常见问题（FAQ）

**Q：启动后白屏 / 一直加载？**
A：先确认 `dist` 与 `dist-electron` 是否已构建（`npm run build:dist` 或 `npm run dev`）。生产模式下窗口加载的是 `http://127.0.0.1:17777`，若 Express 端口被占用会直接报错退出。

**Q：登录二维码不显示 / 接口报错？**
A：确认 16666 端口可用，且网络可访问网易云音乐接口。部分接口需要登录 Cookie，请重新登录。

**Q：播放提示「暂无资源」？**
A：受版权或会员限制，部分歌曲（含 VIP / 试听歌曲）无法获取音频流，客户端会自动跳过并提示。

**Q：`npm install` 出现 ERESOLVE？**
A：本项目依赖已适配 peer 约束，请使用仓库自带的 `package-lock.json`（`npm ci`）。不要使用 `--legacy-peer-deps` 绕过；若仍报错请附上完整日志提 issue。

**Q：国内安装 Electron 很慢？**
A：`.npmrc` 已配置 `electron_mirror` 指向 npmmirror。若仍失败，可临时设置环境变量 `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/` 后重新执行。

**Q：每次执行 npm 命令都提示 `Unknown project config "electron_mirror"`？**
A：这是 npm 11 对项目级未知配置项的提示，`electron_mirror` 是给 `@electron/get` 用的镜像变量（会以 `npm_config_electron_mirror` 传给依赖安装脚本），**不影响安装与运行**，可忽略。若不想看到该提示，可删掉 `.npmrc` 中的这一行，改用环境变量 `ELECTRON_MIRROR` 注入。

**Q：渲染进程能用 Node API 吗？**
A：不能，也不应该。安全模型已开启 `contextIsolation`，渲染进程通过 `window.halo`（preload 暴露）访问窗口控制、打开外链等能力，详见 `src/utils/bridge.ts`。

## 许可证与 API 来源

- 本项目基于 [MIT License](./LICENSE) 开源。
- API 源代码来自 [Binaryify/NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi)，遵循其原项目许可。
- 界面设计参考 [YesPlayMusic](https://github.com/qier222/YesPlayMusic)。

> 本项目仅供个人学习研究使用，禁止用于商业及非法用途。
