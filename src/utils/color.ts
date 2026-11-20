/**
 * 封面取色（Phase 3 / B4）。
 *
 * 目标：从当前封面里提取一个「有颜色」的主色和一个辅助色，供播放页环境光、
 * 唱片氛围光等场景使用，让界面跟随歌曲封面变化。
 *
 * 设计要点：
 * - 采样：把图片绘制到 16×16 的画布，浏览器插值天然做了区域平均，避免逐像素噪声；
 * - 过滤：近黑 / 近白 / 低饱和（灰）像素不参与取色，否则大面积黑边、白底会把主色拉灰；
 * - 加权：饱和度越高的像素权重越大（同时避开过暗/过亮的极值），保证主色是「有颜色」的那一块；
 * - 主/辅：主色为加权平均；辅色优先取与主色色相差异明显的像素，
 *   找不到时对主色做明度偏移派生，保证一定能拿到两个不同颜色；
 * - 分层：`pickColor` 是纯函数（node 环境可单测），只有 `extractDominantColor` 依赖 Image / canvas。
 *
 * 跨域说明：Electron 渲染进程开启 webSecurity 后，canvas 读取跨域图片会被标记为 tainted，
 * 因此加载时设置 `crossOrigin = 'anonymous'`；CDN 不返回 CORS 头时图片会直接加载失败，
 * 这里统一 reject，调用方回退到纯模糊封面层 / 主题色。
 */

/** 取色用的采样网格边长：16×16 = 256 个采样点足够代表整体色调 */
export const SAMPLE_SIZE = 16

/** 近黑判定：RGB 三通道都 ≤ 该值视为黑色（封面常见的黑边） */
export const NEAR_BLACK_MAX = 46

/** 近白判定：RGB 三通道都 ≥ 该值视为白色（白底封面不参与取色） */
export const NEAR_WHITE_MIN = 222

/** 最低饱和度（HSV 的 S = (max - min) / max），低于该值的灰调不参与取色 */
export const MIN_SATURATION = 0.16

/** 辅色与主色的最小色相角差（度），小于该值视为同色系 */
export const MIN_SECONDARY_HUE_GAP = 40

/** 辅色家族宽度（度）：只平均锚点色相 ±该范围内的像素，避免异色互相抵消 */
const SECONDARY_FAMILY_HUE_WIDTH = 30

/** 取色结果缓存条数上限（封面 URL 不可变，命中缓存可避免重复解码） */
const COLOR_CACHE_LIMIT = 32

/** 单张封面的加载超时（毫秒）：超时后 reject，调用方回退 */
const IMAGE_LOAD_TIMEOUT = 8000

/** 取色使用的 RGB 通道值（0~255） */
export interface RgbColor {
  r: number
  g: number
  b: number
}

/** 封面取色结果：均为 CSS `rgb()` 字符串，可直接写进 CSS 变量 */
export interface PickedColor {
  /** 主色 */
  primary: string
  /** 辅助色，与主色有明显色相或明度差异 */
  secondary: string
}

/** HSV 三元组：h ∈ [0, 360)，s / v ∈ [0, 1] */
interface HsvColor {
  h: number
  s: number
  v: number
}

/** 通过过滤、带置信权重的采样像素 */
interface UsableColor {
  color: RgbColor
  hsv: HsvColor
  weight: number
}

const clampChannel = (value: number): number => {
  if (!Number.isFinite(value)) return 0
  return Math.min(255, Math.max(0, Math.round(value)))
}

/** 把任意（可能越界/非法的）RGB 收敛为 0~255 的整数；含非法通道时返回 null */
export const normalizeRgb = (
  color: RgbColor | null | undefined
): RgbColor | null => {
  if (!color) return null
  const channels = [color.r, color.g, color.b]
  if (!channels.every((channel) => Number.isFinite(channel))) return null
  return {
    r: clampChannel(color.r),
    g: clampChannel(color.g),
    b: clampChannel(color.b),
  }
}

/** RGB → CSS `rgb()` 字符串 */
export const toRgbCss = (color: RgbColor): string =>
  `rgb(${clampChannel(color.r)}, ${clampChannel(color.g)}, ${clampChannel(color.b)})`

