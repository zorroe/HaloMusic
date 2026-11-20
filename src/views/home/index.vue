<template>
  <div class="page">
    <!-- 页面标题区：左右两端对齐，右侧可放页面级操作 -->
    <header class="page-head">
      <div>
        <h1 class="page-title">发现音乐</h1>
        <p class="page-subtitle">每日推荐、精选歌单与排行榜，一屏直达</p>
      </div>
    </header>

    <!-- 加载骨架：与真实版式一一对应 -->
    <template v-if="loading">
      <div
        class="hero-row"
        aria-busy="true">
        <ea-skeleton
          variant="rect"
          height="210px"
          radius="16px"
          class="hero-skeleton" />
        <ea-skeleton
          variant="rect"
          height="210px"
          radius="16px"
          class="hero-skeleton" />
      </div>
      <section class="section">
        <div class="section-head">
          <ea-skeleton
            variant="text"
            width="8rem"
            height="22px" />
        </div>
        <div class="grid-cards">
          <ea-skeleton
            v-for="index in 10"
            :key="`skeleton-playlist-${index}`"
            variant="card" />
        </div>
      </section>
      <section class="section">
        <div class="section-head">
          <ea-skeleton
            variant="text"
            width="8rem"
            height="22px" />
        </div>
        <div class="grid-cards grid-cards--sm">
          <ea-skeleton
            v-for="index in 6"
            :key="`skeleton-artist-${index}`"
            variant="card" />
        </div>
      </section>
    </template>

    <ea-empty
      v-else-if="failedAll"
      title="首页加载失败"
      description="请检查网络后重试"
      action-text="重新加载"
      @action="loadAll" />
    <ea-empty
      v-else-if="nothingToShow"
      title="暂时没有推荐内容"
      description="稍后再来看看吧" />

    <template v-else>
      <!-- 快捷入口：每日推荐 + 私人 FM -->
      <div class="hero-row">
        <div
          class="hero-card card-surface daily-card"
          :class="{ 'daily-card--image': recommendBg }">
          <img
            v-if="recommendBg"
            :src="recommendBg"
            class="daily-bg"
            alt="" />
          <span
            class="daily-shade"
            aria-hidden="true"></span>
          <div class="daily-body">
            <span class="daily-eyebrow">每日推荐</span>
            <span class="daily-title">为你精选的今日歌单</span>
            <span class="daily-meta">
              {{
                recommendSongList.length
                  ? `共 ${recommendSongList.length} 首 · 每天 6:00 更新`
                  : '每天 6:00 更新'
              }}
            </span>
            <div class="daily-actions">
              <button
                type="button"
                class="pill-btn pill-btn--primary"
                @click="handlePlayMultiRecommend">
                <icon-park
                  :icon="PlayOne"
                  :size="16"
                  theme="filled"
                  fill="currentColor" />
                播放全部
              </button>
              <button
                type="button"
                class="pill-btn"
                @click="routeTo('/recommendMusic')">
                查看全部
              </button>
            </div>
          </div>
        </div>
        <person-fm class="hero-card card-surface fm-card" />
      </div>

      <section
        v-if="recommendPlayList.length"
        class="section">
        <div class="section-head">
          <h2 class="section-title">推荐歌单</h2>
          <span class="muted section-meta">为你挑选</span>
        </div>
        <div class="grid-cards">
          <play-list-cover
            v-for="item in recommendPlayList"
            :key="item.id"
            :data="item"></play-list-cover>
        </div>
      </section>

      <section
        v-if="recommendArtist.length"
        class="section">
        <div class="section-head">
          <h2 class="section-title">推荐歌手</h2>
        </div>
        <div class="grid-cards grid-cards--sm">
          <artist-cover
            v-for="item in recommendArtist"
            :key="item.id"
            :data="item"></artist-cover>
        </div>
      </section>

      <section
        v-if="albumNewest.length"
        class="section">
        <div class="section-head">
          <h2 class="section-title">最新音乐</h2>
          <span class="muted section-meta">新专速递</span>
        </div>
        <div class="grid-cards">
          <album-cover
            v-for="item in albumNewest"
            :key="item.id"
            :data="item"></album-cover>
        </div>
      </section>

      <section
        v-if="topList.length"
        class="section">
        <div class="section-head">
          <h2 class="section-title">排行榜</h2>
          <span class="muted section-meta">实时热度</span>
        </div>
        <div class="grid-cards">
          <top-list-cover
            v-for="item in topList"
            :key="item.id"
            :data="item"></top-list-cover>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, ref } from 'vue'
