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
}

/** 同一条消息的短时间去重窗口 */
const DEDUPE_WINDOW = 1200
/** 最多同时展示的条数（超出时移除最旧的） */
const MAX_COUNT = 5

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
 * 修复点：
 * - id 递增（旧实现 seed 从不自增，所有通知 id 都是 `notification_1`）；
 * - 容器单例复用；
 * - 最多同时 5 条，超出移除最旧的；
 * - 每条通知关闭后真正卸载并移除 DOM（旧实现只是把高度收成 0，节点永久残留）。
 */
const notify = (options: string | VNode | NotifyOptions): void => {
  const normalized = normalizeOptions(options)
  const messageText = typeof normalized.message === 'string' ? normalized.message : ''

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
  getContainer().appendChild(wrapper)

  const item: ActiveNotification = { id, wrapper }
  const vnode = createVNode(NotificationConstructor, {
    id,
    ...normalized,
    onClosed: () => remove(item),
  })
  render(vnode, wrapper)
  active.push(item)

  while (active.length > MAX_COUNT) {
    const oldest = active[0]
    if (!oldest) break
    remove(oldest)
  }
}

export default notify
