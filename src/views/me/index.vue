<template>
  <div
    v-if="notLoggedIn"
    class="flex flex-col items-center justify-center gap-4 py-40">
    <div class="text-xl font-bold">还没有登录</div>
    <div class="text-base text-gray-500">登录后即可查看你的音乐库</div>
    <ea-button
      type="primary"
      @click="routeTo('/login')">
      <div class="text-base font-bold">去登录</div>
    </ea-button>
  </div>
  <div
    v-else-if="!isLoaded"
    class="flex flex-col items-center justify-center gap-4 py-40 text-gray-400">
    <div class="me-spinner"></div>
    <div class="text-base">正在加载音乐库…</div>
  </div>
  <div
    v-else
    class="flex flex-col w-full gap-4">
    <div class="flex gap-4 items-center">
      <lmg
        class="w-10 h-10 rounded-full"
        :src="user.avatarUrl"
        :width="60"
        :height="60" />
      <div class="font-bold text-3xl">{{ `${user.nickname ?? ''}的音乐库` }}</div>
      <button
        type="button"
        class="refresh-btn"
        title="刷新"
        :disabled="isRotate"
        @click="refreshMe">
        <icon-park
          :icon="Refresh"
          :size="18"
          :class="{ rotating: isRotate }" />
      </button>
    </div>
    <div class="flex gap-4 items-center">
      <div
        class="items-between w-1/3 h-48 like-card cursor-pointer">
        <div
          class="flex-grow text-sm whitespace-pre-wrap"
          @click="routeTo(`/playlist/${likePlayListId}`)">
          {{ randomLyric }}
        </div>
        <div class="flex justify-between items-center w-full">
          <div
            class="flex flex-col"
            @click="routeTo(`/playlist/${likePlayListId}`)">
            <div class="font-bold">我喜欢的音乐</div>
            <div>{{ `共${likeCount}首` }}</div>
          </div>
          <icon-park
            :icon="PlayOne"
            fill="white"
            theme="filled"
            :size="24"
            title="播放我喜欢的音乐"
            class="btn-play"
            @click.stop="handlePlayLikeList"></icon-park>
        </div>
      </div>
      <div
        class="grid-cols-3 grid place-content-center w-2/3 h-48 rounded gap-1">
        <div
          v-for="item in likeList.slice(0, 12)"
          :key="item.id"
          class="rounded-md like-music flex items-center cursor-pointer py-1"
          @dblclick="handlePlayOne(item)">
          <lmg
            class="w-8 h-8 rounded"
            :src="item.picUrl"
            :width="60"
            :height="60" />
          <div class="flex flex-col justify-center px-2 min-w-0">
            <div
              class="font-bold text-sm overflow-hidden text-ellipsis whitespace-nowrap">
              {{ item.name }}
            </div>
            <div class="text-xs flex gap-1 text-gray-600 active:text-gray-800">
              <span
                v-for="ar in item.singers"
                :key="ar.id"
                class="hover:underline"
                @click.stop="routeTo(`/artist/${ar.id}`)">
                {{ ar.name }}</span
              >
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="me-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        :class="{ 'me-tab-active': activeTab === tab.id }"
        class="me-tab font-bold text-lg text-gray-600 hover:text-gray-800"
        @click="handleClickTab(tab.id)">
        {{ tab.name }}
      </button>
    </div>
    <div
      v-if="tabLoading"
      class="flex justify-center items-center py-12 text-gray-400">
      <div class="me-spinner me-spinner--small"></div>
    </div>
    <template v-else>
      <div
        v-show="activeTab === '1'"
        class="grid-cols-5 grid gap-4">
        <play-list-cover
          v-for="item in myPlayList"
          :key="item.id"
          :data="item"></play-list-cover>
      </div>
      <div v-show="activeTab === '2'">
        <div class="grid-cols-5 grid place-items-center gap-4">
          <album-cover
            v-for="item in albumSubList"
            :key="item.id"
            :data="item"></album-cover>
        </div>
      </div>
      <div v-show="activeTab === '3'">
        <div class="grid-cols-6 grid place-items-center gap-3">
          <artist-cover
            v-for="item in artistSubList"
            :key="item.id"
            :data="item"></artist-cover>
        </div>
      </div>
      <div v-show="activeTab === '4'">
        <div class="flex flex-wrap gap-4">
          <mv-cover
            v-for="item in mvSubList"
            :key="item.id"
            :data="item"></mv-cover>
        </div>
      </div>
      <div v-show="activeTab === '5'">
        <div class="me-tabs">
          <button
            v-for="tab in sortTabs"
            :key="tab.id"
            type="button"
            :class="{ 'me-tab-active': historyType === tab.id }"
            class="me-tab font-bold text-lg text-gray-600 hover:text-gray-800"
            @click="handleClickSortTab(tab.id)">
            {{ tab.name }}
          </button>
        </div>
        <div><music-table :data="musicHistoryData"></music-table></div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { PlayOne, Refresh } from '@icon-park/vue-next'
