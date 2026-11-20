<template>
  <div class="footer-root">
    <div class="ea-footer">
      <div class="footer-song">
        <img
          :src="coverUrl"
          class="footer-cover"
          alt=""
          @click="playerStore.openPlayerPage"
        />
        <div class="footer-song-info">
          <div class="footer-song-name">{{ songName }}</div>
          <div class="footer-song-singers">
            <span
              v-for="singer in singers"
              :key="singer.id"
              class="ea-link"
              @click="routeTo(`/artist/${singer.id}`)"
            >
              {{ singer.name }}
            </span>
          </div>
        </div>
      </div>

      <div class="footer-center">
        <div class="footer-controls">
          <icon-park
            :icon="LeftOne"
            :size="18"
            theme="filled"
            fill="currentColor"
            class="footer-icon"
            title="上一首"
            @click="playerStore.playPrev"
          ></icon-park>
          <button
            type="button"
            class="footer-play"
            :title="playerStore.paused ? '播放' : '暂停'"
            @click="playerStore.togglePlay"
          >
            <icon-park
              :icon="playIcon"
              :size="20"
              theme="filled"
              fill="currentColor"
            ></icon-park>
          </button>
          <icon-park
            :icon="RightOne"
            :size="18"
            theme="filled"
            fill="currentColor"
            class="footer-icon"
            title="下一首"
            @click="playerStore.playNext"
          ></icon-park>
        </div>

        <div class="footer-progress">
          <span class="footer-time">{{
            formatDuration(playerStore.currentTime)
          }}</span>
          <div class="footer-progress-bar">
            <vue-slider
              v-model="progress"
              :min="0"
              :max="sliderMax"
              :interval="1"
              :lazy="true"
              :drag-on-click="true"
              :duration="0"
              :disabled="playerStore.duration <= 0"
              :tooltip-formatter="formatDuration"
              :height="2"
              :dot-size="10"
            >
            </vue-slider>
          </div>
          <span class="footer-time">{{ formatDuration(playerStore.duration) }}</span>
        </div>
      </div>

      <div class="footer-tools">
        <icon-park
          :icon="playModeIcon"
          :size="20"
          class="footer-icon btn-animation"
          :title="playModeText"
          @click="playerStore.toggleLoop"
        ></icon-park>
        <icon-park
          :icon="MusicList"
          :size="20"
          class="footer-icon btn-animation"
          title="播放队列"
          @click="changeDrawerStatus(true)"
        ></icon-park>
        <label
          for="song-quality"
          class="footer-icon btn-animation quality-trigger"
          title="音质选择"
        >
          <icon-park :icon="VoiceOne" :size="20"></icon-park>
        </label>
        <button
          type="button"
          class="footer-icon btn-animation footer-timer"
          :class="{ 'is-active': playerStore.sleepTimerRunning }"
          :title="sleepTimerTitle"
          @click="openSleepTimerPanel"
        >
          <icon-park :icon="Timer" :size="20"></icon-park>
          <span v-if="playerStore.sleepTimerRunning" class="footer-timer-text">
            {{ sleepTimerLabel }}
          </span>
        </button>
        <div class="footer-volume">
          <icon-park
            :icon="volumeIcon"
            :size="18"
            theme="filled"
            fill="currentColor"
            @click="playerStore.toggleMute"
          ></icon-park>
          <div class="volume-bar">
            <vue-slider
              v-model="volume"
              :min="0"
              :max="100"
              :interval="1"
              :drag-on-click="true"
              :duration="0"
              tooltip="none"
              :dot-size="12"
            >
            </vue-slider>
          </div>
        </div>
        <icon-park
          :icon="Up"
          :size="20"
          class="footer-icon btn-animation"
          title="打开播放页"
          @click="playerStore.openPlayerPage"
        ></icon-park>
      </div>
    </div>

    <ea-drawer :drawer-show="drawerShow" @close="changeDrawerStatus(false)">
      <template v-if="!isFm">
        <div class="playlist-header">
          <div class="playlist-summary">
            <span class="playlist-title">播放队列</span>
            <span class="playlist-meta"
              >共 {{ playlist.length }} 首 ·
              {{ formatDuration(totalDuration) }}</span
            >
          </div>
          <button
            type="button"
            class="playlist-clear"
            :disabled="playlist.length === 0"
            @click="handleClearPlaylist"
          >
            清空
          </button>
        </div>

        <div v-if="playlist.length === 0" class="playlist-empty">
          播放队列还是空的，去挑首歌吧
        </div>
        <div v-else class="playlist-list">
          <div
            v-for="(music, index) in playlist"
            :key="`${music.id}-${index}`"
            class="playlist-item"
            :class="{ playing: isCurrentSong(music) }"
            @dblclick="handlePlayMusic(music)"
          >
            <span class="playlist-index">
              <span
                v-if="isCurrentSong(music)"
                class="music-bars"
                :class="{ 'is-paused': playerStore.paused }"
                aria-hidden="true"
              >
                <i class="music-bar"></i>
                <i class="music-bar"></i>
                <i class="music-bar"></i>
              </span>
              <template v-else>{{ index + 1 }}</template>
            </span>
            <div class="playlist-main">
              <div class="playlist-name">{{ music.name }}</div>
              <div class="playlist-singers">
                <span v-for="singer in music.ar || []" :key="singer.id">
                  {{ singer.name }}
                </span>
              </div>
            </div>
            <div class="playlist-duration">
              {{ formatDuration(getSongDuration(music)) }}
            </div>
            <icon-park
              :icon="Delete"
              :size="16"
              class="playlist-remove"
              title="从队列中移除"
              @click.stop="handleRemoveSong(music)"
            ></icon-park>
          </div>
        </div>
      </template>
      <div v-else class="fm-playing">私人FM播放中</div>
    </ea-drawer>

    <ea-modal id="song-quality" :show-btn="false">
      <div class="quality-panel">
        <div class="quality-title">音质选择</div>
        <div class="quality-list">
          <button
            v-for="option in qualityOptions"
            :key="option.value"
            type="button"
            class="quality-option"
            :class="{ active: playerStore.quality === option.value }"
            @click="handleSelectQuality(option.value)"
          >
            <span class="quality-label">{{ option.label }}</span>
            <span class="quality-desc">{{ option.desc }}</span>
            <icon-park
              v-if="playerStore.quality === option.value"
              :icon="Check"
              :size="16"
              class="quality-check"
            ></icon-park>
          </button>
        </div>
      </div>
    </ea-modal>

    <Player />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  Check,
  Delete,
  LeftOne,
  MusicList,
  Pause,
  PlayCycle,
  PlayOnce,
  PlayOne,
  RightOne,
  ShuffleOne,
  Timer,
  Up,
  VoiceOne,
  VolumeMute,
  VolumeNotice,
  VolumeSmall,
} from '@icon-park/vue-next'
import { usePlayerStore } from '@/store/playerStore'
import pinia from '@/store/store'
import { formatTrackTime, routeTo } from '@/utils/common'
import type { SongDetail, SongLevel } from '@/utils/player'
import { formatSleepCountdown } from '@/utils/player-timer'
import Player from './Player.vue'

