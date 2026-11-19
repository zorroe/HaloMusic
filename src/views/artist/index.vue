<template>
  <div
    v-if="!loaded && !loadFailed"
    class="flex flex-col items-center justify-center gap-4 py-40 text-gray-400">
    <div class="page-spinner"></div>
    <div class="text-base">正在加载歌手…</div>
  </div>
  <div
    v-else-if="loadFailed"
    class="flex flex-col items-center justify-center gap-4 py-40">
    <div class="text-xl font-bold">歌手信息加载失败</div>
    <div class="text-base text-gray-500">可能是网络异常或歌手不存在</div>
    <ea-button
      type="primary"
      @click="loadAll">
      <div class="text-base font-bold">重新加载</div>
    </ea-button>
  </div>
  <div
    v-else
    class="flex flex-col w-full px-4 h-64 gap-8 my-4">
    <div class="flex my-4 gap-4">
      <lmg
        :src="artistInfo?.artist?.cover"
        :width="300"
        :height="300"
        class="w-56 h-56 rounded-full"></lmg>
      <div class="flex flex-col gap-4 truncate pl-6 w-full">
        <div class="font-bold text-3xl">{{ artistInfo?.artist?.name }}</div>
        <div class="text-base text-gray-800">
          {{ artistInfo?.identify?.imageDesc }}
        </div>
        <div class="text-sm text-gray-800">
          {{
            `${artistInfo?.artist?.musicSize ?? 0}首歌 · ${
              artistInfo?.artist?.albumSize ?? 0
            }张专辑 · ${artistInfo?.artist?.mvSize ?? 0}首MV`
          }}
        </div>
        <label
          for="artist-desc"
          class="artist-desc"
          >{{ artistInfo?.artist?.briefDesc }}</label
        >
        <div class="flex flex-grow gap-4 items-end">
          <ea-button @click="handlePlayAll">
            <icon-park
              :icon="PlayOne"
              theme="filled"
              :size="20"
              class="rounded-full p-1" />
            <div class="text-lg font-bold">播放</div>
          </ea-button>
          <ea-button @click="starArtist">
            <icon-park
              :icon="Like"
              :theme="isStarArtist ? 'filled' : 'outline'"
              :size="20"
              class="rounded-full p-1" />
            <div class="text-lg font-bold">
              {{ isStarArtist ? '已关注' : '关注' }}
            </div>
          </ea-button>
          <ea-button
            type="info"
            title="在浏览器中打开"
            @click="handleOpenInBrowser">
            <icon-park
              :icon="BrowserSafari"
              theme="filled"
              :size="20"
              class="rounded-full p-1" />
          </ea-button>
        </div>
      </div>
    </div>
    <div>
      <div class="flex justify-between items-center pr-2">
        <div class="text-lv1">热门歌曲</div>
        <div
          class="ea-link text-xs font-bold"
          @click="routeTo('/artistTracks/' + artistId)">
          查看全部
        </div>
      </div>
      <music-table :data="artistHotSongs"></music-table>
    </div>
    <div>
      <div class="text-lv1">专辑</div>
      <div class="grid-cols-5 grid place-items-center gap-4">
        <album-cover
          v-for="item in artistHotAlbums"
          :key="item.id"
          :data="item"></album-cover>
      </div>
    </div>
    <div>
      <div class="text-lv1">MV</div>
      <div class="grid-cols-4 grid place-items-center gap-4">
        <mv-cover
          v-for="item in artistHotMvs"
          :key="item.id"
          :data="item"></mv-cover>
      </div>
    </div>
    <ea-modal
      id="artist-desc"
      :showBtn="false">
      <div class="text-base whitespace-pre-wrap">
        {{ artistInfo?.artist?.briefDesc }}
      </div>
    </ea-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { BrowserSafari, Like, PlayOne } from '@icon-park/vue-next'
import { useLocalStorage } from '@vueuse/core'
import {
  getArtistAlbumApi,
  getArtistDetailApi,
  getArtistMvApi,
  getSongsByArtistIdApi,
  playAllByArtistId as playAllSongsByArtistId,
  subArtistApi,
} from '@/api/artist'
import { getMusicDetailApi } from '@/api/music'
import type { ArtistBaseInfo, ArtistInfo } from '@/types/artistRel'
import type { AlbumBaseInfo } from '@/types/albumRel'
import type { MvBaseInfo } from '@/types/mvRel'
import type { MusicBaseInfo } from '@/types/musicRel'
import { openUrl, routeTo } from '@/utils/common'
import notify from '@/components/common/notification/notify'
import {
  mapAlbum,
  mapSong,
  normalizeImageUrl,
} from '@/views/shared/mappers'

