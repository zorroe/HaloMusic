/**
 * 播放器增强相关的纯逻辑（睡眠定时器 / 播放倍速 / 任务栏进度回写节流）。
 *
 * 这里只放无副作用的纯函数与常量，不依赖 DOM / Audio / 定时器 / Vue，
 * 便于在 node 环境单测；真正的 audio 同步与计时器调度在 playerStore 内完成。
 */

/** 播放倍速允许范围 */
export const PLAYBACK_RATE_MIN = 0.5
export const PLAYBACK_RATE_MAX = 2
/** 播放倍速步进 */
export const PLAYBACK_RATE_STEP = 0.25
/** 默认倍速 */
export const DEFAULT_PLAYBACK_RATE = 1

/** cyclePlaybackRate 的循环顺序：1 → 1.25 → 1.5 → 0.75 → 0.5 → 1 */
export const PLAYBACK_RATE_CYCLE = [1, 1.25, 1.5, 0.75, 0.5] as const

/** 任务栏进度回写的最小变化量（1%） */
export const PROGRESS_PUSH_MIN_DELTA = 0.01

/** 清除任务栏进度的哨兵值（与 bridge 契约一致） */
export const PROGRESS_CLEAR_SENTINEL = -1

/** 睡眠定时器允许的最长分钟数（12 小时，防止误传超大值） */
export const SLEEP_TIMER_MAX_MINUTES = 720

const roundToStep = (value: number, step: number): number => {
  // 先把浮点误差压掉再对齐步进（0.25 的倍数在二进制下可精确表示，仍兜底两位小数）
  return Math.round(Math.round(value / step) * step * 100) / 100
}

/**
 * 归一化播放倍速：夹取到 [0.5, 2.0] 并对齐 0.25 步进。
 * 非法值（NaN / Infinity / <= 0 / 非数字）回落到默认 1。
 */
export function normalizePlaybackRate(rate: unknown): number {
  const parsed = typeof rate === 'number' ? rate : Number(rate)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_PLAYBACK_RATE
  const clamped = Math.min(
    PLAYBACK_RATE_MAX,
    Math.max(PLAYBACK_RATE_MIN, parsed)
  )
  return roundToStep(clamped, PLAYBACK_RATE_STEP)
}

/**
 * 取循环顺序中的下一档倍速。
 * 当前倍速不在循环表里（例如用户通过 setPlaybackRate(1.75) 设置）时，
 * 取比它大的最近一档，没有则回到循环表第一档。
 */
export function nextPlaybackRate(current: number): number {
  const normalized = normalizePlaybackRate(current)
  const index = PLAYBACK_RATE_CYCLE.findIndex((rate) => rate === normalized)
  if (index === -1) {
    const larger = PLAYBACK_RATE_CYCLE.find((rate) => rate > normalized)
    return larger ?? PLAYBACK_RATE_CYCLE[0]
  }
  return PLAYBACK_RATE_CYCLE[(index + 1) % PLAYBACK_RATE_CYCLE.length]
}

const pad2 = (value: number): string => String(value).padStart(2, '0')

/**
 * 睡眠定时器倒计时格式化：`mm:ss`（超过 1 小时为 `h:mm:ss`）。
 * 0 / 负数 / 非法值返回 `00:00`。
 */
export function formatSleepCountdown(seconds: unknown): string {
  const parsed = typeof seconds === 'number' ? seconds : Number(seconds)
  if (!Number.isFinite(parsed) || parsed <= 0) return '00:00'

  const total = Math.floor(parsed)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const restSeconds = total % 60
  if (hours > 0) {
    return `${hours}:${pad2(minutes)}:${pad2(restSeconds)}`
  }
  return `${pad2(minutes)}:${pad2(restSeconds)}`
}

/**
 * 归一化睡眠定时器分钟数：非法/非正数返回 0（表示不启动），
 * 超过上限截断到 SLEEP_TIMER_MAX_MINUTES，小数向下取整。
 */
export function normalizeSleepTimerMinutes(minutes: unknown): number {
  const parsed = typeof minutes === 'number' ? minutes : Number(minutes)
  if (!Number.isFinite(parsed) || parsed <= 0) return 0
  return Math.min(SLEEP_TIMER_MAX_MINUTES, Math.floor(parsed))
}

/**
 * 任务栏进度回写节流判定。
 *
 * - 进度未变化不重复回写；
 * - 清除哨兵 -1：只在“上一次不是 -1”时回写一次；
 * - 从 -1 恢复到正常进度时立即回写；
 * - 0 / 1 两个边界值立即回写（开始 / 播完）；
 * - 其余情况变化量 ≥ minDelta（默认 1%）才回写。
 */
export function shouldPushProgress(
  previous: number,
  next: number,
  minDelta: number = PROGRESS_PUSH_MIN_DELTA
): boolean {
  if (!Number.isFinite(next)) return false
  if (next === PROGRESS_CLEAR_SENTINEL)
    return previous !== PROGRESS_CLEAR_SENTINEL
  if (previous === PROGRESS_CLEAR_SENTINEL) return true
  if (!Number.isFinite(previous)) return true

  const clamped = Math.min(1, Math.max(0, next))
  if (clamped === previous) return false
  if (clamped === 0 || clamped === 1) return true

  const threshold = Math.min(Math.abs(minDelta), 1)
  return Math.abs(clamped - previous) >= threshold
}
