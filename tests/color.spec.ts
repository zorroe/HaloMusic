import { describe, expect, it } from 'vitest'
import {
  clearColorCache,
  extractDominantColor,
  hueDistance,
  isUsableColor,
  pickColor,
  toRgbCss,
} from '../src/utils/color'

/*
 * 取色算法单测：只覆盖纯函数 pickColor / 工具函数与 extractDominantColor 的兜底分支。
 * 真实 canvas 采样在 Electron 里运行，node 环境没有 Image / canvas，这里不 mock DOM。
 */

describe('pickColor（输入过滤与空结果）', () => {
  it('空数组 / 全黑 / 全白 / 纯灰都返回 null', () => {
    expect(pickColor([])).toBeNull()

    // 近黑（max ≤ 46）与近白（min ≥ 222）全部过滤
    expect(
      pickColor([
        { r: 0, g: 0, b: 0 },
        { r: 20, g: 20, b: 20 },
        { r: 255, g: 255, b: 255 },
        { r: 230, g: 236, b: 234 },
        { r: 222, g: 222, b: 222 },
      ])
    ).toBeNull()

    // 低饱和灰调（S < 0.16）不参与取色
    expect(
      pickColor([
        { r: 128, g: 128, b: 128 },
        { r: 150, g: 140, b: 135 },
      ])
    ).toBeNull()
  })

  it('非法通道的条目被跳过，其余颜色正常参与', () => {
    expect(pickColor([{ r: Number.NaN, g: 0, b: 200 }])).toBeNull()

    const picked = pickColor([
      { r: Number.NaN, g: 0, b: 200 },
      { r: 40, g: 150, b: 220 },
      { r: 40, g: 150, b: 220 },
    ])
    expect(picked?.primary).toBe('rgb(40, 150, 220)')
    expect(picked?.secondary).not.toBe(picked?.primary)
  })
})

describe('pickColor（主色为加权平均）', () => {
  it('相同颜色重复采样时主色精确等于该颜色，辅色是它的明度变体', () => {
    const picked = pickColor([
      { r: 200, g: 60, b: 60 },
      { r: 200, g: 60, b: 60 },
    ])
    expect(picked).toEqual({
      primary: 'rgb(200, 60, 60)',
      // v = 0.78 ≥ 0.5 → 压暗 30%
      secondary: 'rgb(140, 42, 42)',
    })
  })

  it('暗色主色派生的辅色是提亮变体', () => {
    const picked = pickColor([{ r: 40, g: 40, b: 120 }])
    expect(picked?.primary).toBe('rgb(40, 40, 120)')
    // v ≈ 0.47 < 0.5 → 向白色提亮 28%
    expect(picked?.secondary).toBe('rgb(100, 100, 158)')
    expect(picked?.secondary).not.toBe(picked?.primary)
  })

  it('饱和色权重更高：灰调与鲜艳色混合时主色贴近鲜艳色', () => {
    const picked = pickColor([
      { r: 120, g: 100, b: 80 },
      { r: 230, g: 40, b: 40 },
    ])
    expect(picked).not.toBeNull()

    const channels = (picked?.primary ?? '')
      .replace(/[^\d,]/g, '')
      .split(',')
      .map((value) => Number(value))
    expect(channels).toHaveLength(3)
    const [red, green, blue] = channels
    // 明显偏红、且比灰调的 120/100/80 更饱和
    expect(red).toBeGreaterThan(180)
    expect(green).toBeLessThan(80)
    expect(blue).toBeLessThan(80)
  })
})

describe('pickColor（辅色与主色的区分）', () => {
  it('存在明显异色像素时辅色取该色相家族，不会互相抵消回主色', () => {
    const picked = pickColor([
      { r: 220, g: 60, b: 60 },
      { r: 60, g: 80, b: 220 },
    ])
    // 主色是两种颜色的加权平均（等权重 → 中点）
    expect(picked?.primary).toBe('rgb(140, 70, 140)')
    // 辅色取「权重 × 色相差」最大的蓝色家族
    expect(picked?.secondary).toBe('rgb(60, 80, 220)')
  })
})

describe('工具函数', () => {
  it('isUsableColor 过滤近黑 / 近白 / 低饱和，越界值先收敛', () => {
    expect(isUsableColor({ r: 0, g: 0, b: 0 })).toBe(false)
    expect(isUsableColor({ r: 46, g: 46, b: 46 })).toBe(false)
    expect(isUsableColor({ r: 255, g: 255, b: 255 })).toBe(false)
    expect(isUsableColor({ r: 222, g: 222, b: 222 })).toBe(false)
    expect(isUsableColor({ r: 128, g: 128, b: 128 })).toBe(false)
    expect(isUsableColor({ r: 40, g: 150, b: 220 })).toBe(true)
    // 越界值先被 clamp 到 0~255 再判定
    expect(isUsableColor({ r: 300, g: 100, b: 50 })).toBe(true)
  })

  it('hueDistance 取最短角差，toRgbCss 输出标准 rgb()', () => {
    expect(hueDistance(350, 10)).toBe(20)
    expect(hueDistance(10, 350)).toBe(20)
    expect(hueDistance(0, 180)).toBe(180)
    expect(hueDistance(120, 120)).toBe(0)
    expect(toRgbCss({ r: 1, g: 2, b: 3 })).toBe('rgb(1, 2, 3)')
  })
})

describe('extractDominantColor（无 DOM 环境兜底）', () => {
  it('空 URL 直接 reject，调用方回退主题色', async () => {
    clearColorCache()
    await expect(extractDominantColor('')).rejects.toThrow('封面地址为空')
    await expect(extractDominantColor('   ')).rejects.toThrow('封面地址为空')
  })
})
