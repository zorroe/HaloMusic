import {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  screen,
  session,
  shell,
  Tray,
} from 'electron'
import type {
  IpcMainEvent,
  IpcMainInvokeEvent,
  MenuItemConstructorOptions,
  WebContents,
} from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { connect } from 'node:net'
import { release } from 'node:os'
import { join } from 'node:path'
import type { Server } from 'node:http'
import express from 'express'
import expressProxy from 'express-http-proxy'
import NeteaseCloudMusicApi from 'NeteaseCloudMusicApi'

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.js    > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.DIST_ELECTRON = join(__dirname, '..')
process.env.DIST = join(process.env.DIST_ELECTRON, '../dist')
process.env.PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? join(process.env.DIST_ELECTRON, '../public')
  : process.env.DIST

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------

/** 所有本地服务只绑定回环地址，不对外网卡暴露 */
const LOOPBACK_HOST = '127.0.0.1'
/** NeteaseCloudMusicApi 端口 */
const NCM_API_PORT = 16666
/** Express 静态资源 + /api 代理端口（渲染进程页面来源） */
const EXPRESS_PORT = 17777
/** 等待本地服务真正可连接的最长时间 */
const SERVICE_READY_TIMEOUT_MS = 20_000
/** 外部链接最大长度，防止超长/畸形串透传 */
const MAX_EXTERNAL_URL_LENGTH = 2048

/** 主窗口默认尺寸（首次启动 / 窗口状态无效时使用） */
const DEFAULT_WINDOW_WIDTH = 1300
const DEFAULT_WINDOW_HEIGHT = 800
/** 主窗口最小尺寸：恢复窗口状态时不得小于该值 */
const MIN_WINDOW_WIDTH = 1300
const MIN_WINDOW_HEIGHT = 800
/** 窗口状态持久化文件（放在 userData 下，升级/卸载不丢） */
const WINDOW_STATE_FILE = 'window-state.json'
/** resize / move 期间写窗口状态的防抖间隔 */
const WINDOW_STATE_SAVE_DEBOUNCE_MS = 300

/**
 * IPC 通道名，统一 `halo:` 前缀。
 * 注意：electron/preload/index.ts 里有一份相同常量（preload 独立构建、不共享模块），
 * 两边改动必须同步。
 */
const IPC = {
  openExternal: 'halo:open-external',
  windowMinimize: 'halo:window-minimize',
  windowToggleMaximize: 'halo:window-toggle-maximize',
  windowClose: 'halo:window-close',
  windowIsMaximized: 'halo:window-is-maximized',
  windowMaximizedChanged: 'halo:maximized-changed',
  getAppVersion: 'halo:app-version',
  appQuit: 'halo:app-quit',
  /** main → preload：页面加载完成，用于移除启动 loading（postMessage 的兜底通道） */
  appReady: 'halo:app-ready',
  /** main → preload：系统媒体键 / 托盘菜单的播放控制动作 */
  mediaKey: 'halo:media-key',
} as const

/** 旧版本（v1.1.0 及更早）生产页面来源；升级后改为 EXPRESS_ORIGIN（127.0.0.1） */
const LEGACY_PROD_ORIGIN = `http://localhost:${EXPRESS_PORT}`
/** 一次性 cookie 迁移标记文件（放在 userData 下） */
const COOKIE_MIGRATION_MARKER = '.cookie-migrated.json'

/** 开发模式：vite dev server 地址（由 vite-plugin-electron 注入） */
const devServerUrl: string | undefined =
  process.env.VITE_DEV_SERVER_URL || undefined
const isDev = Boolean(devServerUrl)

const EXPRESS_ORIGIN = `http://${LOOPBACK_HOST}:${EXPRESS_PORT}`

/** 应用自身的页面来源（生产 + 开发；同时展开 localhost / 127.0.0.1 变体） */
const APP_ORIGINS = expandLoopbackOrigins([
  EXPRESS_ORIGIN,
  ...(devServerUrl
    ? [safeOrigin(devServerUrl)].filter((v): v is string => Boolean(v))
    : []),
])

// ---------------------------------------------------------------------------
// 通用工具
// ---------------------------------------------------------------------------

function safeOrigin(rawUrl: string): string | null {
  try {
    return new URL(rawUrl).origin
  } catch {
    return null
  }
}

/**
 * 把 127.0.0.1 / localhost 两种写法互相补齐：
 * 开发时 vite 可能以 `localhost:3344` 或 `127.0.0.1:3344` 之一注册来源，
 * 回调/导航校验时两种都应视为同一应用。
 */
function expandLoopbackOrigins(origins: string[]): string[] {
  const expanded = new Set<string>()
  for (const origin of origins) {
    expanded.add(origin)
    try {
      const parsed = new URL(origin)
      if (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') {
        const port = parsed.port ? `:${parsed.port}` : ''
        expanded.add(`${parsed.protocol}//127.0.0.1${port}`)
        expanded.add(`${parsed.protocol}//localhost${port}`)
      }
    } catch {
      // 忽略无法解析的来源
    }
  }
  return [...expanded]
}

