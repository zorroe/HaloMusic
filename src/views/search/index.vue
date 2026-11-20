<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1 class="page-title">搜索</h1>
        <p class="page-subtitle">
          <template v-if="searchKey">“{{ searchKey }}”的搜索结果</template>
          <template v-else>在顶部搜索框输入关键词，搜索歌曲、歌手、专辑、歌单与 MV</template>
        </p>
      </div>
      <span
        v-if="searchKey && !loadingUI && !searchFailed && !isEmpty"
        class="muted result-total">
        共 {{ totalCount }} 条结果
      </span>
    </header>

    <!-- 最近搜索：初始 / 失败 / 无结果时出现，不打扰正常结果 -->
    <section
      v-if="showSearchHistory"
      class="section"
      aria-label="最近搜索">
      <div class="section-head">
        <h2 class="section-title">最近搜索</h2>
        <button
          type="button"
          class="pill-btn history-clear"
          @click="clearSearchHistory">
          清空历史
        </button>
      </div>
      <div class="chip-row">
        <button
          v-for="key in searchHistory"
          :key="key"
          type="button"
          class="pill-btn history-chip"
          :title="`重新搜索 ${key}`"
          @click="handleSearchHistoryClick(key)">
          {{ key }}
        </button>
      </div>
    </section>

    <!-- 未输入关键词 -->
    <template v-if="!searchKey">
      <ea-empty
        title="开始搜索"
        description="在顶部搜索框输入歌曲、歌手、专辑或歌单关键词" />
    </template>

    <!-- 加载中：类型 tab 骨架 + 列表行骨架 -->
    <section
      v-else-if="loadingUI"
      class="section">
      <div
        class="tab-row"
        aria-busy="true">
        <ea-skeleton
          v-for="index in 4"
          :key="`skeleton-search-tab-${index}`"
          variant="rect"
          width="5.5rem"
          height="34px"
          radius="9999px" />
      </div>
      <div class="skeleton-list">
        <ea-skeleton
          v-for="index in 6"
          :key="`skeleton-search-${index}`"
          variant="row" />
      </div>
    </section>

    <ea-empty
      v-else-if="searchFailed"
      title="搜索失败"
      description="请检查网络后重试"
      action-text="重新搜索"
      @action="retrySearch" />

    <template v-else-if="isEmpty">
      <ea-empty
        title="没有找到相关内容"
        description="换个关键词试试" />
    </template>

    <template v-else>
      <!-- 结果类型 tab：只展示有数据的类型 -->
      <div
        class="tab-row"
        role="tablist"
        aria-label="搜索结果类型">
        <button
          v-for="tab in typeTabs"
          :key="tab.key"
          type="button"
          role="tab"
          class="pill-btn tab-pill"
          :class="{ 'is-active': activeType === tab.key }"
          :aria-selected="activeType === tab.key ? 'true' : 'false'"
          @click="selectType(tab.key)">
          {{ tab.label }}
          <span class="tab-count">{{ tab.count }}</span>
        </button>
      </div>

      <!-- 单曲 -->
      <section
        v-if="activeType === 'song'"
        class="section">
        <music-table
          :data="songs"
          :showCover="false"></music-table>
        <div
          v-show="songs.length < songCount"
          class="load-more-row">
          <button
            type="button"
            class="pill-btn"
            :disabled="loadMoreLoading === 'song'"
            @click="loadMore('song', songs.length)">
            {{ loadMoreLoading === 'song' ? '加载中…' : '加载更多单曲' }}
          </button>
        </div>
      </section>

      <!-- 歌手 -->
      <section
        v-else-if="activeType === 'artist'"
        class="section">
        <div class="grid-cards grid-cards--sm">
          <artist-cover
            v-for="item in artists"
            :key="item.id"
            :data="item"></artist-cover>
        </div>
      </section>

      <!-- 专辑 -->
      <section
        v-else-if="activeType === 'album'"
        class="section">
        <div class="grid-cards">
          <album-cover
            v-for="item in albums"
            :key="item.id"
            :data="item"></album-cover>
        </div>
      </section>

      <!-- 歌单 -->
      <section
        v-else-if="activeType === 'playlist'"
        class="section">
        <div class="grid-cards">
          <play-list-cover
            v-for="item in playlists"
            :key="item.id"
            :data="item"></play-list-cover>
        </div>
        <div
          v-show="playlists.length < playlistCount"
          class="load-more-row">
          <button
            type="button"
            class="pill-btn"
            :disabled="loadMoreLoading === 'playlist'"
            @click="loadMore('playlist', playlists.length)">
            {{ loadMoreLoading === 'playlist' ? '加载中…' : '加载更多歌单' }}
          </button>
        </div>
      </section>

      <!-- MV -->
      <section
        v-else-if="activeType === 'mv'"
        class="section">
        <div class="grid-cards grid-cards--lg">
          <mv-cover
            v-for="item in mvs"
            :key="item.id"
            :data="item"></mv-cover>
        </div>
      </section>

      <!-- 用户 -->
      <section
        v-else-if="activeType === 'user'"
        class="section">
        <div class="grid-cards grid-cards--sm">
          <user-cover
            v-for="item in userprofiles"
            :key="item.userId"
            :data="item"></user-cover>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useSearchStore } from '@/store/index'
