/**
 * 详情类 GET 内存缓存（Phase 3-2 / A6）单测。
 *
 * 覆盖：
 * - TtlLruCache：LRU 淘汰顺序、TTL 过期、容量上限、getWithMeta 的 stale 标记、clear/delete/覆盖；
 * - stableKey：参数顺序无关、嵌套对象排序、忽略 timestamp、无参数 / 数组顺序等边界；
 * - request.ts 集成：缓存命中短路（不真正发请求、切页 rotate 不清缓存）、
 *   业务错误码不写缓存、cache: false 不缓存、写接口成功后失效缓存。
 */
import { describe, expect, it } from 'vitest'
import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import {
  DEFAULT_CACHE_MAX_SIZE,
  DEFAULT_CACHE_TTL,
  stableKey,
  TtlLruCache,
} from '@/utils/api-cache'
import http, { rotateNavigationScope } from '@/utils/request'

/** 可推进的假时钟，用于确定性验证 TTL */
const createClock = (start = 1_000) => {
  let current = start
  return {
    now: (): number => current,
    advance: (ms: number): void => {
      current += ms
    },
  }
}

const toResponse = (
  config: InternalAxiosRequestConfig,
  payload: unknown
): AxiosResponse => ({
  data: payload,
  status: 200,
  statusText: 'OK',
  headers: {},
  config,
})

/** 立即成功的 adapter，记录调用次数 */
const createAdapter = (payload: unknown) => {
  const state = { calls: 0 }
  const adapter: AxiosAdapter = async (config) => {
    state.calls += 1
    return toResponse(config, payload)
  }
  return { adapter, state }
}

describe('TtlLruCache', () => {
  it('set/get 命中并提升 LRU 新鲜度（最久未用的先淘汰）', () => {
    const clock = createClock()
    const cache = new TtlLruCache<string>({
      maxSize: 2,
      ttl: 10_000,
      now: clock.now,
    })

    cache.set('a', 'A')
    cache.set('b', 'B')
    // 访问 a，使其成为"最近使用"，此时最久未用的是 b
    expect(cache.get('a')).toBe('A')

    cache.set('c', 'C')
    expect(cache.size).toBe(2)
    expect(cache.get('a')).toBe('A')
    expect(cache.get('c')).toBe('C')
    expect(cache.get('b')).toBeUndefined()
  })

  it('TTL 过期后 get 视为未命中，getWithMeta 仍能拿到旧值并标记 isStale', () => {
    const clock = createClock()
    const cache = new TtlLruCache<string>({
      maxSize: 4,
      ttl: 1000,
      now: clock.now,
    })

    cache.set('a', 'A')
    clock.advance(999)
    expect(cache.get('a')).toBe('A')
    expect(cache.getWithMeta('a')).toEqual({ value: 'A', isStale: false })

    clock.advance(2)
    expect(cache.get('a')).toBeUndefined() // get 丢弃过期条目

    cache.set('b', 'B')
    clock.advance(1500)
    // 过期条目：getWithMeta 返回旧值 + isStale，供 stale-while-revalidate 使用
    expect(cache.getWithMeta('b')).toEqual({ value: 'B', isStale: true })
    expect(cache.get('b')).toBeUndefined()
  })

  it('容量上限：超出后淘汰最旧条目，size 不超过 maxSize', () => {
    const clock = createClock()
    const cache = new TtlLruCache<number>({
      maxSize: 3,
      ttl: 10_000,
      now: clock.now,
    })

    for (let index = 0; index < 5; index += 1) {
      cache.set(`k${index}`, index)
    }
    expect(cache.size).toBe(3)
    expect(cache.keys()).toEqual(['k2', 'k3', 'k4'])
    expect(cache.get('k0')).toBeUndefined()
    expect(cache.get('k1')).toBeUndefined()
  })

  it('默认容量 / TTL 有合理默认值；clear / delete / 同 key 覆盖行为正确', () => {
    const clock = createClock()
    const cache = new TtlLruCache<string>({ now: clock.now })

    expect(DEFAULT_CACHE_MAX_SIZE).toBeGreaterThan(0)
    expect(DEFAULT_CACHE_TTL).toBeGreaterThan(0)

    cache.set('a', 'A')
    cache.set('a', 'A2') // 覆盖不增加条目数
    expect(cache.size).toBe(1)
    expect(cache.get('a')).toBe('A2')

    cache.set('b', 'B')
    expect(cache.delete('a')).toBe(true)
    expect(cache.delete('a')).toBe(false)
    expect(cache.size).toBe(1)

    cache.clear()
    expect(cache.size).toBe(0)
    expect(cache.get('b')).toBeUndefined()
  })
})

