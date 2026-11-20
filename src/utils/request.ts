/**
 * 统一请求层。
 *
 * 契约（调用方视角）：
 * - 成功时**直接返回 response.data**（网易云接口的 payload），调用方 `const { data } = await api()`；
 * - 失败时**一定 reject ApiError**（网络 / 超时 / 非 2xx / 业务 301），不再出现“拿到 undefined 再解构崩溃”；
 * - 业务码 301（需要登录）自动跳登录页，跳转走 `import('@/router')` 动态导入，避免 request -> common -> router 的循环依赖；
 * - 渲染进程不依赖任何 Node API（环境判断只用 Vite 注入的 import.meta.env）。
 */
import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'

declare module 'axios' {
  export interface AxiosRequestConfig {
    /**
     * 页面级跳转时是否取消该请求（仅 GET 生效），默认 true。
     * 播放 / 登录态 / 启动缓存等应用级请求传 false，避免切页时被误杀。
     */
    abortOnNavigate?: boolean
  }
}

/** 开发环境直连本地 NeteaseCloudMusicApi 服务 */
const DEV_BASE_URL = 'http://127.0.0.1:16666'
/** 生产环境走主进程 express 的同源反向代理 */
const PROD_BASE_URL = '/api'
const REQUEST_TIMEOUT = 15_000
/** GET 幂等请求失败后的重试间隔（最多重试 2 次） */
const GET_RETRY_DELAYS = [300, 900] as const
/** 可安全重试的 HTTP 状态码 */
const RETRYABLE_STATUS = [408, 425, 429, 500, 502, 503, 504]
const NEED_LOGIN_CODE = 301
const NEED_LOGIN_MESSAGE = '需要登录'
const CANCELED_MESSAGE = '请求已取消'

export interface ApiErrorOptions {
  /** HTTP 状态码 */
  status?: number
  /** 网易云业务码 */
  code?: number
  /** 出错的接口地址 */
  url?: string
  /** 是否属于网络层错误（断网 / 超时 / 无法建立连接） */
  isNetwork?: boolean
  /** 是否是导航取消（不重试、不跳登录、不提示） */
  isCanceled?: boolean
  /** 原始错误或响应体，便于排查 */
  raw?: unknown
}

/**
 * 归一化后的请求错误。
 * UI 层可以据此区分“网络问题（可重试）”“业务失败”与“导航取消（静默）”。
 */
export class ApiError extends Error {
  readonly status?: number
  readonly code?: number
  readonly url?: string
  readonly isNetwork: boolean
  readonly isCanceled: boolean
  readonly raw?: unknown

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = options.status
    this.code = options.code
    this.url = options.url
    this.isNetwork = options.isNetwork ?? false
    this.isCanceled = options.isCanceled ?? false
    this.raw = options.raw
  }
}

/** 判断 unknown 是否为 ApiError */
export const isApiError = (error: unknown): error is ApiError =>
  error instanceof ApiError

const readErrorCode = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null) return undefined
  const code = (error as { code?: unknown }).code
  return typeof code === 'string' ? code : undefined
}

/** 底层是否属于 axios / AbortController 的取消错误 */
const isCanceledLike = (error: unknown): boolean =>
  axios.isCancel(error) || readErrorCode(error) === 'ERR_CANCELED'

/**
 * 判断是否为“请求被取消”（导航切换时的作用域取消，或调用方自带 signal 的取消）。
 * 取消属于正常控制流：UI 层应静默忽略，不要提示错误。
 */
export const isCanceledError = (error: unknown): boolean =>
  (error instanceof ApiError && error.isCanceled) || isCanceledLike(error)

interface PayloadEnvelope {
  code?: number
  msg?: string
}

/** 从接口 payload 中读取业务码与提示信息 */
const readEnvelope = (payload: unknown): PayloadEnvelope | undefined => {
  if (typeof payload !== 'object' || payload === null) return undefined
  const record = payload as Record<string, unknown>
  const code = typeof record.code === 'number' ? record.code : undefined
  const msg =
    typeof record.msg === 'string'
      ? record.msg
      : typeof record.message === 'string'
        ? record.message
        : undefined
  return { code, msg }
}

