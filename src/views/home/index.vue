<template>
  <div
    v-show="loaded"
    class="flex flex-col">
    <div class="text-lv1">推荐歌单</div>
    <div class="grid-cols-5 grid place-content-between gap-8 my-8">
      <play-list-cover
        v-for="item in recommendPlayList.slice(0, 10)"
        :data="item"></play-list-cover>
    </div>
    <div class="flex h-48 gap-8">
      <div
        class="flex items-end rounded-2xl w-1/2 relative overflow-hidden"
        @click="routeTo('/recommendMusic')">
        <img
          :src="recommendBg"
          class="recommend" />
        <div id="mask"></div>
        <div class="ml-4 mb-4 text-7xl w-48 font-bold text-white z-50">
          每日推荐
        </div>
        <div class="flex-1"></div>
        <icon-park
          :icon="PlayOne"
          fill="white"
          theme="filled"
          :size="24"
          @click="handlePlayMultiRecommend"
          class="mr-4 mb-4 p-2 z-50 rounded-full transition-all text-white bg-white bg-opacity-20 hover:bg-opacity-40 active:scale-90"></icon-park>
      </div>
      <person-fm class="w-1/2"></person-fm>
    </div>
    <div class="text-lv1">推荐歌手</div>
    <div class="grid-cols-6 grid place-content-between gap-3">
      <artist-cover
        v-for="item in recommendArtist"
        :data="item"></artist-cover>
    </div>
    <div class="text-lv1">新专速递</div>
    <div class="grid-cols-5 grid place-content-between gap-4">
      <album-cover
        v-for="item in albumNewest"
        :data="item"></album-cover>
    </div>
    <div class="text-lv1">排行榜</div>
    <div class="grid-cols-5 grid place-content-between gap-4">
      <top-list-cover
        v-for="item in topList"
        :data="item"></top-list-cover>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getNewAlbumApi } from '@/api/album'
import { getrecommendArtistApi } from '@/api/artist'
import { getrecommendPlayListApi, getTopListApi } from '@/api/playList'
import { AlbumBaseInfo } from '@/types/albumRel'
import { ArtistBaseInfo } from '@/types/artistRel'
import { PlayListBaseInfo } from '@/types/playListRel'
import { computed, onMounted, ref } from 'vue'
import { routeTo, saveLikeMusicIds, saveSubAlbumIds } from '@/utils/common'
import { getRecommendSongsApi } from '@/api/music'
import { MusicBaseInfo } from '@/types/musicRel'
import dayjs from 'dayjs'
import { PlayOne } from '@icon-park/vue-next'
import { usePlayerStore } from '@/store'
import pinia from '@/store/store'

const playerStore = usePlayerStore(pinia)

defineOptions({
  name: 'home',
})

const loaded = ref(false)
const recommendPlayList = ref<PlayListBaseInfo[]>([])
const recommendArtist = ref<ArtistBaseInfo[]>([])
const albumNewest = ref<AlbumBaseInfo[]>([])
const topList = ref<PlayListBaseInfo[]>([])
const recommendSongList = ref<MusicBaseInfo[]>([])

const recommendBg = ref('')

const getRecommendPlayList = async () => {
  const { recommend } = await getrecommendPlayListApi()

  recommend.forEach((item: any) => {
    recommendPlayList.value.push({
      id: item.id,
      name: item.name,
      picUrl: item.picUrl,
      playCount: item.playcount,
    })
  })
}

const getrecommendArtist = async () => {
  const { list } = await getrecommendArtistApi()
  // 随机6个
  list.artists.sort(() => Math.random() - 0.5)
  list.artists.splice(0, 6).forEach((item: any) => {
    recommendArtist.value.push({
      id: item.id,
      name: item.name,
      picUrl: item.picUrl,
    })
  })
}

const getAlbumNewest = async () => {
  const { albums } = await getNewAlbumApi()
  albums.sort(() => Math.random() - 0.5)
  albums.splice(0, 10).forEach((item: any) => {
    albumNewest.value.push({
      id: item.id,
      name: item.name,
      picUrl: item.picUrl,
      artists: item.artists.map((item: any) => {
        return {
          id: item.id,
          name: item.name,
          picUrl: '',
        }
      }),
    })
  })
}

const getTopList = async () => {
  const { list } = await getTopListApi()
  list.splice(0, 5).forEach((item: any) => {
    topList.value.push({
      id: item.id,
      name: item.name,
      picUrl: item.coverImgUrl,
      playCount: item.playCount,
    })
  })
}

const getRecommendSongs = async () => {
  const { data } = await getRecommendSongsApi()
  data.dailySongs.forEach((item: any) => {
    recommendSongList.value.push({
      id: item.id,
      name: item.name,
      picUrl: item.al.picUrl,
      singers: item.ar.map((item: any) => {
        return {
          id: item.id,
          name: item.name,
          picUrl: '',
        }
      }),
      duration: dayjs(item.dt).format('mm:ss'),
      album: {
        id: item.al.id,
        name: item.al.name,
      },
    })
  })
  recommendBg.value = recommendSongList.value[0].picUrl
}

const handlePlayMultiRecommend = () => {
  const ids = recommendSongList.value.map(item => item.id)
  playerStore.playMulti(ids)
}

onMounted(async () => {
  await getRecommendPlayList()
  await getrecommendArtist()
  await getRecommendSongs()
  getTopList()
  getAlbumNewest()
  loaded.value = true
  setTimeout(() => {
    saveLikeMusicIds()
    saveSubAlbumIds()
  }, 0)
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
