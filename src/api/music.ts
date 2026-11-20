import dayjs from 'dayjs'
import http from '@/utils/request'
import type {
  CheckMusicResponse,
  LikeMusicResponse,
  LyricResponse,
  MusicBaseInfo,
  MusicUrlResponse,
  PersonalFmResponse,
  RecommendSongsResponse,
  SongDetailResponse,
  SongLevel,
  UserCloudResponse,
} from '@/types/musicRel'

export interface LyricParams {
  id: number | string
}

export interface LikeMusicParams {
  id: number
  like: boolean
}

export interface MusicUrlParams {
  id: number | string
  /** 音质档位，缺省由服务端决定 */
  level?: SongLevel
}

export interface MusicDetailParams {
  /** 单个 id 或逗号分隔的 id 列表 */
  ids: string | number
}

/** 歌词详情（词信息基本不变，缓存 5 分钟） */
export const getLyricApi = (params: LyricParams): Promise<LyricResponse> =>
  http.get<LyricResponse>('/lyric', {
    params,
    cache: { ttl: 300_000 },
  })

export const likeMusicApi = (
  params: LikeMusicParams
): Promise<LikeMusicResponse> =>
  http.get<LikeMusicResponse>('/like', { params })

export const getMusicUrlApi = (
  params: MusicUrlParams
): Promise<MusicUrlResponse> =>
  http.get<MusicUrlResponse>('/song/url/v1', { params })

/** 取单曲播放地址；无资源时返回空字符串 */
export const getMusicUrl = async (
  musicId: string | number
): Promise<string> => {
  const res = await getMusicUrlApi({ id: musicId })
  const source = res.data?.[0]?.url
  return source ? source.replace(/^http:/, 'https:') : ''
}

export const getMusicDetailApi = (
  params: MusicDetailParams
): Promise<SongDetailResponse> =>
  http.get<SongDetailResponse>('/song/detail', { params, cache: true })

/** 取单曲信息并组装成视图层使用的 MusicBaseInfo；查不到时返回 null */
export const getMusicDetail = async (
  musicId: string | number
): Promise<MusicBaseInfo | null> => {
  const { songs } = await getMusicDetailApi({ ids: musicId })
  const song = songs?.[0]
  if (!song) return null

  return {
    id: song.id,
    name: song.name,
    picUrl: song.al?.picUrl ?? '',
    singers: Array.isArray(song.ar)
      ? song.ar.map((item) => ({ name: item.name, id: item.id }))
      : [],
    duration: dayjs(song.dt ?? 0).format('mm:ss'),
    album: song.al ? { id: song.al.id, name: song.al.name } : undefined,
  }
}

export const getRecommendSongsApi = (): Promise<RecommendSongsResponse> =>
  http.get<RecommendSongsResponse>('/recommend/songs')

/** 检查歌曲是否可用（版权状态可能变化，只缓存 10 秒） */
export const checkMusicApi = (id: number): Promise<CheckMusicResponse> =>
  http.get<CheckMusicResponse>('/check/music', {
    params: { id },
    cache: { ttl: 10_000 },
  })

/**
 * 获取歌曲资源（http -> https，避免 Electron 混合内容拦截）。
 * 无版权 / 无资源时返回空字符串。
 */
export const getAudioSourceFromNetease = async (
  id: number
): Promise<string> => {
  const res = await getMusicUrlApi({ id, level: 'exhigh' })
  const source = res.data?.[0]?.url
  return source ? source.replace(/^http:/, 'https:') : ''
}

/** 私人 FM */
export const personFmApi = (): Promise<PersonalFmResponse> =>
  http.get<PersonalFmResponse>('/personal_fm')

/** 云盘 */
export const userCloudApi = (
  params: Record<string, unknown>
): Promise<UserCloudResponse> =>
  http.get<UserCloudResponse>('/user/cloud', { params })

export const userCloudDetailApi = (
  params: Record<string, unknown>
): Promise<UserCloudResponse> =>
  http.get<UserCloudResponse>('/user/cloud/detail', { params })
