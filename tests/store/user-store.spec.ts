// @vitest-environment happy-dom
/**
 * useUserInfoStore 测试：setUserInfo 与 isLogin 联动、localStorage 持久化、
 * 从已有 localStorage 恢复、旧数据（只有 user 没有 isLogin）兼容。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { useUserInfoStore } from '@/store/index'
import type { UserProfile } from '@/types/userRel'

// store/index 顶层 import 了 likeMusicApi，这里精确 mock，避免加载网络层
vi.mock('@/api/music', () => ({ likeMusicApi: vi.fn() }))

const profile = {
  userId: 42,
  nickname: '测试用户',
  avatarUrl: 'https://p1.music.126.net/avatar.jpg',
} as unknown as UserProfile

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('useUserInfoStore', () => {
  it('setUserInfo 写入用户信息，联动 isLogin=true 并持久化', async () => {
    const store = useUserInfoStore()
    store.setUserInfo(profile)

    expect(store.isLogin).toBe(true)
    expect(store.getUserInfo?.nickname).toBe('测试用户')

    await nextTick()
    expect(JSON.parse(localStorage.getItem('user') ?? 'null')).toMatchObject({
      userId: 42,
      nickname: '测试用户',
    })
    expect(localStorage.getItem('isLogin')).toBe('true')
  })

  it('setUserInfo(null) 清空用户信息与登录态，并从 localStorage 移除 user', async () => {
    const store = useUserInfoStore()
    store.setUserInfo(profile)
    await nextTick()

    store.setUserInfo(null)
    expect(store.userInfo).toBeNull()
    expect(store.isLogin).toBe(false)

    await nextTick()
    expect(localStorage.getItem('user')).toBeNull()
    expect(localStorage.getItem('isLogin')).toBe('false')

    store.setLogin(true)
    expect(store.isLogin).toBe(true)
  })

  it('从 localStorage 恢复用户信息；旧数据只有 user 时自动补 isLogin', () => {
    localStorage.setItem('user', JSON.stringify(profile))
    setActivePinia(createPinia())

    const store = useUserInfoStore()
    expect(store.userInfo?.userId).toBe(42)
    expect(store.getUserInfo?.nickname).toBe('测试用户')
    // 旧版本可能没有写 isLogin：只要 user 存在就按已登录处理
    expect(store.isLogin).toBe(true)
  })
})
