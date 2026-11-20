<template>
  <ea-empty
    v-if="notLoggedIn"
    title="还没有登录"
    description="登录后即可查看你的音乐库"
    action-text="去登录"
    @action="routeTo('/login')" />
  <!-- 音乐库整体骨架：头像 + 标题 + 我喜欢卡片 + 最近喜欢小行 + tab 栏 + 卡片网格 -->
  <div
    v-else-if="!isLoaded"
    class="flex flex-col w-full gap-4"
    aria-busy="true">
    <div class="flex gap-4 items-center">
      <ea-skeleton
        variant="circle"
        :width="40"
        :height="40" />
      <ea-skeleton
        variant="rect"
        width="18rem"
        height="30px" />
      <ea-skeleton
        variant="circle"
        :width="26"
        :height="26" />
    </div>
    <div class="flex gap-4 items-start">
      <ea-skeleton
        variant="rect"
        width="33%"
        height="12rem"
        radius="12px" />
      <div class="grid grid-cols-3 gap-1 w-2/3">
        <div
          v-for="index in 12"
          :key="`skeleton-like-${index}`"
          class="flex items-center gap-2 py-1">
          <ea-skeleton
            variant="rect"
            :width="32"
            :height="32"
            radius="4px" />
          <div class="flex flex-col gap-1 flex-1 min-w-0">
            <ea-skeleton
              variant="text"
              width="70%" />
            <ea-skeleton
              variant="text"
              width="45%" />
          </div>
        </div>
      </div>
    </div>
    <div class="me-tabs">
      <ea-skeleton
        v-for="index in 5"
        :key="`skeleton-tab-${index}`"
        variant="text"
        width="5rem"
        height="28px" />
    </div>
    <div class="grid-cols-5 grid gap-4">
      <ea-skeleton
        v-for="index in 10"
        :key="`skeleton-card-${index}`"
        variant="card"
        width="12rem" />
    </div>
  </div>
  <ea-empty
    v-else-if="loadFailed"
    title="音乐库加载失败"
    description="请检查网络后重试"
    action-text="重新加载"
    @action="retryLoad" />
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
        v-if="likeList.length"
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
            <div class="text-xs flex gap-1 text-[var(--color-text-muted)] active:text-[var(--color-text)]">
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
      <div
        v-else
        class="w-2/3 h-48 flex items-center justify-center">
        <ea-empty
          compact
          title="喜欢列表还是空的"
          description="在歌曲上点红心，喜欢就会出现在这里" />
      </div>
    </div>
    <div class="me-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        :class="{ 'me-tab-active': activeTab === tab.id }"
        class="me-tab font-bold text-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        @click="handleClickTab(tab.id)">
        {{ tab.name }}
      </button>
    </div>
    <div
      v-if="tabLoading"
      aria-busy="true">
      <div
        v-if="activeTab === '5'"
        class="flex flex-col">
        <ea-skeleton
          v-for="index in 10"
          :key="`skeleton-history-${index}`"
          variant="row" />
      </div>
      <div
        v-else
        class="grid-cols-5 grid gap-4">
        <ea-skeleton
          v-for="index in 10"
          :key="`skeleton-tab-card-${index}`"
          variant="card"
          width="12rem" />
      </div>
    </div>
    <template v-else>
      <div v-show="activeTab === '1'">
        <div
          v-if="myPlayList.length"
          class="grid-cols-5 grid gap-4">
          <play-list-cover
            v-for="item in myPlayList"
            :key="item.id"
            :data="item"></play-list-cover>
        </div>
        <ea-empty
          v-else
          compact
          title="还没有歌单"
          description="去发现页收藏一些喜欢的歌单吧" />
      </div>
      <div v-show="activeTab === '2'">
        <div
          v-if="albumSubList.length"
          class="grid-cols-5 grid place-items-center gap-4">
          <album-cover
            v-for="item in albumSubList"
            :key="item.id"
            :data="item"></album-cover>
        </div>
        <ea-empty
          v-else
          compact
          title="还没有收藏的专辑"
          description="在专辑页点亮收藏，就会出现在这里" />
      </div>
      <div v-show="activeTab === '3'">
        <div
          v-if="artistSubList.length"
          class="grid-cols-6 grid place-items-center gap-3">
          <artist-cover
            v-for="item in artistSubList"
            :key="item.id"
            :data="item"></artist-cover>
        </div>
        <ea-empty
          v-else
          compact
          title="还没有关注的艺人"
          description="在歌手页点击关注，就会出现在这里" />
      </div>
      <div v-show="activeTab === '4'">
        <div
          v-if="mvSubList.length"
          class="flex flex-wrap gap-4">
          <mv-cover
            v-for="item in mvSubList"
            :key="item.id"
            :data="item"></mv-cover>
        </div>
        <ea-empty
          v-else
          compact
          title="还没有收藏的 MV"
          description="在 MV 页点亮收藏，就会出现在这里" />
      </div>
      <div v-show="activeTab === '5'">
        <div class="me-tabs">
          <button
            v-for="tab in sortTabs"
            :key="tab.id"
            type="button"
            :class="{ 'me-tab-active': historyType === tab.id }"
            class="me-tab font-bold text-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            @click="handleClickSortTab(tab.id)">
            {{ tab.name }}
          </button>
        </div>
        <music-table
          v-if="musicHistoryData.length"
          :data="musicHistoryData"></music-table>
        <ea-empty
          v-else
          compact
          title="还没有听歌记录"
          description="多听几首歌再来看看吧" />
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
import { handleRequestError, routeTo } from '@/utils/common'
import { isCanceledError } from '@/utils/request'
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
/** 首屏三个请求全部失败时进入整页错误态（可重试） */
const loadFailed = ref(false)
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
  loadFailed.value = false
  const results = await Promise.allSettled([
    loadPlayLists(),
    loadLikeSongs(),
    loadLikeCount(),
  ])
  const rejected = results.filter(
    (item): item is PromiseRejectedResult => item.status === 'rejected'
  )
  if (rejected.length) {
    // 切页会取消在途请求：这属于正常控制流，不算加载失败
    const failed = rejected.filter(item => !isCanceledError(item.reason))
    failed.forEach(item => {
      console.error('[HaloMusic] load music library failed:', item.reason)
    })
    if (rejected.length === results.length) {
      // 全部失败（通常是断网，或首屏加载中被切页）：给整页错误态，避免只剩一个空音乐库
      isLoaded.value = true
      loadFailed.value = true
      handleRequestError(failed[0]?.reason, '音乐库加载失败，请稍后重试')
      return
    }
    if (failed.length) {
      handleRequestError(failed[0]?.reason, '部分音乐库数据加载失败')
    }
  }
  isLoaded.value = true
  // 随机歌词不阻塞首屏
  loadRandomLyric().catch((error: unknown) => {
    console.error('[HaloMusic] load random lyric failed:', error)
  })
}

