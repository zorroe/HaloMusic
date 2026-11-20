import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/** 内存版 Storage，用来在 node 环境模拟 localStorage */
const createMemoryStorage = (): Storage => {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size
    },
  }
}

/** 每个用例拿一份全新模块实例（warn 去重状态互不影响） */
const loadModule = async () => {
  vi.resetModules()
  return import('../src/utils/queue-storage')
}

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('serializeQueue', () => {
  it('过滤非法 id、去重且保持顺序，合法 currentId 保留', async () => {
    const { serializeQueue } = await loadModule()
    const playlist: Array<{ id?: unknown }> = [
      { id: 3 },
      { id: '3' },
      { id: 1 },
      { id: 0 },
      { id: -2 },
      { id: Number.NaN },
      { id: Number.POSITIVE_INFINITY },
      { id: null },
      {},
      { id: 'abc' },
      { id: '2' },
    ]

    const queue = serializeQueue(playlist, 1, 1_700_000_000_000)

    expect(queue.ids).toEqual([3, 1, 2])
    expect(queue.currentId).toBe(1)
    expect(queue.updatedAt).toBe(1_700_000_000_000)
  })

  it('空/脏队列返回空 ids，currentId 不在队列中时归一化为 null', async () => {
    const { serializeQueue } = await loadModule()

    expect(serializeQueue(null, 99).ids).toEqual([])
    expect(serializeQueue(undefined, 99).ids).toEqual([])
    expect(serializeQueue([{ id: 'bad' }], 99).ids).toEqual([])

    const queue = serializeQueue([{ id: 1 }, { id: 2 }], 99)
    expect(queue.ids).toEqual([1, 2])
    expect(queue.currentId).toBeNull()
  })

  it('超过最大长度时截断，且只 warn 一次', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { serializeQueue, MAX_QUEUE_LENGTH } = await loadModule()
    const playlist = Array.from(
      { length: MAX_QUEUE_LENGTH + 5 },
      (_, index) => ({
        id: index + 1,
      })
    )

    const first = serializeQueue(playlist, 1)
    expect(first.ids).toHaveLength(MAX_QUEUE_LENGTH)
    expect(first.ids[0]).toBe(1)
    expect(first.ids.at(-1)).toBe(MAX_QUEUE_LENGTH)

    // 第二次截断不再重复 warn
    serializeQueue(playlist, 2)
    expect(warn).toHaveBeenCalledTimes(1)
    const message = String(warn.mock.calls[0]?.[0] ?? '')
    expect(message).toContain('播放队列超过')
  })
})

describe('parsePersistedQueue', () => {
  it('解析 JSON 字符串/对象，容忍脏 ids 与缺失字段', async () => {
    const { parsePersistedQueue } = await loadModule()

    const fromString = parsePersistedQueue(
      JSON.stringify({
        ids: [2, 2, '1', 0, -1, 'x'],
        currentId: 1,
        updatedAt: 123,
      })
    )
    expect(fromString).toEqual({
      ids: [2, 1],
      currentId: 1,
      updatedAt: 123,
    })

    // 已解析对象、缺 updatedAt、currentId 不在队列里
    expect(parsePersistedQueue({ ids: ['5', 6], currentId: 5 })).toEqual({
      ids: [5, 6],
      currentId: 5,
      updatedAt: 0,
    })
    expect(parsePersistedQueue({ ids: [1], currentId: 9 })).toEqual({
      ids: [1],
      currentId: null,
      updatedAt: 0,
    })
  })

  it('无法识别的脏数据统一返回 null', async () => {
    const { parsePersistedQueue } = await loadModule()

    expect(parsePersistedQueue(null)).toBeNull()
    expect(parsePersistedQueue(undefined)).toBeNull()
    expect(parsePersistedQueue('')).toBeNull()
    expect(parsePersistedQueue('not-json')).toBeNull()
    expect(parsePersistedQueue('null')).toBeNull()
    expect(parsePersistedQueue(123)).toBeNull()
    expect(parsePersistedQueue([{ id: 1 }])).toBeNull()
    expect(parsePersistedQueue({})).toBeNull()
    expect(parsePersistedQueue({ ids: '1,2' })).toBeNull()
    expect(parsePersistedQueue({ ids: null })).toBeNull()
  })
})

