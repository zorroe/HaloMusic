import { createVNode, isVNode, render } from 'vue'
import type { VNode } from 'vue'
import NotificationConstructor from './Notification.vue'

export type NotifyType = 'info' | 'success' | 'warning' | 'error'

export interface NotifyOptions {
  message: string | VNode
  type?: NotifyType
  /** 毫秒；<=0 表示不自动关闭 */
  duration?: number
}

interface ActiveNotification {
  id: string
  wrapper: HTMLElement
  /** 请求关闭：正常播放退出动画后再移除；组件未就绪时退化为立即移除 */
  close: () => void
}

/** 同一条消息的短时间去重窗口 */
const DEDUPE_WINDOW = 1200
/** 最多同时展示的条数（超出时淘汰最旧的） */
const MAX_COUNT = 5
/** 多条同时出现时的入场错峰间隔 */
const STAGGER_STEP = 35

let seed = 0
let lastMessage = ''
let lastShownAt = 0
const active: ActiveNotification[] = []

const getContainer = (): HTMLElement => {
  const existed = document.getElementById('ea-notify-container')
  if (existed) return existed
  const container = document.createElement('div')
  container.id = 'ea-notify-container'
  document.body.appendChild(container)
  return container
}

const remove = (item: ActiveNotification) => {
  const index = active.indexOf(item)
  if (index !== -1) active.splice(index, 1)
  render(null, item.wrapper)
  item.wrapper.remove()
}

const normalizeOptions = (
  options: string | VNode | NotifyOptions
): NotifyOptions => {
  if (typeof options === 'string' || isVNode(options)) {
    return { message: options }
  }
  return options
}

/**
 * 全局轻提示。
 *
 * 能力约定保持不变：
 * - 同文案 1.2s 去重；
 * - 容器单例复用，最多同时 5 条，超出淘汰最旧；
 * - 组件卸载（Notification.vue）负责清理自身定时器；
 * - 关闭时先播退出动画（halo-slide-out-right + fade），动画结束才真正 unmount + 移除 DOM，
 *   避免旧实现「收起高度」与「移除节点」竞争造成的闪现。
 */
const notify = (options: string | VNode | NotifyOptions): void => {
  const normalized = normalizeOptions(options)
  const messageText =
    typeof normalized.message === 'string' ? normalized.message : ''

  const now = Date.now()
  if (
    messageText &&
    messageText === lastMessage &&
    now - lastShownAt < DEDUPE_WINDOW
  ) {
    return
  }
  lastMessage = messageText
  lastShownAt = now

  seed += 1
  const id = `notification_${seed}`
  const wrapper = document.createElement('div')
  // 多条同时出现时按当前条数做 35ms 错峰（只影响入场动画，不影响移除时机）
  const staggerDelay = Math.min(active.length, MAX_COUNT - 1) * STAGGER_STEP
  wrapper.style.setProperty('--ea-notify-delay', `${staggerDelay}ms`)
  getContainer().appendChild(wrapper)

  const item: ActiveNotification = { id, wrapper, close: () => remove(item) }
  const vnode = createVNode(NotificationConstructor, {
    id,
    ...normalized,
    onClosed: () => remove(item),
    // 组件挂载后接管关闭：走「先动画、后卸载」的路径
    registerClose: (close: () => void) => {
      item.close = close
    },
  })
  render(vnode, wrapper)
  active.push(item)

  // 超限时让最旧的几条播放退场动画（而不是瞬间删除）。
  // 出现动画期间 active 里仍保留它们，等 onClosed 回调再真正移除。
  const overflow = active.length - MAX_COUNT
  if (overflow > 0) {
    active.slice(0, overflow).forEach(oldest => oldest.close())
  }
}

export default notify
