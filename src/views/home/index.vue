<template>
  <!-- 加载骨架：尺寸与真实首页一一对应，避免内容就绪后大幅跳动 -->
  <div
    v-if="loading"
    class="flex flex-col"
    aria-busy="true">
    <ea-skeleton
      variant="rect"
      width="7rem"
      height="32px"
      class="my-4" />
    <div class="grid grid-cols-5 gap-8 mb-8">
      <ea-skeleton
        v-for="index in 10"
        :key="`skeleton-playlist-${index}`"
        variant="card"
        width="12rem" />
    </div>
    <div class="flex gap-8 mb-8">
      <div
        v-for="index in 2"
        :key="`skeleton-banner-${index}`"
        class="w-1/2">
        <ea-skeleton
          variant="rect"
          height="12rem"
          radius="16px" />
      </div>
    </div>
    <ea-skeleton
      variant="rect"
      width="7rem"
      height="32px"
      class="my-4" />
    <div class="grid grid-cols-6 gap-3">
      <div
        v-for="index in 6"
        :key="`skeleton-artist-${index}`"
        class="flex flex-col items-center gap-2">
        <ea-skeleton
          variant="circle"
          :width="160"
          :height="160" />
        <ea-skeleton
          variant="text"
          width="6rem" />
      </div>
    </div>
    <ea-skeleton
      variant="rect"
      width="7rem"
      height="32px"
      class="my-4" />
    <div class="grid grid-cols-5 gap-4">
      <ea-skeleton
        v-for="index in 10"
        :key="`skeleton-album-${index}`"
        variant="card"
        width="12rem" />
    </div>
    <ea-skeleton
      variant="rect"
      width="7rem"
      height="32px"
      class="my-4" />
    <div class="grid grid-cols-5 gap-4">
      <ea-skeleton
        v-for="index in 5"
        :key="`skeleton-toplist-${index}`"
        variant="card"
        width="12rem" />
    </div>
  </div>
  <ea-empty
    v-else-if="failedAll"
    title="首页加载失败"
    description="请检查网络后重试"
    action-text="重新加载"
    @action="loadAll" />
  <ea-empty
    v-else-if="nothingToShow"
    title="暂时没有推荐内容"
    description="稍后再来看看吧" />
  <div
    v-else
    class="flex flex-col">
    <div class="text-lv1">推荐歌单</div>
    <div class="grid-cols-5 grid place-content-between gap-8 mb-8">
      <play-list-cover
        v-for="item in recommendPlayList"
        :key="item.id"
        :data="item"></play-list-cover>
    </div>
    <div class="flex h-48 gap-8">
      <div
        class="flex items-end rounded-2xl w-1/2 relative overflow-hidden cursor-pointer"
        @click="routeTo('/recommendMusic')">
        <img
          v-if="recommendBg"
          :src="recommendBg"
          class="recommend"
          alt="" />
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
          title="播放每日推荐"
          @click="handlePlayMultiRecommend"
          class="mr-4 mb-4 p-2 z-50 rounded-full transition-all text-white bg-white/20 hover:bg-white/40 active:scale-90"></icon-park>
      </div>
      <person-fm class="w-1/2"></person-fm>
    </div>
    <div class="text-lv1">推荐歌手</div>
    <div class="grid-cols-6 grid place-content-between gap-3">
      <artist-cover
        v-for="item in recommendArtist"
        :key="item.id"
        :data="item"></artist-cover>
    </div>
    <div class="text-lv1">新专速递</div>
    <div class="grid-cols-5 grid place-content-between gap-4">
      <album-cover
        v-for="item in albumNewest"
        :key="item.id"
        :data="item"></album-cover>
    </div>
    <div class="text-lv1">排行榜</div>
    <div class="grid-cols-5 grid place-content-between gap-4">
      <top-list-cover
        v-for="item in topList"
        :key="item.id"
        :data="item"></top-list-cover>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { PlayOne } from '@icon-park/vue-next'