import { PlayOne } from '@icon-park/vue-next'
import { getNewAlbumApi } from '@/api/album'
import { getrecommendArtistApi } from '@/api/artist'
import { getrecommendPlayListApi, getTopListApi } from '@/api/playList'
import { getRecommendSongsApi } from '@/api/music'
import type { AlbumBaseInfo } from '@/types/albumRel'
import type { ArtistBaseInfo } from '@/types/artistRel'
import type { PlayListBaseInfo } from '@/types/playListRel'
import type { MusicBaseInfo } from '@/types/musicRel'
import {
  handleRequestError,
  routeTo,
  saveLikeMusicIds,
  saveSubAlbumIds,
} from '@/utils/common'
import { isCanceledError } from '@/utils/request'
import { usePlayerStore } from '@/store/playerStore'
import pinia from '@/store/store'
import notify from '@/components/common/notification/notify'
import PersonFm from '@/components/common/PersonalFm.vue'
import {
  mapAlbum,
  mapArtist,
  mapPlayList,
  mapSong,
  randomSlice,
} from '@/views/shared/mappers'

defineOptions({
  name: 'home',
})

const playerStore = usePlayerStore(pinia)

const loading = ref(true)
const failedAll = ref(false)
const recommendPlayList = ref<PlayListBaseInfo[]>([])
const recommendArtist = ref<ArtistBaseInfo[]>([])
const albumNewest = ref<AlbumBaseInfo[]>([])
const topList = ref<PlayListBaseInfo[]>([])
const recommendSongList = ref<MusicBaseInfo[]>([])
const recommendBg = ref('')

/** 所有模块都请求成功但内容为空时给一个明确空态，避免只剩标题的空白页 */
const nothingToShow = computed(
  () =>
    !recommendPlayList.value.length &&
    !recommendArtist.value.length &&
    !albumNewest.value.length &&
    !topList.value.length &&
    !recommendSongList.value.length
)

/** keep-alive 静默刷新阈值：距上次加载超过 5 分钟才在重新激活时后台重拉 */
const SILENT_REFRESH_INTERVAL_MS = 5 * 60 * 1000

/** keep-alive 静默刷新状态：上次加载时间 / 上次是否失败 / 是否正在静默刷新 */
let lastLoadedAt = 0
let lastLoadFailed = false
let silentRefreshing = false

const loadRecommendPlayList = async () => {
  const { recommend } = await getrecommendPlayListApi()
  recommendPlayList.value = (recommend ?? [])
    .slice(0, 10)
    .map(mapPlayList)
}

const loadRecommendArtist = async () => {
  const { list } = await getrecommendArtistApi()
  recommendArtist.value = randomSlice(list?.artists ?? [], 6).map(mapArtist)
}

const loadAlbumNewest = async () => {
  const { albums } = await getNewAlbumApi()
  albumNewest.value = randomSlice(albums ?? [], 10).map(mapAlbum)
}

const loadTopList = async () => {
  const { list } = await getTopListApi()
  topList.value = (list ?? []).slice(0, 5).map(mapPlayList)
}

const loadRecommendSongs = async () => {
  const { data } = await getRecommendSongsApi()
  const dailySongs = data?.dailySongs ?? []
  recommendSongList.value = dailySongs.map(mapSong)
  recommendBg.value = recommendSongList.value[0]?.picUrl ?? ''
}

/**
 * 五个模块并行请求：任意一个失败都不影响其它模块渲染。
 * silent=true 用于 keep-alive 重新激活：不显示骨架、失败不提示、保留现有内容。
 */