import { searchByType, typeMap } from '@/api/search'
import pinia from '@/store/store'
import { handleRequestError } from '@/utils/common'
import { isCanceledError } from '@/utils/request'
import type { MusicBaseInfo } from '@/types/musicRel'
import type { PlayListBaseInfo } from '@/types/playListRel'
import type { ArtistBaseInfo } from '@/types/artistRel'
import type { AlbumBaseInfo } from '@/types/albumRel'
import type { MvBaseInfo } from '@/types/mvRel'
import type { UserProfile } from '@/types/userRel'
import {
  mapAlbum,
  mapArtist,
  mapMv,
  mapPlayList,
  mapSong,
  type RawArtist,
  type RawMv,
  type RawPlayList,
  type RawSong,
} from '@/views/shared/mappers'

defineOptions({
  name: 'search',
})

interface SearchSection<T> {
  count: number
  s: T[]
}

interface RawSearchResult {
  song: SearchSection<RawSong>
  album: SearchSection<{ id: number; name: string; picUrl: string }>
  artist: SearchSection<RawArtist>
  playlist: SearchSection<RawPlayList>
  userprofile: SearchSection<Partial<UserProfile>>
  mv: SearchSection<RawMv>
}

const searchStore = useSearchStore(pinia)

const searching = ref(false)
/** 所有搜索类型都失败时展示可重试的错误态，避免和「无结果」混淆 */
const searchFailed = ref(false)
/** 防抖等待期（从输入变化到真正发起请求之间）也展示 loading，避免闪一下空状态 */
const searchPending = ref(false)
const loadingUI = computed(() => searching.value || searchPending.value)
const loadMoreLoading = ref<'song' | 'playlist' | ''>('')
let debounceTimer: ReturnType<typeof setTimeout> | undefined
/** 搜索请求串行队列，避免快速输入时两次搜索的 store 结果互相覆盖 */
let queue: Promise<void> = Promise.resolve()

const searchKey = computed(() => searchStore.searchKey ?? '')

const result = computed<RawSearchResult>(
  () => searchStore.getSearchResult as unknown as RawSearchResult
)

const artists = computed<ArtistBaseInfo[]>(() =>
  (result.value.artist?.s ?? []).map(mapArtist)
)
const songs = computed<MusicBaseInfo[]>(() =>
  (result.value.song?.s ?? []).map(mapSong)
)
const playlists = computed<PlayListBaseInfo[]>(() =>
  (result.value.playlist?.s ?? []).map(mapPlayList)
)
const albums = computed<AlbumBaseInfo[]>(() =>
  (result.value.album?.s ?? []).map(mapAlbum)
)
const mvs = computed<MvBaseInfo[]>(() =>
  (result.value.mv?.s ?? []).map(mapMv)
)
const userprofiles = computed<UserProfile[]>(() =>
  (result.value.userprofile?.s ?? []).map(
    item => item as unknown as UserProfile
  )
)