const needsLogin = (envelope: PayloadEnvelope | undefined): boolean =>
  envelope?.code === NEED_LOGIN_CODE || envelope?.msg === NEED_LOGIN_MESSAGE

/** 路由层最小契约：不静态依赖 @/router（避免循环依赖），只用到 push / currentRoute */
interface RouterLike {
  push(location: string): unknown
  currentRoute?: {
    value?: {
      path?: string
    }
  }
}

let loginRedirecting = false

/**
 * 业务码 301 时跳转登录页。
 * 动态导入 @/router：静态导入会形成 request -> router -> views -> api -> request 的循环。
 */
const redirectToLogin = (): void => {
  if (loginRedirecting) return
  loginRedirecting = true
  void import('@/router')
    .then((module) => {
      const candidate = module as {
        router?: RouterLike
        default?: RouterLike
      }
      const router = candidate.router ?? candidate.default
      if (!router) return
      if (router.currentRoute?.value?.path === '/login') return
      void Promise.resolve(router.push('/login')).catch(() => undefined)
    })
    .catch(() => undefined)
    .finally(() => {
      loginRedirecting = false
    })
}

const extractApiError = (error: unknown, fallbackUrl?: string): ApiError => {
  if (error instanceof ApiError) return error

  if (isCanceledLike(error)) {
    const url = axios.isAxiosError(error) ? error.config?.url : fallbackUrl
    return new ApiError(CANCELED_MESSAGE, {
      isCanceled: true,
      url,
      raw: error,
    })
  }

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<unknown>
    const response = axiosError.response
    if (response) {
      const envelope = readEnvelope(response.data)
      return new ApiError(
        envelope?.msg ?? `请求失败（HTTP ${response.status}）`,
        {
          status: response.status,
          code: envelope?.code,
          url: axiosError.config?.url ?? fallbackUrl,
          raw: response.data,
        }
      )
    }
    const isTimeout =
      axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT'
    return new ApiError(
      isTimeout ? '请求超时，请稍后重试' : '网络连接失败，请检查网络后重试',
      {
        isNetwork: true,
        url: axiosError.config?.url ?? fallbackUrl,
        raw: error,
      }
    )
  }

  if (error instanceof Error) {
    return new ApiError(error.message, { url: fallbackUrl, raw: error })
  }
  return new ApiError('未知请求错误', { url: fallbackUrl, raw: error })
}

/** 去重表：同 method + url + params 的并发 GET 复用同一个 Promise */
const pendingRequests = new Map<string, Promise<unknown>>()

// ---------------- 导航作用域取消 ----------------

/**
 * 当前导航作用域的 AbortController。
 * 路由切换（afterEach）时轮换：旧作用域 abort，在途页面级 GET 请求随之取消；
 * 播放 / 登录态等应用级请求通过 abortOnNavigate: false 跳过绑定。
 */
let navigationScope = new AbortController()

/** 作用域代数：用于让「等待重试中」的请求感知到期间发生了切页 */
let navigationGeneration = 0

/**
 * 轮换导航作用域：取消上一页所有在途的页面级 GET 请求。
 * 应先切换出新作用域再 abort 旧作用域，避免 abort 触发的新请求绑到已取消的 signal 上。
 */
export const rotateNavigationScope = (): void => {
  const previous = navigationScope
  navigationScope = new AbortController()
  navigationGeneration += 1
  pendingRequests.clear()
  previous.abort()
}

/**
 * 应用级请求标记（等效于给请求传 `abortOnNavigate: false`），路由切换时不会被取消。
 *
 * 之所以不逐个修改 api 函数签名：api 函数都是「同步发起请求 + 返回 Promise」，
 * 因此在回调内同步发起的首个 GET 请求会消费掉这次标记，作用域仅限当前这一发请求。
 * 只应包裹单个 api 调用；不要跨 await 使用（await 之后再发的请求不会被标记）。
 */