/** RGB → HSV */
const toHsv = (color: RgbColor): HsvColor => {
  const max = Math.max(color.r, color.g, color.b)
  const min = Math.min(color.r, color.g, color.b)
  const delta = max - min

  let hue = 0
  if (delta > 0) {
    if (max === color.r) hue = ((color.g - color.b) / delta) % 6
    else if (max === color.g) hue = (color.b - color.r) / delta + 2
    else hue = (color.r - color.g) / delta + 4
    hue *= 60
    if (hue < 0) hue += 360
  }

  return {
    h: hue,
    s: max === 0 ? 0 : delta / max,
    v: max / 255,
  }
}

/** 两个色相之间的最小角差（0~180 度） */
export const hueDistance = (first: number, second: number): number => {
  const delta = Math.abs(first - second) % 360
  return delta > 180 ? 360 - delta : delta
}

/**
 * 判断一个颜色是否适合取色：过滤近黑、近白与低饱和灰。
 * 越界值会先被收敛到 0~255；含非法通道时返回 false。
 */
export const isUsableColor = (color: RgbColor): boolean => {
  const normalized = normalizeRgb(color)
  if (!normalized) return false

  const max = Math.max(normalized.r, normalized.g, normalized.b)
  const min = Math.min(normalized.r, normalized.g, normalized.b)

  if (max <= NEAR_BLACK_MAX) return false
  if (min >= NEAR_WHITE_MIN) return false

  const saturation = max === 0 ? 0 : (max - min) / max
  return saturation >= MIN_SATURATION
}

/**
 * 像素置信权重：饱和度越高越可信；过暗/过亮的颜色本身「颜色感」弱，做一点惩罚。
 * 权重恒为正，保证加权平均的分母不会为 0。
 */
const confidenceOf = (hsv: HsvColor): number => {
  const brightness = 1 - (Math.abs(hsv.v - 0.55) / 0.55) * 0.6
  return 0.2 + hsv.s * hsv.s * 4 * Math.max(0.35, brightness)
}

interface WeightedColor {
  color: RgbColor
  weight: number
}

const weightedAverage = (entries: WeightedColor[]): RgbColor => {
  let red = 0
  let green = 0
  let blue = 0
  let weightSum = 0

  for (const entry of entries) {
    const weight = Number.isFinite(entry.weight)
      ? Math.max(entry.weight, 0.0001)
      : 0.0001
    red += entry.color.r * weight
    green += entry.color.g * weight
    blue += entry.color.b * weight
    weightSum += weight
  }

  return {
    r: clampChannel(red / weightSum),
    g: clampChannel(green / weightSum),
    b: clampChannel(blue / weightSum),
  }
}

/**
 * 只有一种颜色家族时派生辅助色：暗色提亮、亮色压暗，保证与主色有明度差。
 * 极端通道（0 / 255）也能拿到不同的结果。
 */
const deriveSecondary = (primary: RgbColor): RgbColor => {
  const hsv = toHsv(primary)
  if (hsv.v < 0.5) {
    const ratio = 0.28
    return {
      r: clampChannel(primary.r + (255 - primary.r) * ratio),
      g: clampChannel(primary.g + (255 - primary.g) * ratio),
      b: clampChannel(primary.b + (255 - primary.b) * ratio),
    }
  }

  const ratio = 0.3
  return {
    r: clampChannel(primary.r * (1 - ratio)),
    g: clampChannel(primary.g * (1 - ratio)),
    b: clampChannel(primary.b * (1 - ratio)),
  }
}

/**
 * 纯函数取色：从采样像素里挑出主色与辅色。
 *
 * - 空数组 / 全是近黑、近白、灰调 → 返回 null（调用方回退主题色）；
 * - 主色：过滤后像素的加权平均（饱和色优先）；
 * - 辅色：先在与主色色相差 ≥ MIN_SECONDARY_HUE_GAP 的像素里挑一个「权重 × 色相差」最大的锚点，
 *   再只平均该锚点附近（±辅色家族宽度）的像素——避免两个互补色互相抵消又平均回主色；
 *   没有明显异色像素时由主色派生明度变体。
 */
