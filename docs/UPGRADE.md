# HaloMusic 优化升级报告

> 本次升级针对仓库 `master`（v1.1.0，最后一笔提交为 README 西语翻译）做了一次系统性体检与重构。
> 目标是：**让项目能干净安装、能构建、能安全运行，并修掉一批真实 bug**，同时补齐工程化基建。

---

## 1. 项目概况（升级前）

| 维度 | 情况 |
| --- | --- |
| 定位 | 网易云音乐第三方 Electron 桌面客户端（界面参考 YesPlayMusic） |
| 架构 | Electron 主进程内托管 `NeteaseCloudMusicApi`(16666) + Express 静态/反代服务(17777)；渲染进程为 Vue SPA，通过 `/api` 访问本地服务 |
| 技术栈 | Vue 3.5 + TypeScript + Vite 6 + Pinia + Vue Router 4 + Tailwind CSS 4 + daisyUI 5 + Electron 35 |
| 规模 | 64 个 `.vue/.ts` 文件、约 5,893 行；无测试、无 lint、无 lockfile |
| 运行方式 | `npm run dev`（Vite + Electron 联动） / `npm run build`（typecheck + vite build + electron-builder） |

---

## 2. 基线问题清单（分析结论）

### P0 —— 直接阻断：新克隆的仓库装不上、构建不出来

| # | 问题 | 证据 / 影响 |
| --- | --- | --- |
| 1 | **干净安装失败（ERESOLVE）** | `@videojs-player/vue@1.0.0` 的 peer 要求 `video.js@7.x`，而 `package.json` 声明 `video.js@^8.22.0`，`npm install` 直接报错。只有加 `--legacy-peer-deps` 才能装。 |
| 2 | **生产构建失败（Tailwind 4 配置错代）** | 依赖升到了 `tailwindcss@4`，但 `postcss.config.js` 仍用 v3 的 `tailwindcss` 插件，`style.scss` 仍用 `@tailwind base` 指令 → `vite build` 抛 `you're trying to use tailwindcss directly as a PostCSS plugin`。 |
| 3 | **`index.html` 残留调试脚本** | `<script src="http://localhost:8098"></script>` 会让每次启动都去请求一个不存在的本地端口，拖慢首屏、污染 CSP，完全离线时表现为卡顿。 |
| 4 | **幽灵依赖** | `Footer.vue` 里 `var _ = require('lodash')`，但 `lodash` 从未在 `package.json` 中声明；一旦渲染进程禁用 node 集成就会直接抛错。 |
| 5 | **打包配置双份且失效** | `package.json` 内有 `build` 字段，`electron-builder.json5` 又是一份（`appId: "YourAppID"`），且构建脚本没引用后者。 |

### P0 —— 安全：Electron 处于最不安全的配置

| # | 问题 | 风险 |
| --- | --- | --- |
| 6 | `nodeIntegration: true` + `contextIsolation: false` + `webSecurity: false` | 渲染进程可任意调用 Node/文件系统；任何被注入的第三方内容都可直接 RCE。 |
| 7 | 渲染进程直接 `import { ipcRenderer } from 'electron'`（`utils/common.ts`、`Menubar.vue`） | 依赖上述不安全配置才能工作，形成"要安全就全崩"的死锁。 |
| 8 | 本地 API 服务监听所有网卡 | `serveNcmApi` 默认 `host: ''`、Express 默认绑定 `0.0.0.0` → 同一局域网内其他设备可直接调用你本机的网易云 API 代理（含 Cookie）。 |
| 9 | CSP 形同虚设 | `index.html` 的 meta CSP 只有 `script-src 'self' 'unsafe-inline'`，而 `webSecurity:false` 已把同源策略关掉；无 `connect-src`/`img-src` 约束。 |
| 10 | 生命周期顺序错误 | `whenReady().then(createExpressApp).then(createWindow).then(startNeteaseMusicApi)`：窗口先加载、API 后启动，首屏请求必然竞态失败一次。 |

### P1 —— 功能正确性：能跑，但结果不可靠

