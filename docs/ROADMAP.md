# HaloMusic 后续开发计划与优化清单

> 前置状态：v1.2 优化升级已完成（见 [UPGRADE.md](./UPGRADE.md)）。当前基线：`npm install` 干净可装、`typecheck` 0 error、`eslint` 0 warning、13 个单测、`vite build` 通过、开发模式真实启动通过。
>
> 本文分两部分：**① 全量优化清单**（代码 / UI / 动效 / 桌面能力 / 性能 / 工程化），**② 分阶段落地计划**（含验收标准与风险）。

---

## 0. 现状盘点（本次审计得到的事实）

| 维度                 | 现状                                                                                                                                                                              | 结论                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| 类型安全             | `any` 仅剩 2 处（`vite-env.d.ts` 的 SFC 声明等必要位置）                                                                                                                          | 良好，无需专项治理   |
| 测试                 | 13 个单测（LRC 解析、时间格式化）                                                                                                                                                 | 覆盖面窄，缺组件/E2E |
| 代码重复             | **10 个页面各自复制了一份 loading spinner + `@keyframes *-spin`**（`album`/`artist`/`artist/tracks`/`explore`/`home`/`mv`/`playlist`/`playlist/recommendMusic`/`search`/`login`） | 需抽公共组件         |
| 路由动效             | `App.vue` 的 `<router-view>` **没有任何 `<Transition>`**                                                                                                                          | 页面切换是硬切       |
| 播放页动效           | 封面静态、无唱片旋转、无环境光背景；仅 `translateY` 开合                                                                                                                          | 动效最大短板         |
| 歌词动效             | 仅当前行变色/改字号，无模糊/逐字/平滑过渡                                                                                                                                         | 可显著提升质感       |
| 深色模式             | `global.scss` 定义了 `[data-theme="dark"]` 变量，但**全仓无任何地方设置该属性**                                                                                                   | 死代码，需真正落地   |
| 骨架屏               | 无（页面加载只有转圈，`v-show="loaded"` 直接空白）                                                                                                                                | 感知性能差           |
| 列表虚拟化           | 无（`v-for` 直接渲染全量，歌单可上千行）                                                                                                                                          | 长列表会掉帧         |
| 请求取消             | 全仓无 `AbortController`（快速切页时旧请求仍会回写）                                                                                                                              | 需补                 |
| 媒体键/托盘/系统集成 | `electron/main` 无 `globalShortcut`/`Tray`/`setProgressBar`                                                                                                                       | 桌面音乐应用刚需缺失 |
| 自动更新             | 无 `electron-updater`                                                                                                                                                             | 发布能力缺失         |
| CI/E2E               | 无 `.github/workflows`、无 Playwright                                                                                                                                             | 无质量门禁           |
| 队列持久化           | 整个歌曲对象数组写入 `localStorage`（上千首 ≈ 1MB，逼近配额）                                                                                                                     | 应只存 id            |

---

## 1. 全量优化清单

### A. 代码与架构

