<template>
  <div class="page">
    <!-- 加载骨架：16:9 视频占位 + 标题/元信息行 -->
    <div v-if="loading" class="page-loading" aria-busy="true">
      <div class="mv-stage">
        <ea-skeleton
          variant="rect"
          width="100%"
          height="100%"
          radius="var(--radius-lg)"
        />
      </div>
      <div class="mv-head">
        <div class="mv-info">
          <ea-skeleton
            variant="rect"
            width="4rem"
            height="20px"
            radius="var(--radius-full)"
          />
          <ea-skeleton variant="rect" width="18rem" height="34px" />
          <ea-skeleton variant="text" width="55%" />
          <ea-skeleton variant="text" width="75%" />
        </div>
      </div>
    </div>

    <ea-empty
      v-else-if="loadFailed"
      title="视频加载失败"
      description="可能是版权限制或网络异常"
      action-text="重新加载"
      @action="loadMv"
    />

    <template v-else>
      <section class="section">
        <!-- 视频：16:9 自适应、圆角、放 card-surface 容器内 -->
        <div class="card-surface mv-stage">
          <video
            class="mv-video"
            :src="src"
            :poster="cover"
            controls
            loop
            playsinline
            preload="metadata"
            @play="handlePlay"
          ></video>
        </div>

        <header v-if="mvData" class="page-head mv-head">
          <div class="mv-info">
            <span class="detail-badge">MV</span>
            <div class="mv-title-row">
              <h1 class="page-title mv-title" :title="mvData?.name">
                {{ mvData?.name }}
              </h1>
              <span v-if="durationText" class="mv-duration">{{
                durationText
              }}</span>
            </div>

            <div class="mv-artists">
              <span
                v-for="artist in mvData?.artists"
                :key="artist.id"
                class="mv-artist"
                @click="routeTo(`/artist/${artist.id}`)"
              >
                <lmg
                  :src="artist.img1v1Url"
                  :width="80"
                  :height="80"
                  class="mv-artist-avatar"
                />
                <span class="ea-link">{{ artist.name }}</span>
              </span>
            </div>

            <p class="page-subtitle">
              <span>播放 {{ formatCount(mvData?.playCount) }}</span>
              <span class="detail-dot">·</span>
              <span>收藏 {{ formatCount(mvData?.subCount) }}</span>
              <span class="detail-dot">·</span>
              <span>分享 {{ formatCount(mvData?.shareCount) }}</span>
              <template v-if="publishDateText">
                <span class="detail-dot">·</span>
                <span>{{ publishDateText }}</span>
              </template>
            </p>

            <template v-if="descriptionText">
              <p
                ref="descRef"
                class="detail-desc"
                :class="{ 'detail-desc--expanded': descExpanded }"
              >
                {{ descriptionText }}
              </p>
              <button
                v-if="descOverflow"
                type="button"
                class="detail-desc-toggle"
                @click="descExpanded = !descExpanded"
              >
                {{ descExpanded ? '收起' : '展开' }}
              </button>
            </template>
          </div>

          <div class="detail-actions">
            <button
              type="button"
              class="pill-btn"
              title="在浏览器中打开"
              @click="handleShare"
            >
              <icon-park :icon="Share" theme="filled" :size="16" />
              网页版打开
            </button>
          </div>
        </header>
        <ea-empty v-else compact title="暂无视频信息" />
      </section>

      <!-- 相关推荐：同一歌手的其它 MV（附加内容，失败不影响主流程） -->
      <section v-if="relatedMvs.length" class="section">
        <div class="section-head">
          <h2 class="section-title">相关推荐</h2>
          <span class="muted section-meta">
            更多 {{ mvData?.artistName || '该歌手' }} 的 MV
          </span>
        </div>
        <div class="grid-cards grid-cards--lg">
          <mv-cover
            v-for="item in relatedMvs"
            :key="item.id"
            :data="item"
          ></mv-cover>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { Share } from '@icon-park/vue-next'
import dayjs from 'dayjs'
import { mvDetailApi, mvUrlApi } from './index'
import type { MvBr, MvData } from './index'
import { getArtistMvApi } from '@/api/artist'
import type { MvBaseInfo } from '@/types/mvRel'
import router from '@/router'
import { openUrl, routeTo } from '@/utils/common'
import { usePlayerStore } from '@/store/playerStore'
import pinia from '@/store/store'
import { formatDurationMs, normalizeImageUrl } from '@/views/shared/mappers'

defineOptions({
  name: 'mv',
})

const playerStore = usePlayerStore(pinia)

const mvId = ref<string>('')
const cover = ref<string>('')
const brs = ref<MvBr[]>([])
const src = ref<string>('')
/** 视频码率（清晰度），与原实现保持一致 */
const quality = ref<number>(1080)
const mvData = ref<MvData>()
const loading = ref(true)
/** 详情/播放地址请求失败或没有可播放地址时进入可重试错误态 */
const loadFailed = ref(false)
const relatedMvs = ref<MvBaseInfo[]>([])

