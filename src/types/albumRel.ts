import type { ArtistBaseInfo } from './artistRel'
import type { SongDetail } from './musicRel'

interface AlbumBaseInfo {
  id: number
  name: string
  picUrl: string
  artists: ArtistBaseInfo[]
  /** 部分榜单接口返回该字段 */
  publishTime?: number
  [key: string]: unknown
}

interface AlbumInfo {
  songs: SongDetail[]
  paid: boolean
  onSale: boolean
  mark: number
  awardTags?: string[] | null
  companyId: number
  blurPicUrl: string
  alias: string[]
  artists: Artist[]
  copyrightId: number
  picId: Img1v1Id
  artist: Artist2
  pic: Img1v1Id
  publishTime: number
  company: string
  briefDesc: string
  picUrl: string
  commentThreadId: string
  tags: string
  description: string
  status: number
  subType: string
  name: string
  id: number
  type: string
  size: number
  picId_str: string
  info: Info
  [key: string]: unknown
}

interface Info {
  commentThread: CommentThread
  latestLikedUsers?: unknown
  liked: boolean
  comments?: unknown
  resourceType: number
  resourceId: number
  commentCount: number
  likedCount: number
  shareCount: number
  threadId: string
}

interface CommentThread {
  id: string
  resourceInfo: ResourceInfo
  resourceType: number
  commentCount: number
  likedCount: number
  shareCount: number
  hotCount: number
  latestLikedUsers?: unknown
  resourceOwnerId: number
  resourceTitle: string
  resourceId: number
}

interface ResourceInfo {
  id: number
  userId: number
  name: string
  imgUrl: string
  creator?: unknown
  encodedId?: unknown
  subTitle?: unknown
  webUrl?: unknown
}

interface Artist2 {
  img1v1Id: Img1v1Id
  topicPerson: number
  followed: boolean
  alias: string[]
  picId: Img1v1Id
  trans: string
  briefDesc: string
  musicSize: number
  albumSize: number
  picUrl: string
  img1v1Url: string
  name: string
  id: number
  picId_str: string
  img1v1Id_str: string
}

interface Artist {
  img1v1Id: Img1v1Id
  topicPerson: number
  followed: boolean
  alias: unknown[]
  picId: number
  trans: string
  briefDesc: string
  musicSize: number
  albumSize: number
  picUrl: string
  img1v1Url: string
  name: string
  id: number
  img1v1Id_str: string
}

interface Img1v1Id {
  s: number
  e: number
  c: number[]
}

/** /album 返回 */
interface AlbumDetailResponse {
  code?: number
  songs: SongDetail[]
  album: AlbumInfo
}

/** /album/newest 返回 */
interface NewAlbumResponse {
  code?: number
  albums: AlbumBaseInfo[]
}

/** /album/sublist 的收藏专辑元素 */
interface SubAlbumInfo {
  id: number
  name?: string
  picUrl?: string
  artists?: ArtistBaseInfo[]
  [key: string]: unknown
}

/** /album/sublist 返回 */
interface SubAlbumListResponse {
  code?: number
  data: SubAlbumInfo[]
  hasMore?: boolean
  count?: number
}

export type {
  AlbumBaseInfo,
  AlbumInfo,
  AlbumDetailResponse,
  NewAlbumResponse,
  SubAlbumInfo,
  SubAlbumListResponse,
}