function isAppOrigin(rawUrl: string): boolean {
  const origin = safeOrigin(rawUrl)
  return origin !== null && APP_ORIGINS.includes(origin)
}

/**
 * 解析并校验外部链接。
 * - 仅允许 http(s)，其余协议（file: / javascript: / data: 等）一律拒绝；
 * - 长度上限 2048；
 * - 拒绝包含控制字符的串（防日志/参数注入）；
 * - 返回规范化后的 URL 对象，统一用 `url.toString()` 交给系统浏览器。
 */
function parseExternalUrl(value: unknown, httpsOnly = false): URL | null {
  if (typeof value !== 'string') return null
  if (value.length === 0 || value.length > MAX_EXTERNAL_URL_LENGTH) return null
  // 拒绝控制字符（NUL、换行等），避免日志/参数注入
  if (/[\u0000-\u001f\u007f]/.test(value)) return null
  if (!/^https?:\/\//i.test(value)) return null

  try {
    const parsed = new URL(value)
    if (httpsOnly) {
      return parsed.protocol === 'https:' ? parsed : null
    }
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? parsed
      : null
  } catch {
    return null
  }
}

function describeValue(value: unknown): string {
  if (typeof value === 'string') {
    return value.length > 120 ? `${value.slice(0, 120)}…` : value
  }
  return typeof value
}

/**
 * 应用图标路径（主窗口 / 系统托盘共用）。
 * - dev：process.env.PUBLIC 指向仓库的 public/；
 * - prod：PUBLIC 指向 dist/，vite 会把 public/ 下的静态资源拷到 dist 根目录，
 *   因此同一个拼接方式在两种模式下都成立，不要硬编码绝对路径。
 */
function appIconPath(): string {
  return join(process.env.PUBLIC, 'favicon.ico')
}

/** 轮询 TCP 端口，直到目标服务真正可以建立连接（而不是仅 listen() 调用完成） */
function waitForTcpPort(
  host: string,
  port: number,
  timeoutMs: number
): Promise<void> {
  const deadline = Date.now() + timeoutMs

  return new Promise<void>((resolve, reject) => {
    const attempt = () => {
      const socket = connect({ host, port })
      let settled = false

      const finish = (error?: Error) => {
        if (settled) return
        settled = true
        socket.destroy()

        if (!error) {
          resolve()
          return
        }

        if (Date.now() >= deadline) {
          reject(
            new Error(
              `等待 ${host}:${port} 就绪超时（${timeoutMs}ms）：${error.message}`
            )
          )
          return
        }
        setTimeout(attempt, 120)
      }

      socket.setTimeout(1000)
      socket.once('connect', () => finish())
      socket.once('timeout', () => finish(new Error('TCP 连接超时')))
      socket.once('error', (error: Error) => finish(error))
    }

    attempt()
  })
}

/** 优雅关闭 http.Server（含 keep-alive 连接），供 before-quit 调用 */
function closeServer(server: Server | null | undefined, label: string): void {
  if (!server) return

  try {
    // 先断开空闲/活跃的 keep-alive 连接，避免 server.close() 长时间挂起
    server.closeAllConnections?.()
    server.closeIdleConnections?.()
    server.close((error) => {
      if (error) console.warn(`[HaloMusic] 关闭 ${label} 时出错:`, error)
    })
    console.info(`[HaloMusic] 已关闭 ${label}`)
  } catch (error) {
    console.warn(`[HaloMusic] 关闭 ${label} 失败:`, error)
  }
}

// ---------------------------------------------------------------------------
// CSP：由主进程注入（index.html 不再写 meta CSP）
// ---------------------------------------------------------------------------

/**
 * 生产环境 CSP（从严）：
 * - script 只允许自身打包产物；
 * - connect 只允许自身与 127.0.0.1 本地服务（页面由 express 提供，/api 走同源）；
 * - 媒体允许 blob: / https:（网易云音频、MV），以及本地回环；
 * - 图片允许 https:（网易云封面 CDN）。
 */
const PROD_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https: http://127.0.0.1:*",
  "connect-src 'self' http://127.0.0.1:*",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

/**
 * 开发环境 CSP：在生产的脚本约束上放行 vite HMR 所需的
 * `'unsafe-inline'` 内联 script 与 `ws://127.0.0.1:*` 连接；
 * 同时兼容历史渲染层直接访问 `http://localhost:16666` 的写法。
 * 仅开发模式生效，打包产物不会命中此分支。
 */
const DEV_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https: http:",
  "connect-src 'self' http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:*",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

function installContentSecurityPolicy(): void {
  const policy = isDev ? DEV_CSP : PROD_CSP

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    // 只对应用自身来源（vite dev server / express）注入，不污染第三方响应
    if (!isAppOrigin(details.url)) {
      callback({})
      return
    }

    const responseHeaders: Record<string, string | string[]> = {}
    for (const [key, value] of Object.entries(details.responseHeaders ?? {})) {
      if (key.toLowerCase() === 'content-security-policy') continue
      responseHeaders[key] = value
    }
    responseHeaders['Content-Security-Policy'] = [policy]

    callback({ responseHeaders })
  })
}