| 编号 | 事项                                                     | 现状 / 做法                                                                                                                                        | 收益                       |
| ---- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| A1   | 抽取 `EaLoading` / `EaSkeleton` / `EaEmpty` 三个公共组件 | 10 处 spinner 重复；统一 props（`size`/`text`/`variant`）                                                                                          | 去重 ~150 行，动效统一     |
| A2   | 播放队列只持久化 id 列表                                 | `playerStore` 现用 `useLocalStorage('player-playlist', [])` 存完整对象；改为存 `ids`，启动时批量 `/song/detail` 回填（已有 `getMusicDetail(ids)`） | 省 storage、避免配额风险   |
| A3   | 请求取消（AbortController）                              | `request.ts` 增加 `signal` 透传 + 每个视图在 `onBeforeUnmount` abort                                                                               | 快速切页不写脏数据、省流量 |
| A4   | 列表虚拟滚动                                             | 歌单/排行/搜索结果（`MusicTable`）改窗口化渲染（固定行高 64px），或引入 `vue-virtual-scroller`                                                     | 1000+ 行稳定 60fps         |
| A5   | 图片渐进加载（LQIP）                                     | `Image.vue` 先加载 `?param=20y20` 高斯模糊占位，再切 `param=300y300`，用 `IMG.decode()` 避免闪烁                                                   | 体感更快、无白块           |
| A6   | API 轻量缓存                                             | 对 `playlist/detail`、`album`、`artist` 详情做内存 LRU + TTL（2–5 min），返回上一页零抖动                                                          | 减少重复请求               |
| A7   | 错误分级                                                 | `ApiError` 增加 `silent` 语义：后台预取失败不 toast，仅用户主动操作失败提示                                                                        | 减少通知噪音               |
| A8   | 清理兼容垫片                                             | `utils/common.ts` 里的 `PlayerStoreLike` 类型 shim 已无必要（`clearPlaylist` 已存在）                                                              | 代码简洁                   |
| A9   | store 拆分                                               | `store/index.ts` 拆为 `user.ts` / `search.ts` / `like.ts`                                                                                          | 可读性                     |
| A10  | 测试补齐                                                 | 组件测试（`@vue/test-utils` + `happy-dom`）：`MusicTable`、`EaModal`、`Footer`；store 测试：队列/随机/`useLikeStore`                               | 回归安全网                 |
| A11  | 契约版本号                                               | `window.halo` 增加 `apiVersion`，preload 与渲染层协商，便于后续扩展 IPC 而不破坏旧包                                                               | 长期演进                   |
| A12  | 主进程拆分                                               | `electron/main/index.ts` 已 700+ 行，拆为 `window.ts` / `server.ts` / `security.ts` / `ipc.ts`                                                     | 可维护性                   |

### B. UI / 视觉

| 编号 | 事项                              | 说明                                                                                                                                                                                                                                   |
| ---- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1   | **骨架屏**（首页/歌单/搜索/我的） | 用与真实布局同尺寸的灰块 + shimmer，替代转圈；避免 CLS                                                                                                                                                                                 |
| B2   | 统一空态/错误态                   | `EaEmpty`：无结果 / 网络错误 / 需要登录 / 无版权，均带"重试"按钮                                                                                                                                                                       |
| B3   | **深色模式落地**                  | 设置 `document.documentElement.dataset.theme`，跟随系统（`prefers-color-scheme`）+ 手动开关；daisyUI 5 配置 `themes: light --default, dark --prefersdark`；补齐 `bg-white` 等硬编码颜色的变量化（当前 Header/抽屉/Modal 多处写死白色） |
| B4   | 封面取色（Ambient Color）         | canvas 取封面主色 → 播放页渐变背景、进度条/高亮色联动；带兜底色                                                                                                                                                                        |
| B5   | **播放页重设计**                  | 左侧封面 + 右侧歌词 + 底部控制；背景为封面模糊放大 + 缓慢平移（性能友好，用两张 img + `filter:blur(60px)`）                                                                                                                            |
| B6   | 迷你播放器 / 桌面歌词窗口         | 独立无边框 `BrowserWindow`（`alwaysOnTop`、`transparent`），共享同一 pinia 状态需走 IPC 同步或复用同一 renderer 路由                                                                                                                   |
| B7   | 列表行增强                        | hover 显示播放按钮；右键上下文菜单（下一首播放 / 加入歌单 / 查看专辑 / 复制链接 / 打开网易云）                                                                                                                                         |
| B8   | 搜索增强                          | 搜索历史（本地持久化 + 可清除）、类型 tab 化、回车即搜、Esc 清空                                                                                                                                                                       |
| B9   | 我的页数据可视化                  | 听歌排行/最近播放做成图表（纯 CSS/SVG，不引图表库）                                                                                                                                                                                    |
| B10  | 无障碍                            | 焦点环（`:focus-visible`）、`aria-label`、键盘导航（↑↓ 选行、Enter 播放、Esc 关闭）、`role` 语义                                                                                                                                       |
| B11  | 设计 token                        | 颜色/圆角/间距/字号/阴影统一为 CSS 变量（当前散落 `rgb(51,94,234)` 等硬编码）                                                                                                                                                          |
| B12  | 原生窗口材质                      | Win11 `backgroundMaterial: 'mica'`（Electron 30+）、macOS `vibrancy: 'sidebar'`；当前是纯 CSS 毛玻璃，视觉层叠感不足                                                                                                                   |
| B13  | 细节统一                          | 滚动条、hover 色阶、禁用态、选中态、托盘图标（含 @2x）                                                                                                                                                                                 |

