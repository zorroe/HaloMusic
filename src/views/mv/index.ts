import http from '@/utils/request'

export interface MvDetailParams {
  mvid: string | number
}

export interface MvUrlParams {
  id: string | number
  /** 视频码率（清晰度） */
  r?: number
}

export interface MvArtist {
  id: number
  name: string
  img1v1Url: string
  followed?: boolean
}

export interface MvBr {
  size: number
  br: number
  point: number
}

export interface MvData {
  id: number
  name: string
  artistId: number
  artistName: string
  briefDesc: string
  desc?: string | null
  cover: string
  coverId_str: string
  coverId: { s: number; e: number; c: number[] }
  playCount: number
  subCount: number
  shareCount: number
  commentCount: number
  duration: number
  nType: number
  publishTime: string
  price?: number | null
  brs: MvBr[]
  artists: MvArtist[]
  commentThreadId: string
  videoGroup: unknown[]
}

export interface MvDetailResponse {
  code: number
  data: MvData
}

export interface MvUrlResponse {
  code: number
  data: {
    id: number
    url: string | null
    r: number
    size?: number
    br?: number
  }
}

export const mvDetailApi = async (
  params: MvDetailParams
): Promise<MvDetailResponse> => {
  const result = await http({
    url: '/mv/detail',
    method: 'get',
    params,
  })
  return result as MvDetailResponse
}

export const mvUrlApi = async (
  params: MvUrlParams
): Promise<MvUrlResponse> => {
  const result = await http({
    url: '/mv/url',
    method: 'get',
    params,
  })
  return result as MvUrlResponse
}
