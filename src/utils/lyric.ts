/**
 * 歌词解析工具（纯函数，无副作用、无第三方依赖）
 *
 * 兼容网易云歌词的常见脏数据：
 * - `[mm:ss]` / `[mm:ss.xx]` / `[mm:ss.xxx]` / `[mm:ss:xx]` 多种时间戳写法
 * - 一行多个时间戳（`[00:10.00][00:20.00]副歌`）
 * - `[offset:+/-毫秒]` 全局偏移（正值表示歌词整体延后显示）
 * - `[ti:] [ar:] [al:] [by:]` 等元信息标签、空行、CRLF、BOM、乱码脏行
 * - 只有时间戳没有歌词文本的行按空行处理（不参与滚动高亮）
 */

export interface LyricLine {
  /** 该行歌词开始时间，单位秒 */
  time: number
  /** 歌词文本（已 trim） */
  text: string
}

/** 时间戳：[mm:ss] / [mm:ss.xx] / [mm:ss.xxx] / [mm:ss:xx]（分钟允许 1-4 位） */
const TIME_TAG_SOURCE = '\\[(\\d{1,4}):(\\d{1,2})(?:[.:](\\d{1,3}))?\\]'

/** offset 标签，单位毫秒，可正可负 */
const OFFSET_TAG_RE = /\[offset:\s*([+-]?\d+)\s*\]/i

/** 把 `[mm:ss.xx]` 中的分、秒、小数部分换算成秒 */
const toSeconds = (
  minutes: string,
  seconds: string,
  fraction?: string
): number => {
  const min = Number.parseInt(minutes, 10)
  const sec = Number.parseInt(seconds, 10)
  if (!Number.isFinite(min) || !Number.isFinite(sec)) return Number.NaN
  // 小数部分按毫秒处理：`.5` => 500ms，`.34` => 340ms，`.345` => 345ms
  const ms = fraction ? Number.parseInt(fraction.padEnd(3, '0'), 10) : 0
  return min * 60 + sec + (Number.isFinite(ms) ? ms / 1000 : 0)
}

/** 读取全局 offset（毫秒），没有或非法时返回 0 */
const parseOffsetSeconds = (lyric: string): number => {
  const matched = OFFSET_TAG_RE.exec(lyric)
  if (!matched) return 0
  const offsetMs = Number.parseInt(matched[1], 10)
  return Number.isFinite(offsetMs) ? offsetMs / 1000 : 0
}

/**
 * 解析 LRC 歌词文本为按时间升序排列的歌词行数组。
 *
 * @param lrc 原始歌词字符串，允许为空/undefined（运行时容错）
 * @returns 歌词行数组；没有有效歌词时返回空数组
 */
export function parseLrc(lrc: string): LyricLine[] {
  if (typeof lrc !== 'string' || lrc.trim() === '') return []

  const normalized = lrc.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  const offsetSeconds = parseOffsetSeconds(normalized)

  const collected: Array<LyricLine & { order: number }> = []
  let order = 0

  for (const rawLine of normalized.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue

    // 每行单独创建带 g 的正则，避免 lastIndex 在行之间串扰
    const timeTagRe = new RegExp(TIME_TAG_SOURCE, 'g')
    const times: number[] = []
    let matched: RegExpExecArray | null
    while ((matched = timeTagRe.exec(line)) !== null) {
      const time = toSeconds(matched[1], matched[2], matched[3])
      if (Number.isFinite(time)) times.push(time)
    }
    // 没有时间戳：元信息标签（[ti:] [ar:] ...）或纯脏行，全部跳过
    if (times.length === 0) continue

    // 去掉全部时间戳后剩下的才是歌词文本
    const text = line.replace(new RegExp(TIME_TAG_SOURCE, 'g'), '').trim()
    // 只有标签没有歌词（间奏/占位行）不参与滚动
    if (!text) continue

    for (const time of times) {
      collected.push({
        // 偏移后小时级负值兜底为 0，避免进度条与歌词索引出现负时间
        time: Math.max(0, time + offsetSeconds),
        text,
        order: order++,
      })
    }
  }

  // 升序排列；同一时间点保持原始出现顺序
  collected.sort((a, b) => a.time - b.time || a.order - b.order)

  return collected.map(({ time, text }) => ({ time, text }))
}

/**
 * 根据当前播放进度查找正在播放的歌词行下标。
 *
 * @param lines parseLrc 解析后的歌词行（必须按 time 升序）
 * @param timeSeconds 当前播放时间，单位秒
 * @returns 当前行下标；未开始播放或数组为空时返回 -1
 */
export function findActiveLyricIndex(
  lines: LyricLine[],
  timeSeconds: number
): number {
  if (!Array.isArray(lines) || lines.length === 0) return -1
  if (!Number.isFinite(timeSeconds)) return -1
  if (timeSeconds < lines[0].time) return -1

  // 二分查找最后一个 time <= timeSeconds 的行
  let low = 0
  let high = lines.length - 1
  let active = -1
  while (low <= high) {
    const mid = (low + high) >> 1
    if (lines[mid].time <= timeSeconds) {
      active = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  return active
}
