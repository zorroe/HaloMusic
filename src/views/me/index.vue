<template>
  <ea-empty
    v-if="notLoggedIn"
    title="还没有登录"
    description="登录后即可查看你的音乐库"
    action-text="去登录"
    @action="routeTo('/login')" />

  <!-- 首屏骨架：个人信息卡 + 我喜欢 + 胶囊 tab + 卡片网格 -->
  <div
    v-else-if="!isLoaded"
    class="page"
    aria-busy="true">
    <section class="card-surface profile-card profile-card--skeleton">
      <ea-skeleton
        variant="circle"
        :width="72"
        :height="72" />
      <div class="profile-body">
        <ea-skeleton
          variant="rect"
          width="12rem"
          height="22px" />
        <ea-skeleton
          variant="text"
          width="16rem" />
        <ea-skeleton
          variant="text"
          width="10rem" />
      </div>
    </section>
    <section class="section">
      <ea-skeleton
        variant="rect"
        height="168px"
        radius="16px" />
    </section>
    <div class="tab-row">
      <ea-skeleton
        v-for="index in 5"
        :key="`skeleton-tab-${index}`"
        variant="rect"
        width="6rem"
        height="32px"
        radius="9999px" />
    </div>
    <div class="grid-cards">
      <ea-skeleton
        v-for="index in 10"
        :key="`skeleton-card-${index}`"
        variant="card" />
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
    class="page">
    <!-- 个人信息卡：头像 + 昵称 + 统计 -->
    <section class="card-surface profile-card">
      <lmg
        class="profile-avatar"
        :src="user.avatarUrl"
        :width="144"
        :height="144" />
      <div class="profile-body">
        <div class="profile-head">
          <h1 class="profile-name">{{ user.nickname || '音乐爱好者' }}</h1>
          <button
            type="button"
            class="pill-btn pill-btn--icon"
            title="刷新音乐库"
            :disabled="isRotate"
            @click="refreshMe">
            <icon-park
              :icon="Refresh"
              :size="16"
              :class="{ rotating: isRotate }" />
          </button>
        </div>
        <p class="profile-signature">{{ signatureText }}</p>
        <div class="profile-stats">
          <div class="profile-stat">
            <span class="profile-stat__value">{{ myPlayList.length }}</span>
            <span class="profile-stat__label">歌单</span>
          </div>
          <div class="profile-stat">
            <span class="profile-stat__value">{{ displayCount(likeCount) }}</span>
            <span class="profile-stat__label">喜欢</span>
          </div>
          <div class="profile-stat">
            <span class="profile-stat__value">{{ followCount }}</span>
            <span class="profile-stat__label">关注</span>
          </div>
          <div class="profile-stat">
            <span class="profile-stat__value">{{ fansCount }}</span>
            <span class="profile-stat__label">粉丝</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 我喜欢的音乐 -->
    <section class="section">
      <div class="section-head">
        <h2 class="section-title">我喜欢的音乐</h2>
        <button
          type="button"
          class="pill-btn"
          @click="handlePlayLikeList">
          <icon-park
            :icon="PlayOne"
            :size="15"
            theme="filled"
            fill="currentColor" />
          播放全部
        </button>
      </div>

      <div
        v-if="likeList.length"
        class="liked-panel">
        <div class="liked-quote">
          <p class="liked-quote__text">{{ randomLyric }}</p>
          <div class="liked-quote__foot">
            <div class="liked-quote__meta">
              <span class="liked-quote__title">我喜欢的音乐</span>
              <span class="liked-quote__count">{{ likeCount }} 首</span>
            </div>
            <button
              type="button"
              class="pill-btn liked-quote__play"
              @click.stop="handlePlayLikeList">
              <icon-park
                :icon="PlayOne"
                :size="14"
                theme="filled"
                fill="currentColor" />
              播放
            </button>
          </div>
        </div>

        <div class="liked-list">
          <div
            v-for="item in likeList.slice(0, 12)"
            :key="item.id"
            class="liked-track"
            @dblclick="handlePlayOne(item)">
            <lmg
              class="liked-track__cover"
              :src="item.picUrl"
              :width="60"
              :height="60" />
            <div class="liked-track__body">
              <div
                class="liked-track__name"
                :title="item.name">
                {{ item.name }}
              </div>
              <div class="liked-track__artists">
                <span
                  v-for="ar in item.singers"
                  :key="ar.id"
                  class="ea-link"
                  @click.stop="routeTo(`/artist/${ar.id}`)">
                  {{ ar.name }}</span
                >
              </div>
            </div>
          </div>
        </div>
      </div>

      <ea-empty
        v-else
        compact
        title="喜欢列表还是空的"
        description="在歌曲上点红心，喜欢就会出现在这里" />
    </section>

    <!-- 音乐库分类：胶囊 tab + 卡片网格 -->
    <section class="section">
      <div
        class="tab-row"
        role="tablist"
        aria-label="音乐库分类">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          role="tab"
          class="pill-btn tab-pill"
          :class="{ 'is-active': activeTab === tab.id }"
          :aria-selected="activeTab === tab.id ? 'true' : 'false'"
          @click="handleClickTab(tab.id)">
          {{ tab.name }}
        </button>
      </div>

      <div
        v-if="tabLoading"
        aria-busy="true">
        <div
          v-if="activeTab === '5'"
          class="skeleton-rows">
          <ea-skeleton
            v-for="index in 6"
            :key="`skeleton-history-${index}`"
            variant="row" />
        </div>
        <div
          v-else
          class="grid-cards">
          <ea-skeleton
            v-for="index in 8"
            :key="`skeleton-tab-card-${index}`"
            variant="card" />
        </div>
      </div>

      <template v-else>
        <div v-show="activeTab === '1'">
          <div
            v-if="myPlayList.length"
            class="grid-cards">
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
            class="grid-cards">
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
            class="grid-cards grid-cards--sm">
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
            class="grid-cards grid-cards--lg">
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
          <div
            class="tab-row tab-row--sub"
            role="tablist"
            aria-label="听歌排行范围">
            <button
              v-for="tab in sortTabs"
              :key="tab.id"
              type="button"
              role="tab"
              class="pill-btn tab-pill tab-pill--sm"
              :class="{ 'is-active': historyType === tab.id }"
              :aria-selected="historyType === tab.id ? 'true' : 'false'"
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
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, onBeforeUnmount, ref, watch } from 'vue'
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

