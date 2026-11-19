<template>
  <div
    v-if="!loaded && !loadFailed"
    class="flex flex-col items-center justify-center gap-4 py-40 text-gray-400">
    <div class="page-spinner"></div>
    <div class="text-base">正在加载专辑…</div>
  </div>
  <div
    v-else-if="loadFailed"
    class="flex flex-col items-center justify-center gap-4 py-40">
    <div class="text-xl font-bold">专辑加载失败</div>
    <div class="text-base text-gray-500">可能是网络异常或专辑不存在</div>
    <ea-button
      type="primary"
      @click="getAlbum">
      <div class="text-base font-bold">重新加载</div>
    </ea-button>
  </div>
  <div
    v-else
    class="flex flex-col w-full px-4 h-64 gap-8">
    <div class="flex my-4 gap-8">
      <lmg
        :src="albumInfo?.picUrl"
        :width="300"
        :height="300"
        class="rounded-xl w-48 h-48 shadow"></lmg>
      <div class="flex flex-col gap-2">
        <div class="font-bold text-3xl">{{ albumInfo?.name }}</div>
        <div>
          Singer by
          <span
            class="ea-link"
            @click="routeTo(`/artist/${albumInfo?.artist?.id}`)"
            >{{ albumInfo?.artist?.name }}</span
          >
        </div>
        <div class="text-sm">
          {{ albumMeta }}
        </div>
        <div class="flex flex-grow gap-4 items-end">
          <ea-button @click="playMusicByAlbumId">
            <icon-park
              :icon="PlayOne"
              theme="filled"
              :size="20"
              class="rounded-full p-1" />
            <div class="text-lg font-bold">播放</div>
          </ea-button>
          <ea-button :title="isSub ? '已收藏' : '未收藏'">
            <icon-park
              :icon="Like"
              :theme="isSub ? 'filled' : 'outline'"
              :size="20"
              class="rounded-full p-1" />
          </ea-button>
        </div>
      </div>
    </div>
    <music-table
      :data="albumSongs"
      :showCover="false"></music-table>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import dayjs from 'dayjs'
import { Like, PlayOne } from '@icon-park/vue-next'
import { getAlbumApi } from '@/api/album'
import type { AlbumInfo } from '@/types/albumRel'
import type { MusicBaseInfo } from '@/types/musicRel'
import { routeTo } from '@/utils/common'
import { usePlayerStore } from '@/store/playerStore'
import pinia from '@/store/store'
import notify from '@/components/common/notification/notify'
import { mapSong } from '@/views/shared/mappers'

defineOptions({
  name: 'album',
})

const route = useRoute()
const playerStore = usePlayerStore(pinia)

const loaded = ref(false)
const loadFailed = ref(false)
const albumId = computed(() => String(route.params.id ?? ''))
const albumSongs = ref<MusicBaseInfo[]>([])
const albumInfo = ref<AlbumInfo>()

const readSubAlbumIds = (): number[] => {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem('subAlbumIds') || '[]'
    )
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(item => Number(item))
      .filter(id => Number.isFinite(id))
  } catch {
    return []
  }
}

const subAlbumIds = ref<number[]>(readSubAlbumIds())

const isSub = computed(() =>
  subAlbumIds.value.some(id => id === albumInfo.value?.id)
)

const albumMeta = computed(() => {
  const album = albumInfo.value
  if (!album) return ''
  const year =
    album.publishTime && Number.isFinite(album.publishTime)
      ? dayjs(album.publishTime).format('YYYY')
      : ''
  const size = `${album.size}首歌`
  return year ? `${year} · ${size}` : size
})

const getAlbum = async () => {
  loaded.value = false
  loadFailed.value = false
  try {
    const { songs, album } = await getAlbumApi({ id: albumId.value })
    albumInfo.value = album
    albumSongs.value = (songs ?? []).map(mapSong)
    loaded.value = true
  } catch (error) {
    console.error('[HaloMusic] load album failed:', error)
    loadFailed.value = true
    notify({ message: '专辑加载失败，请稍后重试', type: 'error' })
  }
}

const playMusicByAlbumId = () => {
  const ids = albumSongs.value.map(item => item.id)
  if (!ids.length) {
    notify({ message: '专辑里还没有歌曲', type: 'warning' })
    return
  }
  playerStore.playMulti(ids.join(','))
}

onMounted(getAlbum)
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
</style>
