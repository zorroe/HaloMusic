import http from '@/utils/request'
import pinia from '@/store/store'
import { usePlayerStore } from '@/store/playerStore'
import type {
  BaseResponse,
  HighQualityParams,
  HighQualityResponse,
  PersonalizeResponse,
  PlayListAllResponse,
  PlayListDetailResponse,
  PlayListTagsResponse,
  RecommendPlayListResponse,
  TopListResponse,
  TopPlayListParams,
  TopPlayListResponse,
} from '@/types/playListRel'

export interface PlayListIdParams {
  /** 部分页面在数据加载完成前可能传入空值 */
  id?: number | string
}

export interface PlayListSubscribeParams extends PlayListIdParams {
  /** 1: 收藏 2: 取消收藏 */
  t: 1 | 2
}

export interface UpdatePlayListNameParams extends PlayListIdParams {
  name: string
}

const playerStore = usePlayerStore(pinia)

export const getrecommendPlayListApi = (): Promise<RecommendPlayListResponse> =>
  http.get<RecommendPlayListResponse>('/recommend/resource')

export const getPersonalizePlayListApi = (params: {
  limit?: number
  order?: string
}): Promise<PersonalizeResponse> =>
  http.get<PersonalizeResponse>('/personalized', { params })

export const getTopListApi = (): Promise<TopListResponse> =>
  http.get<TopListResponse>('/toplist')

/** 获取歌单所有歌曲 */
export const getPlayListAllApi = (
  params: PlayListIdParams
): Promise<PlayListAllResponse> =>
  http.get<PlayListAllResponse>('/playlist/track/all', { params })

/** 获取歌单详情 */
export const getPlayListDetailApi = (
  params: PlayListIdParams
): Promise<PlayListDetailResponse> =>
  http.get<PlayListDetailResponse>('/playlist/detail', { params })

/** 收藏与取消收藏歌单 */
export const subscribePlayListApi = (
  params: PlayListSubscribeParams
): Promise<BaseResponse> =>
  http.get<BaseResponse>('/playlist/subscribe', { params })

/** 删除歌单 */
export const deletePlayListApi = (
  params: PlayListIdParams
): Promise<BaseResponse> =>
  http.get<BaseResponse>('/playlist/delete', { params })

/** 歌单标签列表 */
export const playListTagsApi = (): Promise<PlayListTagsResponse> =>
  http.get<PlayListTagsResponse>('/playlist/highquality/tags')

export const topPlayListApi = (
  params: TopPlayListParams
): Promise<TopPlayListResponse> =>
  http.get<TopPlayListResponse>('/top/playlist', { params })

export const getHighQualityPlayListApi = (
  params: HighQualityParams
): Promise<HighQualityResponse> =>
  http.get<HighQualityResponse>('/top/playlist/highquality', { params })

export const updatePlaylistName = (
  params: UpdatePlayListNameParams
): Promise<BaseResponse> =>
  http.get<BaseResponse>('/playlist/name/update', { params })

/** 根据歌单 id 播放歌单内所有歌曲 */
export const playAllByPlayListId = async (
  id: number | string
): Promise<void> => {
  const { songs } = await getPlayListAllApi({ id })
  const ids = (songs ?? []).map((item) => item.id)
  if (ids.length === 0) return
  await playerStore.playMulti(ids.join(','))
}

/** 获取精品歌单 */
export const getHighQualityPlayList = (
  params: HighQualityParams
): Promise<HighQualityResponse> => getHighQualityPlayListApi(params)

/** 获取排行榜歌单 */
export const getTopPlayList = (
  params: TopPlayListParams
): Promise<TopPlayListResponse> => topPlayListApi(params)
