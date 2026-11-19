/** 网易云接口音质档位 */
type SongLevel =
  | 'standard'
  | 'higher'
  | 'exhigh'
  | 'lossless'
  | 'hires'
  | 'jyeffect'
  | 'sky'
  | 'jymaster'

/** 歌曲演出者（/song/detail 的 ar 元素） */
interface SongArtist {
  id: number
  name: string
  picUrl?: string
  alias?: string[]
}

/** 歌曲所属专辑（/song/detail 的 al 字段） */
interface SongAlbum {
  id: number
  name: string
  picUrl: string
}

/**
 * /song/detail、/search、/playlist/track/all 等接口返回的原始歌曲结构。
 * 网易云字段并不规整，未列出的字段统一走索引签名（unknown），使用前需收窄。
 */
interface SongDetail {
  id: number
  name: string
  ar: SongArtist[]
  al: SongAlbum
  /** 时长（毫秒） */
  dt: number
  fee?: number
  mv?: number
  alias?: string[]
  [key: string]: unknown
}

/** 视图层统一使用的歌曲信息（由 api 层从 SongDetail 组装） */
interface MusicBaseInfo {
  id: number
  name: string
  picUrl: string
  singers: {
    id: number
    name: string
  }[]
  duration: string
  album?: {
    id: number
    name: string
  }
}

/** /song/url/v1 返回的单条播放地址 */
interface SongUrlInfo {
  id?: number
  /** 无版权 / 无资源时为 null */
  url: string | null
  br?: number
  size?: number
  level?: string
  freeTrialInfo?: unknown
  [key: string]: unknown
}

interface MusicUrlResponse {
  code?: number
  data: SongUrlInfo[]
}

interface SongDetailResponse {
  code?: number
  songs: SongDetail[]
}

interface CheckMusicResponse {
  success: boolean
  message?: string
  code?: number
}

interface RecommendSongsData {
  dailySongs: SongDetail[]
  recommendReasons?: unknown[]
}

interface RecommendSongsResponse {
  code?: number
  data: RecommendSongsData
}

/** 私人 FM 返回的是旧版歌曲结构（album / artists / duration） */
interface PersonalFmSong {
  id: number
  name?: string
  album?: SongAlbum
  artists?: SongArtist[]
  /** 时长（毫秒） */
  duration?: number
  [key: string]: unknown
}

interface PersonalFmResponse {
  code?: number
  data: PersonalFmSong[]
}

interface LyricResponse {
  code?: number
  /** 无歌词时 lyric 为空字符串 */
  lrc: {
    lyric: string
    version?: number
  }
  tlyric?: {
    lyric: string
  } | null
  [key: string]: unknown
}

interface LikeMusicResponse {
  code?: number
  [key: string]: unknown
}

interface UserCloudResponse {
  code?: number
  data: SongDetail[]
  count?: number
  hasMore?: boolean
  [key: string]: unknown
}

export type {
  SongLevel,
  SongArtist,
  SongAlbum,
  SongDetail,
  MusicBaseInfo,
  SongUrlInfo,
  MusicUrlResponse,
  SongDetailResponse,
  CheckMusicResponse,
  RecommendSongsData,
  RecommendSongsResponse,
  PersonalFmSong,
  PersonalFmResponse,
  LyricResponse,
  LikeMusicResponse,
  UserCloudResponse,
}
