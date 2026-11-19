import type { ArtistBaseInfo } from './artistRel'
import type { SongAlbum, SongArtist } from './musicRel'

/** 云搜索单曲结果（/cloudsearch 的 songs 元素） */
interface SearchSong {
  id: number
  name: string
  ar?: SongArtist[]
  al?: SongAlbum
  /** 时长（毫秒） */
  dt?: number
  [key: string]: unknown
}

/** 云搜索专辑结果 */
interface SearchAlbum {
  id: number
  name: string
  picUrl?: string
  artists?: ArtistBaseInfo[]
  [key: string]: unknown
}

/** 云搜索歌手结果 */
interface SearchArtist {
  id: number
  name: string
  picUrl?: string
  img1v1Url?: string
  [key: string]: unknown
}

/** 云搜索歌单结果 */
interface SearchPlaylist {
  id: number
  name: string
  coverImgUrl?: string
  playCount?: number
  creator?: {
    userId: number
    nickname: string
  } | null
  [key: string]: unknown
}

/** 云搜索用户结果 */
interface SearchUser {
  userId: number
  nickname?: string
  avatarUrl?: string
  [key: string]: unknown
}

/** 云搜索 MV 结果 */
interface SearchMv {
  id: number
  name: string
  cover?: string
  artists?: ArtistBaseInfo[]
  [key: string]: unknown
}

interface SearchBucket<T> {
  count: number
  s: T[]
}

/** 搜索 store 中分类型保存的结果 */
interface SearchResultState {
  song: SearchBucket<SearchSong>
  album: SearchBucket<SearchAlbum>
  artist: SearchBucket<SearchArtist>
  playlist: SearchBucket<SearchPlaylist>
  userprofile: SearchBucket<SearchUser>
  mv: SearchBucket<SearchMv>
}

type SearchType = keyof SearchResultState

/** /cloudsearch 的 result 字段（按类型平铺 count + 复数列表） */
interface CloudSearchRawResult {
  songCount?: number
  songs?: SearchSong[]
  albumCount?: number
  albums?: SearchAlbum[]
  artistCount?: number
  artists?: SearchArtist[]
  playlistCount?: number
  playlists?: SearchPlaylist[]
  userprofileCount?: number
  userprofiles?: SearchUser[]
  mvCount?: number
  mvs?: SearchMv[]
  [key: string]: unknown
}

interface CloudSearchParams {
  keywords: string
  type?: string
  limit?: number
  offset?: number
}

interface CloudSearchResponse {
  code?: number
  result: CloudSearchRawResult
}

/** typeMap 元素 */
interface SearchTypeEntry {
  code: string
  alias: SearchType
}

export type {
  SearchSong,
  SearchAlbum,
  SearchArtist,
  SearchPlaylist,
  SearchUser,
  SearchMv,
  SearchBucket,
  SearchResultState,
  SearchType,
  CloudSearchRawResult,
  CloudSearchParams,
  CloudSearchResponse,
  SearchTypeEntry,
}
