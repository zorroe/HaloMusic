<template>
  <div class="sidebar">
    <div class="sidebar-brand">
      <img
        class="sidebar-logo"
        src="/logo.svg"
        alt="" />
      <span class="sidebar-name">HaloMusic</span>
    </div>

    <nav class="sidebar-nav">
      <button
        v-for="item in navItems"
        :key="item.path"
        type="button"
        class="nav-item"
        :class="{ 'is-active': isActive(item.path) }"
        @click="routeTo(item.path)">
        <icon-park
          :icon="item.icon"
          :size="18"
          theme="outline"
          fill="currentColor" />
        <span class="nav-label">{{ item.name }}</span>
      </button>
    </nav>

    <div class="sidebar-group-title">音乐库</div>
    <nav class="sidebar-nav">
      <button
        type="button"
        class="nav-item"
        @click="openLikedPlaylist">
        <icon-park
          :icon="Like"
          :size="18"
          theme="outline"
          fill="currentColor" />
        <span class="nav-label">我喜欢的音乐</span>
      </button>
      <button
        type="button"
        class="nav-item"
        @click="openQueue">
        <icon-park
          :icon="MusicList"
          :size="18"
          theme="outline"
          fill="currentColor" />
        <span class="nav-label">播放队列</span>
      </button>
    </nav>

    <div class="sidebar-bottom">
      <button
        type="button"
        class="nav-item"
        :title="themeTitle"
        @click="handleCycleTheme">
        <icon-park
          :icon="themeIcon"
          :size="18"
          theme="outline"
          fill="currentColor" />
        <span class="nav-label">{{ themeLabel }}</span>
      </button>
      <span class="sidebar-version">v{{ version }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  AutoFocus,
  Compass,
  Home,
  Like,
  Moon,
  MusicList,
  Search,
  Sunny,
  User,
} from '@icon-park/vue-next'
import router from '@/router'
import { routeTo } from '@/utils/common'
import notify from '@/components/common/notification/notify'
import { bridge } from '@/utils/bridge'
import { useTheme } from '@/utils/theme'

defineOptions({
  name: 'appSidebar',
})

/** 打开播放队列抽屉的一次性事件（Footer 内监听） */
const OPEN_QUEUE_EVENT = 'halo:open-queue'

const navItems = [
  { name: '首页', path: '/', icon: Home },
  { name: '发现', path: '/explore', icon: Compass },
  { name: '我的', path: '/me', icon: User },
  { name: '搜索', path: '/search', icon: Search },
]

const currentPath = computed(() => router.currentRoute.value.path)

const isActive = (path: string): boolean => {
  if (path === '/') return currentPath.value === '/'
  return currentPath.value.startsWith(path)
}

/* ---------------- 我喜欢的音乐 ---------------- */
const openLikedPlaylist = (): void => {
  try {
    const playlistId = localStorage.getItem('likePlayListId')
    if (playlistId) {
      routeTo(`/playlist/${playlistId}`)
      return
    }
  } catch {
    // localStorage 不可用时直接回落到「我的音乐」
  }
  notify({ message: '请先登录后查看我喜欢的音乐', type: 'warning' })
  routeTo('/me')
}

/* ---------------- 播放队列（通知 Footer 打开抽屉） ---------------- */
const openQueue = (): void => {
  window.dispatchEvent(new CustomEvent(OPEN_QUEUE_EVENT))
}

/* ---------------- 主题切换 ---------------- */
const { mode, cycleThemeMode } = useTheme()

const themeIcon = computed(() => {
  if (mode.value === 'light') return Sunny
  if (mode.value === 'dark') return Moon
  return AutoFocus
})

const themeLabel = computed(() => {
  if (mode.value === 'light') return '浅色主题'
  if (mode.value === 'dark') return '深色主题'
  return '跟随系统'
})

const themeTitle = computed(
  () => `当前：${themeLabel.value} · 点击切换外观`
)

const handleCycleTheme = (): void => {
  cycleThemeMode()
}

/* ---------------- 版本号 ---------------- */
const version = ref('')

onMounted(() => {
  bridge
    .getAppVersion()
    .then(value => {
      version.value = value
    })
    .catch(() => undefined)
})
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 18px 12px 12px;
  gap: 6px;
  color: var(--color-text);
  user-select: none;
}

/* 品牌区 */
.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 10px 16px;
}

.sidebar-logo {
  width: 28px;
  height: 28px;
  border-radius: 8px;
}

.sidebar-name {
  font-size: 1.0625rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

/* 导航 */
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 38px;
  padding: 0 10px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);
}

.nav-item:hover {
  background-color: var(--color-hover);
  color: var(--color-text);
}

.nav-item.is-active {
  background-color: var(--color-primary-bg);
  color: var(--color-primary);
}

.nav-item:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}

.nav-label {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.sidebar-group-title {
  padding: 18px 10px 6px;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-subtle);
}

.sidebar-bottom {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.sidebar-bottom .nav-item {
  flex: 1;
}

.sidebar-version {
  flex: none;
  padding-right: 8px;
  font-size: 0.6875rem;
  color: var(--color-text-subtle);
  font-variant-numeric: tabular-nums;
}
</style>