import { useLocalStorage } from '@vueuse/core'
import {
  getAlbumSubListApi,
  getArtistSubListApi,
  getLikeListApi,
  getListenHistoryApi,
  getMvSubListApi,
  getPlayListByUidApi,
} from './api'
import { routeTo } from '@/utils/common'
import type { PlayListBaseInfo } from '@/types/playListRel'
import type { MusicBaseInfo } from '@/types/musicRel'
import type { ArtistBaseInfo } from '@/types/artistRel'
import type { MvBaseInfo } from '@/types/mvRel'
import type { AlbumBaseInfo } from '@/types/albumRel'
import type { UserProfile } from '@/types/userRel'
import { getPlayListAllApi, playAllByPlayListId } from '@/api/playList'
import { getLyricApi } from '@/api/music'
import { usePlayerStore } from '@/store/playerStore'
import { useUserInfoStore } from '@/store/index'
import pinia from '@/store/store'
import notify from '@/components/common/notification/notify'
import {
  mapAlbum,
  mapArtist,
  mapPlayList,
  mapSong,
  normalizeImageUrl,
} from '@/views/shared/mappers'

defineOptions({
  name: 'me',
})

const playerStore = usePlayerStore(pinia)
const userInfoStore = useUserInfoStore(pinia)

const isLoaded = ref(false)
const isRotate = ref(false)
const historyType = ref('1')
const musicHistoryData = ref<MusicBaseInfo[]>([])
const activeTab = ref('1')
const tabLoading = ref(false)

let rotateTimer: ReturnType<typeof setTimeout> | undefined

/** 优先使用 store（会持久化），兜底读旧版 localStorage 里的 user */
const user = computed<Partial<UserProfile>>(() => {
  const info = userInfoStore.userInfo
  if (info && info.userId) return info
  try {
    const raw = localStorage.getItem('user')
    const parsed: unknown = raw ? JSON.parse(raw) : null
    if (parsed && typeof parsed === 'object') {
      return parsed as Partial<UserProfile>
    }
    return {}
  } catch {
    return {}
  }
})

const notLoggedIn = computed(() => !user.value.userId)

const tabs = [
  { id: '1', name: '全部歌单' },
  { id: '2', name: '专辑' },
  { id: '3', name: '艺人' },
  { id: '4', name: 'MV' },
  { id: '5', name: '听歌排行' },
]

const sortTabs = [
  { id: '1', name: '本周' },
  { id: '0', name: '所有时间' },
]

const myPlayList = ref<PlayListBaseInfo[]>([])
const likeList = ref<MusicBaseInfo[]>([])
const likeCount = ref(0)
const randomLyric = ref('暂无歌词')
const albumSubList = ref<AlbumBaseInfo[]>([])
const artistSubList = useLocalStorage<ArtistBaseInfo[]>('artistSubList', [])
const mvSubList = ref<MvBaseInfo[]>([])

// 我喜欢的音乐也是一个歌单，这个歌单的 id（可能由 home 页异步写入，读取时兜底刷新）
const likePlayListId = ref(localStorage.getItem('likePlayListId') || '')

