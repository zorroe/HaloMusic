<template>
  <div
    v-if="loaded"
    class="flex flex-col w-full px-4 h-64 gap-8 my-4">
    <div class="flex my-4 gap-4">
      <lmg
        :src="artistInfo.artist.cover"
        :width="300"
        :height="300"
        class="w-56 h-56 rounded-full"></lmg>
      <div class="flex flex-col gap-4 truncate pl-6 w-full">
        <div class="font-bold text-3xl">{{ artistInfo.artist.name }}</div>
        <div class="text-base text-gray-800">
          {{ artistInfo.identify?.imageDesc }}
        </div>
        <div class="text-sm text-gray-800">
          {{
            `${artistInfo.artist.musicSize}首歌 · ${artistInfo.artist.albumSize}张专辑 · ${artistInfo.artist.mvSize}首MV`
          }}
        </div>
        <label
          for="artist-desc"
          class="artist-desc"
          >{{ artistInfo.artist.briefDesc }}</label
        >
        <div class="flex flex-grow gap-4 items-end">
          <ea-button @click="playAllByArtistId">
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
              theme="outline"
              :size="20"
              class="rounded-full p-1"
              v-if="!isStarArtist" />
            <icon-park
              :icon="Like"
              theme="filled"
              :size="20"
              class="rounded-full p-1"
              v-else />

            <div
              class="text-lg font-bold"
              v-if="!isStarArtist">
              关注
            </div>
            <div
              class="text-lg font-bold"
              v-else>
              已关注
            </div>
          </ea-button>
          <ea-button
            type="info"
            @click="
              openUrl(
                `https://music.163.com/#/artist?id=${artistInfo.artist.id}`
              )
            ">
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
          :data="item"></album-cover>
      </div>
    </div>
    <div>
      <div class="text-lv1">MV</div>
      <div class="grid-cols-4 grid place-items-center gap-4">
        <mv-cover
          v-for="item in artistHotMvs"
          :data="item"></mv-cover>
      </div>
    </div>
    <ea-modal
      id="artist-desc"
      :showBtn="false">
      <div class="text-base whitespace-pre-wrap">
        {{ artistInfo.artist.briefDesc }}
      </div>
    </ea-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import router from '@/router'
import { ArtistInfo } from '@/types/artistRel'
import {
  getArtistDetailApi,
  getSongsByArtistIdApi,
  getArtistAlbumApi,
  getArtistMvApi,
  subArtistApi,
} from '@/api/artist'
import { BrowserSafari, Like, PlayOne } from '@icon-park/vue-next'
import { openUrl } from '@/utils/common'
import { MusicBaseInfo } from '@/types/musicRel'
import dayjs from 'dayjs'
import { routeTo } from '@/utils/common'
import { getMusicDetailApi } from '@/api/music'
import { AlbumBaseInfo } from '@/types/albumRel'
import { MvBaseInfo } from '@/types/mvRel'
import { usePlayerStore } from '@/store/playerStore'
import pinia from '@/store/store'
import { useLocalStorage } from '@vueuse/core'

const playerStore = usePlayerStore(pinia)

defineOptions({
  name: 'artist',
})

const artistId = ref<string>('')

const artistInfo = ref<ArtistInfo>({} as ArtistInfo)
const loaded = ref(false)

const artistHotSongs = ref<MusicBaseInfo[]>([])
const artistHotAlbums = ref<AlbumBaseInfo[]>([])
const artistHotMvs = ref<MvBaseInfo[]>([])
const artistSubList = useLocalStorage<any>('artistSubList', [])

const isStarArtist = computed(() => {
  for (let index = 0; index < artistSubList.value.length; index++) {
    const element = artistSubList.value[index]
    if (element.id == artistId.value) {
      return true
    }
  }
  return false
})

const getArtistDetail = async () => {
  const { data } = await getArtistDetailApi({ id: artistId.value })
  artistInfo.value = data
}

const getHotSongsByArtistId = async () => {
  const { songs: s1s } = await getSongsByArtistIdApi({
    id: artistId.value,
    limit: 5,
  })
  const ids = s1s.map((song: any) => song.id)
  const { songs: s2s } = await getMusicDetailApi({ ids: ids.join(',') })
  s2s.forEach((song: any) => {
    artistHotSongs.value.push({
      id: song.id,
      name: song.name,
      picUrl: song.al.picUrl,
      singers: song.ar.map((singer: any) => {
        return {
          id: singer.id,
          name: singer.name,
        }
      }),
      duration: dayjs(song.dt).format('mm:ss'),
      album: {
        id: song.al.id,
        name: song.al.name,
      },
    })
  })
}

const getAlbumsByArtistId = async () => {
  const { hotAlbums } = await getArtistAlbumApi({
    id: artistId.value,
    limit: 10,
  })
  hotAlbums.forEach((album: any) => {
    artistHotAlbums.value.push({
      id: album.id,
      name: album.name,
      picUrl: album.picUrl,
      artists: album.artists.map((artist: any) => {
        return {
          id: artist.id,
          name: artist.name,
        }
      }),
    })
  })
}

const getMvsByArtistId = async () => {
  const { mvs } = await getArtistMvApi({ id: artistId.value, limit: 8 })
  mvs.forEach((mv: any) => {
    artistHotMvs.value.push({
      id: mv.id,
      name: mv.name,
      picUrl: mv.imgurl16v9,
      creators: [
        {
          id: mv.artist.id,
          name: mv.artist.name,
        },
      ],
    })
  })
}

const playAllByArtistId = async () => {
  const { songs: s1s } = await getSongsByArtistIdApi({
    id: artistId.value,
    limit: 999,
  })
  const ids = s1s.map((song: any) => song.id)
  playerStore.playMulti(ids.join(','))
}

const starArtist = async () => {
  const res = (await subArtistApi(
    artistId.value,
    isStarArtist.value ? 2 : 1
  )) as any
  if (res.code == 200 && res.message == 'success') {
    if (isStarArtist.value) {
      for (let index = 0; index < artistSubList.value.length; index++) {
        const element = artistSubList.value[index]
        if (element.id == artistId.value) {
          artistSubList.value.splice(index, 1)
        }
      }
    } else {
      artistSubList.value.push({
        id: artistId.value,
        name: artistInfo.value.artist.name,
        picUrl: artistInfo.value.artist.cover,
      })
    }
  }
}

onMounted(async () => {
  artistId.value = router.currentRoute.value.params.id as string
  await getArtistDetail()
  loaded.value = true
  getHotSongsByArtistId()
  getAlbumsByArtistId()
  getMvsByArtistId()
})
</script>

<style lang="scss" scoped>
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
  &:hover {
    transition: opacity 0.3s;
    opacity: 0.88;
  }
}
</style>
