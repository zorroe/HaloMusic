<template>
  <div class="page">
    <!-- 加载骨架 -->
    <div v-if="!loaded && !loadFailed" class="page-loading" aria-busy="true">
      <div class="detail-head">
        <ea-skeleton
          variant="rect"
          :width="176"
          :height="176"
          radius="var(--radius-lg)"
        />
        <div class="detail-info">
          <ea-skeleton
            variant="rect"
            width="4rem"
            height="20px"
            radius="var(--radius-full)"
          />
          <ea-skeleton variant="rect" width="14rem" height="34px" />
          <ea-skeleton variant="text" width="45%" />
          <ea-skeleton variant="text" width="65%" />
          <div class="detail-actions">
            <ea-skeleton
              variant="rect"
              width="7.5rem"
              height="34px"
              radius="var(--radius-full)"
            />
            <ea-skeleton
              variant="rect"
              width="6rem"
              height="34px"
              radius="var(--radius-full)"
            />
          </div>
        </div>
      </div>
      <div class="flex flex-col">
        <ea-skeleton
          v-for="index in 10"
          :key="`skeleton-album-track-${index}`"
          variant="row"
        />
      </div>
    </div>

    <ea-empty
      v-else-if="loadFailed"
      title="专辑加载失败"
      description="可能是网络异常或专辑不存在"
      action-text="重新加载"
      @action="getAlbum"
    />

    <template v-else>
      <!-- 统一详情页头：大封面 + 类型徽标 / 标题 / 元信息 / 可折叠简介 / 操作区 -->
      <header class="page-head">
        <div class="detail-head">
          <div class="detail-cover">
            <lmg
              :src="albumInfo?.picUrl"
              :width="400"
              :height="400"
              class="w-full h-full object-cover"
            />
          </div>

          <div class="detail-info">
            <span class="detail-badge">专辑</span>

            <h1 class="page-title detail-title" :title="albumInfo?.name">
              {{ albumInfo?.name }}
            </h1>

            <p class="page-subtitle">
              <span>歌手</span>
              <span
                class="ea-link"
                @click="routeTo(`/artist/${albumInfo?.artist?.id}`)"
                >{{ albumInfo?.artist?.name }}</span
              >
              <template v-if="albumMeta">
                <span class="detail-dot">·</span>
                <span>{{ albumMeta }}</span>
              </template>
              <template v-if="albumInfo?.company">
                <span class="detail-dot">·</span>
                <span>{{ albumInfo?.company }}</span>
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

            <div class="detail-actions">
              <button
                type="button"
                class="pill-btn pill-btn--primary"
                @click="playMusicByAlbumId"
              >
                <icon-park :icon="PlayOne" theme="filled" :size="16" />
                播放全部
              </button>
              <!-- 专辑收藏状态来自账号（本项目没有收藏专辑接口），保留为状态展示 -->
              <span
                class="pill-btn pill-btn--state"
                :title="
                  isSub
                    ? '已收藏（状态来自网易云账号）'
                    : '未收藏（可在网页版收藏）'
                "
              >
                <icon-park
                  :icon="Like"
                  :theme="isSub ? 'filled' : 'outline'"
                  :size="16"
                />
                {{ isSub ? '已收藏' : '未收藏' }}
              </span>
            </div>
          </div>
        </div>
      </header>

      <!-- 歌曲列表 -->
      <section class="section">
        <div class="section-head">
          <h2 class="section-title">歌曲列表</h2>
          <span class="muted detail-count">{{ songsMeta }}</span>
        </div>
        <music-table
          v-if="albumSongs.length"
          :data="albumSongs"
          :showCover="false"
        ></music-table>
        <ea-empty
          v-else
          title="专辑里还没有歌曲"
          description="换个专辑听听吧"
        />
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import dayjs from 'dayjs'
import { Like, PlayOne } from '@icon-park/vue-next'
import { getAlbumApi } from '@/api/album'
import type { AlbumInfo } from '@/types/albumRel'
import type { MusicBaseInfo } from '@/types/musicRel'
import { handleRequestError, routeTo } from '@/utils/common'
import { usePlayerStore } from '@/store/playerStore'
import pinia from '@/store/store'
import notify from '@/components/common/notification/notify'
import { mapSong } from '@/views/shared/mappers'

