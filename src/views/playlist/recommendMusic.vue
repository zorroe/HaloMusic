<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1 class="page-title">每日推荐</h1>
        <p class="page-subtitle">根据你的音乐口味生成，每天 6:00 更新</p>
      </div>
    </header>

    <!-- 加载骨架 -->
    <template v-if="!loaded && !loadFailed">
      <div
        class="daily-hero card-surface skeleton-hero"
        aria-busy="true">
        <div class="skeleton-hero__text">
          <ea-skeleton
            variant="text"
            width="10rem"
            height="24px" />
          <ea-skeleton
            variant="text"
            width="16rem"
            height="16px" />
        </div>
        <ea-skeleton
          variant="rect"
          width="7.5rem"
          height="34px"
          radius="9999px" />
      </div>
      <section class="section">
        <div class="section-head">
          <ea-skeleton
            variant="text"
            width="6rem"
            height="22px" />
        </div>
        <div class="skeleton-list">
          <ea-skeleton
            v-for="index in 10"
            :key="`skeleton-recommend-${index}`"
            variant="row" />
        </div>
      </section>
    </template>

    <ea-empty
      v-else-if="loadFailed"
      title="每日推荐加载失败"
      description="请检查网络后重试"
      action-text="重新加载"
      @action="getRecommendSongs" />

    <template v-else>
      <!-- 紧凑 hero：标题 + 日期 + 播放全部 -->
      <div class="daily-hero card-surface">
        <div class="daily-hero__text">
          <span class="daily-hero__eyebrow">{{ todayLabel }}</span>
          <span class="daily-hero__title">为你精选的今日歌单</span>
          <span class="daily-hero__desc muted">
            {{
              recommendSongList.length
                ? `根据你的音乐口味生成 · 共 ${recommendSongList.length} 首`
                : '根据你的音乐口味生成'
            }}
          </span>
        </div>
        <button
          v-if="recommendSongList.length"
          type="button"
          class="pill-btn pill-btn--primary"
          @click="handlePlayAll">
          <icon-park
            :icon="PlayOne"
            :size="16"
            theme="filled"
            fill="currentColor" />
          播放全部
        </button>
      </div>

      <section
        v-if="recommendSongList.length"
        class="section">
        <div class="section-head">
          <h2 class="section-title">歌曲列表</h2>
          <span class="muted section-meta">共 {{ recommendSongList.length }} 首</span>
        </div>
        <music-table :data="recommendSongList"></music-table>
      </section>

      <ea-empty
        v-else
        title="今天还没有推荐歌曲"
        description="稍后再来看看吧" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, ref } from 'vue'
import { PlayOne } from '@icon-park/vue-next'
import { getRecommendSongsApi } from '@/api/music'
import type { MusicBaseInfo } from '@/types/musicRel'
import { handleRequestError } from '@/utils/common'
import { usePlayerStore } from '@/store/playerStore'
import pinia from '@/store/store'
import notify from '@/components/common/notification/notify'
import { mapSong } from '@/views/shared/mappers'

defineOptions({
  name: 'recommendMusic',
})

/** keep-alive 静默刷新阈值：距上次加载超过 5 分钟才在重新激活时后台重拉 */
const SILENT_REFRESH_INTERVAL_MS = 5 * 60 * 1000

const playerStore = usePlayerStore(pinia)

/* 每日推荐歌曲页面 */
const recommendSongList = ref<MusicBaseInfo[]>([])
const loaded = ref(false)
const loadFailed = ref(false)

/** 页面日期（如「11月20日 星期五」），只影响展示 */
const todayLabel = computed(() => {
  const now = new Date()
  const date = new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
  }).format(now)
  const weekday = new Intl.DateTimeFormat('zh-CN', {
    weekday: 'long',
  }).format(now)
  return `${date} ${weekday}`
})

/** keep-alive 静默刷新状态：上次加载时间 / 上次是否失败 / 是否正在静默刷新 */
let lastLoadedAt = 0
let lastLoadFailed = false
let silentRefreshing = false

/**
 * 拉取每日推荐。
 * silent=true 用于 keep-alive 重新激活：不显示骨架、失败不提示、保留现有内容。
 */
const getRecommendSongs = async (silent = false) => {
  if (silent) {
    if (silentRefreshing) return
    silentRefreshing = true
  } else {
    loaded.value = false
    loadFailed.value = false
  }
  try {
    const { data } = await getRecommendSongsApi()
    recommendSongList.value = (data?.dailySongs ?? []).map(mapSong)
    loaded.value = true
    loadFailed.value = false
    lastLoadFailed = false
  } catch (error) {
    console.error('[HaloMusic] load recommend songs failed:', error)
    lastLoadFailed = true
    if (silent) return
    loadFailed.value = true
    handleRequestError(error, '每日推荐加载失败，请稍后重试')
  } finally {
    lastLoadedAt = Date.now()
    silentRefreshing = false
  }
}

/** 播放全部：与列表内双击播放同一入口，空列表时不发请求 */
const handlePlayAll = () => {
  const ids = recommendSongList.value.map(item => item.id)
  if (!ids.length) {
    notify({ message: '每日推荐还没准备好', type: 'warning' })
    return
  }
  playerStore.playMulti(ids.join(','))
}

onMounted(() => {
  void getRecommendSongs()
})

onActivated(() => {
  // 首次激活与 onMounted 的首次加载会先后触发：lastLoadedAt 为 0 时说明首屏还没落地，直接跳过
  if (!lastLoadedAt || silentRefreshing) return
  if (!lastLoadFailed && Date.now() - lastLoadedAt < SILENT_REFRESH_INTERVAL_MS) {
    return
  }
  void getRecommendSongs(true)
})
</script>

<style scoped>
/* 紧凑 hero：背景取品牌色到卡片的柔和渐变 */
.daily-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 18px;
  padding: 22px 24px;
  background: linear-gradient(
    120deg,
    var(--color-primary-bg),
    var(--color-card-bg) 70%
  );
}

.daily-hero__text {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.daily-hero__eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--color-primary);
}

.daily-hero__title {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-text);
}

.daily-hero__desc {
  font-size: 13px;
}

.skeleton-hero {
  align-items: center;
}

.skeleton-hero__text {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-meta {
  font-size: 13px;
  white-space: nowrap;
}
</style>
