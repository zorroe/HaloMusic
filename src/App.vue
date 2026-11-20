<template>
  <div class="wrapper">
    <div class="header">
      <Header />
    </div>
    <div class="content">
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
    </div>
    <div
      v-show="playerStore.current.idx !== -1"
      class="footer">
      <Footer />
    </div>
  </div>
  <Modals />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import Header from '@/components/layout/Header.vue'
import Footer from '@/components/layout/Footer.vue'
import Modals from '@/components/layout/Modals.vue'
import { usePlayerStore } from '@/store/playerStore'
import pinia from '@/store/store'
import { checkLoginStatus } from '@/utils/common'
import { bindMediaKeys } from '@/utils/mediaKeys'

const playerStore = usePlayerStore(pinia)

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
.wrapper {
  overflow: hidden;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.content {
  overflow-y: scroll;
  overflow-x: hidden;
  flex: 1;
  padding: 75px 40px 64px 40px;
}

.header {
  position: fixed;
  top: 0px;
  left: 0px;
  right: 0px;
  background: radial-gradient(transparent, rgb(255, 255, 255) 1px);
  background-size: 2px 2px;
  backdrop-filter: saturate(180%) blur(50px);
  z-index: 9000;
}

.footer {
  position: fixed;
  bottom: 0px;
  left: 0px;
  right: 0px;
  height: 64px;
  background: radial-gradient(transparent, rgb(255, 255, 255) 1px);
  background-size: 2px 2px;
  backdrop-filter: saturate(180%) blur(50px);
  z-index: 9000;
}
</style>