// ---------------------------------------------------------------------------
// 会话安全：权限一律拒绝
// ---------------------------------------------------------------------------

function installSessionSecurity(): void {
  const ses = session.defaultSession

  ses.setPermissionRequestHandler((_webContents, permission, callback) => {
    console.warn(`[HaloMusic] 已拒绝权限请求: ${permission}`)
    callback(false)
  })

  // 与 request handler 配套，避免某些 Web API 只走 check 分支（check 调用频繁，不打印日志）
  ses.setPermissionCheckHandler(() => false)

  installContentSecurityPolicy()
}

// ---------------------------------------------------------------------------
// 升级兼容：旧版本 localhost 域的登录 cookie 一次性迁移到 127.0.0.1
// ---------------------------------------------------------------------------

/**
 * v1.1.0 及更早版本生产页面来源是 `http://localhost:17777`，登录 cookie
 * （MUSIC_U、__csrf 等）挂在 `localhost` 域；本次升级改为 `http://127.0.0.1:17777`
 * （避免 localhost 的 IPv6 解析问题），浏览器按域隔离 cookie，不迁移会导致
 * 升级后用户被要求重新扫码登录。
 *
 * 约束：
 * - 仅生产分支执行（dev 页面来源是 127.0.0.1:3344，不存在该场景）；
 * - 用 userData 下的标记文件保证只跑一次；
 * - 任何失败只 console.warn，绝不阻断启动；
 * - 全部迁移成功后才清理旧域 cookie，避免部分失败时丢登录态。
 */
async function migrateLegacyLocalhostCookies(): Promise<void> {
  if (isDev) return

  try {
    const markerPath = join(app.getPath('userData'), COOKIE_MIGRATION_MARKER)
    if (existsSync(markerPath)) return

    const ses = session.defaultSession

    // 按 domain 查询，再用旧页面 URL 查询兜底，按 domain|path|name 去重
    const cookieMap = new Map<string, Electron.Cookie>()
    const collect = (cookies: Electron.Cookie[]): void => {
      for (const cookie of cookies) {
        const key = `${cookie.domain ?? ''}|${cookie.path ?? ''}|${cookie.name}`
        if (!cookieMap.has(key)) cookieMap.set(key, cookie)
      }
    }
    collect(await ses.cookies.get({ domain: 'localhost' }))
    collect(await ses.cookies.get({ url: `${LEGACY_PROD_ORIGIN}/` }))

    const legacyCookies = [...cookieMap.values()]

    const writeMarker = (payload: Record<string, unknown>): void => {
      try {
        writeFileSync(
          markerPath,
          JSON.stringify({ ...payload, migratedAt: new Date().toISOString() }),
          'utf-8'
        )
      } catch (error) {
        console.warn('[HaloMusic] 写入 cookie 迁移标记失败:', error)
      }
    }

    if (legacyCookies.length === 0) {
      // 没有历史 cookie：落标记，避免每次启动都重复查询
      writeMarker({ total: 0, migrated: 0 })
      return
    }

    let migrated = 0
    for (const cookie of legacyCookies) {
      try {
        const details: Electron.CookiesSetDetails = {
          url: EXPRESS_ORIGIN,
          name: cookie.name,
          value: cookie.value,
          path: cookie.path || '/',
          // 新来源是 http，不能带 Secure（否则不会被发送）
          secure: false,
          httpOnly: Boolean(cookie.httpOnly),
          // Chromium 要求 SameSite=None 必须搭配 Secure；本应用请求均为同源，统一降级为 lax
          sameSite:
            cookie.sameSite === 'no_restriction' ? 'lax' : cookie.sameSite,
        }
        if (typeof cookie.expirationDate === 'number') {
          details.expirationDate = cookie.expirationDate
        }
        await ses.cookies.set(details)
        migrated += 1
      } catch (error) {
        console.warn(`[HaloMusic] 迁移旧 cookie 失败: ${cookie.name}`, error)
      }
    }

    // 全部成功才清理旧域 cookie（含 path 的 cookie 用对应 URL 删除）
    if (migrated === legacyCookies.length) {
      for (const cookie of legacyCookies) {
        try {
          const oldUrl = new URL(
            cookie.path || '/',
            `${LEGACY_PROD_ORIGIN}/`
          ).toString()
          await ses.cookies.remove(oldUrl, cookie.name)
        } catch (error) {
          console.warn(
            `[HaloMusic] 清理 localhost 旧 cookie 失败: ${cookie.name}`,
            error
          )
        }
      }
    }

    // 至少成功迁移一个才落标记；全部失败则保留标记缺失，下次启动重试
    if (migrated > 0) {
      writeMarker({ total: legacyCookies.length, migrated })
    }
    console.info(
      `[HaloMusic] 旧 localhost 登录 cookie 迁移完成: ${migrated}/${legacyCookies.length}`
    )
  } catch (error) {
    // 迁移失败绝不能阻断启动
    console.warn(
      '[HaloMusic] 旧 localhost cookie 迁移失败（不影响启动）:',
      error
    )
  }
}