import { getNewAlbumApi } from '@/api/album'
import { getrecommendArtistApi } from '@/api/artist'
import { getrecommendPlayListApi, getTopListApi } from '@/api/playList'
import { getRecommendSongsApi } from '@/api/music'
import type { AlbumBaseInfo } from '@/types/albumRel'
import type { ArtistBaseInfo } from '@/types/artistRel'
import type { PlayListBaseInfo } from '@/types/playListRel'
import type { MusicBaseInfo } from '@/types/musicRel'
import {
  handleRequestError,
  routeTo,
  saveLikeMusicIds,
  saveSubAlbumIds,
} from '@/utils/common'
import { isCanceledError } from '@/utils/request'
import { usePlayerStore } from '@/store/playerStore'
import pinia from '@/store/store'
import notify from '@/components/common/notification/notify'
import {
  mapAlbum,
  mapArtist,
  mapPlayList,
  mapSong,
  randomSlice,
} from '@/views/shared/mappers'

defineOptions({
  name: 'home',
})

const playerStore = usePlayerStore(pinia)

const loading = ref(true)
const failedAll = ref(false)
const recommendPlayList = ref<PlayListBaseInfo[]>([])
const recommendArtist = ref<ArtistBaseInfo[]>([])
const albumNewest = ref<AlbumBaseInfo[]>([])
const topList = ref<PlayListBaseInfo[]>([])
const recommendSongList = ref<MusicBaseInfo[]>([])
const recommendBg = ref('')

/** 所有模块都请求成功但内容为空时给一个明确空态，避免只剩标题的空白页 */
const nothingToShow = computed(
  () =>
    !recommendPlayList.value.length &&
    !recommendArtist.value.length &&
    !albumNewest.value.length &&
    !topList.value.length &&
    !recommendSongList.value.length
)

const loadRecommendPlayList = async () => {
  const { recommend } = await getrecommendPlayListApi()
  recommendPlayList.value = (recommend ?? [])
    .slice(0, 10)
    .map(mapPlayList)
}

const loadRecommendArtist = async () => {
  const { list } = await getrecommendArtistApi()
  recommendArtist.value = randomSlice(list?.artists ?? [], 6).map(mapArtist)
}

const loadAlbumNewest = async () => {
  const { albums } = await getNewAlbumApi()
  albumNewest.value = randomSlice(albums ?? [], 10).map(mapAlbum)
}

const loadTopList = async () => {
  const { list } = await getTopListApi()
  topList.value = (list ?? []).slice(0, 5).map(mapPlayList)
}

const loadRecommendSongs = async () => {
  const { data } = await getRecommendSongsApi()
  const dailySongs = data?.dailySongs ?? []
  recommendSongList.value = dailySongs.map(mapSong)
  recommendBg.value = recommendSongList.value[0]?.picUrl ?? ''
}

/** 五个模块并行请求：任意一个失败都不影响其它模块渲染 */
const loadAll = async () => {
  loading.value = true
  failedAll.value = false
  const tasks = [
    loadRecommendPlayList(),
    loadRecommendArtist(),
    loadAlbumNewest(),
    loadTopList(),
    loadRecommendSongs(),
  ]
  const results = await Promise.allSettled(tasks)
  const rejected = results.filter(
    (item): item is PromiseRejectedResult => item.status === 'rejected'
  )
  if (rejected.length) {
    rejected.forEach(item => {
      console.error('[HaloMusic] home request failed:', item.reason)
    })
    // 切页会取消在途请求：这属于正常控制流，不算加载失败、不提示
    const failed = rejected.filter(item => !isCanceledError(item.reason))
    if (rejected.length === tasks.length) {
      failedAll.value = true
    } else if (failed.length) {
      handleRequestError(
        failed[0]?.reason,
        `部分内容加载失败（${failed.length}/${tasks.length}）`
      )
    }
  }
  loading.value = false

  // 喜欢列表 / 订阅专辑 id 不影响首屏，放到最后异步刷新
  Promise.allSettled([saveLikeMusicIds(), saveSubAlbumIds()]).then(items => {
    items.forEach(item => {
      if (item.status === 'rejected') {
        console.error('[HaloMusic] sync user data failed:', item.reason)
      }
    })
  })
}

const handlePlayMultiRecommend = (event: Event) => {
  event.stopPropagation()
  const ids = recommendSongList.value.map(item => item.id)
  if (!ids.length) {
    notify({ message: '每日推荐还没准备好', type: 'warning' })
    return
  }
  playerStore.playMulti(ids.join(','))
}

onMounted(loadAll)
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