/** 错误态「重新加载」：回到骨架并重跑一次首屏请求 */
const retryLoad = () => {
  if (!user.value.userId) return
  isLoaded.value = false
  void initData()
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
    handleRequestError(error, '听歌排行加载失败')
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
    handleRequestError(error, '数据加载失败，请稍后重试')
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
    const rejected = results.filter(
      (item): item is PromiseRejectedResult => item.status === 'rejected'
    )
    const failed = rejected.some(item => !isCanceledError(item.reason))
    // 只有全部是「切页取消」时不提示，避免在其他页面弹刷新结果
    if (!rejected.length || failed) {
      notify({
        message: failed ? '刷新完成，部分数据失败' : '刷新成功',
        type: failed ? 'warning' : 'success',
      })
    }
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
.btn-play {
  transition:
    transform var(--motion-base) var(--ease-spring),
    background-color var(--motion-fast) var(--ease-standard);
  background-color: var(--color-primary);
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
  background-color: var(--color-primary-bg);
  color: var(--color-primary);
}

.like-music {
  padding: 4px 8px;
}

.like-music:hover {
  background-color: var(--color-hover);
}

.me-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--color-border);
}

.me-tab {
  min-width: 80px;
  padding: 8px 4px;
  margin-bottom: -1px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  cursor: pointer;
  transition:
    color var(--motion-fast) var(--ease-standard),
    border-color var(--motion-fast) var(--ease-standard);
}

.me-tab-active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
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
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);
}

.refresh-btn:hover {
  background-color: var(--color-hover);
}

.refresh-btn:disabled {
  cursor: default;
}

.rotating {
  animation: halo-spin var(--motion-slow) linear;
}
</style>
