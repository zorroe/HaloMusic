import type { AlbumBaseInfo } from './albumRel'
import type { MvBaseInfo } from './mvRel'
import type { SongDetail } from './musicRel'

interface ArtistBaseInfo {
  id: number
  name: string
  picUrl: string
  [key: string]: unknown
}

interface ArtistInfo {
  videoCount: number
  identify: Identify
  artist: Artist
  blacklist: boolean
  preferShow: number
  showPriMsg: boolean
  secondaryExpertIdentiy: SecondaryExpertIdentiy[]
  [key: string]: unknown
}

interface SecondaryExpertIdentiy {
  expertIdentiyId: number
  expertIdentiyName: string
  expertIdentiyCount: number
}

interface Artist {
  id: number
  cover: string
  avatar: string
  name: string
  transNames: unknown[] | null
  alias: string[]
  identities: unknown[]
  identifyTag?: unknown
  briefDesc: string
  rank: Rank
  albumSize: number
  musicSize: number
  mvSize: number
  [key: string]: unknown
}

interface Rank {
  rank: number
  type: number
}

interface Identify {
  imageUrl?: unknown
  imageDesc: string
  actionUrl: string
}

/** /artist/detail 返回 */
interface ArtistDetailResponse {
  code?: number
  data: ArtistInfo
}

/** /toplist/artist 返回 */
interface TopArtistResponse {
  code?: number
  list: {
    artists: ArtistBaseInfo[]
    [key: string]: unknown
  }
}

/** /artist/songs 返回 */
interface ArtistSongsResponse {
  code?: number
  songs: SongDetail[]
  total?: number
  more?: boolean
}

/** /artist/album 返回 */
interface ArtistAlbumResponse {
  code?: number
  hotAlbums: AlbumBaseInfo[]
  more?: boolean
}

/** /artist/mv 返回 */
interface ArtistMvResponse {
  code?: number
  mvs: MvBaseInfo[]
  hasMore?: boolean
}

export type {
  ArtistBaseInfo,
  ArtistInfo,
  ArtistDetailResponse,
  TopArtistResponse,
  ArtistSongsResponse,
  ArtistAlbumResponse,
  ArtistMvResponse,
}