/**
 * 「展开睡眠定时面板」的一次性事件名（与 Player.vue 保持一致）。
 * Footer 只有入口，面板在播放页内；用 window 事件避免为 UI 开关去改 store。
 */
const OPEN_SLEEP_TIMER_EVENT = 'halo:open-sleep-timer-panel'

const playerStore = usePlayerStore(pinia)

const playlist = computed(() => playerStore.playlist)
const song = computed(() => playerStore.current.currentSong)
const coverUrl = computed(() => song.value?.al?.picUrl || '')
const songName = computed(() => song.value?.name || '暂无播放')
const singers = computed(() => song.value?.ar || [])
const isFm = computed(() => playerStore.isFm)

const drawerShow = ref(false)

const volume = computed({
  get: () => playerStore.volume,
  set: (value: number) => playerStore.setVolume(value),
})

const playIcon = computed(() => (playerStore.paused ? PlayOne : Pause))

const volumeIcon = computed(() => {
  if (playerStore.volume === 0) return VolumeMute
  if (playerStore.volume <= 60) return VolumeSmall
  return VolumeNotice
})

const playModeIcon = computed(() => {
  if (playerStore.cycleMode === 0) return PlayOnce
  if (playerStore.cycleMode === 2) return ShuffleOne
  return PlayCycle
})

const playModeText = computed(() => {
  if (playerStore.cycleMode === 0) return '单曲循环'
  if (playerStore.cycleMode === 2) return '随机播放'
  return '列表循环'
})

// ---------------- 睡眠定时入口（面板在播放页内） ----------------
const sleepTimerLabel = computed(() =>
  playerStore.sleepTimerRunning
    ? formatSleepCountdown(playerStore.sleepTimerRemaining)
    : ''
)

