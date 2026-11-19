import type { SongDetail } from './musicRel'

interface PlayListBaseInfo {
  id: number
  name: string
  picUrl: string
  playCount: number
  creator?: {
    id: number
    nickname: string
  }
  /** 以下字段部分接口会返回，按需使用 */
  coverImgUrl?: string
  trackCount?: number
  description?: string | null
  subscribed?: boolean
  userId?: number
  updateTime?: number
  [key: string]: unknown
}

/** 歌单详情（/playlist/detail 的 playlist 字段，只列出常用字段） */
interface PlayListDetail extends PlayListBaseInfo {
  creator: {
    id: number
    userId: number
    nickname: string
    avatarUrl?: string
  }
  tracks?: SongDetail[]
  trackIds?: { id: number }[]
}

/** /playlist/track/all 返回 */
interface PlayListAllResponse {
  code?: number
  songs: SongDetail[]
}

/** /playlist/detail 返回 */
interface PlayListDetailResponse {
  code?: number
  playlist: PlayListDetail
}

/** /recommend/resource 返回 */
interface RecommendPlayListResponse {
  code?: number
  recommend: PlayListBaseInfo[]
}

/** /personalized 返回 */
interface PersonalizeResponse {
  code?: number
  result: PlayListBaseInfo[]
  category?: number
  hasTaste?: boolean
}

/** /toplist 返回 */
interface TopListResponse {
  code?: number
  list: PlayListBaseInfo[]
}

/** /top/playlist 与 /top/playlist/highquality 返回 */
interface TopPlayListParams {
  cat?: string
  order?: string
  limit?: number
  offset?: number
  before?: number
}

interface HighQualityParams {
  cat?: string
  limit?: number
  before?: number
  lasttime?: number
}

interface TopPlayListResponse {
  code?: number
  playlists: PlayListBaseInfo[]
  total?: number
  more?: boolean
  cat?: string
}

interface HighQualityResponse {
  code?: number
  playlists: PlayListBaseInfo[]
  more?: boolean
  lasttime?: number
}

/** /playlist/highquality/tags 返回 */
interface PlayListTagsResponse {
  code?: number
  tags: { id: number; name: string; category?: number }[]
}

/** /user/playlist 返回 */
interface UserPlayListResponse {
  code?: number
  playlist: PlayListBaseInfo[]
  more?: boolean
}

/** 通用操作类响应 */
interface BaseResponse {
  code?: number
  msg?: string
  message?: string
  [key: string]: unknown
}

export type {
  PlayListBaseInfo,
  PlayListDetail,
  PlayListAllResponse,
  PlayListDetailResponse,
  RecommendPlayListResponse,
  PersonalizeResponse,
  TopListResponse,
  TopPlayListParams,
  HighQualityParams,
  TopPlayListResponse,
  HighQualityResponse,
  PlayListTagsResponse,
  UserPlayListResponse,
  BaseResponse,
}
