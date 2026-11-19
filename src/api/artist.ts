import http from '@/utils/request'
import pinia from '@/store/store'
import { usePlayerStore } from '@/store/playerStore'
import type {
  ArtistAlbumResponse,
  ArtistDetailResponse,
  ArtistMvResponse,
  ArtistSongsResponse,
  TopArtistResponse,
} from '@/types/artistRel'
import type { BaseResponse } from '@/types/playListRel'

export interface RecommendArtistParams {
  /** 1: 华语 2: 欧美 3: 韩国 4: 日本（可选，缺省时服务端给默认值） */
  type?: 1 | 2 | 3 | 4
}

export interface ArtistIdParams {
  id: number | string
}

export interface ArtistPageParams extends ArtistIdParams {
  limit?: number
  offset?: number
  order?: 'hot' | 'time'
}

export interface ArtistSubParams {
  id: number | string
  /** 1: 收藏 2: 取消收藏 */
  t: 1 | 2
}

const playerStore = usePlayerStore(pinia)

export const getrecommendArtistApi = (
  params: RecommendArtistParams = {}
): Promise<TopArtistResponse> =>
  http.get<TopArtistResponse>('/toplist/artist', { params })

export const getArtistDetailApi = (
  params: ArtistIdParams
): Promise<ArtistDetailResponse> =>
  http.get<ArtistDetailResponse>('/artist/detail', { params })

export const getSongsByArtistIdApi = (
  params: ArtistPageParams
): Promise<ArtistSongsResponse> =>
  http.get<ArtistSongsResponse>('/artist/songs', { params })

export const getArtistAlbumApi = (
  params: ArtistPageParams
): Promise<ArtistAlbumResponse> =>
  http.get<ArtistAlbumResponse>('/artist/album', { params })

export const getArtistMvApi = (
  params: ArtistPageParams
): Promise<ArtistMvResponse> =>
  http.get<ArtistMvResponse>('/artist/mv', { params })

/** 收藏 / 取消收藏歌手 */
export const subArtistApi = (id: string, t: 1 | 2): Promise<BaseResponse> =>
  http.get<BaseResponse>('/artist/sub', { params: { id, t } })

export const playAllByArtistId = async (id: number): Promise<void> => {
  const { songs } = await getSongsByArtistIdApi({ id, limit: 1000, offset: 0 })
  const ids = (songs ?? []).map((item) => item.id)
  if (ids.length === 0) return
  await playerStore.playMulti(ids.join(','))
}

export const playMusicByArtistId = async (id: string): Promise<void> => {
  const { songs } = await getSongsByArtistIdApi({ id, limit: 999 })
  const ids = (songs ?? []).map((song) => song.id)
  if (ids.length === 0) return
  await playerStore.playMulti(ids.join(','))
}
