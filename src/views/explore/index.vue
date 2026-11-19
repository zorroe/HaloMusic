<template>
  <div>
    <div class="text-6xl font-bold mb-4 bg-white">发现</div>
    <div class="flex flex-wrap bg-white">
      <div
        v-for="btn in btns"
        :key="btn.name">
        <ea-button
          v-if="btn.enable"
          class="show-btn m-4"
          :type="activeName == btn.name ? 'primary' : 'info'"
          @click="handleClick(btn)">
          <div class="text-lg font-bold">{{ btn.name }}</div>
        </ea-button>
      </div>
      <ea-button
        class="m-4"
        type="info"
        @click="showHidden = !showHidden">
        <div class="text-lg font-bold">...</div>
      </ea-button>
    </div>
    <Transition name="expand">
      <div
        v-show="showHidden"
        class="flex flex-col gap-4 my-4 px-4 rounded-lg bg-gray-100 p-8 mx-4">
        <div
          v-for="cat in cats"
          :key="cat"
          class="flex items-center">
          <div class="min-w-fit mr-6">
            <div class="text-lg font-bold">{{ cat }}</div>
          </div>
          <div class="flex flex-wrap gap-4">
            <div
              v-for="label in labels(cat)"
              :key="label.name"
              @click="handleVisible(label)">
              <div
                class="cat-item-hidden"
                :class="{ 'cat-item-active': label.enable }">
                {{ label.name }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
    <div
      v-if="loading && !playListList.length"
      class="flex flex-col items-center justify-center gap-4 py-32 text-gray-400">
      <div class="page-spinner"></div>
      <div class="text-base">正在加载歌单…</div>
    </div>
    <div
      v-else-if="loadFailed"
      class="flex flex-col items-center justify-center gap-4 py-32">
      <div class="text-xl font-bold">歌单加载失败</div>
      <div class="text-base text-gray-500">请检查网络后重试</div>
      <ea-button
        type="primary"
        @click="retry">
        <div class="text-base font-bold">重新加载</div>
      </ea-button>
    </div>
    <template v-else>
      <div
        v-if="!playListList.length"
        class="flex items-center justify-center py-32 text-gray-400">
        这个分类下暂时没有歌单
      </div>
      <div
        v-else
        class="grid-cols-5 grid place-items-center gap-8 mx-16 mt-12">
        <play-list-cover
          v-for="item in playListList"
          :key="item.id"
          :data="item"></play-list-cover>
      </div>
      <div
        v-show="showMoreBtn"
        class="flex justify-center items-center my-4">
        <ea-button
          type="info"
          :disabled="loading"
          @click="loadMore">
          <div class="text-lg font-bold">
            {{ loading ? '加载中…' : '加载更多' }}
          </div>
        </ea-button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { playlistBigCats, playlistCategories } from './btns'
import type { PlaylistCategory } from './btns'
import type { PlayListBaseInfo } from '@/types/playListRel'
import {
  getHighQualityPlayList,
  getPersonalizePlayListApi,
  getTopListApi,
  getTopPlayList,
} from '@/api/playList'
import notify from '@/components/common/notification/notify'
import { mapPlayList } from '@/views/shared/mappers'

defineOptions({
  name: 'explore',
})

const btns = useLocalStorage<PlaylistCategory[]>('btns', playlistCategories)
const cats = playlistBigCats
const showHidden = ref(false)
const playListList = ref<PlayListBaseInfo[]>([])
const showMoreBtn = ref(false)
const activeName = ref('全部')
const loading = ref(false)
const loadFailed = ref(false)

/** 精品歌单分页参数（before 用上一页最后一条的 updateTime） */
const highQualityParams = {
  limit: 60,
  before: 0,
}

/** 普通分类分页参数 */
const topParams = {
  offset: 0,
  limit: 60,
  cat: '全部',
}

const labels = (cat: string): PlaylistCategory[] =>
  btns.value.filter(item => item.bigCat === cat)

// 点击推荐歌单
const loadPersonalized = async () => {
  playListList.value = []
  showMoreBtn.value = false
  const { result } = await getPersonalizePlayListApi({ limit: 100 })
  playListList.value = (result ?? []).map(mapPlayList)
}

// 点击排行榜
const loadTopList = async () => {
  playListList.value = []
  showMoreBtn.value = false
  const { list } = await getTopListApi()
  playListList.value = (list ?? []).map(mapPlayList)
}

// 点击精品歌单（分页）
const loadHighQuality = async () => {
  const { playlists } = await getHighQualityPlayList({
    ...highQualityParams,
    cat: activeName.value,
  })
  const list = playlists ?? []
  playListList.value.push(...list.map(mapPlayList))
  const last = list[list.length - 1]
  if (typeof last?.updateTime === 'number') {
    highQualityParams.before = last.updateTime
  }
  showMoreBtn.value = list.length > 0
}

// 点击其它分类（分页）
const loadOthers = async () => {
  const { playlists } = await getTopPlayList({ ...topParams })
  const list = playlists ?? []
  playListList.value.push(...list.map(mapPlayList))
  showMoreBtn.value = list.length > 0
}

const runLoad = async (task: () => Promise<void>) => {
  if (loading.value) return
  loading.value = true
  loadFailed.value = false
  try {
    await task()
  } catch (error) {
    console.error('[HaloMusic] load explore playlists failed:', error)
    loadFailed.value = playListList.value.length === 0
    notify({ message: '歌单加载失败，请稍后重试', type: 'error' })
  } finally {
    loading.value = false
  }
}

const handleClick = async (btn: PlaylistCategory) => {
  if (loading.value || btn.name === activeName.value) return
  const previous = activeName.value
  activeName.value = btn.name
  await runLoad(async () => {
    if (btn.name === '推荐歌单') {
      await loadPersonalized()
    } else if (btn.name === '排行榜') {
      await loadTopList()
    } else if (btn.name === '精品歌单') {
      playListList.value = []
      highQualityParams.before = 0
      await loadHighQuality()
    } else {
      playListList.value = []
      topParams.cat = btn.name
      topParams.offset = 0
      await loadOthers()
    }
  })
  if (loadFailed.value) activeName.value = previous
}

const loadMore = async () => {
  await runLoad(async () => {
    if (activeName.value === '精品歌单') {
      await loadHighQuality()
    } else {
      topParams.offset += topParams.limit
      await loadOthers()
    }
  })
}

const retry = () => {
  if (activeName.value === '精品歌单') {
    playListList.value = []
    highQualityParams.before = 0
    void runLoad(loadHighQuality)
    return
  }
  if (activeName.value === '推荐歌单') {
    void runLoad(loadPersonalized)
    return
  }
  if (activeName.value === '排行榜') {
    void runLoad(loadTopList)
    return
  }
  playListList.value = []
  topParams.cat = activeName.value
  topParams.offset = 0
  void runLoad(loadOthers)
}

const handleVisible = (btn: PlaylistCategory) => {
  const index = btns.value.findIndex(item => item.name === btn.name)
  if (index === -1) return
  const target = btns.value[index]
  if (!target) return
  btns.value.splice(index, 1, { ...target, enable: !target.enable })
}

onMounted(() => {
  void runLoad(loadOthers)
})
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

.cat-item-hidden {
  border-radius: 0.375rem;
  padding: 0.25rem 1rem;
  cursor: pointer;
}

.cat-item-hidden:hover {
  color: rgb(51, 94, 234);
  background-color: rgb(234, 239, 253);
}

.cat-item-active {
  color: rgb(51, 94, 234);
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.5s ease-in-out;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
}
</style>
