import http from '@/utils/request'
import type {
  LikeListResponse,
  LoginStatusResponse,
  LogoutResponse,
} from '@/types/userRel'
import type { UserPlayListResponse } from '@/types/playListRel'

export interface UserPlayListParams {
  uid: number
  limit?: number
  offset?: number
}

/** 登录状态（未登录时 data.profile 为 null，而不是抛错） */
export const loginStatusApi = (): Promise<LoginStatusResponse> =>
  http.get<LoginStatusResponse>('/login/status')

/** 退出登录 */
export const logoutApi = (): Promise<LogoutResponse> =>
  http.post<LogoutResponse>('/logout')

/** 用户所有歌单（第一个通常是“我喜欢的音乐”） */
export const getPlayListByUidApi = (
  params: UserPlayListParams
): Promise<UserPlayListResponse> =>
  http.get<UserPlayListResponse>('/user/playlist', { params })

/** 喜欢列表的 id 集合 */
export const getLikeListApi = (params: {
  uid: number
}): Promise<LikeListResponse> =>
  http.get<LikeListResponse>('/likeList', { params })