/** keep-alive 静默刷新阈值：距上次加载超过 5 分钟才在重新激活时后台重拉 */
const SILENT_REFRESH_INTERVAL_MS = 5 * 60 * 1000

/** keep-alive 静默刷新状态：上次加载时间 / 上次是否失败 / 是否正在静默刷新 */
let lastLoadedAt = 0
let lastLoadFailed = false
let silentRefreshing = false

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

const signatureText = computed(() => {
  const signature = user.value.signature
  if (typeof signature === 'string' && signature.trim()) return signature.trim()
  return '在你的音乐库里管理歌单、收藏与听歌排行'
})

/** 未知/非法数值统一显示占位符，避免出现 NaN */
const readCount = (value: unknown): string => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return '—'
  }
  return String(Math.round(value))
}

const followCount = computed(() => readCount(user.value.follows))
const fansCount = computed(() => readCount(user.value.followeds))

/** 计数展示：大于 1 万时折算为「x.x万」 */
const displayCount = (value: number): string => {
  const count = Number(value)
  if (!Number.isFinite(count) || count < 0) return '0'
  if (count >= 10000) return `${(count / 10000).toFixed(1)}万`
  return String(Math.round(count))
}

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
      lastLoadedAt = Date.now()
      lastLoadFailed = true
      handleRequestError(failed[0]?.reason, '音乐库加载失败，请稍后重试')
      return
    }
    if (failed.length) {
      handleRequestError(failed[0]?.reason, '部分音乐库数据加载失败')
    }
  }
  isLoaded.value = true
  lastLoadedAt = Date.now()
  lastLoadFailed = false
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

/**
 * keep-alive 重新激活时的静默刷新：只重拉首屏数据，
 * 不显示骨架、失败不提示；成功时顺带清掉之前的错误态。
 */
