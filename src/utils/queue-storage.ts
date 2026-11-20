/**
 * 播放队列持久化（v2：只存 id 列表 + 当前 id）。
 *
 * 背景：旧版把完整歌曲对象数组序列化进 `player-playlist`，一首歌约 1KB，
 * 上千首歌就会逼近 localStorage 5MB 配额。v2 只存 id，体量缩小约两个数量级，
 * 启动/首次使用时再由播放器 store 批量回填详情。
 *
 * 本模块只做「纯函数 + localStorage 薄封装」，不依赖 DOM / Vue / 网络，
 * 便于在 node 环境单测。
 */

export const QUEUE_STORAGE_KEY = 'player-queue-v2'
export const LEGACY_QUEUE_KEY = 'player-playlist'
/** 旧版当前歌曲 id 的持久化 key（迁移时读取） */
export const LEGACY_CURRENT_ID_KEY = 'player-id'

/** 队列最多持久化的歌曲数，防止异常数据写爆存储 */
export const MAX_QUEUE_LENGTH = 2000

export interface PersistedQueue {
  ids: number[]
  /** 当前歌曲 id；不在 ids 里时归一化为 null */
  currentId: number | null
  /** 最近一次持久化时间（毫秒时间戳），便于排查 */
  updatedAt: number
}

/** 序列化只需要读取 id，兼容 SongDetail 等更宽的对象 */
export interface QueueSongLike {
  id?: unknown
}

const warnedKeys = new Set<string>()

/** 同类降级只提示一次，避免每次持久化都刷控制台 */
const warnOnce = (key: string, message: string): void => {
  if (warnedKeys.has(key)) return
  warnedKeys.add(key)
  console.warn(`[queue-storage] ${message}`)
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/** 兼容 localStorage 读出来的 JSON 字符串与已解析对象 */
const decodeJson = (raw: unknown): unknown => {
  if (typeof raw !== 'string') return raw
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    return null
  }
}

/**
 * 把任意值归一化为合法的网易云歌曲 id（正整数）。
 * 非有限数字、<=0、空串、非数字字符串统一返回 null。
 */
export const normalizeQueueId = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? Math.trunc(value) : null
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null
  }
  return null
}

