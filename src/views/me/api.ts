import http from '@/utils/request'

export interface OffsetParams {
  offset?: number
  limit?: number
}

/** 我的喜欢歌曲 id 列表 */
export interface LikeListResponse {
  code: number
  ids: number[]
}

export interface UserPlayListRaw {
  id: number
  name: string
  coverImgUrl: string
  playCount: number
  creator?: {
    userId: number
    nickname: string
  }
}

export interface PlayListByUidResponse {
  code: number
  playlist: UserPlayListRaw[]
}

/** 听歌排行里的歌曲（字段比 song/detail 精简，但 al/ar/dt 结构与之一致） */
export interface HistorySong {
  id: number
  name: string
  dt: number
  al: {
    id: number
    name: string
    picUrl: string
  }
  ar: Array<{
    id: number
    name: string
  }>
}

export interface ListenHistoryResponse {
  code: number
  weekData: Array<{ song: HistorySong; playCount?: number }>
  allData: Array<{ song: HistorySong; playCount?: number }>
}

export interface ArtistSubItem {
  id: number
  name: string
  img1v1Url: string
}

export interface ArtistSubListResponse {
  code: number
  count: number
  hasMore: boolean
  data: ArtistSubItem[]
}

export interface AlbumSubItem {
  id: number
  name: string
  picUrl: string
  artists?: Array<{ id: number; name: string }>
}

export interface AlbumSubListResponse {
  code: number
  count: number
  hasMore: boolean
  data: AlbumSubItem[]
}

export interface MvSubItem {
  vid: string
  title: string
  coverUrl: string
  creator?: Array<{ userId: number; userName: string }>
}

export interface MvSubListResponse {
  code: number
  count: number
  hasMore: boolean
  data: MvSubItem[]
}

export const getLikeListApi = async (
  params: { uid: number }
): Promise<LikeListResponse> => {
  const result = await http.get('/likeList', { params })
  return result as LikeListResponse
}

export const getPlayListByUidApi = async (params: {
  uid: number
}): Promise<PlayListByUidResponse> => {
  const result = await http.get('/user/playlist', { params })
  return result as PlayListByUidResponse
}

export const getListenHistoryApi = async (params: {
  uid: number
  type: string
}): Promise<ListenHistoryResponse> => {
  const result = await http({
    url: '/user/record',
    method: 'get',
    params,
  })
  return result as ListenHistoryResponse
}

export const getArtistSubListApi = async (
  params: OffsetParams
): Promise<ArtistSubListResponse> => {
  const result = await http({
    url: '/artist/sublist',
    method: 'get',
    params,
  })
  return result as ArtistSubListResponse
}

export const getMvSubListApi = async (
  params: OffsetParams
): Promise<MvSubListResponse> => {
  const result = await http({
    url: '/mv/sublist',
    method: 'get',
    params,
  })
  return result as MvSubListResponse
}

export const getAlbumSubListApi = async (
  params: OffsetParams
): Promise<AlbumSubListResponse> => {
  const result = await http({
    url: '/album/sublist',
    method: 'get',
    params,
  })
  return result as AlbumSubListResponse
}
