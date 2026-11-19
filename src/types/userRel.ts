interface UserProfile {
  userId: number
  userType: number
  nickname: string
  avatarImgId: AvatarImgId
  avatarUrl: string
  backgroundImgId: AvatarImgId
  backgroundUrl: string
  signature: string
  createTime: number
  userName: string
  accountType: number
  shortUserName: string
  birthday: number
  authority: number
  gender: number
  accountStatus: number
  province: number
  city: number
  authStatus: number
  description?: unknown
  detailDescription?: unknown
  defaultAvatar: boolean
  expertTags?: string[] | null
  experts?: unknown
  djStatus: number
  locationStatus: number
  vipType: number
  followed: boolean
  mutual: boolean
  authenticated: boolean
  lastLoginTime: number
  lastLoginIP: string
  remarkName?: unknown
  viptypeVersion: number
  authenticationTypes: number
  avatarDetail?: unknown
  anchor: boolean
  /** 兼容部分接口返回的额外字段 */
  [key: string]: unknown
}

interface AvatarImgId {
  s: number
  e: number
  c: number[]
}

interface LoginAccount {
  id: number
  userName?: string
  [key: string]: unknown
}

interface LoginStatusData {
  code?: number
  profile: UserProfile | null
  account?: LoginAccount | null
}

/** /login/status 返回 */
interface LoginStatusResponse {
  code?: number
  msg?: string
  data?: LoginStatusData
  [key: string]: unknown
}

/** /logout 返回 */
interface LogoutResponse {
  code?: number
  msg?: string
  [key: string]: unknown
}

/** /likeList 返回 */
interface LikeListResponse {
  code?: number
  ids: number[]
}

export type {
  UserProfile,
  AvatarImgId,
  LoginAccount,
  LoginStatusData,
  LoginStatusResponse,
  LogoutResponse,
  LikeListResponse,
}