defineOptions({
  name: 'album',
})

const route = useRoute()
const playerStore = usePlayerStore(pinia)

const loaded = ref(false)
const loadFailed = ref(false)
const albumId = computed(() => String(route.params.id ?? ''))
const albumSongs = ref<MusicBaseInfo[]>([])
const albumInfo = ref<AlbumInfo>()

const readSubAlbumIds = (): number[] => {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem('subAlbumIds') || '[]'
    )
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => Number(item))
      .filter((id) => Number.isFinite(id))
  } catch {
    return []
  }
}

const subAlbumIds = ref<number[]>(readSubAlbumIds())

const isSub = computed(() =>
  subAlbumIds.value.some((id) => id === albumInfo.value?.id)
)

const albumMeta = computed(() => {
  const album = albumInfo.value
  if (!album) return ''
  const year =
    album.publishTime && Number.isFinite(album.publishTime)
      ? dayjs(album.publishTime).format('YYYY')
      : ''
  const size = `${album.size} 首`
  return year ? `${year} · ${size}` : size
})

const descriptionText = computed(() => {
  const album = albumInfo.value
  const description = album?.description || album?.briefDesc
  return typeof description === 'string' ? description.trim() : ''
})

/** 把 MusicTable 里的 `m:ss` 时长累加成列表总时长文案 */
const parseDurationSeconds = (duration: string | number): number => {
  if (typeof duration === 'number') {
    if (!Number.isFinite(duration) || duration <= 0) return 0
    return duration > 999 ? duration / 1000 : duration
  }
  if (!duration) return 0
  const parts = String(duration)
    .split(':')
    .map((part) => Number(part))
  if (parts.some((part) => !Number.isFinite(part))) return 0
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return 0
}

const totalDurationText = computed(() => {
  const totalSeconds = albumSongs.value.reduce(
    (sum, music) => sum + parseDurationSeconds(music.duration),
    0
  )
  if (totalSeconds <= 0) return ''
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.round((totalSeconds % 3600) / 60)
  if (hours > 0) return `${hours} 小时 ${minutes} 分钟`
  return `${Math.max(1, minutes)} 分钟`
})

const songsMeta = computed(() => {
  const count = `共 ${albumSongs.value.length} 首`
  return totalDurationText.value
    ? `${count} · ${totalDurationText.value}`
    : count
})

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

const getAlbum = async () => {
  loaded.value = false
  loadFailed.value = false
  descExpanded.value = false
  descOverflow.value = false
  try {
    const { songs, album } = await getAlbumApi({ id: albumId.value })
    albumInfo.value = album
    albumSongs.value = (songs ?? []).map(mapSong)
    loaded.value = true
    await nextTick()
    measureDesc()
  } catch (error) {
    console.error('[HaloMusic] load album failed:', error)
    loadFailed.value = true
    handleRequestError(error, '专辑加载失败，请稍后重试')
  }
}

const playMusicByAlbumId = () => {
  const ids = albumSongs.value.map((item) => item.id)
  if (!ids.length) {
    notify({ message: '专辑里还没有歌曲', type: 'warning' })
    return
  }
  playerStore.playMulti(ids.join(','))
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  void getAlbum()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
/* ---------------- 统一详情页头 ---------------- */
.page-loading {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.detail-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 28px;
  width: 100%;
  min-width: 0;
}

.detail-cover {
  flex: none;
  width: 176px;
  height: 176px;
  overflow: hidden;
  border-radius: var(--radius-lg);
  background-color: var(--color-secondary-bg);
  box-shadow: var(--shadow-sm);
}

.detail-info {
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

.detail-title {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  margin-top: 2px;
}

/* 非交互状态胶囊：只展示收藏状态，不假装可以点击 */
.pill-btn--state {
  cursor: default;
  color: var(--color-text-muted);
}

.pill-btn--state:hover {
  background-color: var(--color-card-bg);
  border-color: var(--color-border);
}

.detail-count {
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
}
</style>
