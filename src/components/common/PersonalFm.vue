<template>
  <div
    class="flex items-end rounded-2xl w-1/2 relative overflow-hidden"
    @click="">
    <img
      :src="bgImg"
      class="recommend" />
    <div id="mask"></div>
    <div class="ml-4 mb-4 text-7xl w-48 font-bold text-white z-50">
      私人FM
    </div>
    <div class="flex-1"></div>
    <icon-park
      :icon="PlayOne"
      fill="white"
      theme="filled"
      :size="24"
      @click="playerStore.playFm"
      class="mr-4 mb-4 p-2 z-50 rounded-full transition-all text-white bg-white bg-opacity-20 hover:bg-opacity-40 active:scale-90"></icon-park>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { PlayOne } from '@icon-park/vue-next'
import { personFmApi } from '@/api/music'
import { usePlayerStore } from '@/store/playerStore';
import pinia from '@/store/store';

const playerStore = usePlayerStore(pinia)

const fmList = ref<any>()
const bgImg = ref<string>()

const personalFm = async () => {
  const { data } = await personFmApi()
  fmList.value = data
  bgImg.value = fmList.value[0].album.picUrl
}

onMounted(() => {
  personalFm()
})
</script>

<style scoped>
.recommend {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  animation: move 38s infinite;
  animation-direction: alternate;
  z-index: 1;
}

#mask {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 400px;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 2;
}

@keyframes move {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(-50%);
  }
}
</style>