### C. 动效（Motion）

> 统一规范：只用 `transform` / `opacity` / `filter`（避免 layout 抖动）；时长 `120–320ms`；曲线 `cubic-bezier(0.2, 0, 0, 1)`；全部支持 `prefers-reduced-motion` 降级。

| 编号 | 事项               | 做法                                                                                                                                                                  |
| ---- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1   | **路由切换过渡**   | `App.vue` 包 `<Transition name="page" mode="out-in">`（fade + translateY(8px)）；动画时长 180ms，避免与 keep-alive 缓存冲突（`out-in` + 缓存组件不重复入场）          |
| C2   | 播放页开合         | 现为 300ms translateY；改弹簧曲线（`cubic-bezier(0.34, 1.56, 0.64, 1)`），封面/歌词错峰 40ms 入场                                                                     |
| C3   | **播放页唱片效果** | 封面容器播放时 `animation: vinyl 20s linear infinite`，暂停时 `animation-play-state: paused`；外层唱片纹路 + 中心轴点                                                 |
| C4   | 歌词动效           | 非当前行 `blur(1px)` + `opacity .45`，当前行 `scale(1.06)` + 主色；滚动用 `scroll-behavior: smooth` + `transition`；进阶：逐字卡拉OK（需 `/lyric/new` 的 `yrc` 格式） |
| C5   | 封面 hover         | `scale(1.03)` + 阴影加深 + 播放按钮 spring 弹出（`transform: scale(.8)→1` + `opacity`）                                                                               |
| C6   | 骨架 shimmer       | 渐变扫光 `background: linear-gradient(...) ; background-size: 200%`；`animation: shimmer 1.2s infinite`                                                               |
| C7   | 交互微动效         | 播放/暂停图标 `scale` 脉冲；喜欢按钮 heart pop（`1 → 1.25 → 1`，180ms）；图标 hover 抬升 1px                                                                          |
| C8   | **播放中动感音条** | 当前行左侧 3 根 bar 高度波动动画（替代纯文字高亮），暂停时静止                                                                                                        |
| C9   | 浮层动效统一       | Toast（右侧滑入 + 淡出）、Drawer（translateX + 背景 fade）、Modal（scale .96→1 + fade），统一 200ms                                                                   |
| C10  | 进度条/音量条      | hover 时 thumb 放大 1.4x、条体加高 2px；拖动时 tooltip 跟随                                                                                                           |
| C11  | 列表入场           | 仅首屏前 8 项做 30ms stagger 淡入；长列表不做逐项动画                                                                                                                 |
| C12  | 减动效支持         | 全局 `@media (prefers-reduced-motion: reduce) { * { animation-duration:.01ms!important; transition-duration:.01ms!important } }`                                      |
| C13  | 动效 token         | `--motion-fast: 120ms; --motion-base: 200ms; --motion-slow: 320ms; --ease-out: cubic-bezier(.2,0,0,1)`                                                                |

### D. 桌面能力（Electron）