const songCount = computed(() => result.value.song?.count ?? 0)
const playlistCount = computed(() => result.value.playlist?.count ?? 0)
const artistCount = computed(() => result.value.artist?.count ?? 0)
const albumCount = computed(() => result.value.album?.count ?? 0)
const mvCount = computed(() => result.value.mv?.count ?? 0)
const userCount = computed(() => result.value.userprofile?.count ?? 0)

/* --------------------------------------------------------------------------
 * 结果类型 tab：只展示有数据的类型；结果变化导致当前类型消失时自动切到第一个
 * ------------------------------------------------------------------------ */
type ResultTabKey = 'song' | 'artist' | 'album' | 'playlist' | 'mv' | 'user'

interface ResultTab {
  key: ResultTabKey
  label: string
  count: number
}

const typeTabs = computed<ResultTab[]>(() => {
  const all: ResultTab[] = [
    { key: 'song', label: '单曲', count: songCount.value },
    { key: 'artist', label: '歌手', count: artistCount.value },
    { key: 'album', label: '专辑', count: albumCount.value },
    { key: 'playlist', label: '歌单', count: playlistCount.value },
    { key: 'mv', label: 'MV', count: mvCount.value },
    { key: 'user', label: '用户', count: userCount.value },
  ]
  return all.filter(tab => tab.count > 0)
})

const totalCount = computed(() =>
  typeTabs.value.reduce((total, tab) => total + tab.count, 0)
)

const activeType = ref<ResultTabKey>('song')

/** 切换结果类型（tab 点击） */
const selectType = (key: ResultTabKey) => {
  activeType.value = key
}

watch(typeTabs, tabs => {
  if (!tabs.some(tab => tab.key === activeType.value)) {
    activeType.value = tabs[0]?.key ?? 'song'
  }
})

const isEmpty = computed(() => {
  const sections = result.value
  const total =
    (sections.song?.count ?? 0) +
    (sections.album?.count ?? 0) +
    (sections.artist?.count ?? 0) +
    (sections.playlist?.count ?? 0) +
    (sections.mv?.count ?? 0) +
    (sections.userprofile?.count ?? 0)
  return total === 0
})

/* --------------------------------------------------------------------------
 * 搜索历史：localStorage 持久化，最新在前、去重、最多 10 条
 * ------------------------------------------------------------------------ */
const SEARCH_HISTORY_KEY = 'halo-search-history'
const MAX_SEARCH_HISTORY = 10

const readSearchHistory = (): string[] => {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item): item is string => typeof item === 'string')
      .map(item => item.trim())
      .filter(item => item.length > 0)
      .slice(0, MAX_SEARCH_HISTORY)
  } catch {
    return []
  }
}

const searchHistory = ref<string[]>(readSearchHistory())

const persistSearchHistory = (list: string[]) => {
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(list))
  } catch {
    // 隐私模式 / 配额满时仅保留内存态，不影响搜索
  }
}

/** 写入一次搜索历史：同关键词去重并提到最前，超过 10 条淘汰最旧 */
const addSearchHistory = (key: string) => {
  const keyword = key.trim()
  if (!keyword) return
  const next = [
    keyword,
    ...searchHistory.value.filter(item => item !== keyword),
  ].slice(0, MAX_SEARCH_HISTORY)
  const unchanged =
    next.length === searchHistory.value.length &&
    next.every((item, index) => item === searchHistory.value[index])
  if (unchanged) return
  searchHistory.value = next
  persistSearchHistory(next)
}

const clearSearchHistory = () => {
  searchHistory.value = []
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY)
  } catch {
    // 清理失败不影响页面
  }
}