// ---------------------------------------------------------------------------
// 导航 / 新窗口安全
// ---------------------------------------------------------------------------

function installNavigationGuards(): void {
  app.on('web-contents-created', (_event, contents: WebContents) => {
    // 只处理应用窗口；devtools（type=remote）等不拦截
    if (contents.getType() !== 'window') return

    // 一律禁止应用内新开窗口；https 链接交给系统浏览器
    contents.setWindowOpenHandler(({ url }) => {
      const externalUrl = parseExternalUrl(url, true)
      if (externalUrl) {
        void shell.openExternal(externalUrl.toString()).catch((error) => {
          console.warn('[HaloMusic] 打开外部链接失败:', error)
        })
      } else {
        console.warn(`[HaloMusic] 已阻止打开窗口: ${describeValue(url)}`)
      }
      return { action: 'deny' }
    })

    // 阻止跳出应用来源（http(s) 外部页面、file: 等一律拦截）
    const blockOffAppNavigation = (
      event: { preventDefault: () => void },
      url: string
    ) => {
      if (isAppOrigin(url)) return
      event.preventDefault()
      console.warn(`[HaloMusic] 已阻止导航到: ${describeValue(url)}`)
    }
    contents.on('will-navigate', blockOffAppNavigation)
    contents.on('will-redirect', blockOffAppNavigation)

    // 禁止 webview（webviewTag 已为 false，这里作为第二道防线）
    contents.on('will-attach-webview', (event) => {
      event.preventDefault()
      console.warn('[HaloMusic] 已阻止 <webview> 挂载')
    })
  })
}

// ---------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------

function windowFromSender(sender: WebContents): BrowserWindow | null {
  return BrowserWindow.fromWebContents(sender)
}

/**
 * 校验 IPC 调用来自应用自身页面（Electron 安全清单要求校验 sender）。
 * 开发模式额外放宽到任意 loopback 来源，避免 vite 端口/host 写法变化导致误拒。
 */
function isTrustedIpcSender(event: IpcMainEvent | IpcMainInvokeEvent): boolean {
  const frameUrl: string | null | undefined = event.senderFrame?.url
  if (!frameUrl) return false
  if (isAppOrigin(frameUrl)) return true

  if (isDev) {
    const origin = safeOrigin(frameUrl)
    if (origin) {
      try {
        const { hostname } = new URL(origin)
        if (hostname === '127.0.0.1' || hostname === 'localhost') return true
      } catch {
        // 忽略无法解析的来源
      }
    }
  }

  console.warn(
    `[HaloMusic] 拒绝来自非应用页面的 IPC 调用: ${describeValue(frameUrl)}`
  )
  return false
}

function pushMaximizedState(win: BrowserWindow): void {
  if (win.isDestroyed() || win.webContents.isDestroyed()) return
  win.webContents.send(IPC.windowMaximizedChanged, win.isMaximized())
}

function registerIpcHandlers(): void {
  // 版本号
  ipcMain.handle(IPC.getAppVersion, (event: IpcMainInvokeEvent) =>
    isTrustedIpcSender(event) ? app.getVersion() : ''
  )

  // 当前是否最大化（渲染进程启动时同步一次）
  ipcMain.handle(IPC.windowIsMaximized, (event: IpcMainInvokeEvent) => {
    if (!isTrustedIpcSender(event)) return false
    const win = windowFromSender(event.sender)
    return win ? win.isMaximized() : false
  })

  // 外部链接：仅 http(s)、长度受限
  ipcMain.on(IPC.openExternal, (event: IpcMainEvent, url: unknown) => {
    if (!isTrustedIpcSender(event)) return

    const externalUrl = parseExternalUrl(url)
    if (!externalUrl) {
      console.warn(`[HaloMusic] 拒绝打开非法外部链接: ${describeValue(url)}`)
      return
    }
    void shell.openExternal(externalUrl.toString()).catch((error) => {
      console.warn('[HaloMusic] 打开外部链接失败:', error)
    })
  })

  // 窗口控制：用 fromWebContents 定位窗口，不依赖全局单例
  ipcMain.on(IPC.windowMinimize, (event: IpcMainEvent) => {
    if (!isTrustedIpcSender(event)) return
    windowFromSender(event.sender)?.minimize()
  })

  ipcMain.on(IPC.windowToggleMaximize, (event: IpcMainEvent) => {
    if (!isTrustedIpcSender(event)) return
    const win = windowFromSender(event.sender)
    if (!win) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })

  // 关闭窗口＝退出应用（走 app.quit 触发 before-quit 优雅关停，而不是 app.exit 强杀）
  ipcMain.on(IPC.windowClose, (event: IpcMainEvent) => {
    if (!isTrustedIpcSender(event)) return
    app.quit()
  })

  ipcMain.on(IPC.appQuit, (event: IpcMainEvent) => {
    if (!isTrustedIpcSender(event)) return
    app.quit()
  })
}