defineOptions({
  name: 'artist',
})

const route = useRoute()

const artistId = computed(() => String(route.params.id ?? ''))
const loaded = ref(false)
const loadFailed = ref(false)
const artistInfo = ref<ArtistInfo>()
const artistHotSongs = ref<MusicBaseInfo[]>([])
const artistHotAlbums = ref<AlbumBaseInfo[]>([])
const artistHotMvs = ref<MvBaseInfo[]>([])
const artistSubList = useLocalStorage<ArtistBaseInfo[]>('artistSubList', [])

const isStarArtist = computed(() =>
  artistSubList.value.some(item => String(item.id) === artistId.value)
)

const getArtistDetail = async () => {
  const { data } = await getArtistDetailApi({ id: artistId.value })
  artistInfo.value = data
}

const getHotSongsByArtistId = async () => {
  const { songs } = await getSongsByArtistIdApi({
    id: artistId.value,
    limit: 5,
  })
  const ids = (songs ?? []).map(song => song.id)
  if (!ids.length) {
    artistHotSongs.value = []
    return
  }
  const { songs: detailSongs } = await getMusicDetailApi({
    ids: ids.join(','),
  })
  artistHotSongs.value = (detailSongs ?? []).map(mapSong)
}

const getAlbumsByArtistId = async () => {
  const { hotAlbums } = await getArtistAlbumApi({
    id: artistId.value,
    limit: 10,
  })
  artistHotAlbums.value = (hotAlbums ?? []).map(mapAlbum)
}

const getMvsByArtistId = async () => {
  const { mvs } = await getArtistMvApi({ id: artistId.value, limit: 8 })
  artistHotMvs.value = (mvs ?? []).map(mv => ({
    ...mv,
    picUrl: normalizeImageUrl(mv.picUrl),
  }))
}

/** 歌手详情 / 热门歌曲 / 专辑 / MV 四路并行 */
const loadAll = async () => {
  loaded.value = false
  loadFailed.value = false
  try {
    await Promise.allSettled([
      getArtistDetail(),
      getHotSongsByArtistId(),
      getAlbumsByArtistId(),
      getMvsByArtistId(),
    ])
    loaded.value = true
    loadFailed.value = !artistInfo.value
  } catch (error) {
    console.error('[HaloMusic] load artist failed:', error)
    loadFailed.value = true
  }
}

const handlePlayAll = () => {
  playAllSongsByArtistId(Number(artistId.value)).catch((error: unknown) => {
    console.error('[HaloMusic] play artist songs failed:', error)
    notify({ message: '播放失败，请稍后重试', type: 'error' })
  })
}

const handleOpenInBrowser = () => {
  openUrl(`https://music.163.com/#/artist?id=${artistId.value}`)
}

const starArtist = async () => {
  const target = isStarArtist.value ? 2 : 1
  try {
    const res = await subArtistApi(artistId.value, target)
    if (res.code !== 200) {
      notify({ message: '关注操作失败', type: 'warning' })
      return
    }
    if (target === 2) {
      artistSubList.value = artistSubList.value.filter(
        item => String(item.id) !== artistId.value
      )
    } else {
      artistSubList.value = [
        ...artistSubList.value,
        {
          id: Number(artistId.value),
          name: artistInfo.value?.artist?.name ?? '',
          picUrl: normalizeImageUrl(artistInfo.value?.artist?.cover),
        },
      ]
    }
    notify({
      message: target === 1 ? '关注成功' : '已取消关注',
      type: 'success',
    })
  } catch (error) {
    console.error('[HaloMusic] star artist failed:', error)
    notify({ message: '关注操作失败，请稍后重试', type: 'error' })
  }
}

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

.artist-desc {
  user-select: none;
  font-size: 14px;
  opacity: 0.68;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  cursor: pointer;
  white-space: normal;
}

.artist-desc:hover {
  transition: opacity 0.3s;
  opacity: 0.88;
}
</style>
