/**
 * 系统媒体键 / 托盘播放控制 → 播放器 store 的桥接（渲染层）。
 *
 * 链路：主进程（globalShortcut / Tray 菜单）→ `halo:media-key` IPC →
 * preload（`window.halo.media.onKey`，带动作白名单）→ 本模块 → playerStore。
 *
 * 约定：
 * - 纯浏览器环境（无 preload）由 bridge.ts 降级为 no-op，本模块直接跳过；
 * - 只订阅一次（模块级 flag），避免组件重复挂载 / HMR 造成多条监听；
 * - 不直接操作 audio 元素，也不 import electron，播放逻辑全部复用 store。
 */
import { usePlayerStore } from '@/store/playerStore'
import pinia from '@/store/store'
import { bridge } from '@/utils/bridge'
import type { MediaKeyAction } from '@/utils/bridge'

/** 模块级幂等标记：整个应用只绑定一次媒体键监听 */
let mediaKeysBound = false

/** 播放操作是异步的：兜底捕获，避免 rejection 冒泡成全局错误提示 */
const runPlayerAction = (task: Promise<unknown>): void => {
  void task.catch((error: unknown) => {
    console.error('[HaloMusic] 媒体键播放操作失败:', error)
  })
}

/**
 * 处理一个播放控制动作。
 * play-pause → togglePlay()；play-next → playNext()；play-prev → playPrev()
 */
const handleMediaKey = (action: MediaKeyAction): void => {
  const playerStore = usePlayerStore(pinia)

  switch (action) {
    case 'play-pause':
      runPlayerAction(playerStore.togglePlay())
      break
    case 'play-next':
      runPlayerAction(playerStore.playNext())
      break
    case 'play-prev':
      runPlayerAction(playerStore.playPrev())
      break
    default:
      // preload 已做白名单校验，这里只是类型收窄的兜底
      break
  }
}

/**
 * 绑定全局媒体键 / 托盘播放控制（幂等）。
 * 需在 pinia 初始化之后调用（由入口/根组件接线）。
 */
export function bindMediaKeys(): void {
  if (mediaKeysBound) return
  // 浏览器环境没有 preload，bridge 已降级为 no-op，无需订阅
  if (!bridge.isElectron) return

  mediaKeysBound = true
  bridge.media.onKey(handleMediaKey)
}