describe('stableKey', () => {
  it('参数顺序无关，且不同 url 不同 key', () => {
    expect(stableKey('/playlist/detail', { id: 1, timestamp2: 2 })).toBe(
      stableKey('/playlist/detail', { timestamp2: 2, id: 1 })
    )
    expect(stableKey('/album', { id: 1 })).not.toBe(
      stableKey('/artist', { id: 1 })
    )
  })

  it('忽略顶层与嵌套的 timestamp（请求拦截器每次都会注入）', () => {
    expect(stableKey('/x', { id: 1, timestamp: 111 })).toBe(
      stableKey('/x', { timestamp: 222, id: 1 })
    )
    expect(stableKey('/x', { id: 1 })).toBe(
      stableKey('/x', { id: 1, timestamp: 999 })
    )
    expect(
      stableKey('/x', { filter: { id: 1, timestamp: 1 }, timestamp: 2 })
    ).toBe(stableKey('/x', { filter: { timestamp: 3, id: 1 }, timestamp: 4 }))
  })

  it('嵌套对象按键排序；数组保持顺序；无参数时只用 url', () => {
    expect(stableKey('/x', { filter: { b: 2, a: 1 }, ids: [1, 2] })).toBe(
      stableKey('/x', { ids: [1, 2], filter: { a: 1, b: 2 } })
    )
    expect(stableKey('/x', { ids: [1, 2] })).not.toBe(
      stableKey('/x', { ids: [2, 1] })
    )
    expect(stableKey('/x')).toBe('/x')
    expect(stableKey('/x', undefined)).toBe('/x')
    expect(stableKey('/x', null)).toBe('/x')
    // undefined 值被 JSON 序列化丢弃，等价于没有该参数
    expect(stableKey('/x', { id: 1, extra: undefined })).toBe(
      stableKey('/x', { id: 1 })
    )
  })
})

describe('request.ts 缓存集成', () => {
  it('cache: true 命中缓存短路（不发请求），rotateNavigationScope 不清缓存', async () => {
    const { adapter, state } = createAdapter({ code: 200, data: { id: 42 } })

    const first = await http.get('/__test__/cache-hit', {
      adapter,
      params: { id: 42 },
      cache: true,
    })
    expect(first).toEqual({ code: 200, data: { id: 42 } })
    expect(state.calls).toBe(1)

    // 切页轮换导航作用域不应清空接口缓存
    rotateNavigationScope()

    const second = await http.get('/__test__/cache-hit', {
      adapter,
      params: { id: 42 },
      cache: true,
    })
    expect(second).toEqual({ code: 200, data: { id: 42 } })
    expect(state.calls).toBe(1) // 未真正发请求（拦截器已短路）

    // 参数不同 => 未命中
    await http.get('/__test__/cache-hit', {
      adapter,
      params: { id: 43 },
      cache: true,
    })
    expect(state.calls).toBe(2)
  })

  it('业务错误码不写缓存；cache: false 不缓存', async () => {
    const errorPayload = createAdapter({ code: 400, msg: '参数错误' })
    await http
      .get('/__test__/cache-biz-error', {
        adapter: errorPayload.adapter,
        params: { id: 1 },
        cache: true,
      })
      .catch(() => undefined)
    await http
      .get('/__test__/cache-biz-error', {
        adapter: errorPayload.adapter,
        params: { id: 1 },
        cache: true,
      })
      .catch(() => undefined)
    expect(errorPayload.state.calls).toBe(2)

    const noCache = createAdapter({ code: 200, data: { id: 1 } })
    await http.get('/__test__/cache-off', {
      adapter: noCache.adapter,
      params: { id: 1 },
      cache: false,
    })
    await http.get('/__test__/cache-off', {
      adapter: noCache.adapter,
      params: { id: 1 },
      cache: false,
    })
    expect(noCache.state.calls).toBe(2)
  })

  it('写接口成功后失效缓存，避免「收藏后详情还是旧数据」', async () => {
    const detail = createAdapter({ code: 200, data: { subscribed: false } })
    const detailConfig = {
      adapter: detail.adapter,
      params: { id: 7 },
      cache: true,
    }

    await http.get('/__test__/mutation-target', detailConfig)
    await http.get('/__test__/mutation-target', detailConfig)
    expect(detail.state.calls).toBe(1) // 第二次命中缓存

    // 模拟网易云用 GET 实现的写接口（/like 成功后应整体失效缓存）
    const mutation = createAdapter({ code: 200 })
    await http.get('/like', {
      adapter: mutation.adapter,
      params: { id: 7, like: true },
    })

    await http.get('/__test__/mutation-target', detailConfig)
    expect(detail.state.calls).toBe(2) // 缓存已失效，重新请求
  })
})