/** 搜索历史只在「初始 / 搜索失败 / 无结果」时出现，有结果或加载中时不打扰 */
const showSearchHistory = computed(() => {
  if (searchHistory.value.length === 0) return false
  if (loadingUI.value) return false
  return !searchKey.value || searchFailed.value || isEmpty.value
})

/**
 * 点历史 chip 重新搜索。
 * chip 是原生 button，键盘 Enter / Space 由浏览器原生触发 click，无需额外按键绑定。
 */
const handleSearchHistoryClick = (key: string) => {
  const keyword = key.trim()
  if (!keyword) return
  if (keyword === searchKey.value) {
    // 关键词没变不会触发 watch，直接重跑一次
    retrySearch()
    return
  }
  searchStore.setSearchKey(keyword)
}

/** 6 个搜索类型并发请求，单个失败不影响其它类型 */
const runSearch = async () => {
  const key = searchStore.searchKey
  if (!key) return
  searchPending.value = false
  addSearchHistory(key)
  searching.value = true
  searchFailed.value = false
  searchStore.clearSearchResult()
  try {
    const results = await Promise.allSettled(
      typeMap.map(type => searchByType(type.alias, 0))
    )
    const rejected = results.filter(
      (item): item is PromiseRejectedResult =>
        item.status === 'rejected' && !isCanceledError(item.reason)
    )
    if (rejected.length) {
      rejected.forEach(item => {
        console.error('[HaloMusic] search failed:', item.reason)
      })
      const allFailed = rejected.length === results.length
      searchFailed.value = allFailed
      handleRequestError(
        rejected[0]?.reason,
        allFailed ? '搜索失败，请检查网络' : '部分搜索结果加载失败'
      )
    }
  } finally {
    searching.value = false
  }
}

const enqueueSearch = () => {
  queue = queue.then(runSearch).catch(error => {
    console.error('[HaloMusic] search queue failed:', error)
    searching.value = false
  })
}

/** 错误态「重新搜索」：复用串行队列再跑一次当前关键词 */
const retrySearch = () => {
  searchFailed.value = false
  searchPending.value = true
  enqueueSearch()
}

// 搜索词变化时防抖后入队执行
watch(
  () => searchStore.searchKey,
  key => {
    if (debounceTimer !== undefined) clearTimeout(debounceTimer)
    if (!key) {
      searchPending.value = false
      searchFailed.value = false
      return
    }
    searchPending.value = true
    debounceTimer = setTimeout(() => {
      searchPending.value = false
      enqueueSearch()
    }, 250)
  },
  { immediate: true }
)

const loadMore = async (type: 'song' | 'playlist', offset: number) => {
  if (loadMoreLoading.value) return
  loadMoreLoading.value = type
  try {
    await searchByType(type, offset)
  } catch (error) {
    console.error('[HaloMusic] load more search result failed:', error)
    handleRequestError(error, '加载更多失败，请稍后重试')
  } finally {
    loadMoreLoading.value = ''
  }
}

onBeforeUnmount(() => {
  if (debounceTimer !== undefined) {
    clearTimeout(debounceTimer)
    debounceTimer = undefined
  }
})
</script>

<style scoped>
/* 结果类型 / 分类胶囊 tab 行 */
.tab-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tab-pill {
  height: 32px;
  padding: 0 14px;
  font-size: 13px;
}

.tab-pill.is-active {
  background-color: var(--color-primary-bg);
  border-color: transparent;
  color: var(--color-primary);
}

.tab-count {
  margin-left: 6px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  opacity: 0.72;
}

/* 最近搜索 chips */
.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.history-chip {
  max-width: 100%;
  height: 30px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-muted);
}

.history-clear {
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-muted);
}

.result-total {
  font-size: 13px;
  white-space: nowrap;
}

.load-more-row {
  display: flex;
  justify-content: center;
  padding: 8px 0;
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
