<template>
  <div
    v-if="!loaded && !loadFailed"
    class="flex flex-col items-center justify-center gap-4 py-40 text-gray-400">
    <div class="page-spinner"></div>
    <div class="text-base">正在加载每日推荐…</div>
  </div>
  <div
    v-else-if="loadFailed"
    class="flex flex-col items-center justify-center gap-4 py-40">
    <div class="text-xl font-bold">每日推荐加载失败</div>
    <div class="text-base text-gray-500">请检查网络后重试</div>
    <ea-button
      type="primary"
      @click="getRecommendSongs">
      <div class="text-base font-bold">重新加载</div>
    </ea-button>
  </div>
  <template v-else>
    <div class="special-playlist">
      <div class="title gradient">每日歌曲推荐</div>
      <div class="subtitle">根据你的音乐口味生成 · 每天6:00更新</div>
    </div>
    <music-table :data="recommendSongList"></music-table>
  </template>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getRecommendSongsApi } from '@/api/music'
import type { MusicBaseInfo } from '@/types/musicRel'
import notify from '@/components/common/notification/notify'
import { mapSong } from '@/views/shared/mappers'

defineOptions({
  name: 'recommendMusic',
})

/* 每日推荐歌曲页面 */
const recommendSongList = ref<MusicBaseInfo[]>([])
const loaded = ref(false)
const loadFailed = ref(false)

const getRecommendSongs = async () => {
  loaded.value = false
  loadFailed.value = false
  try {
    const { data } = await getRecommendSongsApi()
    recommendSongList.value = (data?.dailySongs ?? []).map(mapSong)
    loaded.value = true
  } catch (error) {
    console.error('[HaloMusic] load recommend songs failed:', error)
    loadFailed.value = true
    notify({ message: '每日推荐加载失败，请稍后重试', type: 'error' })
  }
}

onMounted(getRecommendSongs)
</script>

<style scoped>
.page-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top-color: var(--color-primary, #335eea);
  border-radius: 50%;
  animation: page-spin 0.8s linear infinite;
}

@keyframes page-spin {
  to {
    transform: rotate(360deg);
  }
}

.special-playlist {
  margin-top: 192px;
  margin-bottom: 128px;
  border-radius: 1.25em;
  text-align: center;
}

@keyframes letterSpacing4 {
  from {
    letter-spacing: 0px;
  }

  to {
    letter-spacing: 4px;
  }
}

@keyframes letterSpacing1 {
  from {
    letter-spacing: 0px;
  }

  to {
    letter-spacing: 1px;
  }
}

.special-playlist .title {
  font-size: 84px;
  line-height: 1.05;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 4px;
  animation-duration: 0.8s;
  animation-name: letterSpacing4;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.special-playlist .subtitle {
  font-size: 18px;
  letter-spacing: 1px;
  margin: 28px 0 54px 0;
  animation-duration: 0.8s;
  animation-name: letterSpacing1;
  text-transform: uppercase;
  color: var(--color-text);
}

.gradient {
  background: linear-gradient(to left, #dd2476, #ff512f);
}
</style>