const refreshSilently = async () => {
  if (!user.value.userId || !isLoaded.value) return
  if (silentRefreshing || tabLoading.value) return
  silentRefreshing = true
  try {
    const results = await Promise.allSettled([
      loadPlayLists(),
      loadLikeSongs(),
      loadLikeCount(),
    ])
    const failed = results.filter(
      (item): item is PromiseRejectedResult =>
        item.status === 'rejected' && !isCanceledError(item.reason)
    )
    failed.forEach(item => {
      console.error('[HaloMusic] silent refresh music library failed:', item.reason)
    })
    lastLoadFailed = failed.length === results.length
    if (!failed.length) {
      loadFailed.value = false
      loadRandomLyric().catch((error: unknown) => {
        console.error('[HaloMusic] silent refresh lyric failed:', error)
      })
    }
  } finally {
    silentRefreshing = false
    lastLoadedAt = Date.now()
  }
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

onActivated(() => {
  // 首屏数据还没落地（lastLoadedAt 为 0）或正在加载时不重复请求：
  // 首次激活与上面的 watch 首屏加载会先后触发，靠这个判断避免双请求。
  if (!lastLoadedAt || !isLoaded.value || silentRefreshing) return
  if (!lastLoadFailed && Date.now() - lastLoadedAt < SILENT_REFRESH_INTERVAL_MS) {
    return
  }
  void refreshSilently()
})

onBeforeUnmount(() => {
  if (rotateTimer !== undefined) {
    clearTimeout(rotateTimer)
    rotateTimer = undefined
  }
})
</script>

<style scoped>
/* ---------------------------------------------------------------------------
 * 个人信息卡
 * ------------------------------------------------------------------------- */
.profile-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 22px 24px;
}

.profile-card--skeleton {
  min-height: 148px;
}

.profile-avatar {
  flex: none;
  width: 72px;
  height: 72px;
  border-radius: var(--radius-full);
  object-fit: cover;
}

.profile-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.profile-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.profile-name {
  margin: 0;
  font-size: 1.375rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-signature {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 22px;
  margin-top: 6px;
}

.profile-stat {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.profile-stat__value {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}

.profile-stat__label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* ---------------------------------------------------------------------------
 * 我喜欢的音乐：歌词卡 + 最近喜欢列表
 * ------------------------------------------------------------------------- */
.liked-panel {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(0, 2fr);
  gap: 16px;
}

.liked-quote {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 14px;
  min-height: 168px;
  padding: 20px;
  border-radius: var(--radius-lg);
  background: linear-gradient(
    140deg,
    var(--color-primary-bg),
    var(--color-card-bg)
  );
  border: 1px solid var(--color-border);
  color: var(--color-primary);
}

.liked-quote__text {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.6;
  white-space: pre-wrap;
  color: var(--color-text);
  opacity: 0.92;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
}

.liked-quote__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.liked-quote__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.liked-quote__title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-text);
}

.liked-quote__count {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.liked-quote__play {
  flex: none;
}

.liked-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 4px 12px;
  align-content: start;
  padding: 12px;
  border-radius: var(--radius-lg);
  background-color: var(--color-card-bg);
  border: 1px solid var(--color-border);
}

.liked-track {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  cursor: default;
  transition: background-color var(--motion-fast) var(--ease-standard);
}

.liked-track:hover {
  background-color: var(--color-hover);
}

.liked-track__cover {
  flex: none;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  object-fit: cover;
}

.liked-track__body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.liked-track__name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.liked-track__artists {
  display: flex;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.liked-track__artists .ea-link {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-muted);
}

.liked-track__artists .ea-link:hover {
  color: var(--color-primary);
}

/* ---------------------------------------------------------------------------
 * 胶囊 tab 行
 * ------------------------------------------------------------------------- */
.tab-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tab-row--sub {
  margin-bottom: 10px;
}

.tab-pill {
  height: 32px;
  padding: 0 14px;
  font-size: 13px;
}

.tab-pill--sm {
  height: 28px;
  padding: 0 12px;
  font-size: 12px;
}

.tab-pill.is-active {
  background-color: var(--color-primary-bg);
  border-color: transparent;
  color: var(--color-primary);
}

/* 骨架 */
.skeleton-rows {
  display: flex;
  flex-direction: column;
}

/* 刷新按钮旋转（只转一圈，复位由定时器控制） */
.rotating {
  animation: halo-spin var(--motion-slow) linear;
}

/* 窄窗口下：我喜欢区域纵向堆叠，统计项更紧凑 */
@media (max-width: 1080px) {
  .liked-panel {
    grid-template-columns: minmax(0, 1fr);
  }

  .profile-card {
    align-items: flex-start;
  }

  .profile-stats {
    gap: 16px;
  }
}
</style>