interface KeepOnNavigateToken {
  used: boolean
}

const keepOnNavigateTokens: KeepOnNavigateToken[] = []

/** 消费最近一个未被使用的标记；没有则返回 false */
const consumeKeepOnNavigateToken = (): boolean => {
  for (let index = keepOnNavigateTokens.length - 1; index >= 0; index -= 1) {
    const token = keepOnNavigateTokens[index]
    if (!token || token.used) continue
    token.used = true
    keepOnNavigateTokens.splice(index, 1)
    return true
  }
  return false
}

const releaseKeepOnNavigateToken = (token: KeepOnNavigateToken): void => {
  const index = keepOnNavigateTokens.indexOf(token)
  if (index !== -1) keepOnNavigateTokens.splice(index, 1)
}

export const withoutAbortOnNavigate = <T>(
  run: () => Promise<T>
): Promise<T> => {
  const token: KeepOnNavigateToken = { used: false }
  keepOnNavigateTokens.push(token)

  let result: Promise<T>
  try {
    result = run()
  } catch (error) {
    releaseKeepOnNavigateToken(token)
    return Promise.reject(error)
  }
  // 回调内没有发起请求（例如提前校验返回）时回收标记，避免影响后续请求
  if (!token.used) releaseKeepOnNavigateToken(token)
  return result
}

const instance: AxiosInstance = axios.create({
  baseURL: import.meta.env.DEV ? DEV_BASE_URL : PROD_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  withCredentials: true,
})

// 只给当前实例设置默认头，不再污染全局 axios.defaults
instance.defaults.headers.post['Content-Type'] =
  'application/json;charset=UTF-8'

instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const params = (config.params ?? {}) as Record<string, unknown>
  config.params = {
    ...params,
    // 时间戳参数沿用旧行为，避免代理 / 浏览器缓存
    timestamp: Date.now(),
  }

  // 页面级 GET 绑定当前导航作用域；应用级请求 / 调用方自带 signal 的不绑定
  const method = (config.method ?? 'get').toLowerCase()
  if (method === 'get' && config.abortOnNavigate !== false && !config.signal) {
    config.signal = navigationScope.signal
  }
  return config
})

instance.interceptors.response.use(
  (response: AxiosResponse<unknown>) => {
    const payload: unknown = response.data
    const envelope = readEnvelope(payload)
    if (needsLogin(envelope)) {
      redirectToLogin()
      return Promise.reject(
        new ApiError(envelope?.msg ?? NEED_LOGIN_MESSAGE, {
          status: response.status,
          code: NEED_LOGIN_CODE,
          url: response.config?.url,
          raw: payload,
        })
      )
    }
    return payload as AxiosResponse
  },
  (error: unknown) => {
    const apiError = extractApiError(error)
    // 取消是正常控制流：不触发 301 跳登录、不重试、不提示
    if (apiError.isCanceled) return Promise.reject(apiError)
    if (
      apiError.code === NEED_LOGIN_CODE ||
      apiError.status === NEED_LOGIN_CODE ||
      apiError.message === NEED_LOGIN_MESSAGE
    ) {
      redirectToLogin()
    }
    return Promise.reject(apiError)
  }
)

const wait = (ms: number): Promise<void> =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })

const shouldRetry = (error: ApiError): boolean =>
  error.isNetwork ||
  (typeof error.status === 'number' && RETRYABLE_STATUS.includes(error.status))

const executeRequest = async <T>(config: AxiosRequestConfig): Promise<T> => {
  const payload = await instance.request(config)
  return payload as unknown as T
}

