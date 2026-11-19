import http from '@/utils/request'

export interface QrKeyData {
  code?: number
  unikey: string
}

export interface QrKeyResponse {
  code: number
  data: QrKeyData
}

export interface QrImgParams {
  key: string
  qrimg: string
}

export interface QrImgResponse {
  code: number
  data: {
    qrimg: string
    qrurl?: string
  }
}

export interface QrStatusParams {
  key: string
}

export interface QrStatusResponse {
  code: number
  message?: string
  /** 803（登录成功）时返回的 cookie 字符串 */
  cookie?: string
}

export const qrStatusApi = async (
  params: QrStatusParams
): Promise<QrStatusResponse> => {
  const result = await http({
    url: '/login/qr/check',
    method: 'get',
    params,
  })
  return result as QrStatusResponse
}

export const qrKeyApi = async (): Promise<QrKeyResponse> => {
  const result = await http({
    url: '/login/qr/key',
    method: 'get',
  })
  return result as QrKeyResponse
}

export const qrImgApi = async (
  params: QrImgParams
): Promise<QrImgResponse> => {
  const result = await http({
    url: '/login/qr/create',
    method: 'get',
    params,
  })
  return result as QrImgResponse
}
