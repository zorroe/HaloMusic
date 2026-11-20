<template>
  <div class="page">
    <!-- 加载骨架：统一详情页头的形状 + 与真实行高一致的歌曲骨架 -->
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
            width="4.5rem"
            height="20px"
            radius="var(--radius-full)"
          />
          <ea-skeleton variant="rect" width="18rem" height="34px" />
          <ea-skeleton variant="text" width="55%" />
          <ea-skeleton variant="text" width="70%" />
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
          v-for="index in 12"
          :key="`skeleton-track-${index}`"
          variant="row"
        />
      </div>
    </div>

    <ea-empty
      v-else-if="loadFailed"
      title="歌单加载失败"
      description="可能是网络异常或歌单不存在"
      action-text="重新加载"
      @action="loadAll"
    />

    <template v-else>
      <!-- 统一详情页头：大封面 + 类型徽标 / 标题 / 元信息 / 可折叠简介 / 操作区 -->
      <header class="page-head">
        <div class="detail-head">
          <div class="detail-cover">
            <lmg
              :src="playListDetail?.coverImgUrl"
              :width="400"
              :height="400"
              class="w-full h-full object-cover"
            />
          </div>

          <div class="detail-info">
            <span class="detail-badge">歌单</span>

            <div class="detail-title-row">
              <h1
                v-show="!isEdit"
                class="page-title detail-title"
                :title="playListDetail?.name"
              >
                {{ playListDetail?.name }}
              </h1>
              <input
                v-show="isEdit"
                ref="playlistNameInputRef"
                v-model="newName"
                type="text"
                placeholder="请输入歌单名"
                class="playlist-name-input"
                @blur="handleBlur"
                @keydown.enter="confirmEdit"
              />
              <button
                v-if="isOwner"
                type="button"
                class="detail-icon-btn"
                title="编辑歌单名"
                aria-label="编辑歌单名"
                @click="handleEdit"
              >
                <icon-park :icon="Edit" theme="filled" :size="18" />
              </button>
            </div>

            <p class="page-subtitle">
              <span>创建者</span>
              <span class="ea-link" @click="handleOpenCreator">{{
                playListDetail?.creator?.nickname
              }}</span>
              <template v-if="updateTimeText">
                <span class="detail-dot">·</span>
                <span>最后更新于 {{ updateTimeText }}</span>
              </template>
              <span class="detail-dot">·</span>
              <span>共 {{ trackCount }} 首</span>
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
                @click="handlePlayAll"
              >
                <icon-park :icon="PlayOne" theme="filled" :size="16" />
                播放全部
              </button>
              <button
                v-if="!isOwner"
                type="button"
                class="pill-btn"
                :title="playListDetail?.subscribed ? '取消收藏' : '收藏'"
                @click="handleSubscribePlayList"
              >
                <icon-park
                  :icon="Like"
                  :theme="playListDetail?.subscribed ? 'filled' : 'outline'"
                  :size="16"
                />
                {{ playListDetail?.subscribed ? '已收藏' : '收藏' }}
              </button>
              <button
                v-else
                type="button"
                class="pill-btn pill-btn--danger"
                title="删除歌单"
                @click="openDeleteModal"
              >
                <icon-park :icon="Delete" :size="16" />
                删除歌单
              </button>
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
        <music-table v-if="musicTableData.length" :data="musicTableData" />
        <ea-empty
          v-else
          title="歌单里还没有歌曲"
          description="去发现页看看别的歌单吧"
        />
      </section>
    </template>

    <ea-modal id="delete-modal" @confirm="handleDeletePlayList">
      <div class="font-bold">确定删除此歌单吗？</div>
    </ea-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { Delete, Edit, Like, PlayOne } from '@icon-park/vue-next'
import {
  deletePlayListApi,
  getPlayListAllApi,
  getPlayListDetailApi,
  subscribePlayListApi,
  updatePlaylistName,
} from '@/api/playList'
import type { PlayListDetail } from '@/types/playListRel'
import type { MusicBaseInfo } from '@/types/musicRel'
import { handleRequestError, openUrl } from '@/utils/common'
import { useUserInfoStore } from '@/store'
import { usePlayerStore } from '@/store/playerStore'
import pinia from '@/store/store'
import notify from '@/components/common/notification/notify'
import { mapSong } from '@/views/shared/mappers'

defineOptions({
  name: 'playlist',
})

const route = useRoute()
const router = useRouter()
const playerStore = usePlayerStore(pinia)
const userStore = useUserInfoStore(pinia)

const loaded = ref(false)
const loadFailed = ref(false)
const isEdit = ref(false)
const newName = ref('')
const playlistNameInputRef = ref<HTMLInputElement | null>(null)
const playListDetail = ref<PlayListDetail>()
const musicTableData = ref<MusicBaseInfo[]>([])

const playListId = computed(() => String(route.params.id ?? ''))
const currentUserId = computed(() => userStore.userInfo?.userId)
const isOwner = computed(
  () => playListDetail.value?.creator?.userId === currentUserId.value
)