| # | 问题 | 现象 |
| --- | --- | --- |
| 11 | **播放进度是假的** | `currentTime` 由 `setInterval` 每秒 `+1` 自增，与 `audio.currentTime` 完全脱钩 → 进度条漂移、暂停后仍走、切歌后乱跳、`ended` 时定时器不清。 |
| 12 | **`playOne` 永远判不相等** | `id !== current.value.currentSong?.id`：`string` 与 `number` 比较恒为 true → 每次点击都重新请求 `/song/detail`。 |
| 13 | **请求失败会让调用方崩** | `request.ts` 的错误拦截器不解包也不 `reject`，调用方拿到 `undefined` 后 `const { data } = undefined` → TypeError；无响应时 `response.data` 先崩。 |
| 14 | **`sleep()` 是忙等** | `while(true)` 空转，直接卡死主线程。 |
| 15 | **歌词滚动定时器泄漏** | `Player.vue` 在 `setup` 顶层 `setInterval(scrollTo, 1000)`，永不清理，页面关掉还在跑。 |
| 16 | `setInterval`/`document` 监听普遍不清理 | `EaDrawer` 的 document click、`notify` 的定时器、`Notification` 的定时器均泄漏；`notify` 的 `seed` 从不自增 → 所有通知 id 都是 `notification_1`。 |
| 17 | `@dblclick.native` | Vue 3 已移除 `.native` 修饰符，双击播放实际失效/报 warning。 |
| 18 | 未登录即崩溃 | `saveLikeMusicIds` 里 `JSON.parse(localStorage.getItem('user') || '')`，未登录时整个首页 `onMounted` 抛错。 |
| 19 | 刷新即丢失用户信息 | `userInfo` 只存在内存 store，刷新页面后头像/昵称消失。 |
| 20 | 首页/列表页串行请求 | `home` 5 个接口串行 `await`，首屏要等 5 个 RTT。 |
| 21 | 页面级空白 bug | `artist/tracks.vue` 只渲染分页按钮、**完全不渲染歌曲列表**；`PlayListCover` 标题用字符串表达式当点击事件 → 点不开歌单。 |
| 22 | 音质选择是假的 | Footer 的音质弹窗内容写死为 `ddd`，`chooseQuality()` 只 `console.log`。 |
| 23 | 离线不可用 | `global.scss` 用 `@import url("https://fonts.googleapis.com/...")`，Electron 离线启动会阻塞等待外网字体。 |

### P2 —— 工程化与可维护性

- 无 `package-lock.json`（`.gitignore` 主动忽略 lockfile），依赖不可复现。
- 无 ESLint / Prettier / 测试 / CI，`package.json` 只有 3 个脚本。
- 大量 `any`、`console.log` 残留；`request → common → router → views → api → request` 存在**循环依赖**。
- 死代码：`/test`、`/pan` 路由与页面、未引用的 `vue.svg`/`vite.svg`/`electron.svg`/`main-bg.png`。
- 全局组件全量注册 + `unplugin-vue-define-options`（Vue 3.3+ 已原生支持 `defineOptions`）。
- daisyUI 5 移除了 `form-control` / `input-group` / `tab-bordered`，Header 搜索框、`me` 页 tab 样式已失效。

---

## 3. 升级方案

按"**能装能建 → 安全 → 正确 → 体验 → 工程化**"的顺序拆成 5 条互不重叠写域的并行工作流（共享契约先由 Lead 冻结：`src/utils/bridge.ts` + `src/types/electron.d.ts`）：

| 工作流 | 负责范围 | 目标 |
| --- | --- | --- |
| 构建与工程化 | `package.json` / vite / tailwind / 打包 / lint / test / README | 干净安装 + 可构建 + 质量工具链 |
| Electron 安全 | `electron/**` | 安全默认、preload 桥、CSP、服务生命周期、优雅退出 |
| 播放器核心 | `playerStore` / `Player.vue` / `Footer.vue` / `utils/player` / `utils/lyric` | 事件驱动播放引擎、队列、歌词、零泄漏 |
| 数据层 | `utils/request`、`utils/common`、`api/**`、`store/index`、`types/**` | 错误模型、去循环依赖、类型化 |
| 视图层 | `main.ts` / `App.vue` / `router` / `views/**` / 通用组件 | 并行加载、组件 bug、死代码清理 |

---

## 4. 变更清单

