interface MvBaseInfo {
  id: number
  name: string
  picUrl: string
  creators: {
    id: number
    name: string
  }[]
  [key: string]: unknown
}

interface MvDetail {
  id: number
  name: string
  cover: string
  artists: {
    id: number
    name: string
    img1v1Url: string
    [key: string]: unknown
  }[]
  brs: {
    size: number
    br: number
    point: number
  }[]
  duration: number
  [key: string]: unknown
}

interface MvDetailResponse {
  code?: number
  data: MvDetail
}

interface MvUrlResponse {
  code?: number
  data: {
    id: number
    url: string | null
    r?: number
    [key: string]: unknown
  }
}

export type { MvBaseInfo, MvDetail, MvDetailResponse, MvUrlResponse }
