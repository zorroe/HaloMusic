<template>
  <div>
    <div class="text-6xl font-bold mb-4">发现</div>
    <div class="flex flex-wrap">
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
        class="flex flex-col gap-4 my-4 px-4 rounded-lg bg-[var(--color-secondary-bg)] p-8 mx-4">
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
      class="grid-cols-5 grid place-items-center gap-8 mx-16 mt-12"
      aria-busy="true">
      <ea-skeleton
        v-for="index in 10"
        :key="`skeleton-explore-${index}`"
        variant="card"
        width="12rem" />
    </div>
    <ea-empty
      v-else-if="loadFailed"
      title="歌单加载失败"
      description="请检查网络后重试"
      action-text="重新加载"
      @action="retry" />
    <template v-else>
      <ea-empty
        v-if="!playListList.length"
        title="这个分类下暂时没有歌单"
        description="换个分类看看吧" />
      <div
        v-else
        class="grid-cols-5 grid place-items-center gap-8 mx-16 mt-12"
        :aria-busy="loading ? 'true' : 'false'">
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
import { onActivated, onMounted, ref } from 'vue'
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
import { handleRequestError } from '@/utils/common'
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

/** keep-alive 静默刷新阈值：距上次加载超过 5 分钟才在重新激活时后台重拉当前分类 */
const SILENT_REFRESH_INTERVAL_MS = 5 * 60 * 1000

/** keep-alive 静默刷新状态：上次加载时间 / 上次是否失败 / 是否正在静默刷新 */
let lastLoadedAt = 0
let lastLoadFailed = false
let silentRefreshing = false
/** 用户主动加载的版本号：静默刷新期间用户切了分类/翻页时，丢弃过期的静默结果 */
let loadVersion = 0

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

/* --------------------------------------------------------------------------
 * 数据拉取：fetch* 只负责取第一页数据（不直接改列表），
 * 正常加载与 keep-alive 静默刷新共用，避免两份请求逻辑。
 * ------------------------------------------------------------------------ */

/** 推荐歌单（首屏一次性给 100 个，无分页） */
const fetchPersonalized = async (): Promise<PlayListBaseInfo[]> => {
  const { result } = await getPersonalizePlayListApi({ limit: 100 })
  return (result ?? []).map(mapPlayList)
}

/** 排行榜（无分页） */
const fetchTopListData = async (): Promise<PlayListBaseInfo[]> => {
  const { list } = await getTopListApi()
  return (list ?? []).map(mapPlayList)
}

/** 精品歌单单页结果：列表 + 下一页 before 游标（最后一条 updateTime） */
interface HighQualityPage {
  list: PlayListBaseInfo[]
  lastUpdateTime: number | null
}

/** 精品歌单（分页：before 用上一页最后一条的 updateTime） */
const fetchHighQualityPage = async (
  before: number,
  cat: string
): Promise<HighQualityPage> => {
  const { playlists } = await getHighQualityPlayList({
    limit: highQualityParams.limit,
    before,
    cat,
  })
  const list = playlists ?? []
  const last = list[list.length - 1]
  return {
    list: list.map(mapPlayList),
    lastUpdateTime:
      typeof last?.updateTime === 'number' ? last.updateTime : null,
  }
}

/** 普通分类（分页） */
const fetchOthersPage = async (
  offset: number,
  cat: string
): Promise<PlayListBaseInfo[]> => {
  const { playlists } = await getTopPlayList({
    offset,
    limit: topParams.limit,
    cat,
  })
  return (playlists ?? []).map(mapPlayList)
}

// 点击推荐歌单
const loadPersonalized = async () => {
  playListList.value = []
  showMoreBtn.value = false
  playListList.value = await fetchPersonalized()
}

// 点击排行榜
const loadTopList = async () => {
  playListList.value = []
  showMoreBtn.value = false
  playListList.value = await fetchTopListData()
}

// 点击精品歌单（分页）
const loadHighQuality = async () => {
  const page = await fetchHighQualityPage(
    highQualityParams.before,
    activeName.value
  )
  if (page.lastUpdateTime !== null) {
    highQualityParams.before = page.lastUpdateTime
  }
  playListList.value.push(...page.list)
  showMoreBtn.value = page.list.length > 0
}

// 点击其它分类（分页）
const loadOthers = async () => {
  const list = await fetchOthersPage(topParams.offset, topParams.cat)
  playListList.value.push(...list)
  showMoreBtn.value = list.length > 0
}

const runLoad = async (task: () => Promise<void>) => {
  if (loading.value) return
  loadVersion += 1
  loading.value = true
  loadFailed.value = false
  try {
    await task()
    lastLoadFailed = false
  } catch (error) {
    console.error('[HaloMusic] load explore playlists failed:', error)
    loadFailed.value = playListList.value.length === 0
    lastLoadFailed = true
    handleRequestError(error, '歌单加载失败，请稍后重试')
  } finally {
    loading.value = false
    lastLoadedAt = Date.now()
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

/**
 * keep-alive 重新激活时的静默刷新：
 * 只重拉当前分类的第一页，成功后才替换列表（空结果不覆盖），失败不提示、不切错误态。
 */
const refreshSilently = async () => {
  if (silentRefreshing || loading.value) return
  const version = loadVersion
  silentRefreshing = true
  try {
    let list: PlayListBaseInfo[] = []
    let nextBefore: number | null = null
    if (activeName.value === '精品歌单') {
      const page = await fetchHighQualityPage(0, activeName.value)
      list = page.list
      nextBefore = page.lastUpdateTime
    } else if (activeName.value === '推荐歌单') {
      list = await fetchPersonalized()
    } else if (activeName.value === '排行榜') {
      list = await fetchTopListData()
    } else {
      list = await fetchOthersPage(0, activeName.value)
    }
    // 请求期间用户已经主动切换分类/翻页：丢弃本次静默结果，避免覆盖用户操作
    if (version !== loadVersion) return
    if (list.length > 0) {
      playListList.value = list
      showMoreBtn.value =
        activeName.value !== '推荐歌单' && activeName.value !== '排行榜'
      // 分页游标跟随新的第一页重置，避免「加载更多」拿到重复数据
      if (activeName.value === '精品歌单' && nextBefore !== null) {
        highQualityParams.before = nextBefore
      } else if (activeName.value !== '推荐歌单' && activeName.value !== '排行榜') {
        topParams.cat = activeName.value
        topParams.offset = 0
      }
    }
    loadFailed.value = false
    lastLoadFailed = false
  } catch (error) {
    console.error('[HaloMusic] silent refresh explore failed:', error)
    lastLoadFailed = true
  } finally {
    silentRefreshing = false
    lastLoadedAt = Date.now()
  }
}

onMounted(() => {
  void runLoad(loadOthers)
})

onActivated(() => {
  // 首次激活与 onMounted 的首次加载会先后触发：lastLoadedAt 为 0 时说明首屏还没落地，直接跳过
  if (!lastLoadedAt || loading.value || silentRefreshing) return
  if (!lastLoadFailed && Date.now() - lastLoadedAt < SILENT_REFRESH_INTERVAL_MS) {
    return
  }
  void refreshSilently()
})
</script>

<style scoped>
.cat-item-hidden {
  border-radius: 0.375rem;
  padding: 0.25rem 1rem;
  cursor: pointer;
}

.cat-item-hidden:hover {
  color: var(--color-primary);
  background-color: var(--color-primary-bg);
}

.cat-item-active {
  color: var(--color-primary);
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