const updateTimeText = computed(() => {
  const time = playListDetail.value?.trackUpdateTime
  if (typeof time !== 'number' || !time) return ''
  return dayjs(time).format('YYYY-MM-DD')
})

const trackCount = computed(
  () => playListDetail.value?.trackCount ?? musicTableData.value.length
)

const descriptionText = computed(() => {
  const description = playListDetail.value?.description
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
  const totalSeconds = musicTableData.value.reduce(
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
  const count = `${musicTableData.value.length} 首`
  return totalDurationText.value
    ? `共 ${count} · ${totalDurationText.value}`
    : `共 ${count}`
})

// ---------------- 简介折叠：只折叠 2 行，超出才显示「展开 / 收起」 ----------------
const descRef = ref<HTMLElement | null>(null)
const descExpanded = ref(false)
const descOverflow = ref(false)

/** 展开状态下不重新测量，避免把「展开」按钮测没 */
const measureDesc = () => {
  const element = descRef.value
  if (!element || descExpanded.value) return
  descOverflow.value = element.scrollHeight - element.clientHeight > 1
}

const handleResize = () => {
  measureDesc()
}

const loadDetail = async () => {
  const { playlist } = await getPlayListDetailApi({ id: playListId.value })
  playListDetail.value = playlist
}

const loadSongs = async () => {
  const { songs } = await getPlayListAllApi({ id: playListId.value })
  musicTableData.value = (songs ?? []).map(mapSong)
}

/** 详情与歌曲并行请求，任一失败都进入错误态（可重试） */
const loadAll = async () => {
  loaded.value = false
  loadFailed.value = false
  descExpanded.value = false
  descOverflow.value = false
  try {
    await Promise.all([loadDetail(), loadSongs()])
    loaded.value = true
    await nextTick()
    measureDesc()
  } catch (error) {
    console.error('[HaloMusic] load playlist failed:', error)
    loadFailed.value = true
    handleRequestError(error, '歌单加载失败，请稍后重试')
  }
}

const handleOpenCreator = () => {
  const creatorId = playListDetail.value?.creator?.userId
  if (!creatorId) return
  openUrl(`https://music.163.com/#/user/home?id=${creatorId}`)
}

const handlePlayAll = () => {
  const ids = musicTableData.value.map((music) => music.id)
  if (!ids.length) {
    notify({ message: '歌单里还没有歌曲', type: 'warning' })
    return
  }
  playerStore.playMulti(ids.join(','))
}

const handleEdit = async () => {
  isEdit.value = true
  newName.value = playListDetail.value?.name ?? ''
  await nextTick()
  playlistNameInputRef.value?.focus()
}

const handleBlur = () => {
  isEdit.value = false
}

const confirmEdit = async () => {
  const name = newName.value.trim()
  if (!name) {
    isEdit.value = false
    return
  }
  try {
    await updatePlaylistName({ id: playListId.value, name })
    if (playListDetail.value) playListDetail.value.name = name
    notify({ message: '修改成功', type: 'success' })
  } catch (error) {
    console.error('[HaloMusic] rename playlist failed:', error)
    handleRequestError(error, '修改失败')
  } finally {
    isEdit.value = false
  }
}

const handleDeletePlayList = async () => {
  try {
    await deletePlayListApi({ id: playListId.value })
    notify({ message: '歌单已删除', type: 'success' })
    router.push('/me')
  } catch (error) {
    console.error('[HaloMusic] delete playlist failed:', error)
    handleRequestError(error, '删除失败，请稍后重试')
  }
}

/** 打开删除确认弹窗：ea-modal 用隐藏 checkbox 作为开关，点它即可触发 change */
const openDeleteModal = () => {
  const toggle = document.getElementById('delete-modal')
  if (toggle instanceof HTMLInputElement) toggle.click()
}

const handleSubscribePlayList = async () => {
  try {
    await subscribePlayListApi({
      id: playListId.value,
      t: playListDetail.value?.subscribed ? 2 : 1,
    })
    await loadDetail()
  } catch (error) {
    console.error('[HaloMusic] subscribe playlist failed:', error)
    handleRequestError(error, '操作失败，请稍后重试')
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  void loadAll()
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

.detail-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  min-width: 0;
}

.detail-title {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-icon-btn {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: var(--radius-full);
  background-color: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);
}

.detail-icon-btn:hover {
  background-color: var(--color-hover);
  color: var(--color-text);
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

/* 危险操作：沿用胶囊按钮的尺寸，只换配色 */
.pill-btn--danger {
  color: var(--color-danger);
  border-color: color-mix(in srgb, var(--color-danger) 38%, transparent);
  background-color: var(--color-card-bg);
}

.pill-btn--danger:hover {
  border-color: var(--color-danger);
  background-color: var(--color-danger-bg);
}

.detail-count {
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
}

/* 歌单名内联编辑 */
.playlist-name-input {
  min-width: 240px;
  padding: 2px 8px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  outline: none;
  background-color: var(--color-input-bg);
  color: var(--color-text);
  font-family: inherit;
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.playlist-name-input:focus {
  border-color: var(--color-primary);
}
</style>