const refreshLikePlayListId = () => {
  if (!likePlayListId.value) {
    likePlayListId.value = localStorage.getItem('likePlayListId') || ''
  }
}

const loadPlayLists = async () => {
  const res = await getPlayListByUidApi({ uid: user.value.userId ?? 0 })
  // 我的所有歌单（创建的、收藏的），第 0 个是「我喜欢的音乐」，单独展示
  myPlayList.value = (res.playlist ?? []).slice(1).map(mapPlayList)
}

const loadLikeSongs = async () => {
  refreshLikePlayListId()
  if (!likePlayListId.value) {
    likeList.value = []
    return
  }
  const detail = await getPlayListAllApi({ id: Number(likePlayListId.value) })
  likeList.value = (detail.songs ?? []).map(mapSong)
}

const loadLikeCount = async () => {
  const res = await getLikeListApi({ uid: user.value.userId ?? 0 })
  likeCount.value = res.ids?.length ?? 0
}

const loadRandomLyric = async () => {
  if (!likeList.value.length) {
    randomLyric.value = '暂无歌词'
    return
  }
  const music = likeList.value[Math.floor(Math.random() * likeList.value.length)]
  if (!music) {
    randomLyric.value = '暂无歌词'
    return
  }
  const res = await getLyricApi({ id: music.id })
  const lrc: string = res?.lrc?.lyric ?? ''
  const lines = lrc
    .split('\n')
    .map(line => line.replace(/\[[^\]]*\]/g, '').trim())
    .filter(line => line.length > 0)
  if (!lines.length) {
    randomLyric.value = '暂无歌词'
    return
  }
  const start = Math.floor(Math.random() * Math.max(1, lines.length - 2))
  randomLyric.value = lines.slice(start, start + 3).join('\n')
}

const initData = async () => {
  const results = await Promise.allSettled([
    loadPlayLists(),
    loadLikeSongs(),
    loadLikeCount(),
  ])
  const rejected = results.filter(
    (item): item is PromiseRejectedResult => item.status === 'rejected'
  )
  if (rejected.length) {
    rejected.forEach(item => {
      console.error('[HaloMusic] load music library failed:', item.reason)
    })
    notify({ message: '部分音乐库数据加载失败', type: 'warning' })
  }
  isLoaded.value = true
  // 随机歌词不阻塞首屏
  loadRandomLyric().catch((error: unknown) => {
    console.error('[HaloMusic] load random lyric failed:', error)
  })
}

/** 加载一个 tab 的数据（重置后按接口分页拉全） */
const loadAlbumSubList = async () => {
  albumSubList.value = []
  let hasMore = true
  let guard = 0
  while (hasMore && guard < 20) {
    const res = await getAlbumSubListApi({ offset: albumSubList.value.length })
    albumSubList.value.push(...(res.data ?? []).map(mapAlbum))
    hasMore = !!res.hasMore
    guard += 1
  }
}

const loadArtistSubList = async () => {
  artistSubList.value = []
  let hasMore = true
  let guard = 0
  while (hasMore && guard < 20) {
    const res = await getArtistSubListApi({ offset: artistSubList.value.length })
    artistSubList.value.push(...(res.data ?? []).map(mapArtist))
    hasMore = !!res.hasMore
    guard += 1
  }
}

const loadMvSubList = async () => {
  mvSubList.value = []
  let hasMore = true
  let guard = 0
  while (hasMore && guard < 20) {
    const res = await getMvSubListApi({ offset: mvSubList.value.length })
    const list: MvBaseInfo[] = (res.data ?? []).map(item => ({
      id: Number(item.vid),
      name: item.title,
      picUrl: normalizeImageUrl(item.coverUrl),
      creators: (item.creator ?? []).map(creator => ({
        id: creator.userId,
        name: creator.userName,
      })) as MvBaseInfo['creators'],
    }))
    mvSubList.value.push(...list)
    hasMore = !!res.hasMore
    guard += 1
  }
}

const getListenHistory = async (type: string) => {
  const res = await getListenHistoryApi({
    uid: user.value.userId ?? 0,
    type,
  })
  const data = type === '1' ? res.weekData : res.allData
  musicHistoryData.value = (data ?? []).map(item => mapSong(item.song))
}