/** 过滤非法 id、去重并保持原顺序 */
const collectValidIds = (values: readonly unknown[]): number[] => {
  const ids: number[] = []
  const seen = new Set<number>()
  for (const value of values) {
    const id = normalizeQueueId(value)
    if (id === null || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }
  return ids
}

const limitQueueLength = (ids: number[]): number[] => {
  if (ids.length <= MAX_QUEUE_LENGTH) return ids
  warnOnce(
    'truncate',
    `播放队列超过 ${MAX_QUEUE_LENGTH} 首，仅持久化前 ${MAX_QUEUE_LENGTH} 首`
  )
  return ids.slice(0, MAX_QUEUE_LENGTH)
}

/** 从「未知结构数组」里提取 id（兼容对象数组与纯 id 数组的脏数据） */
const collectIdsFromUnknownArray = (values: readonly unknown[]): number[] => {
  const extracted = values.map((value) => {
    if (isRecord(value)) return value.id
    // 兼容历史脏数据：[1,2,3]、["1","2"] 之类直接存 id 的数组
    return value
  })
  return collectValidIds(extracted)
}

const buildPersistedQueue = (
  rawSongs: readonly unknown[],
  currentId: unknown,
  now?: number
): PersistedQueue => {
  const ids = limitQueueLength(collectIdsFromUnknownArray(rawSongs))
  const normalizedCurrent = normalizeQueueId(currentId)
  const updatedAt =
    typeof now === 'number' && Number.isFinite(now)
      ? Math.trunc(now)
      : Date.now()
  return {
    ids,
    // currentId 必须真实存在于队列里，否则视为无效（例如上一首已被移出队列）
    currentId:
      normalizedCurrent !== null && ids.includes(normalizedCurrent)
        ? normalizedCurrent
        : null,
    updatedAt,
  }
}

/**
 * 把内存中的完整播放队列序列化成持久化结构。
 *
 * @param playlist 完整歌曲对象数组（只读取 id 字段）
 * @param currentId 当前歌曲 id（string/number 均可，非法时归一化为 null）
 * @param now 便于测试注入的当前时间戳，缺省用 Date.now()
 */
export const serializeQueue = (
  playlist: readonly QueueSongLike[] | null | undefined,
  currentId?: unknown,
  now?: number
): PersistedQueue => {
  const songs: readonly unknown[] = Array.isArray(playlist) ? playlist : []
  return buildPersistedQueue(songs, currentId, now)
}

/**
 * 解析 v2 持久化数据（容错：null / 空串 / 非 JSON / 缺字段 / ids 非数组）。
 *
 * @param raw localStorage 原始字符串或已解析对象
 * @returns 合法结构；无法识别时返回 null
 */
export const parsePersistedQueue = (raw: unknown): PersistedQueue | null => {
  const decoded = decodeJson(raw)
  if (!isRecord(decoded)) return null

  const rawIds = decoded.ids
  if (!Array.isArray(rawIds)) return null

  // 解析阶段静默截断（格式异常以容错为主，不提示用户）
  const ids = collectValidIds(rawIds).slice(0, MAX_QUEUE_LENGTH)
  const normalizedCurrent = normalizeQueueId(decoded.currentId)
  const rawUpdatedAt = decoded.updatedAt
  const updatedAt =
    typeof rawUpdatedAt === 'number' && Number.isFinite(rawUpdatedAt)
      ? Math.trunc(rawUpdatedAt)
      : 0

  return {
    ids,
    currentId:
      normalizedCurrent !== null && ids.includes(normalizedCurrent)
        ? normalizedCurrent
        : null,
    updatedAt,
  }
}

/**
 * 把旧版 `player-playlist`（完整歌曲对象数组）迁移成 v2 结构。
 *
 * 纯函数：`currentId` 由调用方从旧 key `player-id` 读取后传入，保持可单测。
 *
 * @param raw 旧版原始字符串或已解析数组
 * @param currentId 旧版当前歌曲 id（通常来自 localStorage 的 player-id）
 * @returns 提取到有效 id 时返回 v2 结构；不是数组或全是脏数据时返回 null
 */
export const migrateLegacyQueue = (
  raw: unknown,
  currentId?: unknown,
  now?: number
): PersistedQueue | null => {
  const decoded = decodeJson(raw)
  if (!Array.isArray(decoded)) return null
  const queue = buildPersistedQueue(decoded, currentId, now)
  return queue.ids.length > 0 ? queue : null
}

// ---------------- localStorage 薄封装（不可用时静默降级） ----------------

const getStorage = (): Storage | null => {
  try {
    if (typeof localStorage === 'undefined' || !localStorage) return null
    return localStorage
  } catch {
    return null
  }
}

const requireStorage = (): Storage | null => {
  const storage = getStorage()
  if (!storage) {
    warnOnce('storage', 'localStorage 不可用，播放队列本次会话不做持久化')
    return null
  }
  return storage
}

/** 读取 v2 队列；没有/损坏返回 null */
export const readPersistedQueue = (): PersistedQueue | null => {
  const storage = requireStorage()
  if (!storage) return null
  try {
    return parsePersistedQueue(storage.getItem(QUEUE_STORAGE_KEY))
  } catch {
    warnOnce('read', '读取播放队列失败，已忽略本地缓存')
    return null
  }
}

/** 写入 v2 队列；失败（不可用/配额满）返回 false，不抛出 */
export const writePersistedQueue = (queue: PersistedQueue): boolean => {
  const storage = requireStorage()
  if (!storage) return false
  try {
    storage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue))
    return true
  } catch {
    warnOnce(
      'write',
      '播放队列持久化失败（localStorage 不可用或超出配额），当前会话继续可用'
    )
    return false
  }
}

/** 删除 v2 队列（清理场景使用） */
export const clearPersistedQueue = (): void => {
  const storage = requireStorage()
  if (!storage) return
  try {
    storage.removeItem(QUEUE_STORAGE_KEY)
  } catch {
    warnOnce('clear', '清除播放队列持久化失败')
  }
}

/** 读取旧版完整队列数组；不存在/损坏返回 null */
export const readLegacyPlaylist = (): unknown[] | null => {
  const storage = getStorage()
  if (!storage) return null
  try {
    const decoded = decodeJson(storage.getItem(LEGACY_QUEUE_KEY))
    return Array.isArray(decoded) ? decoded : null
  } catch {
    warnOnce('legacy-read', '读取旧版播放队列失败，跳过迁移')
    return null
  }
}

/** 读取旧版当前歌曲 id（player-id），非法返回 null */
export const readLegacyCurrentId = (): number | null => {
  const storage = getStorage()
  if (!storage) return null
  try {
    return normalizeQueueId(storage.getItem(LEGACY_CURRENT_ID_KEY))
  } catch {
    return null
  }
}

/** 迁移成功后删除旧版队列 key */
export const removeLegacyPlaylist = (): void => {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem(LEGACY_QUEUE_KEY)
  } catch {
    warnOnce('legacy-clear', '清理旧版播放队列失败')
  }
}
