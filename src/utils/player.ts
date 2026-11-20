/**
 * 播放器用到的数据获取封装（只做"取数 + 容错 + 统一结构"，不含播放状态）。
 *
 * 网络层（src/api/music.ts）由数据层负责，本文件只依赖其函数名与响应形状：
 * - checkMusicApi(id) => { success, message }
 * - getMusicUrlApi({ id, level }) => { data: [{ url, freeTrialInfo, ... }] }
 * - getMusicDetailApi({ ids }) => { songs: [...] }
 * - personFmApi() => { data: [...] }
 */
import {
  checkMusicApi,
  getMusicUrlApi,
  getMusicDetailApi,
  personFmApi,
} from '@/api/music'
import { withoutAbortOnNavigate } from '@/utils/request'

/** 播放器支持的音质档位 */
export type SongLevel = 'standard' | 'higher' | 'exhigh' | 'lossless'

export type SongId = string | number

export interface SongArtist {
  id: number
  name: string
  picUrl?: string
}

export interface SongAlbum {
  id: number
  name: string
  picUrl?: string
}

/**
 * 网易云歌曲详情（/song/detail 返回的原始结构）。
 * 只声明播放器实际读取的字段，其余字段透传。
 */
export interface SongDetail {
  id: number
  name: string
  ar?: SongArtist[]
  al?: SongAlbum
  /** 时长，单位毫秒 */
  dt?: number
  /** 接口字段随版本变化，未声明字段放宽为 any 便于透传 */
  [key: string]: any
}

/** getSongResource 的返回结构 */
export interface SongResource {
  /** 已把 http 协议升级为 https，可直接作为 audio.src */
  url: string
  /** true 表示只有试听片段（freeTrialInfo 非空） */
  freeTrial: boolean
  level: SongLevel
}

/** 网易云 /song/url/v1 返回的单条数据 */
interface MusicUrlItem {
  url?: string | null
  freeTrialInfo?: unknown
  level?: string
  br?: number | null
}

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

/** 把外部传入的 id（string/number/数组）统一成 /song/detail 需要的逗号分隔字符串 */
export const normalizeSongIds = (ids: SongId | SongId[]): string => {
  const list = Array.isArray(ids) ? ids : String(ids ?? '').split(',')
  return list
    .map((id) => String(id ?? '').trim())
    .filter((id) => id.length > 0)
    .join(',')
}

/** 混合内容会触发 Chromium 的拦截，统一升级成 https */
export const toSecureUrl = (url: string): string =>
  url.replace(/^http:\/\//i, 'https://')

/**
 * 判断歌曲是否可播放（版权/下架检测）。
 * 请求失败按"不可播放"处理，由调用方决定是否跳过。
 */
export const canPlay = async (songId: SongId): Promise<boolean> => {
  try {
    // 播放相关请求属于应用级请求：切页时不能被取消
    const res: unknown = await withoutAbortOnNavigate(() =>
      checkMusicApi(Number(songId))
    )
    return isObject(res) && res.success === true
  } catch {
    return false
  }
}

/**
 * 获取歌曲播放资源。
 * 兼容：data 缺失、数组为空、url 为 null、接口报错；freeTrialInfo 非空标记为试听。
 */
export const getSongResource = async (
  songId: SongId,
  level: SongLevel = 'exhigh'
): Promise<SongResource | null> => {
  try {
    const res: unknown = await withoutAbortOnNavigate(() =>
      getMusicUrlApi({ id: Number(songId), level })
    )
    if (!isObject(res) || !Array.isArray(res.data)) return null

    const item = (res.data as MusicUrlItem[]).find(
      (candidate) =>
        isObject(candidate) &&
        typeof candidate.url === 'string' &&
        candidate.url.length > 0
    )
    if (!item || typeof item.url !== 'string') return null

    return {
      url: toSecureUrl(item.url),
      freeTrial:
        item.freeTrialInfo !== null && item.freeTrialInfo !== undefined,
      level,
    }
  } catch {
    return null
  }
}

/**
 * 批量查询歌曲详情。
 * @returns 成功时返回歌曲数组；空/失败返回 null（调用方负责提示）
 */
export const getMusicDetail = async (
  ids: SongId | SongId[]
): Promise<SongDetail[] | null> => {
  const normalizedIds = normalizeSongIds(ids)
  if (!normalizedIds) return null

  try {
    const res: unknown = await withoutAbortOnNavigate(() =>
      getMusicDetailApi({ ids: normalizedIds })
    )
    if (!isObject(res) || !Array.isArray(res.songs)) return null

    const songs = (res.songs as unknown[]).filter(
      (song): song is SongDetail =>
        isObject(song) && song.id !== undefined && song.id !== null
    )
    return songs.length > 0 ? songs : null
  } catch {
    return null
  }
}

/**
 * 获取私人 FM 的一首歌曲详情。
 *
 * 注意：私人 FM 返回的是旧版歌曲结构（album / artists / duration），
 * 这里统一补齐成 /song/detail 的结构（al / ar / dt），保证播放队列里字段一致。
 *
 * @returns 失败/无数据返回 null（调用方负责回退）
 */
export const getPersonfm = async (): Promise<SongDetail | null> => {
  try {
    const res: unknown = await withoutAbortOnNavigate(() => personFmApi())
    if (!isObject(res) || !Array.isArray(res.data) || res.data.length === 0) {
      return null
    }
    const raw = res.data[0]
    if (!isObject(raw) || raw.id === undefined || raw.id === null) return null
    const numericId = Number(raw.id)
    if (!Number.isFinite(numericId)) return null

    const album = raw.al ?? raw.album
    const artists = raw.ar ?? raw.artists
    const duration = raw.dt ?? raw.duration

    return {
      ...(raw as unknown as SongDetail),
      id: numericId,
      name: typeof raw.name === 'string' ? raw.name : '',
      al: isObject(album) ? (album as unknown as SongAlbum) : undefined,
      ar: Array.isArray(artists)
        ? (artists as unknown as SongArtist[])
        : undefined,
      dt: typeof duration === 'number' ? duration : undefined,
    }
  } catch {
    return null
  }
}
