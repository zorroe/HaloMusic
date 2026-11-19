/**
 * Preload：在隔离环境（contextIsolation: true + nodeIntegration: false）下暴露
 * window.halo 桥接对象，并注入启动 loading 动画。
 *
 * 约定：
 * - 本文件是独立构建产物（vite-plugin-electron 打成单文件 CJS），因此不 import
 *   仓库内其它模块，也不 import Node 内置模块；只依赖 electron 的
 *   contextBridge / ipcRenderer（保持轻量，减少攻击面）。
 * - `HaloBridge` 形状必须与 `src/utils/bridge.ts` 中 Lead 冻结的契约完全一致。
 */
import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'

// ---------------------------------------------------------------------------
// window.halo 契约（与 src/utils/bridge.ts 的 HaloBridge 保持一致，改动需双方同步）
// ---------------------------------------------------------------------------

interface HaloWindowControls {
  minimize(): void
  toggleMaximize(): void
  close(): void
  isMaximized(): Promise<boolean>
  onMaximizeChange(cb: (isMax: boolean) => void): () => void
}

interface HaloBridge {
  readonly isElectron: boolean
  readonly platform: string
  openExternal(url: string): void
  readonly window: HaloWindowControls
  getAppVersion(): Promise<string>
  quit(): void
}

/**
 * IPC 通道名，与 electron/main/index.ts 中的 IPC 常量保持一致。
 * preload 与 main 是两份独立产物，不共享模块，改动必须两处同步。
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
} as const

const haloBridge: HaloBridge = {
  isElectron: true,
  platform: process.platform,
  openExternal: (url: string) => {
    // 真正的主进程侧校验在 electron/main/index.ts（渲染进程传入的一切都视为不可信）
    if (typeof url !== 'string' || url.length === 0) return
    ipcRenderer.send(IPC.openExternal, url)
  },
  window: {
    minimize: () => ipcRenderer.send(IPC.windowMinimize),
    toggleMaximize: () => ipcRenderer.send(IPC.windowToggleMaximize),
    close: () => ipcRenderer.send(IPC.windowClose),
    isMaximized: async () =>
      Boolean(await ipcRenderer.invoke(IPC.windowIsMaximized)),
    onMaximizeChange: (cb: (isMax: boolean) => void) => {
      const listener = (_event: IpcRendererEvent, value: unknown) => {
        cb(Boolean(value))
      }
      ipcRenderer.on(IPC.windowMaximizedChanged, listener)
      // 返回取消订阅函数；注意必须用同一个 listener 引用调用 removeListener
      return () => {
        ipcRenderer.removeListener(IPC.windowMaximizedChanged, listener)
      }
    },
  },
  getAppVersion: async () =>
    String(await ipcRenderer.invoke(IPC.getAppVersion)),
  quit: () => ipcRenderer.send(IPC.appQuit),
}

try {
  contextBridge.exposeInMainWorld('halo', haloBridge)
} catch (error) {
  // 暴露失败不应中断页面加载（浏览器环境本就没有 preload）
  console.error('[HaloMusic preload] 暴露 window.halo 失败:', error)
}

// ---------------------------------------------------------------------------
// 启动 loading 动画（原有行为保留：渲染进程挂载完成后通知移除，4999ms 兜底）
// ---------------------------------------------------------------------------

function domReady(
  condition: DocumentReadyState[] = ['complete', 'interactive']
) {
  return new Promise((resolve) => {
    if (condition.includes(document.readyState)) {
      resolve(true)
    } else {
      document.addEventListener('readystatechange', () => {
        if (condition.includes(document.readyState)) {
          resolve(true)
        }
      })
    }
  })
}

const safeDOM = {
  append(parent: HTMLElement, child: HTMLElement) {
    if (!Array.from(parent.children).find((e) => e === child)) {
      return parent.appendChild(child)
    }
  },
  remove(parent: HTMLElement, child: HTMLElement) {
    if (Array.from(parent.children).find((e) => e === child)) {
      return parent.removeChild(child)
    }
  },
}

/**
 * https://tobiasahlin.com/spinkit
 * https://connoratherton.com/loaders
 * https://projects.lukehaas.me/css-loaders
 * https://matejkustec.github.io/SpinThatShit
 */
function useLoading() {
  const className = `loaders-css__square-spin`
  const styleContent = `
@keyframes square-spin {
  25% { transform: perspective(100px) rotateX(180deg) rotateY(0); }
  50% { transform: perspective(100px) rotateX(180deg) rotateY(180deg); }
  75% { transform: perspective(100px) rotateX(0) rotateY(180deg); }
  100% { transform: perspective(100px) rotateX(0) rotateY(0); }
}
.${className} > div {
  animation-fill-mode: both;
  width: 50px;
  height: 50px;
  background: #fff;
  animation: square-spin 3s 0s cubic-bezier(0.09, 0.57, 0.49, 0.9) infinite;
}
.app-loading-wrap {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #282c34;
  z-index: 9;
}
    `
  const oStyle = document.createElement('style')
  const oDiv = document.createElement('div')

  oStyle.id = 'app-loading-style'
  oStyle.textContent = styleContent
  oDiv.className = 'app-loading-wrap'
  oDiv.innerHTML = `<div class="${className}"><div></div></div>`

  return {
    appendLoading() {
      safeDOM.append(document.head, oStyle)
      safeDOM.append(document.body, oDiv)
    },
    removeLoading() {
      safeDOM.remove(document.head, oStyle)
      safeDOM.remove(document.body, oDiv)
    },
  }
}

// ----------------------------------------------------------------------

const { appendLoading, removeLoading } = useLoading()
domReady().then(appendLoading)

// 兜底通道：主进程 did-finish-load 后通过 IPC 通知移除 loading
// （window.postMessage 需要跨 contextIsolation world，个别环境可能不通）
ipcRenderer.on(IPC.appReady, () => {
  removeLoading()
})

// 移除 window.onmessage 全局覆盖：改为 addEventListener，且只接受约定 payload
window.addEventListener('message', (event: MessageEvent) => {
  const data: unknown = event.data
  if (
    data !== null &&
    typeof data === 'object' &&
    (data as { payload?: unknown }).payload === 'removeLoading'
  ) {
    removeLoading()
  }
})

// 兜底：即使渲染进程未通知，5 秒后也移除 loading
setTimeout(removeLoading, 4999)
