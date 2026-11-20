import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PLAYBACK_RATE,
  PLAYBACK_RATE_CYCLE,
  PROGRESS_CLEAR_SENTINEL,
  formatSleepCountdown,
  nextPlaybackRate,
  normalizePlaybackRate,
  normalizeSleepTimerMinutes,
  shouldPushProgress,
} from '../src/utils/player-timer'

describe('normalizePlaybackRate（倍速夹取与步进）', () => {
  it('夹取到 0.5~2.0、对齐 0.25 步进，非法值回落默认 1', () => {
    expect(normalizePlaybackRate(0.1)).toBe(0.5)
    expect(normalizePlaybackRate(3)).toBe(2)
    expect(normalizePlaybackRate(1)).toBe(1)
    expect(normalizePlaybackRate(1.1)).toBe(1)
    expect(normalizePlaybackRate(1.2)).toBe(1.25)
    expect(normalizePlaybackRate(0.65)).toBe(0.75)

    expect(normalizePlaybackRate(Number.NaN)).toBe(DEFAULT_PLAYBACK_RATE)
    expect(normalizePlaybackRate(Number.POSITIVE_INFINITY)).toBe(
      DEFAULT_PLAYBACK_RATE
    )
    expect(normalizePlaybackRate(0)).toBe(DEFAULT_PLAYBACK_RATE)
    expect(normalizePlaybackRate(-1)).toBe(DEFAULT_PLAYBACK_RATE)
    expect(normalizePlaybackRate('abc')).toBe(DEFAULT_PLAYBACK_RATE)
    expect(normalizePlaybackRate(undefined)).toBe(DEFAULT_PLAYBACK_RATE)
  })
})

describe('nextPlaybackRate（循环档位）', () => {
  it('按 1 → 1.25 → 1.5 → 0.75 → 0.5 → 1 循环，表外值取更大最近档', () => {
    const visited: number[] = [1]
    let current = 1
    for (let i = 0; i < PLAYBACK_RATE_CYCLE.length; i += 1) {
      current = nextPlaybackRate(current)
      visited.push(current)
    }
    expect(visited).toEqual([1, 1.25, 1.5, 0.75, 0.5, 1])

    expect(nextPlaybackRate(1.75)).toBe(PLAYBACK_RATE_CYCLE[0])
    expect(nextPlaybackRate(0.9)).toBe(1.25)
  })
})

describe('formatSleepCountdown（倒计时格式化）', () => {
  it('格式化为 mm:ss，超过 1 小时用 h:mm:ss，非法值归零', () => {
    expect(formatSleepCountdown(0)).toBe('00:00')
    expect(formatSleepCountdown(-5)).toBe('00:00')
    expect(formatSleepCountdown(Number.NaN)).toBe('00:00')
    expect(formatSleepCountdown(59)).toBe('00:59')
    expect(formatSleepCountdown(60)).toBe('01:00')
    expect(formatSleepCountdown(900)).toBe('15:00')
    expect(formatSleepCountdown(3599)).toBe('59:59')
    expect(formatSleepCountdown(3600)).toBe('1:00:00')
    expect(formatSleepCountdown(3661)).toBe('1:01:01')
  })
})

describe('normalizeSleepTimerMinutes（分钟数归一化）', () => {
  it('支持 15/30/60 等正整数分钟，非法值归零，超限截断', () => {
    expect(normalizeSleepTimerMinutes(15)).toBe(15)
    expect(normalizeSleepTimerMinutes(30)).toBe(30)
    expect(normalizeSleepTimerMinutes(60)).toBe(60)
    expect(normalizeSleepTimerMinutes(15.9)).toBe(15)
    expect(normalizeSleepTimerMinutes(0)).toBe(0)
    expect(normalizeSleepTimerMinutes(-10)).toBe(0)
    expect(normalizeSleepTimerMinutes('abc')).toBe(0)
    expect(normalizeSleepTimerMinutes(99_999)).toBe(720)
  })
})

describe('shouldPushProgress（任务栏进度回写节流）', () => {
  it('未变化/<1% 不回写，≥1%、边界值与哨兵必须回写', () => {
    expect(shouldPushProgress(0.5, 0.5)).toBe(false)
    expect(shouldPushProgress(0.5, 0.504)).toBe(false)
    expect(shouldPushProgress(0.5, 0.51)).toBe(true)
    expect(shouldPushProgress(0.5, 0.49)).toBe(true)

    expect(shouldPushProgress(0.3, 0)).toBe(true)
    expect(shouldPushProgress(0.9, 1)).toBe(true)
    expect(shouldPushProgress(0.5, PROGRESS_CLEAR_SENTINEL)).toBe(true)
    expect(shouldPushProgress(PROGRESS_CLEAR_SENTINEL, 0.01)).toBe(true)
    expect(
      shouldPushProgress(PROGRESS_CLEAR_SENTINEL, PROGRESS_CLEAR_SENTINEL)
    ).toBe(false)
  })

  it('非法进度不回写，支持自定义阈值', () => {
    expect(shouldPushProgress(0.5, Number.NaN)).toBe(false)
    expect(shouldPushProgress(Number.NaN, 0.5)).toBe(true)
    expect(shouldPushProgress(0.5, 0.52, 0.05)).toBe(false)
    expect(shouldPushProgress(0.5, 0.56, 0.05)).toBe(true)
  })
})
