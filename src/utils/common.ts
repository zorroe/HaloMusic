/**
 * 渲染进程通用工具。
 *
 * 说明：
 * - 不再直接使用 Electron 的 ipcRenderer（渲染进程已禁用 node 集成），窗口/外链能力统一走 `@/utils/bridge`（preload 暴露）；
 * - 不再静态依赖 `@/router`（routeTo / go 内动态导入），避免 utils -> router -> views -> api 的循环依赖；
 * - 不再静态依赖 `@/views/**\/api`，所需接口收敛在 `@/api/**` 中；
 * - 所有“读 localStorage 后 JSON.parse”的地方都做了安全解析，未登录 / 脏数据不再抛错。
 */
import Cookies from 'js-cookie'
import pinia from '@/store/store'
import { bridge } from '@/utils/bridge'
import { isApiError } from '@/utils/request'
import { useLikeStore, useUserInfoStore } from '@/store/index'
import { usePlayerStore } from '@/store/playerStore'
import { getPlayListAllApi } from '@/api/playList'
import { getSubAlbumlistApi } from '@/api/album'
import { checkMusicApi, getMusicUrlApi } from '@/api/music'
import { getPlayListByUidApi, loginStatusApi, logoutApi } from '@/api/user'
import type { MusicBaseInfo } from '@/types/musicRel'

const userInfoStore = useUserInfoStore(pinia)
const likeStore = useLikeStore(pinia)

/**
 * playerStore 目前由播放器核心（另一条并行改造线）维护，
 * 这里只依赖少量稳定字段，并在 clearPlaylist 可用时优先使用，避免签名未定导致编译失败。
 */
interface PlayerStoreLike {
  playlist: MusicBaseInfo[]
  clearPlaylist?: () => void
}

const playerStore = usePlayerStore(pinia) as unknown as PlayerStoreLike

interface RouteLocationLike {
  name?: string | null
  fullPath: string
}

interface RouterLike {
  push(path: string): unknown
  go(delta: number): void
  /** vue-router 的 currentRoute 是 ref，这里只取用到的字段 */
  currentRoute?: { value: RouteLocationLike }
  /** 等待首次导航完成（避免在初始 redirect 期间重复跳转） */
  isReady?: () => Promise<void>
}

/** 动态获取 router（不走静态 import，避免循环依赖） */
const getRouter = (): Promise<RouterLike | undefined> =>
  import('@/router')
    .then((module) => {
      const candidate = module as {
        router?: RouterLike
        default?: RouterLike
      }
      return candidate.router ?? candidate.default
    })
    .catch(() => undefined)

/**
 * 跳转登录页。
 * - 先等路由 ready：App 挂载时初始导航（守卫会把 / 重定向到 /login?redirect=）可能还在进行中，
 *   此时直接 push('/login') 会与守卫的 redirect 竞争；
 * - 已经在登录页时不再跳转：否则会带上/丢掉不同的 query，RouterView 重建实例会导致
 *   登录页二次挂载、同时开两套二维码轮询。
 */
export const gotoLogin = async (): Promise<void> => {
  const router = await getRouter()
  if (!router) return
  await router.isReady?.()
  if (router.currentRoute?.value?.name === 'login') return
  void Promise.resolve(router.push('/login')).catch(() => undefined)
}

export const routeTo = (path: string): void => {
  void getRouter().then((router) => {
    if (!router) return
    void Promise.resolve(router.push(path)).catch(() => undefined)
  })
}

export const go = (where: string): void => {
  void getRouter().then((router) => {
    if (!router) return
    if (where === 'forward') {
      router.go(1)
    } else if (where === 'back') {
      router.go(-1)
    } else {
      router.go(0)
    }
  })
}

export const sleep = (numberMillis: number): Promise<void> =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, numberMillis)
  })

