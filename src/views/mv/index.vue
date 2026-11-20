<template>
  <div class="flex flex-col items-center">
    <!-- 加载骨架：播放器占位 + 详情行 -->
    <template v-if="loading">
      <div
        class="mv-player"
        aria-busy="true">
        <ea-skeleton
          variant="rect"
          width="100%"
          height="100%"
          radius="8px" />
      </div>
      <div class="w-full flex justify-center mt-4">
        <div class="detail flex flex-col gap-3">
          <ea-skeleton
            variant="rect"
            width="18rem"
            height="28px" />
          <div class="flex items-center gap-2">
            <ea-skeleton
              variant="circle"
              :width="48"
              :height="48" />
            <ea-skeleton
              variant="circle"
              :width="48"
              :height="48" />
            <ea-skeleton
              variant="circle"
              :width="48"
              :height="48" />
          </div>
          <ea-skeleton
            variant="text"
            width="8rem" />
        </div>
      </div>
    </template>
    <ea-empty
      v-else-if="loadFailed"
      title="视频加载失败"
      description="可能是版权限制或网络异常"
      action-text="重新加载"
      @action="loadMv" />
    <template v-else>
      <div class="mv-player">
        <video
          class="mv-video"
          :src="src"
          :poster="cover"
          controls
          loop
          playsinline
          preload="metadata"
          @play="handlePlay"></video>
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
          <ea-empty
            v-if="!mvData"
            compact
            title="暂无视频信息" />
        </div>
      </div>
    </template>
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
/** 详情/播放地址请求失败或没有可播放地址时进入可重试错误态 */
const loadFailed = ref(false)

const publishDate = computed(() => {
  const time = mvData.value?.publishTime
  if (!time) return ''
  return `发行时间：${dayjs(time).format('YYYY-MM-DD')}`
})

const loadMv = async () => {
  if (!mvId.value) {
    loading.value = false
    loadFailed.value = true
    return
  }
  loading.value = true
  loadFailed.value = false
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
  loadFailed.value = !src.value
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

.detail {
  width: 900px;
  max-width: 100%;
}
</style>
