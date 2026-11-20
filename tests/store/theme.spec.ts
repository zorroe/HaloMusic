// @vitest-environment happy-dom
/**
 * theme.ts 测试：initTheme 应用 <html data-theme>、cycleThemeMode 循环顺序与持久化、
 * system 模式跟随 prefers-color-scheme、非法存储值回退。
 *
 * theme.ts 是模块级单例（导入即应用主题），每个用例用 vi.resetModules() + 动态 import
 * 拿到干净实例；同时先加载一次 vue，保证 nextTick 与主题模块使用同一份响应式运行时。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type MediaQueryListener = (event: { matches: boolean }) => void

interface SystemThemeController {
  setDark: (matches: boolean) => void
}

const originalMatchMedia = window.matchMedia

let systemTheme: SystemThemeController

const installMatchMedia = (initialDark: boolean): SystemThemeController => {
  const listeners = new Set<MediaQueryListener>()
  const mediaQueryList = {
    matches: initialDark,
    media: '(prefers-color-scheme: dark)',
    onchange: null as MediaQueryListener | null,
    addEventListener: (_type: string, listener: MediaQueryListener) => {
      listeners.add(listener)
    },
    removeEventListener: (_type: string, listener: MediaQueryListener) => {
      listeners.delete(listener)
    },
    addListener: (listener: MediaQueryListener) => {
      listeners.add(listener)
    },
    removeListener: (listener: MediaQueryListener) => {
      listeners.delete(listener)
    },
    dispatchEvent: () => true,
  }

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation(() => mediaQueryList),
  })

  return {
    setDark: (matches: boolean) => {
      mediaQueryList.matches = matches
      listeners.forEach((listener) => listener({ matches }))
    },
  }
}

const loadTheme = async () => {
  vi.resetModules()
  // 先加载 vue，再加载 theme：resetModules 后两者共用同一份运行时
  const { nextTick } = await import('vue')
  const theme = await import('@/utils/theme')
  await nextTick()
  return { theme, nextTick }
}

const htmlTheme = (): string | null =>
  document.documentElement.getAttribute('data-theme')

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.style.colorScheme = ''
  systemTheme = installMatchMedia(false)
})

afterEach(() => {
  vi.resetModules()
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: originalMatchMedia,
  })
})

describe('theme.ts', () => {
  it('initTheme 应用 localStorage 中保存的主题', async () => {
    localStorage.setItem('halo-theme', 'dark')
    const { theme, nextTick } = await loadTheme()

    theme.initTheme()
    await nextTick()

    expect(htmlTheme()).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('未保存时默认 system，并跟随 prefers-color-scheme 变化', async () => {
    const { theme, nextTick } = await loadTheme()

    expect(theme.getThemeMode()).toBe('system')
    expect(htmlTheme()).toBe('light')

    systemTheme.setDark(true)
    await nextTick()
    expect(htmlTheme()).toBe('dark')

    systemTheme.setDark(false)
    await nextTick()
    expect(htmlTheme()).toBe('light')
  })

  it('cycleThemeMode 按 light → dark → system 循环，应用并持久化', async () => {
    localStorage.setItem('halo-theme', 'light')
    const { theme, nextTick } = await loadTheme()

    expect(theme.cycleThemeMode()).toBe('dark')
    await nextTick()
    expect(htmlTheme()).toBe('dark')
    expect(localStorage.getItem('halo-theme')).toBe('dark')

    expect(theme.cycleThemeMode()).toBe('system')
    await nextTick()
    expect(localStorage.getItem('halo-theme')).toBe('system')
    // system + 系统浅色 => data-theme=light
    expect(htmlTheme()).toBe('light')

    expect(theme.cycleThemeMode()).toBe('light')
    await nextTick()
    expect(localStorage.getItem('halo-theme')).toBe('light')
    expect(htmlTheme()).toBe('light')
  })

  it('setThemeMode 生效并持久化；非法存储值回退 system', async () => {
    localStorage.setItem('halo-theme', 'blue')
    const { theme, nextTick } = await loadTheme()

    expect(theme.getThemeMode()).toBe('system')
    expect(htmlTheme()).toBe('light')

    theme.setThemeMode('dark')
    await nextTick()
    expect(theme.getThemeMode()).toBe('dark')
    expect(htmlTheme()).toBe('dark')
    expect(localStorage.getItem('halo-theme')).toBe('dark')
  })
})