### 4.1 构建与依赖
- **修复依赖树**：移除 `@videojs-player/vue`、`video.js`、`lyric-parser`、`sass-loader`、`unplugin-vue-define-options`、`vite-plugin-electron-renderer`、`cli-color`；补 `@types/node`、`@types/express*`、`@types/js-cookie`。`npm install` 现已**无需** `--legacy-peer-deps`。
- **依赖大版本升级**：Electron `35 → 45.4.1`（安全补丁）、electron-builder `25 → 26.18`、Tailwind `4.3.5` + `@tailwindcss/postcss`、daisyUI `5.8`、Vue `3.5.45`、vue-router `4.6.5`、Pinia `3.0.4`、`@vueuse/core 13.9`、TS `5.9.3`、Vite `6.4.6`、axios `1.21`、`NeteaseCloudMusicApi 4.34.1`。
- **Tailwind 4 正式迁移**：唯一入口 `src/assets/css/tailwind.css`（`@import "tailwindcss"` + `@plugin "daisyui"`），PostCSS 换 `@tailwindcss/postcss`，删除 `tailwind.config.js`；`style.scss` 与所有 SFC 的 `@apply` 改写为纯 CSS。
- **离线化**：去掉 Google Fonts 外部 `@import`，改用本地 `Barlow-*.woff2` + 系统字体栈。
- `vite.config.ts`：删 `renderer()`/`DefineOptions()`、dev 固定 `127.0.0.1:3344`（strictPort）、`manualChunks` 拆包、主进程依赖 external。
- `index.html`：删除 `localhost:8098` 脚本与空 `<style>`、`lang="zh-CN"`、CSP 交给主进程注入。
- 新增 `electron-builder.json5` 单一打包配置（`com.halomusic.app` / NSIS x64 / DMG / AppImage / asar），`package.json` 内重复的 `build` 段删除。
- 新增 `.editorconfig`、`.prettierrc.json`、`.prettierignore`、`eslint.config.mjs`（flat config）、`vitest.config.ts`。
- `.gitignore` 不再忽略 lockfile，**`package-lock.json` 入库**；新增 `dist`/`release`/`*.tsbuildinfo` 等忽略项。

### 4.2 Electron 安全加固（`electron/main/index.ts`、`electron/preload/index.ts`）
- `nodeIntegration: false` + `contextIsolation: true` + `webSecurity: true`（移除 `webSecurity:false`），`webviewTag: false`。
- 新增 **preload 桥**：`contextBridge.exposeInMainWorld('halo', …)`，渲染进程只通过 `window.halo` 访问 `openExternal` / 窗口控制 / 版本号；配套冻结契约 `src/utils/bridge.ts`（浏览器环境自动降级 no-op）。
- **CSP 由主进程注入**（`onHeadersReceived`，只作用于应用来源）：生产从严（`script-src 'self'`），开发放行 Vite HMR 的 `ws://127.0.0.1:*`。
- **本地服务只绑回环**：NCM API 显式 `host: '127.0.0.1'`，Express `listen(17777, '127.0.0.1')`；Express 侧增加 Host 校验（防 DNS rebinding）与 `/api` Origin 白名单。
- **启动顺序修正**：`NCM API（TCP 轮询确认可用）→ Express → 窗口`；启动失败 `dialog.showErrorBox` 后退出。
- 窗口：`show:false` + `ready-to-show`、`backgroundColor` 防白屏、`win` 全程判空、生产关闭 devTools。
- 导航/新窗口/权限：`will-navigate`/`will-redirect` 仅允许应用来源；`setWindowOpenHandler` 一律 deny，仅 `https` 交系统浏览器；`setPermissionRequestHandler`/`setPermissionCheckHandler` 全拒。
- IPC 统一 `halo:*` 常量并做参数校验（URL 只允许 http(s)、长度 ≤2048、拒绝控制字符；校验 `senderFrame` 来源）。
- 退出：`close` 走 `app.quit()`，`before-quit` 关闭 Express 与 NCM API 两个 server（不再 `app.exit()` 强杀）。
- **升级兼容**：生产页面来源由 `localhost:17777` 改为 `127.0.0.1:17777`，主进程做一次性 cookie 域迁移（`userData/.cookie-migrated.json` 标记），老用户升级后**无需重新扫码登录**。
- 启动 loading 动画增加 `halo:app-ready` IPC 兜底（原 `postMessage` 通道保留）。

