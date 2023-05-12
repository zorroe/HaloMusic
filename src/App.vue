<template>
  <div class="wrapper">
    <div class="header">
      <Header />
    </div>
    <div class="content">
      <router-view v-slot="{ Component }">
        <keep-alive :max="10" :exclude="excludes">
          <component :is="Component"/>
        </keep-alive>
      </router-view>
    </div>
    <div v-show="playerStore.song.id">
      <Footer />
    </div>
  </div>
  <Modals />
</template>

<script setup lang="ts">
import Header from "@/components/layout/Header.vue";
import Footer from "@/components/layout/Footer.vue";
import Modals from "@/components/layout/Modals.vue";
import { usePlayerStore } from "@/store";
import pinia from "@/store/store";

const playerStore = usePlayerStore(pinia);

const excludes = ['artist','playlist','album']

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
  padding-top: 64px;
  flex: 1;
  padding-left: 40px;
  padding-right: 40px;
  padding-bottom: 10px;
}

.header {
  position: fixed;
  top: 0px;
  left: 0px;
  right: 0px;
  height: 64px;
  background: radial-gradient(transparent, rgb(255, 255, 255) 1px);
  background-size: 2px 2px;
  backdrop-filter: saturate(180%) blur(50px);
  z-index: 9000;
}
</style>
