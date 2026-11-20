<template>
  <!-- 加载骨架：封面 + 标题/歌手/元信息 + 与歌曲行高一致的列表 -->
  <div
    v-if="!loaded && !loadFailed"
    class="flex flex-col w-full px-4 gap-8"
    aria-busy="true">
    <div class="flex my-4 gap-8">
      <div class="w-48 flex-none">
        <ea-skeleton
          variant="rect"
          height="12rem"
          radius="12px" />
      </div>
      <div class="flex flex-col gap-2 flex-1 min-w-0 py-2">
        <ea-skeleton
          variant="rect"
          width="16rem"
          height="32px" />
        <ea-skeleton
          variant="text"
          width="10rem" />
        <ea-skeleton
          variant="text"
          width="6rem" />
        <div class="flex flex-grow gap-4 items-end pb-2">
          <ea-skeleton
            variant="rect"
            width="7rem"
            height="40px"
            radius="9999px" />
          <ea-skeleton
            variant="rect"
            :width="40"
            :height="40"
            radius="9999px" />
        </div>
      </div>
    </div>
    <div class="flex flex-col">
      <ea-skeleton
        v-for="index in 12"
        :key="`skeleton-album-track-${index}`"
        variant="row" />
    </div>
  </div>
  <ea-empty
    v-else-if="loadFailed"
    title="专辑加载失败"
    description="可能是网络异常或专辑不存在"
    action-text="重新加载"
    @action="getAlbum" />
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
      v-if="albumSongs.length"
      :data="albumSongs"
      :showCover="false"></music-table>
    <ea-empty
      v-else
      title="专辑里还没有歌曲"
      description="换个专辑听听吧" />
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
import { handleRequestError, routeTo } from '@/utils/common'
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
    handleRequestError(error, '专辑加载失败，请稍后重试')
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
