import http from '@/utils/request'
import pinia from '@/store/store'
import { usePlayerStore } from '@/store/playerStore'
import type {
  AlbumDetailResponse,
  NewAlbumResponse,
  SubAlbumListResponse,
} from '@/types/albumRel'

export interface AlbumParams {
  id: number | string
}

export interface SubAlbumListParams {
  offset?: number
  limit?: number
}

const playerStore = usePlayerStore(pinia)

export const getNewAlbumApi = (): Promise<NewAlbumResponse> =>
  http.get<NewAlbumResponse>('/album/newest', { params: { limit: 10 } })

/** 专辑详情（含歌曲列表） */
export const getAlbumApi = (
  params: AlbumParams
): Promise<AlbumDetailResponse> =>
  http.get<AlbumDetailResponse>('/album', { params, cache: true })

/** 收藏专辑列表 */
export const getSubAlbumlistApi = (
  params: SubAlbumListParams
): Promise<SubAlbumListResponse> =>
  http.get<SubAlbumListResponse>('/album/sublist', { params, cache: true })

/** 根据专辑 id 播放专辑内所有歌曲 */
export const playAllByAlbumId = async (id: number): Promise<void> => {
  const { songs } = await getAlbumApi({ id })
  const ids = (songs ?? []).map((item) => item.id)
  if (ids.length === 0) return
  await playerStore.playMulti(ids.join(','))
}