// ---------------------------------------------------------------------------
// 窗口状态持久化：记住上次的尺寸 / 位置 / 最大化状态
// ---------------------------------------------------------------------------

interface WindowState {
  width: number
  height: number
  x: number
  y: number
  isMaximized: boolean
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * 窗口左上角是否落在某个显示器的工作区内。
 * 注意：screen 模块只能在 app.whenReady() 之后使用，因此该函数只在 createWindow
 * （ready 之后）里被调用，不在模块顶层调用。
 */
function isPointOnAnyDisplay(x: number, y: number): boolean {
  return screen.getAllDisplays().some(({ workArea }) => {
    return (
      x >= workArea.x &&
      x < workArea.x + workArea.width &&
      y >= workArea.y &&
      y < workArea.y + workArea.height
    )
  })
}

/**
 * 读取并校验窗口状态。
 * 任何字段缺失/非法、或 x/y 已不在当前任一显示器工作区（如外接屏被拔掉）时
 * 返回 null，让窗口回退到默认尺寸并居中，避免恢复到屏幕外不可见。
 */
function readWindowState(): WindowState | null {
  const filePath = join(app.getPath('userData'), WINDOW_STATE_FILE)
  if (!existsSync(filePath)) return null

  try {
    const parsed: unknown = JSON.parse(readFileSync(filePath, 'utf-8'))
    if (parsed === null || typeof parsed !== 'object') return null
    const state = parsed as Partial<WindowState>

    if (
      !isFiniteNumber(state.width) ||
      !isFiniteNumber(state.height) ||
      !isFiniteNumber(state.x) ||
      !isFiniteNumber(state.y) ||
      state.width < MIN_WINDOW_WIDTH ||
      state.height < MIN_WINDOW_HEIGHT ||
      typeof state.isMaximized !== 'boolean' ||
      !isPointOnAnyDisplay(state.x, state.y)
    ) {
      console.warn('[HaloMusic] 窗口状态文件无效或已越界，回退默认居中')
      return null
    }

    return {
      width: Math.round(state.width),
      height: Math.round(state.height),
      x: Math.round(state.x),
      y: Math.round(state.y),
      isMaximized: state.isMaximized,
    }
  } catch (error) {
    console.warn('[HaloMusic] 读取窗口状态失败，使用默认布局:', error)
    return null
  }
}

/**
 * 采集当前窗口状态。
 * 最大化时用 getNormalBounds()：记录「还原后」的尺寸/位置，
 * 避免把最大化 bounds 写成普通 bounds，导致下次还原到最大尺寸。
 */
function collectWindowState(win: BrowserWindow): WindowState {
  const isMaximized = win.isMaximized()
  const bounds = isMaximized ? win.getNormalBounds() : win.getBounds()
  return {
    width: Math.round(bounds.width),
    height: Math.round(bounds.height),
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    isMaximized,
  }
}

/** 立即把窗口状态写盘；失败只 warn，不影响应用运行 */
function saveWindowState(win: BrowserWindow): void {
  if (win.isDestroyed()) return
  try {
    const dir = app.getPath('userData')
    mkdirSync(dir, { recursive: true })
    const state = collectWindowState(win)
    writeFileSync(
      join(dir, WINDOW_STATE_FILE),
      `${JSON.stringify(state, null, 2)}\n`,
      'utf-8'
    )
  } catch (error) {
    console.warn('[HaloMusic] 保存窗口状态失败:', error)
  }
}

let windowStateSaveTimer: ReturnType<typeof setTimeout> | null = null

/** 运行时 resize / move 防抖写盘，避免拖动窗口时高频 IO */
function scheduleWindowStateSave(win: BrowserWindow): void {
  if (windowStateSaveTimer) clearTimeout(windowStateSaveTimer)
  windowStateSaveTimer = setTimeout(() => {
    windowStateSaveTimer = null
    saveWindowState(win)
  }, WINDOW_STATE_SAVE_DEBOUNCE_MS)
}

/** 立即落盘（close / before-quit 调用），并清掉尚未触发的防抖任务 */
function flushWindowState(win: BrowserWindow | null): void {
  if (windowStateSaveTimer) {
    clearTimeout(windowStateSaveTimer)
    windowStateSaveTimer = null
  }
  if (win && !win.isDestroyed()) saveWindowState(win)
}

// ---------------------------------------------------------------------------
// 主窗口
// ---------------------------------------------------------------------------

let mainWindow: BrowserWindow | null = null

async function createWindow(): Promise<BrowserWindow> {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
    return mainWindow
  }

  // 读取上次窗口状态并校验（screen 只能在 ready 之后使用，createWindow 只在 ready 后调用）
  const restoredState = readWindowState()