const requestWithRetry = async <T>(config: AxiosRequestConfig): Promise<T> => {
  const method = (config.method ?? 'get').toLowerCase()
  const retryable = method === 'get'
  /** 该请求是否绑定导航作用域（应用级请求 / 自带 signal 的不绑定） */
  const navigationBound =
    retryable && config.abortOnNavigate !== false && !config.signal
  const generation = navigationGeneration
  let attempt = 0
  for (;;) {
    // 等待重试期间如果发生了切页，视为取消，避免旧页面请求回来覆盖新页面
    if (retryable && navigationBound && generation !== navigationGeneration) {
      throw new ApiError(CANCELED_MESSAGE, {
        isCanceled: true,
        url: config.url,
      })
    }
    try {
      return await executeRequest<T>(config)
    } catch (error) {
      const apiError = extractApiError(error)
      // 导航取消：直接抛出，不重试
      if (apiError.isCanceled) throw apiError
      if (
        !retryable ||
        attempt >= GET_RETRY_DELAYS.length ||
        !shouldRetry(apiError)
      ) {
        throw apiError
      }
      await wait(GET_RETRY_DELAYS[attempt])
      attempt += 1
    }
  }
}

const serializeValue = (value: unknown): string => {
  if (value === undefined) return ''
  try {
    return JSON.stringify(value) ?? ''
  } catch {
    return String(value)
  }
}

/** 同 method + url + params 的并发 GET 复用同一个 Promise */
const createDedupeKey = (config: AxiosRequestConfig): string | undefined => {
  const method = (config.method ?? 'get').toLowerCase()
  if (method !== 'get') return undefined
  const params = (config.params ?? {}) as Record<string, unknown>
  const paramPart = Object.keys(params)
    .sort()
    .map((key) => `${key}=${serializeValue(params[key])}`)
    .join('&')
  return `${method}|${config.baseURL ?? ''}|${config.url ?? ''}|${paramPart}`
}

const request = async <T>(config: AxiosRequestConfig): Promise<T> => {
  const method = (config.method ?? 'get').toLowerCase()
  // 应用级请求：消费 withoutAbortOnNavigate 标记，等效于 config.abortOnNavigate = false
  const keepOnNavigate = method === 'get' && consumeKeepOnNavigateToken()
  if (keepOnNavigate) {
    // 不参与页面级请求去重：避免与可能被导航取消的页面请求共享同一个 Promise
    return requestWithRetry<T>({ ...config, abortOnNavigate: false })
  }

  const dedupeKey = createDedupeKey(config)
  if (!dedupeKey) return requestWithRetry<T>(config)

  const pending = pendingRequests.get(dedupeKey)
  if (pending) return pending as Promise<T>

  const current = requestWithRetry<T>(config)
  const tracked: Promise<T> = current.finally(() => {
    // 只清理自己写入的 key：导航轮换时旧请求可能已被新请求顶替
    if (pendingRequests.get(dedupeKey) === tracked) {
      pendingRequests.delete(dedupeKey)
    }
  })
  pendingRequests.set(dedupeKey, tracked)
  return tracked
}

/**
 * 请求客户端。
 * 未显式指定泛型时返回 unknown，调用方需自行断言或收窄；
 * 新代码请显式传入响应泛型：`http.get<T>(url)` / `http<T>({ url })`。
 */
export interface HttpClient {
  <T = unknown>(config: AxiosRequestConfig): Promise<T>
  request<T = unknown>(config: AxiosRequestConfig): Promise<T>
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
  post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T>
  put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T>
  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
}

const http = Object.assign((config: AxiosRequestConfig) => request(config), {
  request: <T = unknown>(config: AxiosRequestConfig) => request<T>(config),
  get: <T = unknown>(url: string, config?: AxiosRequestConfig) =>
    request<T>({ ...config, url, method: 'get' }),
  post: <T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ) => request<T>({ ...config, url, method: 'post', data }),
  put: <T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ) => request<T>({ ...config, url, method: 'put', data }),
  delete: <T = unknown>(url: string, config?: AxiosRequestConfig) =>
    request<T>({ ...config, url, method: 'delete' }),
}) as HttpClient

export default http
