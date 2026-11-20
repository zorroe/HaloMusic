<template>
  <div class="flex flex-col gap-4">
    <ea-empty
      v-if="!searchKey"
      title="搜点什么吧"
      description="在右上角搜索框输入关键词开始搜索" />
    <!-- 结果区骨架：标题行 + 与歌曲行高一致的 5 行 -->
    <div
      v-else-if="loadingUI"
      class="flex flex-col gap-4"
      aria-busy="true">
      <div class="flex items-center gap-3 my-2">
        <ea-skeleton
          variant="text"
          width="12rem"
          height="20px" />
        <ea-skeleton
          variant="text"
          width="6rem"
          height="20px" />
      </div>
      <ea-skeleton
        v-for="index in 5"
        :key="`skeleton-search-${index}`"
        variant="row" />
    </div>
    <ea-empty
      v-else-if="searchFailed"
      title="搜索失败"
      description="请检查网络后重试"
      action-text="重新搜索"
      @action="retrySearch" />
    <ea-empty
      v-else-if="isEmpty"
      title="没有找到相关内容"
      description="换个关键词试试" />
    <template v-else>
      <div v-if="artists.length">
        <div class="text-2xl my-2">
          <span class="font-bold">{{ searchKey }}</span>
          <span>相关歌手</span>
        </div>
        <div class="grid-cols-5 grid place-items-center gap-8 mt-4">
          <artist-cover
            v-for="item in artists.slice(0, 5)"
            :key="item.id"
            :data="item"></artist-cover>
        </div>
      </div>
      <div v-if="playlists.length">
        <div class="text-2xl my-2">
          <span class="font-bold">{{ searchKey }}</span>
          <span>相关歌单</span>
        </div>
        <div class="grid-cols-5 grid place-items-center gap-8 mt-4">
          <play-list-cover
            v-for="item in playlists"
            :key="item.id"
            :data="item"></play-list-cover>
        </div>
        <div
          v-show="playlists.length < playlistCount"
          class="flex justify-center items-center">
          <ea-button
            type="info"
            @click="loadMore('playlist', playlists.length)">
            <div class="text-lg font-bold">
              {{ loadMoreLoading === 'playlist' ? '加载中…' : '加载更多歌单' }}
            </div>
          </ea-button>
        </div>
      </div>
      <div v-if="songs.length">
        <div class="text-2xl my-2">
          <span class="font-bold">{{ searchKey }}</span>
          <span>相关歌曲</span>
        </div>
        <music-table
          :data="songs"
          :showCover="false"></music-table>
        <div
          v-show="songs.length < songCount"
          class="flex justify-center items-center">
          <ea-button
            type="info"
            @click="loadMore('song', songs.length)">
            <div class="text-lg font-bold">
              {{ loadMoreLoading === 'song' ? '加载中…' : '加载更多歌曲' }}
            </div>
          </ea-button>
        </div>
      </div>
      <div v-if="mvs.length">
        <div class="text-2xl my-2">
          <span class="font-bold">{{ searchKey }}</span>
          <span>相关MV</span>
        </div>
        <div class="grid-cols-4 grid place-items-center gap-4">
          <mv-cover
            v-for="item in mvs.slice(0, 8)"
            :key="item.id"
            :data="item"></mv-cover>
        </div>
      </div>
      <div v-if="userprofiles.length">
        <div class="text-2xl my-2">
          <span class="font-bold">{{ searchKey }}</span>
          <span>相关用户</span>
        </div>
        <div class="grid-cols-5 grid place-items-center gap-4">
          <user-cover
            v-for="item in userprofiles.slice(0, 5)"
            :key="item.userId"
            :data="item"></user-cover>
        </div>
      </div>
    </template>
    <!-- 搜索历史：只在「没有可看结果」的状态下展示，不替换上面的空态组件 -->
    <section
      v-if="showSearchHistory"
      class="search-history"
      aria-label="最近搜索">
      <div class="search-history__header">
        <span class="search-history__title">最近搜索</span>
        <button
          type="button"
          class="search-history__clear"
          @click="clearSearchHistory">
          清空历史
        </button>
      </div>
      <div class="search-history__chips">
        <button
          v-for="key in searchHistory"
          :key="key"
          type="button"
          class="search-history__chip"
          :title="`重新搜索 ${key}`"
          @click="handleSearchHistoryClick(key)">
          {{ key }}
        </button>
      </div>
    </section>
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
import type { MvBaseInfo } from '@/types/mvRel'
import type { UserProfile } from '@/types/userRel'
import {
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
.search-history {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 4px 8px;
  border-top: 1px solid var(--color-border);
}

.search-history__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.search-history__title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-muted);
}

.search-history__clear {
  padding: 2px 4px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--color-text-subtle);
  font-size: 13px;
  cursor: pointer;
  transition: color var(--motion-fast) var(--ease-standard);
}

.search-history__clear:hover {
  color: var(--color-text);
}

.search-history__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.search-history__chip {
  max-width: 100%;
  padding: 5px 12px;
  border: 1px solid var(--color-border);
  border-radius: 9999px;
  background-color: var(--color-secondary-bg);
  color: var(--color-text);
  font-size: 14px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    border-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);
}

.search-history__chip:hover {
  border-color: var(--color-primary);
  background-color: var(--color-primary-bg);
  color: var(--color-primary);
}
</style>
