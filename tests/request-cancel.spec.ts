/**
 * 导航作用域请求取消（Phase 2-C）单测。
 *
 * 覆盖：
 * - isCanceledError 对 axios 取消 / ERR_CANCELED / ApiError.isCanceled 的识别；
 * - rotateNavigationScope 会取消在途页面级 GET，且不触发重试；
 * - withoutAbortOnNavigate 标记的应用级请求不受切页影响；
 * - 显式 abortOnNavigate: false 同样不被取消；
 * - 取消后去重表已清理，同参数新请求会重新发起。
 *
 * 说明：用自定义 axios adapter 模拟真实 XHR adapter 的取消行为
 * （监听 config.signal 的 abort 并以 axios.CanceledError reject），
 * 从而在 node 环境验证「拦截器绑定 signal → 轮换作用域 → 归一化为 ApiError(isCanceled)」。
 */
import { describe, expect, it } from 'vitest'
import axios from 'axios'
import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import http, {
  ApiError,
  isCanceledError,
  rotateNavigationScope,
  withoutAbortOnNavigate,
} from '@/utils/request'

const flush = (ms = 20): Promise<void> =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })

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

/** 立即成功的 adapter（记录调用次数） */
const createImmediateAdapter = (payload: unknown = { code: 200, ok: true }) => {
  const calls: InternalAxiosRequestConfig[] = []
  const adapter: AxiosAdapter = async (config) => {
    calls.push(config)
    return toResponse(config, payload)
  }
  return { adapter, calls }
}

/** 一直挂起、收到 signal abort 才以 CanceledError reject 的 adapter（模拟真实网络请求） */
const createPendingAdapter = () => {
  const calls: InternalAxiosRequestConfig[] = []
  const adapter: AxiosAdapter = (config) =>
    new Promise<AxiosResponse>((_resolve, reject) => {
      calls.push(config)
      const signal = config.signal as AbortSignal | undefined
      if (!signal) {
        // 没有绑定导航作用域（应用级请求）：保持挂起，由测试主动轮换也不会取消
        return
      }
      if (signal.aborted) {
        reject(new axios.CanceledError())
        return
      }
      signal.addEventListener(
        'abort',
        () => reject(new axios.CanceledError()),
        {
          once: true,
        }
      )
    })
  return { adapter, calls }
}

describe('isCanceledError', () => {
  it('识别 axios.CanceledError / ERR_CANCELED / ApiError.isCanceled', () => {
    expect(isCanceledError(new axios.CanceledError())).toBe(true)
    expect(isCanceledError(new axios.CanceledError('canceled by scope'))).toBe(
      true
    )
    expect(isCanceledError({ code: 'ERR_CANCELED' })).toBe(true)
    expect(
      isCanceledError(new ApiError('请求已取消', { isCanceled: true }))
    ).toBe(true)
  })

  it('普通错误不算取消', () => {
    expect(isCanceledError(new Error('network down'))).toBe(false)
    expect(
      isCanceledError(new ApiError('网络连接失败，请检查网络后重试'))
    ).toBe(false)
    expect(isCanceledError(null)).toBe(false)
    expect(isCanceledError(undefined)).toBe(false)
    expect(isCanceledError('ERR_CANCELED')).toBe(false)
  })
})

describe('导航作用域取消', () => {
  it('轮换作用域会取消在途页面级 GET，并归一化为 ApiError(isCanceled)、不重试', async () => {
    rotateNavigationScope()
    const { adapter, calls } = createPendingAdapter()

    const pending = http.get('/__test__/slow', { adapter, params: { id: 1 } })
    await flush()
    expect(calls.length).toBe(1)
    expect(calls[0]?.signal).toBeDefined()

    rotateNavigationScope()

    let caught: unknown
    try {
      await pending
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(ApiError)
    expect(isCanceledError(caught)).toBe(true)
    expect((caught as ApiError).isCanceled).toBe(true)
    expect((caught as ApiError).status).toBeUndefined()

    // 取消属于正常控制流：不会进入 GET 重试
    await flush(60)
    expect(calls.length).toBe(1)
  })

  it('withoutAbortOnNavigate 标记的应用级请求在切页后仍然完成', async () => {
    rotateNavigationScope()
    const { adapter, calls } = createImmediateAdapter({ code: 200, ok: true })

    const pending = withoutAbortOnNavigate(() =>
      http.get('/__test__/keep-alive', { adapter })
    )
    // 请求发起后立即切页：标记应在同步阶段就被消费
    rotateNavigationScope()

    await expect(pending).resolves.toEqual({ code: 200, ok: true })
    expect(calls.length).toBe(1)
    expect(calls[0]?.abortOnNavigate).toBe(false)
  })

  it('显式 abortOnNavigate: false 的 GET 同样不被切页取消', async () => {
    rotateNavigationScope()
    const { adapter, calls } = createImmediateAdapter({ code: 200 })

    const pending = http.get('/__test__/explicit-keep', {
      adapter,
      abortOnNavigate: false,
    })
    rotateNavigationScope()

    await expect(pending).resolves.toEqual({ code: 200 })
    expect(calls[0]?.abortOnNavigate).toBe(false)
    expect(calls[0]?.signal).toBeUndefined()
  })

  it('取消后去重表清理：同参数的新请求会重新发起', async () => {
    rotateNavigationScope()
    const { adapter, calls } = createPendingAdapter()

    const first = http.get('/__test__/dedupe', { adapter, params: { id: 7 } })
    await flush()
    rotateNavigationScope()
    await first.catch(() => undefined)

    const second = http.get('/__test__/dedupe', { adapter, params: { id: 7 } })
    await flush()
    expect(calls.length).toBe(2)

    rotateNavigationScope()
    await second.catch(() => undefined)
  })

  it('回调内没发请求时 keep 标记会回收，不会让后续请求免于取消', async () => {
    rotateNavigationScope()
    // 空操作：没有同步发起任何请求，标记应立即回收
    await withoutAbortOnNavigate(async () => undefined)

    const { adapter, calls } = createPendingAdapter()
    const pending = http.get('/__test__/after-noop', {
      adapter,
      params: { id: 9 },
    })
    await flush()
    expect(calls.length).toBe(1)

    // 仍是页面级请求：切页后应被取消
    rotateNavigationScope()
    let caught: unknown
    try {
      await pending
    } catch (error) {
      caught = error
    }
    expect(isCanceledError(caught)).toBe(true)
  })
})
