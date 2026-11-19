import { beforeAll, describe, expect, it, vi } from 'vitest'

/*
 * src/utils/common.ts 在模块顶层会实例化 router / Pinia store，
 * 其中 playerStore 还会创建 Audio。单元测试运行在 node 环境，
 * 因此把这些有副作用的模块替换为轻量 mock，只验证纯函数 formatTrackTime。
 */
vi.mock('@/router/index', () => {
  const router = {
    push: vi.fn(),
    go: vi.fn(),
    beforeEach: vi.fn(),
    afterEach: vi.fn(),
  }
  return { router, default: router }
})

vi.mock('@/store/playerStore', () => ({
  usePlayerStore: () => ({}),
}))

vi.mock('@/store/index', () => ({
  useUserInfoStore: () => ({ isLogin: false }),
  useSearchStore: () => ({}),
  useLikeStore: () => ({
    likeMusicIds: [],
    isLiked: () => false,
    refresh: async () => undefined,
    toggleLike: async () => undefined,
  }),
}))

vi.mock('@/store/store', () => ({ default: {} }))

let formatTrackTime: (value: number) => string

beforeAll(async () => {
  // common.ts 依赖链较重，动态导入以确保上面的 mock 先生效
  ;({ formatTrackTime } = await import('@/utils/common'))
})

describe('formatTrackTime', () => {
  it('空值 / 非法值返回空字符串', () => {
    expect(formatTrackTime(0)).toBe('')
    expect(formatTrackTime(NaN)).toBe('')
    expect(formatTrackTime(undefined as unknown as number)).toBe('')
  })

  it('1 分钟以内补零到两位秒', () => {
    expect(formatTrackTime(1)).toBe('0:01')
    expect(formatTrackTime(9)).toBe('0:09')
    expect(formatTrackTime(59)).toBe('0:59')
  })

  it('整分钟不带多余的秒', () => {
    expect(formatTrackTime(60)).toBe('1:00')
    expect(formatTrackTime(120)).toBe('2:00')
  })

  it('分钟与秒都正确进位', () => {
    expect(formatTrackTime(65)).toBe('1:05')
    expect(formatTrackTime(125)).toBe('2:05')
    expect(formatTrackTime(3599)).toBe('59:59')
    expect(formatTrackTime(3661)).toBe('61:01')
  })

  it('秒数为小数时向下取整', () => {
    expect(formatTrackTime(61.9)).toBe('1:01')
    expect(formatTrackTime(119.99)).toBe('1:59')
  })
})