### 4.3 播放器核心（`src/store/playerStore.ts`、`utils/lyric.ts`、`Player.vue`、`Footer.vue`）
- **删除假进度**：改为 `audio` 事件驱动（`timeupdate` + rAF，写入 store 节流到 10Hz），`pause`/`seek`/`ended`/切歌等离散事件立即同步；`duration` 来自 `loadedmetadata`。
- **播放状态机**：唯一入口 `startSong`，token 自增防快速切歌竞态；版权检查 → 取流 → `src` → `play`，歌词与取流并行。
- **失败自愈**：`audio error` / 无版权 / 无音源 → 提示并自动跳下一首，连续失败 5 次停止（避免刷爆接口）。
- **队列**：`playOne` 命中队列直接切歌（不再重复请求详情）、插入去重、`playMulti` 单次批量拉取、空队列不再 TypeError、`removeSong`/`clearPlaylist`/`playByIndex`。
- **随机播放**：预生成 Fisher-Yates shuffle 池，一轮内不重复、一轮播完才重洗。
- **音质**：4 档（standard/higher/exhigh/lossless）真实选择 modal（替换写死的 `ddd`），持久化；切音质先探测是否有源，失败回退旧音质并保持进度。
- **歌词**：新增纯函数 `src/utils/lyric.ts`（多时间戳 / `[offset:]` / 元信息 / CRLF / 脏行容错）、`findActiveLyricIndex` 二分 O(log n)；`Player.vue` 改为 `watch(activeLyricIndex)` + `scrollIntoView`，删除裸 `setInterval`，点击歌词 seek。
- `Footer.vue`：删除 `require('lodash')`，`.native` 修正，播放队列抽屉支持高亮/双击/删除/清空，进度条按 `duration` 走。

### 4.4 数据层（`utils/request.ts`、`utils/common.ts`、`api/**`、`store/index.ts`、`types/**`）
- **错误模型**：新增 `ApiError`，网络/超时/HTTP 码/业务码（含 301 需登录）分类；错误**一定 reject**，成功仍直接返回 `response.data`（不破坏调用方）。
- **健壮性**：15s 超时、GET 幂等重试 2 次（300/900ms 退避）、并发 GET 去重、`withCredentials`。
- **消除循环依赖**：`request` 不再 import `common`，`common` 不再静态 import router/views（改动态 import + 新增 `src/api/user.ts`）。
- `common.ts`：`sleep` 改 Promise；`ipcRenderer` → `bridge`；`checkLoginStatus` 网络失败不再误踢登录；未登录/脏 JSON 全部容错；`formatTrackTime` 行为保持不变。
- `store/index.ts`：用户信息 `useLocalStorage` 持久化（刷新不丢）、`isLogin` 联动；搜索分页追加按 id 去重；新增 `useLikeStore`（喜欢列表跨组件响应式 + 乐观更新/失败回滚）。
- `api/**` + `types/**`：去 `any`、补参数与返回类型、空数组/空 url 容错、音频 URL 统一 http→https。

### 4.5 视图层（`main.ts`、`App.vue`、`router`、`views/**`、通用组件）
- `main.ts`：接入 Tailwind 4 入口、移除 video.js、全局 `errorHandler` + `unhandledrejection` 兜底。
- 路由：全路由 `meta.title` + `document.title`、登录守卫带 `redirect`、新增 404、删除 `/test` 与 `/pan`。
- **性能**：home 5 个接口 `Promise.allSettled` 并行；me/playlist/artist/tracks 多路并行；search 6 类型并发 + 250ms 防抖 + 串行队列。
- **MV 页**：`@videojs-player/vue` 换原生 `<video controls>`（顺带消灭 peer 冲突依赖）。
- **修 bug**：`EaDrawer` 监听泄漏、`notify` id 重复/节点残留、`Image` 的 `?param=` 拼接、`PlayListCover` 点击失效、`artist/tracks` 页面空白、`playlist` 改名赋值 ref、`login` 二维码过期重启定时器清错、`me` 页 `.rotating` 无动画。
- **daisyUI 5 适配**：Header 搜索框、`me` 页 tab 用纯 CSS/Tailwind 重写；`EaModal` 改为自绘 overlay 但保留 `id + label[for]` 触发契约（不与调用方耦合）。
- 死代码清理：`views/test`、`views/pan`、4 个未引用静态资源；`App.vue` 里从未渲染的 `<Modals />` 补注册。

