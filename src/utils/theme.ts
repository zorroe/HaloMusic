/**
 * 主题（浅色 / 深色 / 跟随系统）基础设施。
 *
 * 约定：
 * - 唯一状态写在 `<html data-theme="light|dark">` 上，CSS 里既可以通过
 *   `[data-theme="dark"]` 覆盖我们的设计变量，daisyUI 也会跟随该属性切换主题；
 * - 用户选择持久化在 localStorage 的 `halo-theme`（'light' | 'dark' | 'system'）；
 * - 默认 `system`：跟随系统 `prefers-color-scheme`，并且实时响应系统切换；
 * - 所有颜色请使用 `--color-*` 变量，禁止在组件里硬编码 #fff / rgb(0,0,0) 等。
 */
import { computed, ref, watch } from 'vue'
import { usePreferredDark } from '@vueuse/core'
import { bridge } from '@/utils/bridge'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'halo-theme'
const THEME_ATTR = 'data-theme'

const isThemeMode = (value: unknown): value is ThemeMode =>
  value === 'light' || value === 'dark' || value === 'system'

const readStoredMode = (): ThemeMode => {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    return isThemeMode(raw) ? raw : 'system'
  } catch {
    return 'system'
  }
}

const writeStoredMode = (mode: ThemeMode): void => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode)
  } catch {
    // 隐私模式 / 配额满：仅本次会话生效，不阻断
  }
}

/** 当前用户选择的模式（响应式，跨组件共享） */
const mode = ref<ThemeMode>(readStoredMode())

/** 系统是否偏好深色（usePreferredDark 是全局单例监听） */
const prefersDark = usePreferredDark()

/** 实际生效的主题 */
const resolvedTheme = computed<ResolvedTheme>(() => {
  if (mode.value === 'system') return prefersDark.value ? 'dark' : 'light'
  return mode.value
})

const applyTheme = (theme: ResolvedTheme): void => {
  const root = document.documentElement
  root.setAttribute(THEME_ATTR, theme)
  root.style.colorScheme = theme
}

/**
 * 让系统原生标题栏跟随主题（Windows 标题栏由 DWM 绘制，Electron 通过
 * nativeTheme.themeSource 控制；浏览器环境 bridge 已降级为 no-op）。
 */
const syncNativeTitleBar = (themeMode: ThemeMode): void => {
  bridge.appearance.setThemeSource(themeMode)
}

// 模式或系统偏好变化时同步到 DOM（immediate 保证首次立即生效）
watch(
  resolvedTheme,
  theme => {
    applyTheme(theme)
  },
  { immediate: true }
)

watch(mode, next => {
  writeStoredMode(next)
  // 用用户选择的模式（而不是解析后的 light/dark），'system' 时让系统自己决定标题栏明暗
  syncNativeTitleBar(next)
})

/**
 * 应用启动时调用一次：把已保存/系统的主题应用到 DOM。
 * 未调用时 watch 的 immediate 也会生效，但显式调用更利于阅读入口。
 */
export function initTheme(): void {
  mode.value = readStoredMode()
  applyTheme(resolvedTheme.value)
  syncNativeTitleBar(mode.value)
}

export function getThemeMode(): ThemeMode {
  return mode.value
}

export function setThemeMode(next: ThemeMode): void {
  mode.value = next
}

/** light → dark → system 循环切换（Header 按钮用） */
export function cycleThemeMode(): ThemeMode {
  const order: ThemeMode[] = ['light', 'dark', 'system']
  const currentIndex = order.indexOf(mode.value)
  const next = order[(currentIndex + 1) % order.length]
  mode.value = next
  return next
}

/** 组件内使用的响应式主题状态 */
export function useTheme() {
  return {
    mode,
    resolvedTheme,
    isDark: computed(() => resolvedTheme.value === 'dark'),
    setThemeMode,
    cycleThemeMode,
  }
}