| 编号 | 事项                               | 说明                                                                                                                                                  |
| ---- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1   | **全局媒体键**                     | `globalShortcut` 注册 `MediaPlayPause` / `MediaNextTrack` / `MediaPreviousTrack` → IPC 到渲染层播放器（音乐应用刚需）                                 |
| D2   | 系统媒体控制（SMTC / Now Playing） | Windows 需原生模块（如 `electron-media-service`）或 `Windows.Media` 互操作；macOS 用 `MPNowPlayingInfoCenter`（需原生）。**放最后做**，评估构建复杂度 |
| D3   | **托盘**                           | `Tray` + 菜单（播放/暂停、上一首、下一首、显示主窗口、退出）；可选"关闭到托盘"设置项                                                                  |
| D4   | 窗口状态持久化                     | 位置/尺寸/是否最大化写入 `userData/window-state.json`                                                                                                 |
| D5   | 自动更新                           | `electron-updater` + GitHub Releases（或私有源）；需要代码签名才能免警告                                                                              |
| D6   | 任务栏进度                         | `win.setProgressBar(currentTime/duration)`；暂停时 `-1`                                                                                               |
| D7   | 声音过渡                           | play/pause 150ms 音量渐变（`gain` 或逐帧 `audio.volume`）；可选 crossfade                                                                             |
| D8   | 播放增强                           | 睡眠定时器、播放速度（0.5–2.0x，`audio.playbackRate`）、均衡器（Web Audio `BiquadFilter`）                                                            |
| D9   | 音频可视化                         | `AnalyserNode` + canvas → 播放页背景律动（注意省电，默认关闭或低频刷新）                                                                              |
| D10  | 本地音乐 / 云盘                    | 云盘接口已有（`userCloudApi`），UI 被注释；补上云盘页与本地文件扫描（`dialog.showOpenDialog`）                                                        |
| D11  | 下载管理                           | 音频缓存到本地目录（**版权合规风险，需谨慎/仅缓存**）                                                                                                 |
| D12  | 多窗口                             | 迷你模式、桌面歌词窗口                                                                                                                                |

### E. 性能

| 编号 | 事项                 | 说明                                                                                    |
| ---- | -------------------- | --------------------------------------------------------------------------------------- |
| E1   | 虚拟滚动（同 A4）    | 首屏渲染节点从上千降到 ~20                                                              |
| E2   | 图片尺寸按显示尺寸取 | 已有 `?param=`，补齐列表小图（60/100/300 三档）                                         |
| E3   | 拆包评估             | 现状 `index 199KB / gzip 69.5KB`、`vue-vendor 165KB`；可按路由预取（`router` 已懒加载） |
| E4   | 进度更新降频         | 当前 store 写入 10Hz，可降到 4Hz + 进度条用 CSS transform（`translateX`）代替宽度变化   |
| E5   | 大列表 computed 审查 | `views/playlist` 等对 songs 做过多次 map/filter，建议一次性 `shallowRef` 固化           |
| E6   | keep-alive 策略      | 当前 `max=10` + exclude 列表；评估改为 include 白名单（只缓存 home/me/explore）         |
| E7   | 启动埋点             | 主进程 `app.getAppMetrics()`、渲染层 `PerformanceObserver` 打点，量化优化效果           |

### F. 工程化与发布

| 编号 | 事项           | 说明                                                                                                  |
| ---- | -------------- | ----------------------------------------------------------------------------------------------------- |
| F1   | CI             | GitHub Actions：`install → typecheck → lint → test → build`，Windows/macOS/Linux 矩阵；PR 门禁        |
| F2   | E2E            | Playwright `_electron.launch()`：启动 → 断言窗口标题/登录页渲染 → IPC 桥存在 → 截图对比               |
| F3   | 提交门禁       | husky + lint-staged + commitlint（conventional commits）                                              |
| F4   | 版本与变更日志 | `changesets` 或 `standard-version` 自动生成 CHANGELOG                                                 |
| F5   | 发布流水线     | electron-builder 签名/公证、产物上传、自动更新源                                                      |
| F6   | 依赖治理       | 定期 `npm audit`；评估 `NeteaseCloudMusicApi`（上游归档）替代方案                                     |
| F7   | 文档           | `docs/ARCHITECTURE.md`（主/渲染进程数据流图）、贡献指南、调试指南（含 `ELECTRON_RUN_AS_NODE` 这类坑） |

---

## 2. 分阶段计划

### Phase 1 —— 动效与感知性能（建议先做，1–2 天，低风险高收益）✅ **已完成**