  const win = new BrowserWindow({
    title: 'HaloMusic',
    icon: appIconPath(),
    width: restoredState?.width ?? DEFAULT_WINDOW_WIDTH,
    height: restoredState?.height ?? DEFAULT_WINDOW_HEIGHT,
    ...(restoredState ? { x: restoredState.x, y: restoredState.y } : {}),
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
    // 先隐藏，等首帧可绘制再显示，避免白屏闪烁
    show: false,
    backgroundColor: '#282c34',
    // 自绘标题栏（Menubar.vue）依赖无边框窗口
    frame: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // 安全默认：渲染进程拿不到 Node，preload 通过 contextBridge 暴露白名单能力
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      /**
       * sandbox：本项目 preload 由 vite-plugin-electron 打成单文件 CommonJS，
       * 在 contextIsolation: true + nodeIntegration: false 下，渲染层已经无法直接
       * 使用 Node/require；这里保持 sandbox: false 是为了兼容打包后的 preload
       * 运行环境（受限 require、无完整 process），若后续把 preload 改成无打包的
       * 纯 ESM，可直接打开 sandbox 获得额外的进程级沙箱。
       */
      sandbox: false,
      spellcheck: false,
      // 生产包关闭 devTools，开发保留
      devTools: isDev,
    },
  })

  mainWindow = win

  // 上次退出时处于最大化：恢复最大化（普通 bounds 已由构造参数应用，不会被污染）
  if (restoredState?.isMaximized) win.maximize()

  // 首帧可绘制后再显示
  win.once('ready-to-show', () => {
    if (!win.isDestroyed()) win.show()
  })

  // loading 移除的兜底通道：渲染进程的 window.postMessage 需要跨 contextIsolation
  // world 传递，个别环境可能不可靠；页面加载完成后再通过 IPC 通知一次（重复移除无副作用）
  win.webContents.on('did-finish-load', () => {
    if (win.isDestroyed() || win.webContents.isDestroyed()) return
    win.webContents.send(IPC.appReady)
  })

  // 开发模式：把渲染进程的 console 与加载失败转发到主进程 stdout，
  // 便于在不打开 DevTools（或 CI / 无 GUI 环境）时发现运行时错误。
  if (isDev) {
    // Electron 45 的 console-message 回调：第一个参数是 Event 与消息参数的合并对象，
    // 其中 level 为 'info' | 'warning' | 'error' | 'debug' 字符串。
    win.webContents.on('console-message', event => {
      const location = event.sourceId
        ? ` (${event.sourceId}:${event.lineNumber})`
        : ''
      const line = `[renderer:${event.level}] ${event.message}${location}`
      if (event.level === 'error') console.error(line)
      else if (event.level === 'warning') console.warn(line)
      else console.info(line)
    })

    win.webContents.on(
      'did-fail-load',
      (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
        if (!isMainFrame) return
        console.error(
          `[HaloMusic] 页面加载失败: code=${errorCode} ${errorDescription} url=${validatedURL}`
        )
      }
    )
  }

  // 最大化状态变化推送给渲染进程（Menubar 的自绘按钮需要）
  let maximizeNotifyTimer: ReturnType<typeof setTimeout> | null = null
  const notifyMaximizedState = () => {
    pushMaximizedState(win)
  }
  win.on('maximize', notifyMaximizedState)
  win.on('unmaximize', notifyMaximizedState)
  win.on('resize', () => {
    if (maximizeNotifyTimer) clearTimeout(maximizeNotifyTimer)
    maximizeNotifyTimer = setTimeout(notifyMaximizedState, 100)
  })

  // 窗口状态记忆：resize / move 防抖保存，close 时立即落盘（退出前保证最后一次写入）
  const persistWindowState = () => scheduleWindowStateSave(win)
  win.on('resize', persistWindowState)
  win.on('move', persistWindowState)
  win.on('maximize', persistWindowState)
  win.on('unmaximize', persistWindowState)
  win.on('close', () => flushWindowState(win))

  win.on('closed', () => {
    // 兜底：窗口未经 close 事件被直接销毁时，清掉待执行的防抖任务
    if (windowStateSaveTimer) {
      clearTimeout(windowStateSaveTimer)
      windowStateSaveTimer = null
    }
    if (maximizeNotifyTimer) {
      clearTimeout(maximizeNotifyTimer)
      maximizeNotifyTimer = null
    }
    if (mainWindow === win) mainWindow = null
  })

  win.webContents.on('render-process-gone', (_event, details) => {
    console.error(
      '[HaloMusic] 渲染进程异常退出:',
      details.reason,
      details.exitCode
    )
  })

  // 开发模式走 vite dev server；生产模式走本机 express（不要用 localhost，避免 IPv6 解析问题）
  const targetUrl = isDev && devServerUrl ? devServerUrl : EXPRESS_ORIGIN
  try {
    await win.loadURL(targetUrl)
    console.info(`[HaloMusic] 主窗口已加载: ${targetUrl}`)
  } catch (error) {
    throw new Error(
      `主窗口加载失败: ${targetUrl}（${error instanceof Error ? error.message : String(error)}）`
    )
  }

  return win
}

