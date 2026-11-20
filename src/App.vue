<template>
  <div
    class="app-shell"
    :class="{ 'app-shell--player': hasPlayer }">
    <aside class="app-sidebar">
      <AppSidebar />
    </aside>

    <div class="app-main">
      <header class="app-topbar">
        <Header />
      </header>

      <main class="app-content">
        <router-view v-slot="{ Component, route }">
          <Transition
            name="page"
            mode="out-in">
            <keep-alive
              :max="10"
              :exclude="excludes">
              <component
                :is="Component"
                :key="route.path" />
            </keep-alive>
          </Transition>
        </router-view>
      </main>
    </div>

    <div
      v-show="hasPlayer"
      class="app-playerbar">
      <Footer />
    </div>
  </div>
  <Modals />
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import Header from '@/components/layout/Header.vue'
import Footer from '@/components/layout/Footer.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import Modals from '@/components/layout/Modals.vue'
import { usePlayerStore } from '@/store/playerStore'
import pinia from '@/store/store'
import { checkLoginStatus } from '@/utils/common'
import { bindMediaKeys } from '@/utils/mediaKeys'

const playerStore = usePlayerStore(pinia)

/** 有歌曲时才显示底部播放条（grid 行同时收起来，避免留白） */
const hasPlayer = computed(() => playerStore.current.idx !== -1)

/**
 * 不缓存的页面：每次进入都需要重新拉数据或重新走流程的页面。
 * 必须与各页面 `defineOptions({ name })` 完全一致，否则 keep-alive 会失效。
 */
const excludes = [
  'artist',
  'playlist',
  'album',
  'curPlaylist',
  'search',
  'mv',
  'login',
]

onMounted(() => {
  playerStore.initPlayer()
  // 系统媒体键 / 托盘播放控制（Electron 下生效，浏览器环境自动跳过）
  bindMediaKeys()
  // 登录态校验只在这里做一次（Header 不再重复请求）
  checkLoginStatus().catch(error => {
    console.error('[HaloMusic] check login status failed:', error)
  })
})
</script>

<style lang="scss" scoped>
/* ===========================================================================
 * 应用外壳：左侧边栏 + (顶栏 + 内容) + 底部播放条
 * 用 grid 两行两列，播放条横跨整行；播放条隐藏时第二行高度归零。
 * ========================================================================= */
.app-shell {
  display: grid;
  grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) 0;
  height: 100vh;
  overflow: hidden;
  background-color: var(--color-shell-bg);
  transition: grid-template-rows var(--motion-base) var(--ease-standard);
}

.app-shell--player {
  grid-template-rows: minmax(0, 1fr) var(--playerbar-height);
}

.app-sidebar {
  grid-row: 1;
  grid-column: 1;
  overflow: hidden;
  background-color: var(--color-sidebar-bg);
  border-right: 1px solid var(--color-border);
}

.app-main {
  grid-row: 1;
  grid-column: 2;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.app-topbar {
  flex: none;
  height: var(--topbar-height);
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-topbar-bg);
  backdrop-filter: saturate(180%) blur(20px);
  z-index: 20;
}

.app-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--content-padding-y) var(--content-padding-x) 36px;
}

.app-playerbar {
  grid-row: 2;
  grid-column: 1 / -1;
  height: var(--playerbar-height);
  border-top: 1px solid var(--color-border);
  background-color: var(--color-playerbar-bg);
  backdrop-filter: saturate(180%) blur(24px);
  z-index: 30;
}
</style>
