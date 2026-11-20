<template>
  <div class="flex items-end rounded-2xl w-1/2 relative overflow-hidden">
    <img :src="bgImg" class="recommend" alt="私人FM背景" />
    <div id="mask"></div>
    <div class="ml-4 mb-4 text-7xl w-48 font-bold text-white z-50">私人FM</div>
    <div class="flex-1"></div>
    <icon-park
      :icon="PlayOne"
      fill="white"
      theme="filled"
      :size="24"
      @click="handlePlayFm"
      class="mr-4 mb-4 p-2 z-50 rounded-full transition-all text-white bg-white/20 hover:bg-white/40 active:scale-90"
    ></icon-park>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { PlayOne } from '@icon-park/vue-next'
import { personFmApi } from '@/api/music'
import { usePlayerStore } from '@/store/playerStore'
import pinia from '@/store/store'

const playerStore = usePlayerStore(pinia)

/** 请求失败时的兜底背景（本地静态资源，避免外链不可用导致卡片空掉） */
const FALLBACK_BG = '/logo.svg'

const bgImg = ref<string>(FALLBACK_BG)

/**
 * 只负责取背景封面：接口失败/结构异常都保留兜底图，
 * 真正播放由播放器 store 的 playFm 负责（它有完整的失败回退逻辑）。
 */
const loadFmCover = async () => {
  try {
    const res = await personFmApi()
    const list = Array.isArray(res?.data) ? res.data : []
    const first = list[0]
    // 私人 FM 同时存在新旧两种歌曲结构：album.picUrl（新）与 al.picUrl（旧）
    const legacyPicUrl = (
      first as { al?: { picUrl?: unknown } } | undefined
    )?.al?.picUrl
    const picUrl = first?.album?.picUrl ?? legacyPicUrl
    if (typeof picUrl === 'string' && picUrl) bgImg.value = picUrl
  } catch {
    bgImg.value = FALLBACK_BG
  }
}

const handlePlayFm = () => {
  void playerStore.playFm()
}

onMounted(() => {
  void loadFmCover()
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
  background-color: var(--color-image-mask);
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