const sleepTimerTitle = computed(() =>
  playerStore.sleepTimerRunning
    ? `睡眠定时剩余 ${sleepTimerLabel.value}，点击在播放页调整`
    : '睡眠定时（在播放页设置）'
)

/** 打开播放页，并通知 Player 展开定时面板 */
const openSleepTimerPanel = () => {
  playerStore.openPlayerPage()
  window.dispatchEvent(new CustomEvent(OPEN_SLEEP_TIMER_EVENT))
}

// ---------------- 进度条 ----------------
const sliderMax = computed(() =>
  playerStore.duration > 0 ? playerStore.duration : 1
)

const progress = computed({
  get: () => Math.min(playerStore.currentTime, sliderMax.value),
  set: (value: number) => playerStore.seek(value),
})

/** 统一时间格式化：0 秒也显示 0:00（formatTrackTime 对 0 返回空串） */
const formatDuration = (value: number | string): string => {
  const seconds = Number(value)
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00'
  return formatTrackTime(seconds) || '0:00'
}

const getSongDuration = (music: SongDetail): number => {
  const durationMs = Number(music?.dt)
  return Number.isFinite(durationMs) && durationMs > 0 ? durationMs / 1000 : 0
}

const totalDuration = computed(() =>
  playlist.value.reduce((total, music) => total + getSongDuration(music), 0)
)

// ---------------- 队列操作 ----------------
const changeDrawerStatus = (status: boolean) => {
  drawerShow.value = status
}

/**
 * 侧边栏的「播放队列」入口通过 window 事件打开抽屉，
 * 避免为了一个 UI 开关去改 store（与播放页定时面板同一思路）。
 */
const OPEN_QUEUE_EVENT = 'halo:open-queue'
const handleOpenQueueEvent = () => changeDrawerStatus(true)

onMounted(() => {
  window.addEventListener(OPEN_QUEUE_EVENT, handleOpenQueueEvent)
})

onBeforeUnmount(() => {
  window.removeEventListener(OPEN_QUEUE_EVENT, handleOpenQueueEvent)
})

const isCurrentSong = (music: SongDetail): boolean =>
  String(music?.id) === String(song.value?.id ?? '')

const handlePlayMusic = (music: SongDetail) => {
  void playerStore.playOne(music.id)
}

const handleRemoveSong = (music: SongDetail) => {
  playerStore.removeSong(music.id)
}

const handleClearPlaylist = () => {
  playerStore.clearPlaylist()
}

// ---------------- 音质选择 ----------------
const qualityOptions: Array<{ value: SongLevel; label: string; desc: string }> =
  [
    { value: 'standard', label: '标准音质', desc: '128kbps' },
    { value: 'higher', label: '较高音质', desc: '192kbps' },
    { value: 'exhigh', label: '极高音质', desc: '320kbps' },
    { value: 'lossless', label: '无损音质', desc: 'FLAC' },
  ]

/** 关闭 ea-modal（组件内部用 id 对应的 checkbox 控制显隐） */
const closeQualityModal = () => {
  const toggle = document.getElementById(
    'song-quality'
  ) as HTMLInputElement | null
  if (toggle?.checked) toggle.click()
}

const handleSelectQuality = async (level: SongLevel) => {
  closeQualityModal()
  await playerStore.setQuality(level)
}
</script>

<style scoped>
/* ===========================================================================
 * 底部播放条（72px，三栏：歌曲信息 / 控制与进度 / 工具）
 * ========================================================================= */
.footer-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  color: var(--color-text);
}

.ea-footer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr) minmax(0, 1fr);
  align-items: center;
  gap: 20px;
  height: 100%;
  padding: 0 20px;
}

/* ---------------- 左：歌曲信息 ---------------- */
.footer-song {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.footer-cover {
  width: 48px;
  height: 48px;
  flex: none;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  object-fit: cover;
  cursor: pointer;
  transition: transform var(--motion-fast) var(--ease-standard);
}

.footer-cover:hover {
  transform: scale(1.06);
}

.footer-song-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.footer-song-name {
  font-size: 0.875rem;
  font-weight: 700;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.footer-song-singers {
  display: flex;
  gap: 6px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* ---------------- 中：控制 + 进度 ---------------- */
.footer-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.footer-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.footer-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border-radius: var(--radius-full);
  color: var(--color-text-muted);
  cursor: pointer;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard),
    transform var(--motion-base) var(--ease-spring);
}

.footer-icon:hover {
  background-color: var(--color-hover);
  color: var(--color-text);
}

.footer-icon:active {
  transform: scale(0.92);
}

.footer-play {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: var(--radius-full);
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  cursor: pointer;
  box-shadow: var(--shadow-xs);
  transition:
    transform var(--motion-base) var(--ease-spring),
    filter var(--motion-fast) var(--ease-standard);
}

.footer-play:hover {
  filter: brightness(1.08);
  transform: scale(1.05);
}

.footer-play:active {
  transform: scale(0.95);
}

.footer-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: 560px;
}