const loadAll = async (silent = false) => {
  if (silent) {
    if (silentRefreshing || loading.value) return
    silentRefreshing = true
  } else {
    loading.value = true
    failedAll.value = false
  }

  try {
    const tasks = [
      loadRecommendPlayList(),
      loadRecommendArtist(),
      loadAlbumNewest(),
      loadTopList(),
      loadRecommendSongs(),
    ]
    const results = await Promise.allSettled(tasks)
    const rejected = results.filter(
      (item): item is PromiseRejectedResult => item.status === 'rejected'
    )
    // 切页会取消在途请求：这属于正常控制流，不算加载失败、不提示
    const failed = rejected.filter(item => !isCanceledError(item.reason))

    if (silent) {
      // 静默刷新：失败只在控制台留痕，不弹错误、不切错误态；全部失败时下次激活再试
      failed.forEach(item => {
        console.error('[HaloMusic] home silent refresh failed:', item.reason)
      })
      if (failed.length < tasks.length) failedAll.value = false
      lastLoadFailed = failed.length > 0 && failed.length === tasks.length
    } else {
      if (rejected.length) {
        rejected.forEach(item => {
          console.error('[HaloMusic] home request failed:', item.reason)
        })
        if (rejected.length === tasks.length) {
          failedAll.value = true
        } else if (failed.length) {
          handleRequestError(
            failed[0]?.reason,
            `部分内容加载失败（${failed.length}/${tasks.length}）`
          )
        }
      }
      lastLoadFailed = failedAll.value
    }
  } finally {
    lastLoadedAt = Date.now()
    if (silent) {
      silentRefreshing = false
    } else {
      loading.value = false
    }
  }

  // 喜欢列表 / 订阅专辑 id 不影响首屏，放到最后异步刷新
  Promise.allSettled([saveLikeMusicIds(), saveSubAlbumIds()]).then(items => {
    items.forEach(item => {
      if (item.status === 'rejected') {
        console.error('[HaloMusic] sync user data failed:', item.reason)
      }
    })
  })
}

const handlePlayMultiRecommend = (event: Event) => {
  event.stopPropagation()
  const ids = recommendSongList.value.map(item => item.id)
  if (!ids.length) {
    notify({ message: '每日推荐还没准备好', type: 'warning' })
    return
  }
  playerStore.playMulti(ids.join(','))
}

onMounted(() => {
  void loadAll()
})

onActivated(() => {
  // 首次激活与 onMounted 的首次加载会先后触发：lastLoadedAt 为 0 时说明首屏还没落地，直接跳过
  if (!lastLoadedAt || loading.value || silentRefreshing) return
  if (!lastLoadFailed && Date.now() - lastLoadedAt < SILENT_REFRESH_INTERVAL_MS) {
    return
  }
  void loadAll(true)
})
</script>

<style scoped>
/* 快捷入口行：每日推荐卡 + 私人 FM 卡等宽 */
.hero-row {
  display: flex;
  gap: 20px;
}

.hero-card {
  flex: 1 1 0;
  min-width: 0;
  height: 210px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  position: relative;
}

.hero-skeleton {
  flex: 1 1 0;
  min-width: 0;
}

/* 每日推荐卡：有封面图时铺图 + 压暗，保证文字可读 */
.daily-card {
  border: 1px solid var(--color-border);
  background: linear-gradient(
    120deg,
    var(--color-primary-bg),
    var(--color-card-bg)
  );
}

.daily-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.04);
  transition: transform var(--motion-slow) var(--ease-standard);
}

.daily-card:hover .daily-bg {
  transform: scale(1.08);
}

.daily-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    100deg,
    color-mix(in srgb, var(--color-mask) 92%, transparent) 0%,
    color-mix(in srgb, var(--color-mask) 45%, transparent) 62%,
    transparent 100%
  );
}

.daily-body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 6px;
  height: 100%;
  padding: 20px 22px;
}

.daily-card--image .daily-body {
  color: var(--color-on-primary);
}

.daily-eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  opacity: 0.86;
}

.daily-title {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.25;
}

.daily-meta {
  font-size: 13px;
  color: var(--color-text-muted);
}

.daily-card--image .daily-meta {
  color: color-mix(in srgb, var(--color-on-primary) 78%, transparent);
}

.daily-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

/* 私人 FM 组件由公共组件提供，这里只控制它在英雄区的尺寸 */
.fm-card {
  width: 100%;
}

.section-meta {
  font-size: 13px;
  white-space: nowrap;
}

/* 窄窗口下改为纵向堆叠，避免两个快捷卡被压扁 */
@media (max-width: 1080px) {
  .hero-row {
    flex-direction: column;
  }

  .hero-card,
  .hero-skeleton {
    flex: none;
    width: 100%;
    height: 200px;
  }
}
</style>
