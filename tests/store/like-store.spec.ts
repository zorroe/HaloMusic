// @vitest-environment happy-dom
/**
 * useLikeStore 测试：localStorage 初始化、乐观更新、成功写入、失败回滚、业务错误码。
 * 网络层用 vi.mock 精确 mock（只替换 likeMusicApi，不发真实请求）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useLikeStore } from '@/store/index'

const mocks = vi.hoisted(() => ({ likeMusicApi: vi.fn() }))

vi.mock('@/api/music', () => ({ likeMusicApi: mocks.likeMusicApi }))

const STORAGE_KEY = 'likeMusicIds'

const readStoredIds = (): unknown =>
  JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')

const createDeferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  mocks.likeMusicApi.mockReset()
})

describe('useLikeStore', () => {
  it('初始化时从 localStorage 读取喜欢列表，refresh 可重新同步', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([1, '2']))

    const store = useLikeStore()
    expect(store.likeMusicIds).toEqual([1, 2])
    expect(store.isLiked(1)).toBe(true)
    expect(store.isLiked(9)).toBe(false)

    localStorage.setItem(STORAGE_KEY, JSON.stringify([7]))
    store.refresh()
    expect(store.isLiked(7)).toBe(true)
    expect(store.isLiked(1)).toBe(false)
  })

  it('toggleLike 喜欢：先乐观更新，成功后调用接口并写 localStorage', async () => {
    const deferred = createDeferred<{ code: number }>()
    mocks.likeMusicApi.mockReturnValue(deferred.promise)

    const store = useLikeStore()
    const task = store.toggleLike(5)

    // 请求未返回前已经乐观更新
    expect(store.isLiked(5)).toBe(true)
    expect(mocks.likeMusicApi).toHaveBeenCalledWith({ id: 5, like: true })

    deferred.resolve({ code: 200 })
    await expect(task).resolves.toBe(true)
    expect(store.isLiked(5)).toBe(true)
    expect(readStoredIds()).toEqual([5])
  })

  it('toggleLike 取消喜欢：返回 false、移除 id 并同步 localStorage', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([5, 9]))
    mocks.likeMusicApi.mockResolvedValue({ code: 200 })

    const store = useLikeStore()
    await expect(store.toggleLike(5)).resolves.toBe(false)

    expect(store.isLiked(5)).toBe(false)
    expect(store.isLiked(9)).toBe(true)
    expect(mocks.likeMusicApi).toHaveBeenCalledWith({ id: 5, like: false })
    expect(readStoredIds()).toEqual([9])
  })

  it('接口失败时回滚乐观更新并 rethrow', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([9]))
    mocks.likeMusicApi.mockRejectedValue(new Error('network down'))

    const store = useLikeStore()
    const task = store.toggleLike(5)
    expect(store.isLiked(5)).toBe(true)

    await expect(task).rejects.toThrow('network down')
    expect(store.isLiked(5)).toBe(false)
    expect(store.isLiked(9)).toBe(true)
    expect(readStoredIds()).toEqual([9])
  })

  it('业务失败码（code != 200）与非法 id 都会拒绝且不留脏状态', async () => {
    mocks.likeMusicApi.mockResolvedValue({ code: 400 })

    const store = useLikeStore()
    await expect(store.toggleLike(3)).rejects.toThrow('喜欢操作失败')
    expect(store.isLiked(3)).toBe(false)

    await expect(store.toggleLike(Number.NaN)).rejects.toThrow('无效的歌曲 id')
    expect(store.likeMusicIds).toEqual([])
  })
})
