import type { HaloBridge } from '@/utils/bridge'

declare global {
  interface Window {
    /** 由 electron/preload/index.ts 通过 contextBridge 注入；浏览器环境为 undefined */
    halo?: HaloBridge
  }
}

export {}
