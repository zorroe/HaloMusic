<template>
  <div class="flex flex-col items-center">
    <div class="mv-player">
      <video
        v-if="src"
        class="mv-video"
        :src="src"
        :poster="cover"
        controls
        loop
        playsinline
        preload="metadata"
        @play="handlePlay"></video>
      <div
        v-else
        class="mv-placeholder">
        <div
          v-if="loading"
          class="mv-spinner"></div>
        <template v-else>
          <div class="text-base font-bold">视频加载失败</div>
          <div class="text-sm text-gray-400">
            可能是版权限制或网络异常
          </div>
          <ea-button
            type="primary"
            @click="loadMv">
            <div class="text-base font-bold">重新加载</div>
          </ea-button>
        </template>
      </div>
    </div>
    <div class="w-full flex justify-center mt-4">
      <div class="detail">
        <div class="text-xl font-semibold">{{ mvData?.name }}</div>
        <div class="flex items-center gap-2 mt-2">
          <div class="flex">
            <lmg
              v-for="artist in mvData?.artists"
              :key="artist.id"
              :src="artist.img1v1Url"
              :width="200"
              :height="200"
              class="w-12 h-12 rounded-full border-white border-2 cursor-pointer"
              @click="routeTo(`/artist/${artist.id}`)"></lmg>
          </div>
          <div class="flex items-center gap-2">
            <div
              v-for="artist in mvData?.artists"
              :key="`name-${artist.id}`"
              class="text-gray-600 text-sm font-light ea-link"
              @click="routeTo(`/artist/${artist.id}`)">
              {{ artist.name }}
            </div>
          </div>
          <div class="flex flex-grow justify-end">
            <icon-park
              :icon="Share"
              :size="18"
              title="在浏览器中打开"
              @click="handleShare"
              class="cursor-pointer p-2 hover:bg-gray-200 transition-all duration-300 rounded-full"></icon-park>
          </div>
        </div>
        <div
          v-if="publishDate"
          class="text-sm text-gray-500 mt-2">
          {{ publishDate }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Share } from '@icon-park/vue-next'
import dayjs from 'dayjs'
import { mvDetailApi, mvUrlApi } from './index'
import type { MvBr, MvData } from './index'
import router from '@/router'
import { openUrl, routeTo } from '@/utils/common'
import { usePlayerStore } from '@/store/playerStore'
import pinia from '@/store/store'

defineOptions({
  name: 'mv',
})

const playerStore = usePlayerStore(pinia)

const mvId = ref<string>('')
const cover = ref<string>('')
const brs = ref<MvBr[]>([])
const src = ref<string>('')
/** 视频码率（清晰度），与原实现保持一致 */
const quality = ref<number>(1080)
const mvData = ref<MvData>()
const loading = ref(true)

const publishDate = computed(() => {
  const time = mvData.value?.publishTime
  if (!time) return ''
  return `发行时间：${dayjs(time).format('YYYY-MM-DD')}`
})

const loadMv = async () => {
  if (!mvId.value) return
  loading.value = true
  src.value = ''
  const [detailResult, urlResult] = await Promise.allSettled([
    mvDetailApi({ mvid: mvId.value }),
    mvUrlApi({ id: mvId.value, r: quality.value }),
  ])

  if (detailResult.status === 'fulfilled') {
    const data = detailResult.value?.data
    mvData.value = data
    cover.value = data?.cover ?? ''
    brs.value = data?.brs ?? []
  } else {
    console.error('[HaloMusic] load mv detail failed:', detailResult.reason)
  }

  if (urlResult.status === 'fulfilled') {
    src.value = urlResult.value?.data?.url ?? ''
  } else {
    console.error('[HaloMusic] load mv url failed:', urlResult.reason)
  }

  loading.value = false
}

/** 视频开始播放时暂停正在播放的音频 */
const handlePlay = () => {
  playerStore.setPause()
}

const handleShare = () => {
  if (!mvData.value?.id) return
  openUrl(`https://music.163.com/#/mv?id=${mvData.value.id}`)
}

onMounted(() => {
  mvId.value = router.currentRoute.value.params.id as string
  loadMv()
})
</script>

<style scoped>
.mv-player {
  width: 900px;
  max-width: 100%;
  height: 480px;
  border-radius: 8px;
  overflow: hidden;
  background-color: #000000;
}

.mv-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background-color: #000000;
}

.mv-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  height: 100%;
  color: #d1d5db;
}

.mv-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: mv-spin 0.8s linear infinite;
}

@keyframes mv-spin {
  to {
    transform: rotate(360deg);
  }
}

.detail {
  width: 900px;
  max-width: 100%;
}
</style>