// ---------------------------------------------------------------------------
// 桌面能力：全局媒体键 + 系统托盘
// ---------------------------------------------------------------------------

/**
 * 播放控制动作（必须与 src/utils/bridge.ts 的 MediaKeyAction、
 * electron/preload/index.ts 的动作白名单三方保持一致）。
 */
type MediaKeyAction = 'play-pause' | 'play-next' | 'play-prev'

/** 媒体键是否已注册（窗口重建 / activate 时不再重复注册） */
let mediaKeysRegistered = false

/**
 * 把播放动作广播给主窗口渲染进程。
 * 窗口不存在/已销毁时静默忽略（窗口重建间隙、启动阶段、退出过程中都可能出现）。
 */
function broadcastMediaKey(action: MediaKeyAction): void {
  const win = mainWindow
  if (!win || win.isDestroyed() || win.webContents.isDestroyed()) return
  win.webContents.send(IPC.mediaKey, action)
}

/**
 * 注册全局媒体键（只注册一次）。
 * - 必须在 app ready 之后、主窗口创建完成后调用；
 * - register 返回 false 表示组合键被其它应用占用：只 warn，不影响启动；
 * - 退出时由 will-quit 统一 unregisterAll()，避免退出后仍占用媒体键。
 */
function installMediaKeys(): void {
  if (mediaKeysRegistered) return
  mediaKeysRegistered = true

  const bindings: ReadonlyArray<readonly [string, MediaKeyAction]> = [
    ['MediaPlayPause', 'play-pause'],
    ['MediaNextTrack', 'play-next'],
    ['MediaPreviousTrack', 'play-prev'],
  ]

  for (const [accelerator, action] of bindings) {
    try {
      const registered = globalShortcut.register(accelerator, () => {
        broadcastMediaKey(action)
      })
      if (!registered) {
        console.warn(
          `[HaloMusic] 全局媒体键注册失败（可能被其它应用占用）: ${accelerator}`
        )
      }
    } catch (error) {
      console.warn(`[HaloMusic] 全局媒体键注册异常: ${accelerator}`, error)
    }
  }
}

let tray: Tray | null = null

/** 显示 / 还原并聚焦主窗口（复用 createWindow 的显隐逻辑：已存在则 show+focus，否则重建） */
function showMainWindow(): void {
  void createWindow().catch(handleStartupFailure)
}

/**
 * 创建系统托盘（应用启动后调用一次）。
 * 图标与主窗口共用 appIconPath()；创建失败（如无桌面环境）只 warn，不影响启动。
 */
function createTray(): void {
  if (tray) return

  try {
    const instance = new Tray(appIconPath())
    tray = instance
    instance.setToolTip('HaloMusic')

    const template: MenuItemConstructorOptions[] = [
      { label: '显示主窗口', click: () => showMainWindow() },
      { label: '播放 / 暂停', click: () => broadcastMediaKey('play-pause') },
      { label: '上一首', click: () => broadcastMediaKey('play-prev') },
      { label: '下一首', click: () => broadcastMediaKey('play-next') },
      { type: 'separator' },
      { label: '退出', click: () => app.quit() },
    ]
    instance.setContextMenu(Menu.buildFromTemplate(template))

    // 单击托盘图标：显示 / 还原并聚焦主窗口
    instance.on('click', () => showMainWindow())
  } catch (error) {
    console.warn('[HaloMusic] 系统托盘创建失败（不影响启动）:', error)
    if (tray) {
      try {
        tray.destroy()
      } catch {
        /* 创建中途失败时销毁可能抛错，忽略 */
      }
      tray = null
    }
  }
}

// ---------------------------------------------------------------------------
// 本地服务：先 NCM API，再 Express，最后才创建窗口
// ---------------------------------------------------------------------------

interface NcmApiServerApp {
  server?: Server
}

let expressServer: Server | null = null
let ncmApiApp: NcmApiServerApp | null = null

/** 启动 NeteaseCloudMusicApi 并等待端口真正可连接 */
async function startNeteaseMusicApi(): Promise<void> {
  console.info(
    `[HaloMusic] 启动 NeteaseCloudMusicApi (${LOOPBACK_HOST}:${NCM_API_PORT}) ...`
  )

  const apiApp = await NeteaseCloudMusicApi.serveNcmApi({
    port: NCM_API_PORT,
    // 必须显式绑定回环地址：库默认 host 为 ''（所有网卡），属于安全风险
    host: LOOPBACK_HOST,
    // 关闭启动时的 npm 版本检查（避免无谓联网、加快启动）
    checkVersion: false,
  })

  ncmApiApp = apiApp as NcmApiServerApp
  await waitForTcpPort(LOOPBACK_HOST, NCM_API_PORT, SERVICE_READY_TIMEOUT_MS)
  console.info('[HaloMusic] NeteaseCloudMusicApi 已就绪')
}