export const pickColor = (
  rgbList: ReadonlyArray<RgbColor>
): PickedColor | null => {
  const usable: UsableColor[] = []

  for (const item of rgbList) {
    const color = normalizeRgb(item)
    if (!color || !isUsableColor(color)) continue
    const hsv = toHsv(color)
    usable.push({ color, hsv, weight: confidenceOf(hsv) })
  }

  if (usable.length === 0) return null

  const primary = weightedAverage(
    usable.map((entry) => ({ color: entry.color, weight: entry.weight }))
  )
  const primaryHue = toHsv(primary).h

  // 辅色候选：色相明显偏离主色的像素，偏离越大权重越高（避免辅色和主色还是同一片色块）
  const distinct = usable.filter(
    (entry) => hueDistance(entry.hsv.h, primaryHue) >= MIN_SECONDARY_HUE_GAP
  )

  let secondary: RgbColor
  if (distinct.length > 0) {
    const anchor = distinct.reduce<{ entry: UsableColor; score: number }>(
      (best, entry) => {
        const score = entry.weight * hueDistance(entry.hsv.h, primaryHue)
        return score > best.score ? { entry, score } : best
      },
      { entry: distinct[0], score: -1 }
    )
    const family = distinct.filter(
      (entry) =>
        hueDistance(entry.hsv.h, anchor.entry.hsv.h) <=
        SECONDARY_FAMILY_HUE_WIDTH
    )
    secondary = weightedAverage(
      family.map((entry) => ({ color: entry.color, weight: entry.weight }))
    )
  } else {
    secondary = deriveSecondary(primary)
  }

  return { primary: toRgbCss(primary), secondary: toRgbCss(secondary) }
}

const colorCache = new Map<string, PickedColor | null>()

/** 清空取色缓存（测试 / 主题切换调试用） */
export const clearColorCache = (): void => {
  colorCache.clear()
}

const rememberColor = (url: string, value: PickedColor | null): void => {
  if (colorCache.size >= COLOR_CACHE_LIMIT) {
    const oldestKey = colorCache.keys().next().value
    if (typeof oldestKey === 'string') colorCache.delete(oldestKey)
  }
  colorCache.set(url, value)
}

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    if (typeof Image === 'undefined') {
      reject(new Error('当前环境不支持图片取色'))
      return
    }

    const image = new Image()
    let settled = false

    const settle = (callback: () => void): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      image.onload = null
      image.onerror = null
      callback()
    }

    const timer = setTimeout(() => {
      settle(() => reject(new Error('封面加载超时，无法取色')))
    }, IMAGE_LOAD_TIMEOUT)

    image.onload = () => {
      settle(() => resolve(image))
    }
    image.onerror = () => {
      settle(() => reject(new Error('封面加载失败（可能是跨域限制）')))
    }

    // 必须在设置 src 之前开启：否则 canvas 会被标记为 tainted，getImageData 直接抛错
    image.crossOrigin = 'anonymous'
    image.decoding = 'async'
    image.src = url
  })

const sampleImage = (image: HTMLImageElement): RgbColor[] => {
  const canvas = document.createElement('canvas')
  canvas.width = SAMPLE_SIZE
  canvas.height = SAMPLE_SIZE

  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return []

  // drawImage 缩放时的插值天然做了 16×16 区域平均，比逐像素抽样更稳
  context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
  const { data } = context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE)

  const colors: RgbColor[] = []
  for (let index = 0; index < data.length; index += 4) {
    // 透明像素不参与取色
    if (data[index + 3] < 128) continue
    colors.push({ r: data[index], g: data[index + 1], b: data[index + 2] })
  }
  return colors
}

/**
 * 从封面图提取主色 / 辅色。
 *
 * - 空 URL、图片加载失败（含 CDN 不支持 CORS）、超时、canvas 不可用 → reject，
 *   调用方用 `--color-primary` / 纯模糊层兜底；
 * - 图片能加载但没有可用颜色（全黑 / 全白 / 纯灰）→ resolve `null`；
 * - 结果按 URL 缓存，同一封面重复调用不会重复解码。
 */
export const extractDominantColor = async (
  imageUrl: string
): Promise<PickedColor | null> => {
  const url = typeof imageUrl === 'string' ? imageUrl.trim() : ''
  if (!url) throw new Error('封面地址为空，无法取色')

  if (colorCache.has(url)) return colorCache.get(url) ?? null

  if (typeof document === 'undefined') {
    throw new Error('当前环境不支持 canvas 取色')
  }

  const image = await loadImage(url)
  const picked = pickColor(sampleImage(image))
  rememberColor(url, picked)
  return picked
}
