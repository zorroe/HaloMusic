<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1 class="page-title">发现</h1>
        <p class="page-subtitle">按分类浏览歌单，找到下一张想循环的专辑</p>
      </div>
      <button
        type="button"
        class="pill-btn"
        :aria-expanded="showHidden ? 'true' : 'false'"
        @click="showHidden = !showHidden">
        <icon-park
          :icon="More"
          :size="16"
          theme="outline"
          fill="currentColor" />
        分类筛选
      </button>
    </header>

    <!-- 分类胶囊 tab 行：只展示用户启用的分类 -->
    <div
      class="tab-row"
      role="tablist"
      aria-label="歌单分类">
      <button
        v-for="btn in visibleTabs"
        :key="btn.name"
        type="button"
        role="tab"
        class="pill-btn tab-pill"
        :class="{ 'is-active': activeName === btn.name }"
        :aria-selected="activeName === btn.name ? 'true' : 'false'"
        :disabled="loading"
        @click="handleClick(btn)">
        {{ btn.name }}
      </button>
    </div>

    <!-- 分类面板：勾选后进入上方 tab 行 -->
    <Transition name="expand">
      <div
        v-show="showHidden"
        class="category-panel card-surface">
        <div
          v-for="cat in cats"
          :key="cat"
          class="category-group">
          <span class="category-group-title">{{ cat }}</span>
          <div class="category-chips">
            <button
              v-for="label in labels(cat)"
              :key="label.name"
              type="button"
              class="pill-btn category-chip"
              :class="{ 'is-active': label.enable }"
              :aria-pressed="label.enable ? 'true' : 'false'"
              @click="handleVisible(label)">
              {{ label.name }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 首屏骨架 -->
    <div
      v-if="loading && !playListList.length"
      class="grid-cards"
      aria-busy="true">
      <ea-skeleton
        v-for="index in 10"
        :key="`skeleton-explore-${index}`"
        variant="card" />
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

      <section
        v-else
        class="section"
        :aria-busy="loading ? 'true' : 'false'">
        <div class="section-head">
          <h2 class="section-title">{{ listTitle }}</h2>
          <span class="muted section-meta">共 {{ playListList.length }} 张</span>
        </div>
        <div class="grid-cards">
          <play-list-cover
            v-for="item in playListList"
            :key="item.id"
            :data="item"></play-list-cover>
        </div>
      </section>

      <div
        v-show="showMoreBtn"
        class="load-more-row">
        <button
          type="button"
          class="pill-btn"
          :disabled="loading"
          @click="loadMore">
          {{ loading ? '加载中…' : '加载更多' }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, ref } from 'vue'
import { More } from '@icon-park/vue-next'
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

/** 顶部胶囊 tab：与旧逻辑一致，只展示被用户启用的分类 */
const visibleTabs = computed(() => btns.value.filter(item => item.enable))

/** 列表区标题：不同分类的语义不同（排行榜不是歌单） */
const listTitle = computed(() => {
  const name = activeName.value
  if (name === '全部') return '全部歌单'
  if (name === '排行榜' || name === '推荐歌单' || name === '精品歌单') {
    return name
  }
  return `${name}歌单`
})

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
/* 分类胶囊 tab 行 */
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

.tab-pill:disabled {
  opacity: 0.55;
  cursor: default;
}

/* 分类筛选面板 */
.category-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px 22px;
}

.category-group {
  display: flex;
  align-items: flex-start;
  gap: 18px;
}

.category-group-title {
  flex: none;
  width: 52px;
  padding-top: 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-muted);
}

.category-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.category-chip {
  height: 30px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-muted);
}

.category-chip.is-active {
  background-color: var(--color-primary-bg);
  border-color: transparent;
  color: var(--color-primary);
  font-weight: 600;
}

.section-meta {
  font-size: 13px;
  white-space: nowrap;
}

.load-more-row {
  display: flex;
  justify-content: center;
  padding: 4px 0 8px;
}

/* 展开/收起分类面板：只动 opacity + transform */
.expand-enter-active,
.expand-leave-active {
  transition:
    opacity var(--motion-base) var(--ease-standard),
    transform var(--motion-base) var(--ease-standard);
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 900px) {
  .category-group {
    flex-direction: column;
    gap: 8px;
  }

  .category-group-title {
    width: auto;
    padding-top: 0;
  }
}
</style>