**范围**：C1 路由过渡、C13 动效 token、C12 减动效、C8 音条、C5 封面 hover、C7 微交互、C3 唱片旋转、C6 骨架 shimmer + **A1 公共组件**、**B1 骨架屏**（首页/歌单/搜索）。

**已交付**（提交见 `feat(motion)` / `feat(ui)`）：

- 动效基础设施 `src/assets/css/motion.css`：时长/曲线 token（`--motion-fast/base/slow/page`、`--ease-standard/spring/out`）、全局 keyframes（`halo-spin/vinyl-spin/bar-bounce/heart-pop/ambient-drift/rise/breathe/shimmer`）、`.halo-hover-lift` `.halo-press`、`:focus-visible` 焦点环、`prefers-reduced-motion` 全局降级。
- 公共组件：`EaLoading`（加载环）、`EaSkeleton`（rect/circle/text/card/row 五种骨架）、`EaEmpty`（标题/描述/重试按钮/图标插槽），全局注册。
- 路由切换过渡（`App.vue`：fade + 8px 上移，180ms；query 变化不重建、path 变化重建）。
- 10 个页面接入骨架屏与统一空态，删除 12 个重复 spinner 类与 11 个重复 `@keyframes`。
- 播放页：封面环境光（双层模糊 + 36s 漂移）、黑胶唱片旋转（暂停冻结角度）、歌词聚焦（非当前行模糊/半透明/微缩，当前行放大）、开合弹簧曲线 + 内容错峰入场。
- 列表：当前播放行 3 根动感音条（暂停静止）、喜欢按钮心跳反馈；6 个封面卡片 hover 缩放 + 阴影 + 播放按钮弹性淡入。
- 顺带修复运行期发现的 3 个问题：Tailwind 4 `@layer` 导致封面播放按钮 hover 不淡入、登录页重复导航造成双份二维码轮询、`Header` 组件名与内建元素冲突的 Vue 告警。

**为什么先做**：不触碰业务逻辑、不影响数据层，纯前端表现层；收益立刻可见（页面切换不再硬切、加载不再空白、播放页有"唱片感"）。

**验收标准**

- 路由切换有 fade+上移过渡，且不出现"先白屏后内容"；
- 首页/歌单/搜索首屏渲染前显示骨架屏，骨架与真实布局尺寸一致（CLS ≈ 0）；
- 播放页封面播放时旋转、暂停时停止在当前位置；
- `prefers-reduced-motion: reduce` 下所有动效自动关闭；
- `typecheck` / `lint` / `test` / `build` 全绿，DevTools Performance 面板切换页面帧率 ≥ 55fps。

### Phase 2 —— 体验与桌面能力（3–5 天）✅ **已完成**

**范围**：A2 队列只存 id、A3 AbortController、A4 虚拟滚动、B2 空态统一、B3 深色模式、B7 右键菜单、B8 搜索历史、B10 基础无障碍、C4 歌词模糊、C9 浮层动效统一、D1 媒体键、D3 托盘、D4 窗口状态。

**已交付**：