### 4.6 工程化
- 脚本：`dev` / `build` / `build:dist` / `typecheck`（渲染进程 + 主进程双端）/ `lint` / `lint:fix` / `format` / `test` / `preview`。
- 测试：Vitest + 13 个用例（LRC 解析 8、时间格式化 5）。
- 文档：README 全量重写（技术栈、目录、脚本、端口、FAQ）；`TODO.md` 更新为路线图；本报告。

---

## 5. 验证结果

| 验收项 | 命令 | 结果 |
| --- | --- | --- |
| 依赖可解析 | `npm install`（**不带** `--legacy-peer-deps`） | ✅ exit 0，ERESOLVE 消除 |
| 渲染进程类型 | `vue-tsc --noEmit` | ✅ 0 error |
| 主进程类型 | `tsc -p tsconfig.node.json --noEmit` | ✅ 0 error |
| 单元测试 | `vitest run` | ✅ 2 文件 / 13 用例通过 |
| 代码规范 | `eslint .` | ✅ 0 error |
| 生产构建 | `vite build` | ✅ 渲染进程 + 主进程 + preload 全部产出 |
| 语料扫描 | `@apply` / `.native` / `require(` / `process.env` / `ipcRenderer` / `console.log` | ✅ 渲染进程内全部归零 |
| 主进程行为 | mock Electron 集成探针（构建产物实跑） | ✅ 生产 40/40、开发 37/37、preload 契约 22/22、cookie 迁移 6 场景全 PASS |
| **真实运行烟测** | `npm run dev`（真实 Electron + Vite + 双本地服务） | ✅ 应用正常启动：Vite 就绪 → NCM API `127.0.0.1:16666` 就绪 → Express `127.0.0.1:17777` 就绪 → 主窗口加载 → 渲染进程发起 `/login/status`、`/login/qr/key`、`/login/qr/create` 并正常轮询 `/login/qr/check`（登录页渲染成功、CSP 未拦截、preload 桥可用、路由守卫生效）；全程无 error 日志 |

构建体积：`dist` 共 38 个文件 / ~889 KB（gzip 前），拆包为 `vue-vendor 165.7KB` / `axios 59.2KB` / `icon-park 22.4KB` / `index 199.2KB`；主进程 `10.3KB`、preload `2.8KB`。

---

## 6. 风险与后续

**需要真机回归的（开发模式已实跑烟测，打包产物与交互细节仍需人工过一遍）**
1. `npm run build` 产出的安装包端到端：窗口显示、CSP 实际生效、IPC 往返、loading 消失（已有 5s 兜底）、升级覆盖安装。
2. 重点交互：扫码登录成功后跳转、退出登录弹窗、播放队列抽屉、音质弹窗、歌单删除、MV 原生 video、搜索分页。
3. 升级路径：用 v1.1.0 已登录的 userData 实测一次，观察日志是否出现"旧 localhost 登录 cookie 迁移完成"。

**已知取舍**
- 连续 5 首不可播会停止（防刷接口），手动下一首可继续。
- 端口固定 16666 / 17777，被占用会弹错误框退出（不再静默失败）；动态端口在 TODO 中。
- `sandbox: false`（preload 为 CJS 单文件），进程级沙箱可作为下一步加固。
- 失败请求现在会 reject，全局 `unhandledrejection` 兜底会 toast，网络抖动时提示可能偏多（已做 1.2s 同文案去重）。
- 生产 CSP 不放行 `http:` 图片/媒体，依赖渲染层统一 https（已核对）。

**建议后续**：动态端口、列表虚拟滚动、深色模式完整适配、electron-updater 自动更新、NeteaseCloudMusicApi 迁移到维护中的 fork（上游已归档）。

---

## 7. 升级后的用户可见变化

- 新克隆仓库 `npm install && npm run dev` **开箱可用**（不再需要 `--legacy-peer-deps`）。
- 播放进度条终于准了；切歌不在黑屏卡死；无版权歌自动跳过。
- 音质可以真的选；播放队列能删单曲/清空。
- 首屏更快（并行请求）；离线启动不再等外网字体。
- 升级后老用户不需要重新扫码登录。
- 打包体积更小（移除 video.js/lodash 轨迹与重复样式），渲染进程不再拥有 Node 权限。
