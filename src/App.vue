<template>
  <div class="wrapper">
    <div class="header">
      <Header />
    </div>
    <div class="content">
      <router-view v-slot="{ Component }">
        <keep-alive
          :max="10"
          :exclude="excludes">
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </div>
    <div
      class="footer"
      v-show="playerStore.current.idx !== -1">
      <Footer />
    </div>
  </div>
  <Modals />
</template>

<script setup lang="ts">
import Header from '@/components/layout/Header.vue'
import Footer from '@/components/layout/Footer.vue'
import { usePlayerStore } from '@/store/playerStore'
import pinia from '@/store/store'
import { onMounted } from 'vue'

const playerStore = usePlayerStore(pinia)

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
