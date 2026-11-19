<template>
  <div class="flex flex-col gap-4">
    <div
      v-if="!searchKey"
      class="flex flex-col items-center justify-center gap-2 py-40 text-gray-400">
      <div class="text-xl font-bold">搜点什么吧</div>
      <div class="text-base">在右上角搜索框输入关键词开始搜索</div>
    </div>
    <div
      v-else-if="loadingUI"
      class="flex flex-col items-center justify-center gap-4 py-40 text-gray-400">
      <div class="search-spinner"></div>
      <div class="text-base">正在搜索「{{ searchKey }}」…</div>
    </div>
    <div
      v-else-if="isEmpty"
      class="flex flex-col items-center justify-center gap-2 py-40 text-gray-400">
      <div class="text-xl font-bold">没有找到与「{{ searchKey }}」相关的内容</div>
      <div class="text-base">换个关键词试试吧</div>
    </div>
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
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useSearchStore } from '@/store/index'
import { searchByType, typeMap } from '@/api/search'
import pinia from '@/store/store'
import notify from '@/components/common/notification/notify'
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

/** 6 个搜索类型并发请求，单个失败不影响其它类型 */
const runSearch = async () => {
  const key = searchStore.searchKey
  if (!key) return
  searching.value = true
  searchStore.clearSearchResult()
  try {
    const results = await Promise.allSettled(
      typeMap.map(type => searchByType(type.alias, 0))
    )
    const rejected = results.filter(
      item => item.status === 'rejected'
    ) as PromiseRejectedResult[]
    if (rejected.length) {
      rejected.forEach(item => {
        console.error('[HaloMusic] search failed:', item.reason)
      })
      notify({
        message:
          rejected.length === results.length
            ? '搜索失败，请检查网络'
            : '部分搜索结果加载失败',
        type: rejected.length === results.length ? 'error' : 'warning',
      })
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

// 搜索词变化时防抖后入队执行
watch(
  () => searchStore.searchKey,
  key => {
    if (debounceTimer !== undefined) clearTimeout(debounceTimer)
    if (!key) {
      searchPending.value = false
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
    notify({ message: '加载更多失败，请稍后重试', type: 'error' })
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
.search-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top-color: var(--color-primary, #335eea);
  border-radius: 50%;
  animation: search-spin 0.8s linear infinite;
}

@keyframes search-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
