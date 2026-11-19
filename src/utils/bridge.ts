/**
 * 渲染进程与 Electron 主进程之间的桥接层（契约文件，由 Lead 维护）。
 *
 * 设计目标：
 * - 渲染进程**不再**直接 `import { ipcRenderer } from 'electron'`；
 * - 主进程开启 `contextIsolation: true` + `nodeIntegration: false` 后，
 *   由 preload 通过 `contextBridge.exposeInMainWorld('halo', api)` 暴露能力；
 * - 纯浏览器环境（无 preload）自动降级为 no-op，保证 `vite` 直接跑也不报错。
 *
 * 实现方：electron/preload/index.ts 必须暴露与 HaloBridge 完全一致的对象。
 */
import type { Ref } from 'vue'

/** 窗口控制 */
export interface HaloWindowControls {
  minimize(): void
  /** 最大化 / 还原切换 */
  toggleMaximize(): void
  /** 关闭窗口（应用随后退出） */
  close(): void
  isMaximized(): Promise<boolean>
  /**
   * 订阅最大化状态变化。
   * @returns 取消订阅函数（必须在组件卸载时调用）
   */
  onMaximizeChange(cb: (isMax: boolean) => void): () => void
}

/** preload 暴露到 window.halo 的能力集合 */
export interface HaloBridge {
  readonly isElectron: boolean
  /** 'win32' | 'darwin' | 'linux' | 'web' */
  readonly platform: string
  /** 用系统默认浏览器打开外部链接，仅允许 http(s) */
  openExternal(url: string): void
  readonly window: HaloWindowControls
  /** 应用版本号（来自 package.json） */
  getAppVersion(): Promise<string>
  /** 退出应用 */
  quit(): void
}

const noop = () => undefined

const webFallback: HaloBridge = {
  isElectron: false,
  platform: 'web',
  openExternal: (url: string) => {
    if (!/^https?:\/\//i.test(url)) return
    window.open(url, '_blank', 'noopener,noreferrer')
  },
  window: {
    minimize: noop,
    toggleMaximize: noop,
    close: noop,
    isMaximized: async () => false,
    onMaximizeChange: () => noop,
  },
  getAppVersion: async () => '0.0.0',
  quit: noop,
}

/**
 * 全局单例桥接对象。
 * preload 在任何渲染脚本之前执行，因此模块加载时直接取 `window.halo` 是安全的。
 */
export const bridge: HaloBridge =
  (globalThis as unknown as { halo?: HaloBridge }).halo ?? webFallback

/** 将某个源（默认 window.halo）的“最大化”状态同步到 ref 的便捷 hook */
export function bindMaximizedState(
  isMax: Ref<boolean>,
  unsubscribe: Ref<(() => void) | undefined>
): void {
  if (!bridge.isElectron) return
  bridge.window.isMaximized().then(v => (isMax.value = v))
  const off = bridge.window.onMaximizeChange(v => (isMax.value = v))
  unsubscribe.value = off
}