- **D1 全局媒体键**：`globalShortcut` 三键（播放暂停/下一首/上一首）→ `halo:media-key` IPC → preload 白名单校验 → `bindMediaKeys()` → playerStore；被其它应用占用时只 warn 不阻断。
- **D3 系统托盘**：托盘图标 + 五项菜单（显示主窗口/播放暂停/上一首/下一首/退出），单击显隐窗口，退出时 `destroy()`。
- **D4 窗口状态记忆**：`userData/window-state.json` 持久化宽高/位置/最大化；启动校验最小尺寸与多屏 `workArea`（外接屏拔掉时回退居中），300ms 防抖 + close/before-quit flush。
- **A2 队列持久化只存 id**：`player-queue-v2`（ids + currentId），启动批量回填并按序重排；旧 `player-playlist` 迁移（字段齐全零网络复用、脏数据先落 ids 再回填）；`playOne` 前非阻塞重试离线场景。
- **A3 导航作用域请求取消**：`rotateNavigationScope()` 在 `router.afterEach` 旋转 AbortController，仅取消页面级 GET；播放/登录/喜欢等 10 类应用级请求用 `withoutAbortOnNavigate()` 标记保留；取消归一化为 `ApiError.isCanceled` 且不重试/不跳登录/不提示；视图层 19 处 catch 统一走 `handleRequestError()`。
- **C9 浮层动效统一**：Modal（fade+pop，Esc 关闭、多弹窗栈、焦点移入/归还）、Drawer（遮罩 fade 与内容 slide 分离）、Toast（滑入/滑出状态机 + `animationend` 后卸载 + 错峰 + 超限退场后淘汰）。
- **B3 深色模式**：`useTheme()`（light/dark/system，跟随系统 + 持久化），`global.scss` 浅/深各一套共 31 个设计变量，全站 30 个文件硬编码颜色变量化（白/灰类命中 30→2，剩余为封面装饰），Header 主题切换按钮；deep 下 primary 提亮保证对比度。
- **B7 右键菜单**：`EaContextMenu`（视口翻转/外部点击/Esc/滚动关闭），歌曲行四项（下一首播放/查看歌手/查看专辑/复制链接，clipboard 失败降级）。
- **B8 搜索历史**：`halo-search-history` 最多 10 条去重，空态下 chips + 清空历史。
- **A4 虚拟滚动**：自研 `EaVirtualList`（固定行高 + spacer + ResizeObserver，无第三方依赖），列表 >80 行启用、≤80 行保持原渲染。
- **B10 无障碍**：`:focus-visible` 焦点环、Modal 焦点管理/Esc、`EaButton` 补 `role=button + tabindex + Enter/Space`、搜索 chips 使用原生 button。
- **keep-alive 静默刷新**：home/explore/me/recommendMusic 在 `onActivated` 且距上次加载 >5min 或上次失败时静默刷新（防双请求、失败不打扰）。
- **C4**：歌词模糊/聚焦已在 Phase 1 完成。

**验收**：切页无脏数据回写（单测覆盖）、媒体键/托盘可用、窗口位置大小保持、长列表窗口化渲染、深色模式可切换并跟随系统。

### Phase 3 —— 平台化（1–2 周）✅ **主体完成（E2E / 代码签名未做）**

**范围**：D5 自动更新、D6 任务栏进度、D8 播放增强、B5 播放页重设计 + B4 封面取色、A6 API 缓存、A10 组件测试、F1 CI、F2 Playwright E2E。

**已交付**：

- **D5 自动更新**：electron-updater 懒加载（仅打包启用、无 release/未签名全部软失败），启动 10s 静默检查，托盘「检查更新…」，下载/重启安装流程 + 进度日志。
- **D6 任务栏进度**：`bridge.playback.setProgress` → `halo:playback-progress` → `setProgressBar`，双向入参白名单校验，暂停/停止清除。
- **D8 播放增强**：睡眠定时器（绝对到期时间戳 + 到点暂停，UI 在播放页/Footer）、播放倍速（持久化 + 循环档位 + 换源重应用）。
- **B4/B5 播放页**：封面取色（canvas 16×16 采样 + 饱和加权，纯函数可单测）驱动环境光交叉淡入与唱片氛围光，控制区三栏重排、自适应封面、音量条 hover 展开、定时/倍速入口。
- **A6 API 缓存**：`TtlLruCache` + `stableKey`，12 个详情/列表接口 60s 缓存（歌词 5min、版权检查 10s），写接口自动失效、301 会话过期清空。
- **A10 测试**：新增 6 个组件 spec + 3 个 store/theme spec，共 90 个用例（node + happy-dom）。
- **F1 CI**：GitHub Actions（ubuntu/windows × Node 22/24）四门禁 + 提交门禁（husky + lint-staged + commitlint）+ electron-builder 发布配置。

**未做**：F2 Playwright E2E（依赖较重，建议作为独立任务）、代码签名/公证（需证书）。

### Phase 4 —— 长期（未开始）

D2 系统媒体控制（SMTC 需原生模块）、D9 音频可视化、D10 本地音乐/云盘、D11 下载、B6 迷你播放器/桌面歌词、i18n、多主题。