.footer-progress-bar {
  flex: 1;
  min-width: 0;
}

.footer-time {
  flex: none;
  min-width: 38px;
  font-size: 0.6875rem;
  color: var(--color-text-subtle);
  font-variant-numeric: tabular-nums;
  text-align: center;
}

/* ---------------- 右：工具 ---------------- */
.footer-tools {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
}

.quality-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* 睡眠定时入口：运行时显示倒计时并高亮 */
.footer-timer {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 0;
  background-color: transparent;
  color: var(--color-text-muted);
  font-family: inherit;
  font-size: 0.6875rem;
  cursor: pointer;
}

.footer-timer.is-active {
  color: var(--color-primary);
}

.footer-timer-text {
  font-size: 0.6875rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.footer-volume {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-muted);
}

.volume-bar {
  width: 84px;
}

/* ---------------- 播放队列抽屉 ---------------- */
.playlist-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
}

.playlist-summary {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.playlist-title {
  font-size: 1rem;
  font-weight: 700;
}

.playlist-meta {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.playlist-clear {
  height: 28px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--color-text-muted);
  font-family: inherit;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-standard);
}

.playlist-clear:hover:not(:disabled) {
  background-color: var(--color-hover);
  color: var(--color-text);
}

.playlist-clear:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.playlist-empty {
  padding: 32px 0;
  text-align: center;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.playlist-list {
  display: flex;
  flex-direction: column;
  padding: 6px 0;
}

.playlist-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  cursor: default;
  transition: background-color var(--motion-fast) var(--ease-standard);
}

.playlist-item:hover {
  background-color: var(--color-hover);
}

.playlist-index {
  width: 20px;
  flex: none;
  text-align: center;
  font-size: 0.75rem;
  color: var(--color-text-subtle);
  font-variant-numeric: tabular-nums;
}

.playlist-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.playlist-name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 0.8125rem;
  font-weight: 600;
}

.playlist-singers {
  display: flex;
  gap: 6px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 0.6875rem;
  color: var(--color-text-muted);
}

.playlist-duration {
  flex: none;
  font-size: 0.6875rem;
  color: var(--color-text-subtle);
  font-variant-numeric: tabular-nums;
}

.playlist-remove {
  flex: none;
  color: var(--color-text-subtle);
  cursor: pointer;
  opacity: 0;
  transition: opacity var(--motion-fast) var(--ease-standard);
}

.playlist-item:hover .playlist-remove {
  opacity: 1;
}

.playlist-remove:hover {
  color: var(--color-danger);
}

.fm-playing {
  padding: 32px 0;
  text-align: center;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

/* 当前播放行的音条 */
.music-bars {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 12px;
}

.music-bar {
  width: 2px;
  background-color: var(--color-primary);
  animation: halo-bar-bounce 0.9s ease-in-out infinite;
}

.music-bar:nth-child(1) {
  animation-delay: -0.2s;
}

.music-bar:nth-child(2) {
  animation-delay: -0.5s;
}

.music-bar:nth-child(3) {
  animation-delay: -0.1s;
}

.music-bars.is-paused .music-bar {
  animation-play-state: paused;
  height: 4px;
}

/* ---------------- 音质选择弹窗 ---------------- */
.quality-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 280px;
}

.quality-title {
  font-size: 1rem;
  font-weight: 700;
}

.quality-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.quality-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-standard);
}

.quality-option:hover {
  background-color: var(--color-hover);
}

.quality-option.active {
  border-color: var(--color-primary);
  background-color: var(--color-primary-bg);
  color: var(--color-primary);
}

.quality-label {
  font-size: 0.8125rem;
  font-weight: 600;
}

.quality-desc {
  margin-left: auto;
  font-size: 0.6875rem;
  color: var(--color-text-subtle);
}

.quality-check {
  color: var(--color-primary);
}
</style>