/** 用系统默认浏览器打开外链（仅允许 http/https） */
export const openUrl = (url: string): void => {
  if (!/^https?:\/\//i.test(url) || url.length > 2048) return
  bridge.openExternal(url)
}

export const windowMinimize = (): void => {
  bridge.window.minimize()
}

export const windowMaxRestore = (): void => {
  bridge.window.toggleMaximize()
}

export const windowClose = (): void => {
  bridge.window.close()
}

export const handleLogin = (): void => {
  routeTo('/login')
}

export const setCookie = (key: string, value: string): void => {
  // 过期时间 30 天
  Cookies.set(key, value, { expires: 30 })
}

export const getCookie = (key: string): string => Cookies.get(key) ?? ''

export const removeCookie = (key: string): void => {
  Cookies.remove(key)
}

export const clearAllCookie = (): void => {
  document.cookie.split(';').forEach((cookie) => {
    const name = cookie.split('=')[0]?.trim()
    if (!name) return
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
  })
}

export const clearLocalStorage = (): void => {
  localStorage.clear()
}

/** 清空播放器队列（优先调用播放器 store 的 clearPlaylist，旧版本兼容直接清空 playlist） */
const clearPlayerQueue = (): void => {
  if (typeof playerStore.clearPlaylist === 'function') {
    playerStore.clearPlaylist()
    return
  }
  playerStore.playlist = []
}

/**
 * 校验登录状态。
 * - 成功且 profile 存在：写入 store（同时持久化到 localStorage）；
 * - profile 为空：清理登录态并跳登录；
 * - 网络失败：保留已有登录态，绝不把已登录用户误踢下线。
 */
export const checkLoginStatus = async (): Promise<boolean> => {
  try {
    const res = await loginStatusApi()
    const profile = res.data?.profile ?? null
    if (profile) {
      userInfoStore.setUserInfo(profile)
      return true
    }
    userInfoStore.setUserInfo(null)
    await gotoLogin()
    return false
  } catch {
    return userInfoStore.isLogin
  }
}

export const doLogout = async (): Promise<void> => {
  try {
    await logoutApi()
  } catch {
    // 后端退出失败也要清本地登录态
  }
  userInfoStore.setUserInfo(null)
  userInfoStore.setLogin(false)
  clearPlayerQueue()
  clearAllCookie()
  clearLocalStorage()
  likeStore.refresh()
  await gotoLogin()
}

/**
 * 重新拉取“我喜欢的音乐”id 列表并写入本地缓存 + likeStore。
 * 未登录直接返回，网络失败保留旧缓存（不抛出，避免页面未捕获的 rejection）。
 */
export const saveLikeMusicIds = async (): Promise<void> => {
  const userId = userInfoStore.getUserInfo?.userId
  if (!userId) return

  try {
    const res = await getPlayListByUidApi({ uid: userId })
    const likePlayList = res.playlist?.[0]
    if (!likePlayList?.id) return
    localStorage.setItem('likePlayListId', String(likePlayList.id))

    const { songs } = await getPlayListAllApi({ id: likePlayList.id })
    const ids = (songs ?? [])
      .map((song) => Number(song.id))
      .filter((id) => Number.isFinite(id))
    localStorage.setItem('likeMusicIds', JSON.stringify(ids))
    likeStore.refresh()
  } catch {
    // 网络异常时保留旧缓存
  }
}

/** 重新拉取收藏专辑 id 列表并写入本地缓存；未登录直接返回 */
export const saveSubAlbumIds = async (): Promise<void> => {
  if (!userInfoStore.isLogin) return

  try {
    const { data } = await getSubAlbumlistApi({ offset: 0, limit: 999 })
    const ids = (data ?? [])
      .map((item) => Number(item.id))
      .filter((id) => Number.isFinite(id))
    localStorage.setItem('subAlbumIds', JSON.stringify(ids))
  } catch {
    // 网络异常时保留旧缓存
  }
}

/** 秒数 -> m:ss（行为与旧实现保持一致，build-infra 单元测试依赖） */
export function formatTrackTime(value: number): string {
  if (!value) return ''
  const min = ~~(value / 60)
  const sec = (~~(value % 60)).toString().padStart(2, '0')
  return `${min}:${sec}`
}

/** 毫秒 -> m:ss */
export function formatDuration(ms: number): string {
  if (!ms || !Number.isFinite(ms)) return ''
  return formatTrackTime(Math.floor(ms / 1000))
}

export interface CheckMusicResult {
  success: boolean
  message: string
  code?: number
}

/** 检查歌曲是否可播放（有版权且有播放地址） */
export const checkMusic = async (id: number): Promise<CheckMusicResult> => {
  try {
    const checkStatus = await checkMusicApi(id)
    const musicUrl = await getMusicUrlApi({ id, level: 'exhigh' })
    const source = musicUrl.data?.[0]
    if (!source?.url || source.freeTrialInfo) {
      return { success: false, message: '暂无资源' }
    }
    return {
      success: Boolean(checkStatus?.success),
      message: checkStatus?.message ?? '',
      code: checkStatus?.code,
    }
  } catch (error) {
    return {
      success: false,
      message: isApiError(error) ? error.message : '检查音乐失败',
    }
  }
}