describe('migrateLegacyQueue', () => {
  it('从旧版对象数组提取 id，currentId 由 player-id 传入', async () => {
    const { migrateLegacyQueue } = await loadModule()
    const legacy = [
      { id: 11, name: '歌A', al: { id: 1, name: '专辑', picUrl: '' } },
      { id: '11', name: '重复' },
      { name: '缺 id' },
      { id: 0 },
      { id: 12 },
      { id: 11 },
      null,
    ]

    const migrated = migrateLegacyQueue(legacy, '11', 1_700_000_000_001)

    expect(migrated).toEqual({
      ids: [11, 12],
      currentId: 11,
      updatedAt: 1_700_000_000_001,
    })
    // 也支持旧 key 里直接是 JSON 字符串
    expect(migrateLegacyQueue(JSON.stringify(legacy), 12)?.ids).toEqual([
      11, 12,
    ])
  })

  it('非数组或全是脏数据时返回 null', async () => {
    const { migrateLegacyQueue } = await loadModule()

    expect(migrateLegacyQueue(null)).toBeNull()
    expect(migrateLegacyQueue('not-json')).toBeNull()
    expect(migrateLegacyQueue({ ids: [1, 2] })).toBeNull()
    expect(migrateLegacyQueue([{ id: 0 }, { name: '无 id' }, null])).toBeNull()
  })
})

describe('localStorage 薄封装', () => {
  it('localStorage 不可用时静默降级并 warn', async () => {
    vi.stubGlobal('localStorage', undefined)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const queueStorage = await loadModule()

    expect(queueStorage.readPersistedQueue()).toBeNull()
    expect(
      queueStorage.writePersistedQueue({ ids: [1], currentId: 1, updatedAt: 0 })
    ).toBe(false)
    expect(() => queueStorage.clearPersistedQueue()).not.toThrow()
    expect(queueStorage.readLegacyPlaylist()).toBeNull()
    expect(queueStorage.readLegacyCurrentId()).toBeNull()
    expect(() => queueStorage.removeLegacyPlaylist()).not.toThrow()
    expect(warn).toHaveBeenCalled()
  })

  it('正常存储下可写、可读、可清空，旧 key 可读可删', async () => {
    const storage = createMemoryStorage()
    vi.stubGlobal('localStorage', storage)
    const queueStorage = await loadModule()

    expect(
      queueStorage.writePersistedQueue({
        ids: [2, 1],
        currentId: 2,
        updatedAt: 123,
      })
    ).toBe(true)
    expect(storage.getItem(queueStorage.QUEUE_STORAGE_KEY)).toBeTruthy()
    expect(queueStorage.readPersistedQueue()).toEqual({
      ids: [2, 1],
      currentId: 2,
      updatedAt: 123,
    })

    queueStorage.clearPersistedQueue()
    expect(queueStorage.readPersistedQueue()).toBeNull()

    storage.setItem(
      queueStorage.LEGACY_QUEUE_KEY,
      JSON.stringify([{ id: 7, name: '旧歌' }])
    )
    storage.setItem(queueStorage.LEGACY_CURRENT_ID_KEY, '7')
    expect(queueStorage.readLegacyPlaylist()).toEqual([{ id: 7, name: '旧歌' }])
    expect(queueStorage.readLegacyCurrentId()).toBe(7)

    queueStorage.removeLegacyPlaylist()
    expect(storage.getItem(queueStorage.LEGACY_QUEUE_KEY)).toBeNull()
  })

  it('写入抛错（配额满/被禁用）时降级返回 false 且不抛出', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const brokenStorage = {
      ...createMemoryStorage(),
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    } as Storage
    vi.stubGlobal('localStorage', brokenStorage)
    const queueStorage = await loadModule()

    expect(
      queueStorage.writePersistedQueue({ ids: [1], currentId: 1, updatedAt: 0 })
    ).toBe(false)
    expect(queueStorage.readPersistedQueue()).toBeNull()
  })
})