### Phase 5 —— UI 全面重构（v1.3.0）✅ 已完成

**目标**：更简洁、更美观、更方便；统一设计语言，替换原顶部导航式布局。

**布局**

- 应用外壳改为「左侧边栏 224px（品牌 / 首页·发现·我的·搜索 / 音乐库：我喜欢的音乐·播放队列 / 主题切换 + 版本号）+ 顶栏 56px（前进后退 + 页面标题 + 搜索 + 头像）+ 内容区 + 底部播放条 72px」；
- 播放条重做：左（48px 封面 + 歌名歌手）、中（播放控制 + 进度时间轴）、右（循环 / 队列 / 音质 / 定时 / 音量 / 播放页），紧凑 72px；
- 移除自绘标题栏后的布局偏移全部重算（抽屉/滚动条/虚拟列表高度）。

**设计系统**

- `global.scss` 新增布局 / 圆角（sm~xl/full）/ 阴影（xs~lg）/ 外壳表面（侧边栏、顶栏、播放条）令牌，深浅两套；
- `style.scss` 新增页面骨架类：`.page`、`.page-head`、`.page-title`、`.page-subtitle`、`.section`、`.section-head`、`.section-title`、`.grid-cards`（`--sm/--lg` 自适应列）、`.card-surface`、`.pill-btn`（`--primary/--icon`）、`.row-between`、`.muted`。

**页面与组件**

- 首页：hero（每日推荐 / 私人 FM）+ 推荐歌单 / 推荐歌手 / 最新音乐 / 排行榜分区；
- 发现：胶囊分类 tab + 分类面板 + 歌单网格 + 加载更多；
- 每日推荐：紧凑 hero + 歌曲列表；
- 搜索：类型 tab（单曲 / 歌手 / 专辑 / 歌单 / MV / 用户）+ 最近搜索 chips；
- 详情页统一头部：封面 176px + 类型徽标 + 标题 / 副标题 / 可折叠简介 + 「播放全部」主按钮 + 收藏 / 关注；
- 我的：个人信息卡 + 胶囊 tab + 网格；登录：居中卡片；404：居中渐变插画；
- 公共组件统一：封面（流式正方形 / `.cover-play`）、MusicTable（52px 行高 + 表头 + hover 操作）、EaEmpty / EaLoading / EaSkeleton / EaModal / EaDrawer / Notification。

**验收**：`typecheck / eslint / vitest（90 用例）/ vite build` 全绿；用 Chrome headless + CDP 对 10 个路由做了深浅两种主题的真实渲染截图核对。

---

## 3. 风险与取舍

| 风险                                    | 应对                                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 动效拖慢低端机                          | 统一 transform/opacity、时长 ≤320ms、`prefers-reduced-motion` 降级、避免 `filter: blur` 大面积逐帧动画 |
| 虚拟滚动与 `keep-alive`/滚动恢复冲突    | 记录 `scrollTop`，回到页面时恢复；行高固定以便计算                                                     |
| 深色模式改造面大                        | 先用 CSS 变量替换硬编码颜色（B11），再切换主题，分 PR 落地                                             |
| 自动更新需要签名                        | 无签名会触发系统安全警告；需先配置证书或暂不发布                                                       |
| 原生模块（SMTC）增加构建复杂度          | 放最后，独立分支验证，失败可回退                                                                       |
| 下载/缓存版权合规                       | 只做播放缓存，不做导出；文档中明确免责                                                                 |
| 大幅改动播放页可能引入可访问性/性能回退 | 先做动效（C 类）再改布局（B5），每步保持 `typecheck/lint/test` 绿                                      |

---

## 4. 建议的下一步

1. **先做 Phase 1**（纯表现层、可快速回滚），一次性把"页面硬切 + 加载空白 + 播放页呆板"三个最明显的体验问题解决；
2. 动效统一走 token，避免再次出现 10 份重复 spinner 这种局面；
3. Phase 1 完成后再评估是否引入 `vue-virtual-scroller` 等新依赖（会改 `package.json` 与 lockfile）。
