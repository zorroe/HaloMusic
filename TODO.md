# TODO / Roadmap

本文件记录已知问题与后续可做项。已完成的历史条目见 git 历史。

## 已完成（v1.2 优化升级）

- [x] 修复 `npm install` 的 ERESOLVE（`@videojs-player/vue` peer 与 video.js 8 冲突）→ 移除 video.js 依赖，MV 改用原生 `<video>`
- [x] Tailwind CSS 4 正式迁移（`@tailwindcss/postcss` + daisyUI 5 plugin，删除 v3 配置）
- [x] Electron 安全加固：`contextIsolation` + preload `window.halo` 桥 + CSP + 本地服务仅监听回环
- [x] 播放器核心重写：audio 事件驱动（去掉假进度 `setInterval`）、队列/随机/单曲循环、失败自动跳过、歌词二分定位
- [x] 请求层错误模型（`ApiError` + reject）、GET 重试与并发去重、循环依赖消除
- [x] 首屏并行加载、通用组件泄漏修复、死代码清理（`/test`、`/pan`、未引用静态资源）
- [x] 工程化：ESLint flat + Prettier + Vitest、`package-lock.json` 入库、README 重写

## 待办

- [ ] 主进程 `sandbox: true` 回归验证（当前 preload 为 CJS 单文件，`sandbox: false`）
- [ ] 动态端口：主进程分配 16666/17777 空闲端口并通过桥告知渲染进程，避免端口占用即退出
- [ ] 播放列表虚拟滚动（超长歌单，> 1000 首）
- [ ] 深色模式完整适配（`[data-theme="dark"]` 变量已存在，但 daisyUI 仅启用 light 主题）
- [ ] 打包版端到端回归（Windows NSIS）：登录、播放、MV、退出、升级覆盖安装
- [ ] 专辑 / 歌单收藏按钮接真实接口（`/album/sub`、`/playlist/subscribe` 已可用但 UI 仍为占位交互）
- [ ] 应用自动更新（electron-updater）
- [ ] 将 `NeteaseCloudMusicApi` 替换为持续维护的 fork（上游已归档）
