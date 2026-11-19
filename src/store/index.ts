import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { likeMusicApi } from '@/api/music'
import type { UserProfile } from '@/types/userRel'
import type {
  CloudSearchRawResult,
  SearchBucket,
  SearchResultState,
  SearchType,
} from '@/types/searchRel'

const USER_STORAGE_KEY = 'user'
const LOGIN_STORAGE_KEY = 'isLogin'
const LIKE_MUSIC_STORAGE_KEY = 'likeMusicIds'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/** 持久化 userInfo 时做安全解析：历史数据可能为空串 / 非法 JSON / “null” */
const userInfoSerializer = {
  read: (raw: string): UserProfile | null => {
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!isRecord(parsed)) return null
      return parsed as UserProfile
    } catch {
      return null
    }
  },
  write: (value: UserProfile | null): string => JSON.stringify(value),
}

/** 读取已持久化的 isLogin（区分“未写过”与“写过 false”） */
const readLoginFlagFromStorage = (): boolean | undefined => {
  try {
    if (typeof localStorage === 'undefined') return undefined
    const raw = localStorage.getItem(LOGIN_STORAGE_KEY)
    if (raw === null) return undefined
    return raw === 'true'
  } catch {
    return undefined
  }
}

/**
 * 用户信息 store。
 * userInfo 使用 useLocalStorage 持久化（key: user），刷新页面后不再丢失；
 * isLogin 与 userInfo 联动：setUserInfo(null) 会顺带把 isLogin 置为 false。
 */
export const useUserInfoStore = defineStore('userInfo', () => {
  const userInfo = useLocalStorage<UserProfile | null>(USER_STORAGE_KEY, null, {
    serializer: userInfoSerializer,
  })
  const storedLoginFlag = readLoginFlagFromStorage()
  const isLogin = useLocalStorage<boolean>(LOGIN_STORAGE_KEY, false)
  // 旧数据兼容：只有 user 没有 isLogin 时按已登录处理，避免路由守卫与登录页来回跳
  if (storedLoginFlag === undefined && userInfo.value) {
    isLogin.value = true
  }

  const setUserInfo = (info: UserProfile | null): void => {
    userInfo.value = info
    isLogin.value = Boolean(info)
  }

  const setLogin = (val: boolean): void => {
    isLogin.value = val
  }

  const getUserInfo = computed(() => userInfo.value)

  return {
    userInfo,
    isLogin,
    setLogin,
    getUserInfo,
    setUserInfo,
  }
})

const createEmptySearchResult = (): SearchResultState => ({
  song: { count: 0, s: [] },
  album: { count: 0, s: [] },
  artist: { count: 0, s: [] },
  playlist: { count: 0, s: [] },
  userprofile: { count: 0, s: [] },
  mv: { count: 0, s: [] },
})

/** 搜索结果元素的唯一标识（歌曲/专辑等用 id，用户用 userId） */
const searchItemKey = (item: unknown): string | number | undefined => {
  if (!isRecord(item)) return undefined
  const key = item.id ?? item.userId
  return typeof key === 'number' || typeof key === 'string' ? key : undefined
}

/**
 * 搜索 store。
 * setSearchResult 保持“追加”语义（分页加载更多可用），内部按 id 去重，
 * 修复旧实现重复点击“加载更多”会把同一批数据重复 push 的问题。
 */
export const useSearchStore = defineStore('search', () => {
  const searchKey = ref<string>('')
  const searchResult = ref<SearchResultState>(createEmptySearchResult())

  const setSearchKey = (key: string): void => {
    searchKey.value = key
  }

  const setSearchResult = (
    typeC: string,
    result: CloudSearchRawResult
  ): void => {
    const bucket = searchResult.value[typeC as SearchType] as
      SearchBucket<unknown> | undefined
    if (!bucket) return

    const count = result[`${typeC}Count`]
    if (typeof count === 'number') {
      bucket.count = count
    }

    const list = result[`${typeC}s`]
    if (!Array.isArray(list)) return

    const target = bucket.s
    const seen = new Set<string | number>()
    target.forEach((item) => {
      const itemKey = searchItemKey(item)
      if (itemKey !== undefined) seen.add(itemKey)
    })
    list.forEach((item) => {
      const itemKey = searchItemKey(item)
      if (itemKey !== undefined) {
        if (seen.has(itemKey)) return
        seen.add(itemKey)
      }
      target.push(item)
    })
  }

  const clearSearchResult = (): void => {
    searchResult.value = createEmptySearchResult()
  }

  const getSearchKey = computed(() => searchKey.value)

  const getSearchResult = computed(() => searchResult.value)

  return {
    searchKey,
    setSearchKey,
    getSearchKey,
    setSearchResult,
    getSearchResult,
    clearSearchResult,
  }
})

/** 读取本地缓存的喜欢歌曲 id（历史数据可能是数字或字符串，做一次收窄） */
const readLikeMusicIds = (): number[] => {
  try {
    const raw = localStorage.getItem(LIKE_MUSIC_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) =>
        typeof item === 'number' || typeof item === 'string'
          ? Number(item)
          : Number.NaN
      )
      .filter((id) => Number.isFinite(id))
  } catch {
    return []
  }
}

const writeLikeMusicIds = (ids: number[]): void => {
  try {
    localStorage.setItem(LIKE_MUSIC_STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // localStorage 不可用（隐私模式 / 配额满）时仅保留内存态
  }
}

/**
 * 喜欢歌曲 store。
 * MusicTable 等组件通过它读写喜欢状态，跨组件响应式同步（不再各自 JSON.parse localStorage）。
 * toggleLike 失败会回滚乐观更新并 reject，调用方负责提示。
 */
export const useLikeStore = defineStore('like', () => {
  const likeMusicIds = ref<number[]>(readLikeMusicIds())

  const isLiked = (id: number): boolean =>
    likeMusicIds.value.includes(Number(id))

  /** 从 localStorage 重新同步（saveLikeMusicIds 全量刷新后调用） */
  const refresh = (): void => {
    likeMusicIds.value = readLikeMusicIds()
  }

  const toggleLike = async (id: number): Promise<boolean> => {
    const targetId = Number(id)
    if (!Number.isFinite(targetId)) {
      throw new Error('无效的歌曲 id')
    }
    const liked = likeMusicIds.value.includes(targetId)
    const snapshot = [...likeMusicIds.value]
    // 乐观更新，失败时回滚
    likeMusicIds.value = liked
      ? snapshot.filter((item) => item !== targetId)
      : [...snapshot, targetId]

    try {
      const res = await likeMusicApi({ id: targetId, like: !liked })
      // 业务失败可能以 HTTP 200 + code != 200 返回，这里补一层校验
      if (typeof res.code === 'number' && res.code !== 200) {
        throw new Error(res.code === 301 ? '需要登录' : '喜欢操作失败')
      }
      writeLikeMusicIds(likeMusicIds.value)
      return !liked
    } catch (error) {
      likeMusicIds.value = snapshot
      writeLikeMusicIds(snapshot)
      throw error
    }
  }

  return {
    likeMusicIds,
    isLiked,
    refresh,
    toggleLike,
  }
})