const handleClickSortTab = async (id: string) => {
  if (historyType.value === id) return
  historyType.value = id
  tabLoading.value = true
  try {
    await getListenHistory(id)
  } catch (error) {
    console.error('[HaloMusic] load listen history failed:', error)
    notify({ message: '听歌排行加载失败', type: 'error' })
  } finally {
    tabLoading.value = false
  }
}

const handleClickTab = async (id: string) => {
  if (activeTab.value === id) return
  activeTab.value = id
  tabLoading.value = true
  try {
    if (id === '2') await loadAlbumSubList()
    else if (id === '3') await loadArtistSubList()
    else if (id === '4') await loadMvSubList()
    else if (id === '5') await getListenHistory(historyType.value)
  } catch (error) {
    console.error('[HaloMusic] load tab data failed:', error)
    notify({ message: '数据加载失败，请稍后重试', type: 'error' })
  } finally {
    tabLoading.value = false
  }
}

const refreshMe = async () => {
  if (isRotate.value) return
  isRotate.value = true
  try {
    const results = await Promise.allSettled([
      loadPlayLists(),
      loadLikeSongs(),
      loadLikeCount(),
      loadRandomLyric(),
    ])
    const failed = results.some(item => item.status === 'rejected')
    notify({
      message: failed ? '刷新完成，部分数据失败' : '刷新成功',
      type: failed ? 'warning' : 'success',
    })
  } finally {
    // 转一圈动画结束再复位
    rotateTimer = setTimeout(() => {
      isRotate.value = false
    }, 800)
  }
}

const handlePlayLikeList = () => {
  refreshLikePlayListId()
  if (!likePlayListId.value) {
    notify({ message: '还没有喜欢的音乐', type: 'warning' })
    return
  }
  playAllByPlayListId(Number(likePlayListId.value)).catch((error: unknown) => {
    console.error('[HaloMusic] play like list failed:', error)
  })
}

const handlePlayOne = (music: MusicBaseInfo) => {
  playerStore.playOne(music.id + '')
}

// 登录态可能比页面晚一步就绪（App 启动时异步校验），userId 出现后再加载
let initialized = false
watch(
  () => user.value.userId,
  () => {
    if (initialized || !user.value.userId) return
    initialized = true
    initData()
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (rotateTimer !== undefined) {
    clearTimeout(rotateTimer)
    rotateTimer = undefined
  }
})
</script>

<style scoped>
.me-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top-color: var(--color-primary, #335eea);
  border-radius: 50%;
  animation: rotate360 0.8s linear infinite;
}

.me-spinner--small {
  width: 24px;
  height: 24px;
  border-width: 2px;
}

.btn-play {
  transition: all 300ms;
  background-color: rgb(51, 94, 234);
  border-radius: 9999px;
  padding: 0.5rem;
}

.btn-play:hover {
  transform: scale(1.05);
}

.btn-play:active {
  transform: scale(0.95);
}

.like-card {
  display: flex;
  padding: 1rem;
  flex-direction: column;
  border-radius: 0.75rem;
  background-color: rgba(51, 94, 234, 0.2);
  color: rgb(51, 94, 234);
}

.like-music {
  padding: 4px 8px;
}

.like-music:hover {
  background-color: rgba(218, 220, 228, 0.4);
}

.me-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.me-tab {
  min-width: 80px;
  padding: 8px 4px;
  margin-bottom: -1px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  cursor: pointer;
  transition: all 300ms;
}

.me-tab-active {
  color: rgb(51, 94, 234);
  border-bottom-color: rgb(51, 94, 234);
}

.refresh-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: none;
  border-radius: 9999px;
  background: transparent;
  cursor: pointer;
  color: inherit;
  transition: background-color 300ms;
}

.refresh-btn:hover {
  background-color: rgba(229, 231, 235, 0.6);
}

.refresh-btn:disabled {
  cursor: default;
}

.rotating {
  animation: rotate360 0.8s linear;
}

@keyframes rotate360 {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
