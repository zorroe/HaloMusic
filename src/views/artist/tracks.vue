<template>
  <div
    v-if="!loaded && !loadFailed"
    class="flex flex-col items-center justify-center gap-4 py-40 text-gray-400">
    <div class="page-spinner"></div>
    <div class="text-base">正在加载歌手歌曲…</div>
  </div>
  <div
    v-else-if="loadFailed"
    class="flex flex-col items-center justify-center gap-4 py-40">
    <div class="text-xl font-bold">歌曲列表加载失败</div>
    <div class="text-base text-gray-500">请检查网络后重试</div>
    <ea-button
      type="primary"
      @click="loadAll">
      <div class="text-base font-bold">重新加载</div>
    </ea-button>
  </div>
  <div
    v-else
    class="flex flex-col w-full gap-4">
    <div class="flex items-baseline justify-between gap-4">
      <div class="text-lv1 !my-2">
        {{ artistName ? `${artistName}的全部歌曲` : '全部歌曲' }}
      </div>
      <div class="text-sm text-gray-500">共 {{ total }} 首</div>
    </div>
    <music-table :data="tracks"></music-table>
    <div
      v-if="totalPage > 1"
      class="w-full inline-flex justify-center items-center gap-3 py-4">
      <button
        type="button"
        class="page-btn"
        :class="{ 'page-btn--disabled': currentPage === 1 }"
        :disabled="currentPage === 1"
        aria-label="上一页"
        @click="prePage">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-3 w-3"
          viewBox="0 0 20 20"
          fill="currentColor">
          <path
            fill-rule="evenodd"
            d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
            clip-rule="evenodd" />
        </svg>
      </button>
      <p class="text-xs text-gray-900">
        {{ currentPage }}
        <span class="mx-1">/</span>
        {{ totalPage }}
      </p>
      <button
        type="button"
        class="page-btn"
        :class="{ 'page-btn--disabled': currentPage === totalPage }"
        :disabled="currentPage === totalPage"
        aria-label="下一页"
        @click="nextPage">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-3 w-3"
          viewBox="0 0 20 20"
          fill="currentColor">
          <path
            fill-rule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            clip-rule="evenodd" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getArtistDetailApi, getSongsByArtistIdApi } from '@/api/artist'
import type { MusicBaseInfo } from '@/types/musicRel'
import notify from '@/components/common/notification/notify'
import { mapSong } from '@/views/shared/mappers'

defineOptions({
  name: 'artistTrack',
})

const route = useRoute()

const PAGE_SIZE = 50

const artistId = computed(() => String(route.params.id ?? ''))
const artistName = ref('')
const tracks = ref<MusicBaseInfo[]>([])
const total = ref(0)
const currentPage = ref(1)
const loaded = ref(false)
const loadFailed = ref(false)
const loadingPage = ref(false)

const totalPage = computed(() =>
  Math.max(1, Math.ceil(total.value / PAGE_SIZE))
)

const getArtistInfo = async () => {
  const { data } = await getArtistDetailApi({ id: artistId.value })
  artistName.value = data?.artist?.name ?? ''
}

const getAllTracks = async () => {
  const { songs, total: count } = await getSongsByArtistIdApi({
    id: artistId.value,
    limit: PAGE_SIZE,
    offset: (currentPage.value - 1) * PAGE_SIZE,
  })
  tracks.value = (songs ?? []).map(mapSong)
  total.value = typeof count === 'number' ? count : tracks.value.length
}

const loadAll = async () => {
  loaded.value = false
  loadFailed.value = false
  try {
    await Promise.all([getArtistInfo(), getAllTracks()])
    loaded.value = true
  } catch (error) {
    console.error('[HaloMusic] load artist tracks failed:', error)
    loadFailed.value = true
    notify({ message: '歌曲列表加载失败，请稍后重试', type: 'error' })
  }
}

const changePage = async (page: number) => {
  if (loadingPage.value) return
  const next = Math.min(Math.max(1, page), totalPage.value)
  if (next === currentPage.value) return
  loadingPage.value = true
  currentPage.value = next
  try {
    await getAllTracks()
  } catch (error) {
    console.error('[HaloMusic] load tracks page failed:', error)
    notify({ message: '翻页失败，请稍后重试', type: 'error' })
  } finally {
    loadingPage.value = false
  }
}

const prePage = () => {
  void changePage(currentPage.value - 1)
}

const nextPage = () => {
  void changePage(currentPage.value + 1)
}

// 该页被 keep-alive 缓存，切换到另一个歌手时仅 params 变化，需要重新拉取
watch(artistId, () => {
  currentPage.value = 1
  loadAll()
})

onMounted(loadAll)
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

.page-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid #f3f4f6;
  border-radius: 4px;
  background-color: #ffffff;
  color: #111827;
  cursor: pointer;
  transition: all 300ms;
}

.page-btn:hover:not(.page-btn--disabled) {
  background-color: #e5e7eb;
}

.page-btn--disabled {
  color: #d1d5db;
  cursor: not-allowed;
}
</style>