const publishDateText = computed(() => {
  const time = mvData.value?.publishTime
  if (!time) return ''
  return `${dayjs(time).format('YYYY-MM-DD')} 发行`
})

const durationText = computed(() => formatDurationMs(mvData.value?.duration))

const descriptionText = computed(() => {
  const description = mvData.value?.desc || mvData.value?.briefDesc
  return typeof description === 'string' ? description.trim() : ''
})

/** 万 / 亿 缩写，0 或非法值显示 0 */
const formatCount = (value?: number): string => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return '0'
  }
  if (value < 10000) return String(Math.floor(value))
  if (value < 100000000) return `${(value / 10000).toFixed(1)} 万`
  return `${(value / 100000000).toFixed(1)} 亿`
}

// ---------------- 简介折叠 ----------------
const descRef = ref<HTMLElement | null>(null)
const descExpanded = ref(false)
const descOverflow = ref(false)

const measureDesc = () => {
  const element = descRef.value
  if (!element || descExpanded.value) return
  descOverflow.value = element.scrollHeight - element.clientHeight > 1
}

const handleResize = () => {
  measureDesc()
}

/** 相关推荐：取同一歌手的其它 MV，失败只降级为不展示 */
const loadRelatedMvs = async (artistId: number) => {
  try {
    const { mvs } = await getArtistMvApi({ id: artistId, limit: 10 })
    relatedMvs.value = (mvs ?? [])
      .filter((item) => String(item.id) !== String(mvId.value))
      .slice(0, 8)
      .map((item) => ({ ...item, picUrl: normalizeImageUrl(item.picUrl) }))
  } catch (error) {
    relatedMvs.value = []
    console.error('[HaloMusic] load related mv failed:', error)
  }
}

const loadMv = async () => {
  if (!mvId.value) {
    loading.value = false
    loadFailed.value = true
    return
  }
  loading.value = true
  loadFailed.value = false
  descExpanded.value = false
  descOverflow.value = false
  src.value = ''
  relatedMvs.value = []
  const [detailResult, urlResult] = await Promise.allSettled([
    mvDetailApi({ mvid: mvId.value }),
    mvUrlApi({ id: mvId.value, r: quality.value }),
  ])

  if (detailResult.status === 'fulfilled') {
    const data = detailResult.value?.data
    mvData.value = data
    cover.value = data?.cover ?? ''
    brs.value = data?.brs ?? []
  } else {
    console.error('[HaloMusic] load mv detail failed:', detailResult.reason)
  }

  if (urlResult.status === 'fulfilled') {
    src.value = urlResult.value?.data?.url ?? ''
  } else {
    console.error('[HaloMusic] load mv url failed:', urlResult.reason)
  }

  loading.value = false
  loadFailed.value = !src.value

  if (!loadFailed.value) {
    await nextTick()
    measureDesc()
    const artistId = mvData.value?.artistId
    if (typeof artistId === 'number' && artistId > 0) {
      void loadRelatedMvs(artistId)
    }
  }
}

/** 视频开始播放时暂停正在播放的音频 */
const handlePlay = () => {
  playerStore.setPause()
}

const handleShare = () => {
  if (!mvData.value?.id) return
  openUrl(`https://music.163.com/#/mv?id=${mvData.value.id}`)
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  mvId.value = router.currentRoute.value.params.id as string
  void loadMv()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.page-loading {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 16:9 视频舞台：圆角 + 深色底（深浅主题都成立），宽度自适应内容区 */
.mv-stage {
  width: min(100%, 1080px);
  margin: 0 auto;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background-color: var(--color-image-mask);
}

.mv-video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.mv-head {
  align-items: flex-end;
  gap: 20px;
}

.mv-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  min-width: 260px;
}

.detail-badge {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 9px;
  border-radius: var(--radius-full);
  background-color: var(--color-primary-bg);
  color: var(--color-primary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
}

.mv-title-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  max-width: 100%;
  min-width: 0;
}

.mv-title {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mv-duration {
  flex: none;
  color: var(--color-text-muted);
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
}

.mv-artists {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.mv-artist {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.mv-artist-avatar {
  width: 24px;
  height: 24px;
  flex: none;
  border-radius: var(--radius-full);
  object-fit: cover;
  background-color: var(--color-secondary-bg);
}

.detail-dot {
  margin: 0 6px;
  color: var(--color-text-subtle);
}

.detail-desc {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  max-width: 100%;
  margin: 0;
  overflow: hidden;
  color: var(--color-text-muted);
  font-size: 0.8125rem;
  line-height: 1.65;
  white-space: pre-line;
}

.detail-desc--expanded {
  display: block;
  overflow: visible;
  -webkit-line-clamp: unset;
}

.detail-desc-toggle {
  padding: 0;
  border: 0;
  background-color: transparent;
  color: var(--color-primary);
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
}

.detail-desc-toggle:hover {
  text-decoration: underline;
}

.detail-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.section-meta {
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
}
</style>