/** Host 头校验：只接受回环地址，缓解 DNS rebinding */
function isLoopbackHostHeader(hostHeader: string): boolean {
  if (!hostHeader) return false
  const hostname = hostHeader.startsWith('[')
    ? hostHeader.slice(1, hostHeader.indexOf(']'))
    : hostHeader.split(':')[0]
  return (
    hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1'
  )
}

/** /api 来源校验：拒绝外部网页把本机代理当开放网关使用 */
function createApiOriginGuard() {
  return (req: any, res: any, next: any) => {
    const origin: unknown = req.headers?.origin
    if (
      typeof origin === 'string' &&
      origin.length > 0 &&
      !APP_ORIGINS.includes(origin)
    ) {
      console.warn(`[HaloMusic] 已拒绝来自 ${origin} 的 /api 请求`)
      res.status(403).json({ code: 403, msg: 'Forbidden origin' })
      return
    }
    next()
  }
}

/** 启动 Express（静态 dist + /api 代理），仅绑定 127.0.0.1 */
function startExpressServer(): Promise<Server> {
  const expressApp = express()
  expressApp.disable('x-powered-by')

  // 1) Host 校验
  expressApp.use((req: any, res: any, next: any) => {
    const hostHeader = String(req.headers?.host ?? '').toLowerCase()
    if (!isLoopbackHostHeader(hostHeader)) {
      console.warn(`[HaloMusic] 已拒绝非法 Host 请求: ${hostHeader}`)
      res.status(403).type('text/plain').send('Forbidden')
      return
    }
    next()
  })

  // 2) 静态资源（Vue Router 使用 hash 模式，无需 history fallback）
  expressApp.use('/', express.static(process.env.DIST, { index: 'index.html' }))

  // 3) /api → 本机 NCM API
  expressApp.use('/api', createApiOriginGuard())
  expressApp.use(
    '/api',
    expressProxy(`http://${LOOPBACK_HOST}:${NCM_API_PORT}`)
  )

  return new Promise<Server>((resolve, reject) => {
    const server: Server = expressApp.listen(
      EXPRESS_PORT,
      LOOPBACK_HOST,
      () => {
        resolve(server)
      }
    )
    server.once('error', reject)
  })
}

// ---------------------------------------------------------------------------
// 生命周期
// ---------------------------------------------------------------------------

function handleStartupFailure(error: unknown): void {
  const reason =
    error instanceof Error ? (error.stack ?? error.message) : String(error)
  console.error('[HaloMusic] 启动失败:', reason)

  try {
    dialog.showErrorBox(
      'HaloMusic 启动失败',
      `应用启动时发生错误，即将退出。\n\n${reason}`
    )
  } catch (dialogError) {
    console.error('[HaloMusic] 显示启动失败对话框时出错:', dialogError)
  }

  app.quit()
}

// Disable GPU Acceleration for Windows 7
if (release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

// 保留 Electron 默认的 dev 安全警告（不要设置 ELECTRON_DISABLE_SECURITY_WARNINGS）

registerIpcHandlers()
installNavigationGuards()

let isQuitting = false

app.on('before-quit', () => {
  if (isQuitting) return
  isQuitting = true

  // 退出前销毁托盘，避免 Windows 通知区残留图标
  if (tray) {
    tray.destroy()
    tray = null
  }

  // 退出前确保最后一次窗口状态写入（close 事件通常还会再写一次，重复写入无副作用）
  flushWindowState(mainWindow)

  // 先关本地服务，再让窗口/进程退出
  closeServer(expressServer, `Express (${LOOPBACK_HOST}:${EXPRESS_PORT})`)
  expressServer = null

  closeServer(
    ncmApiApp?.server,
    `NeteaseCloudMusicApi (${LOOPBACK_HOST}:${NCM_API_PORT})`
  )
  ncmApiApp = null
})

app.on('will-quit', () => {
  // 注销全部全局快捷键，避免应用退出后媒体键仍被占用
  // （未完成 ready 就被退出的场景，globalShortcut 尚不可用，直接跳过）
  if (!app.isReady()) return
  globalShortcut.unregisterAll()
})

app
  .whenReady()
  .then(async () => {
    // 顺序：session 安全 → 旧 cookie 迁移(仅生产) → NCM API(16666) → Express(17777) → 窗口
    installSessionSecurity()
    await migrateLegacyLocalhostCookies()
    await startNeteaseMusicApi()
    expressServer = await startExpressServer()
    console.info(`[HaloMusic] 本地静态服务已启动: ${EXPRESS_ORIGIN}`)
    await createWindow()
    // 桌面能力：均要求 app ready（screen / globalShortcut），且在主窗口创建完成后装配
    installMediaKeys()
    createTray()
  })
  .catch(handleStartupFailure)

app.on('window-all-closed', () => {
  mainWindow = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  const win = mainWindow ?? BrowserWindow.getAllWindows()[0]
  if (!win || win.isDestroyed()) return
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
})

app.on('activate', () => {
  if (isQuitting) return
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
    return
  }
  void createWindow().catch(handleStartupFailure)
})
