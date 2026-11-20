/**
 * 详情类 GET 接口的轻量内存缓存（TTL + LRU）。
 *
 * 设计目标：
 * - 纯内存、无依赖、可单测：不读 localStorage、不依赖 axios；
 * - TTL 到期后 `get()` 视为未命中，`getWithMeta()` 仍可拿到旧值（为 stale-while-revalidate 预留）；
 * - LRU：`get()` / `getWithMeta()` 命中都会提升新鲜度，超出容量时淘汰最久未使用的条目；
 * - `stableKey()` 生成与参数顺序无关的缓存 key，并忽略 `timestamp` 这类每次请求都会变的字段
 *   （request 拦截器会给所有 params 注入 `timestamp: Date.now()`）。
 */

/** 默认容量（条目数） */
export const DEFAULT_CACHE_MAX_SIZE = 60

/** 默认 TTL（毫秒） */
export const DEFAULT_CACHE_TTL = 60_000

export interface TtlLruCacheOptions {
  /** 最大条目数，默认 {@link DEFAULT_CACHE_MAX_SIZE} */
  maxSize?: number
  /** 默认 TTL（毫秒），默认 {@link DEFAULT_CACHE_TTL} */
  ttl?: number
  /** 可注入时钟（单测用），默认 `Date.now` */
  now?: () => number
}

export interface CacheLookupResult<V> {
  value: V
  /** 是否已超过 TTL（值仍然返回，供 stale-while-revalidate 决定是否先用旧值） */
  isStale: boolean
}

interface CacheEntry<V> {
  value: V
  /** 过期时间戳（毫秒）；`now >= expiresAt` 即过期 */
  expiresAt: number
}

/**
 * TTL + LRU 内存缓存。
 * 内部用 `Map` 的插入顺序维护 LRU：命中时 delete + set 把条目挪到末尾，淘汰时删第一个。
 */
export class TtlLruCache<V> {
  private readonly maxSize: number
  private readonly defaultTtl: number
  private readonly now: () => number
  private readonly entries = new Map<string, CacheEntry<V>>()

  constructor(options: TtlLruCacheOptions = {}) {
    const maxSize = options.maxSize ?? DEFAULT_CACHE_MAX_SIZE
    this.maxSize = Math.max(1, Math.floor(maxSize))
    const ttl = options.ttl ?? DEFAULT_CACHE_TTL
    this.defaultTtl = Number.isFinite(ttl)
      ? Math.max(0, ttl)
      : DEFAULT_CACHE_TTL
    this.now = options.now ?? Date.now
  }

  /** 当前条目数 */
  get size(): number {
    return this.entries.size
  }

  /** 当前缓存 key（按 LRU 顺序：最旧 -> 最新），便于调试与单测 */
  keys(): string[] {
    return Array.from(this.entries.keys())
  }

  /**
   * 读取未过期的缓存值；未命中或已过期返回 undefined。
   * 命中时提升该 key 的新鲜度。
   */
  get(key: string): V | undefined {
    const entry = this.entries.get(key)
    if (!entry) return undefined
    if (this.isExpired(entry)) {
      this.entries.delete(key)
      return undefined
    }
    this.touch(key, entry)
    return entry.value
  }

  /**
   * 读取缓存并返回过期标记；未命中返回 undefined。
   * 过期条目仍会返回旧值（`isStale: true`），由调用方决定是先用旧值还是丢弃。
   */
  getWithMeta(key: string): CacheLookupResult<V> | undefined {
    const entry = this.entries.get(key)
    if (!entry) return undefined
    const isStale = this.isExpired(entry)
    this.touch(key, entry)
    return { value: entry.value, isStale }
  }

  /** 写入缓存；`ttl` 缺省用实例默认值，超出容量时淘汰最久未使用的条目 */
  set(key: string, value: V, ttl?: number): void {
    const effectiveTtl = this.normalizeTtl(ttl)
    const expiresAt = this.now() + effectiveTtl
    // 先删后插：同 key 覆盖时保持 Map 顺序为「最新」
    this.entries.delete(key)
    this.entries.set(key, { value, expiresAt })
    this.evictOverflow()
  }

  /** 删除指定 key，返回是否删除成功 */
  delete(key: string): boolean {
    return this.entries.delete(key)
  }

  /** 清空所有缓存 */
  clear(): void {
    this.entries.clear()
  }

  private isExpired(entry: CacheEntry<V>): boolean {
    return this.now() >= entry.expiresAt
  }

  private normalizeTtl(ttl?: number): number {
    if (typeof ttl !== 'number' || !Number.isFinite(ttl)) {
      return this.defaultTtl
    }
    return Math.max(0, ttl)
  }

  /** LRU 提升：把条目挪到 Map 末尾（最新） */
  private touch(key: string, entry: CacheEntry<V>): void {
    this.entries.delete(key)
    this.entries.set(key, entry)
  }

  private evictOverflow(): void {
    while (this.entries.size > this.maxSize) {
      const oldestKey = this.entries.keys().next().value
      if (oldestKey === undefined) return
      this.entries.delete(oldestKey)
    }
  }
}

/** 生成缓存 key 时需要忽略的字段（每次请求都会变，不能进入 key） */
const IGNORED_KEY_NAMES: ReadonlySet<string> = new Set(['timestamp'])

/** 递归归一化：对象按键名排序、忽略 timestamp、数组保持顺序、Date 转 ISO */
const normalizeForKey = (value: unknown): unknown => {
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(normalizeForKey)
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>
    const sorted: Record<string, unknown> = {}
    Object.keys(record)
      .sort()
      .forEach((key) => {
        if (IGNORED_KEY_NAMES.has(key)) return
        sorted[key] = normalizeForKey(record[key])
      })
    return sorted
  }
  return value
}

/**
 * 生成稳定的缓存 key：`url?{按 key 排序后的 JSON}`。
 * - 参数顺序、嵌套对象 key 顺序不影响结果；
 * - 递归忽略 `timestamp` 字段（request 拦截器注入的防缓存参数）；
 * - 序列化失败时退化为只用 url（尽量不抛错）。
 */
export const stableKey = (url: string, params?: unknown): string => {
  if (params === undefined || params === null) return url
  try {
    return `${url}?${JSON.stringify(normalizeForKey(params))}`
  } catch {
    return url
  }
}
