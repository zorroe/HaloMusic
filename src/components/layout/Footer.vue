<template>
  <div class="footer-root">
    <div class="progress-bar">
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
        :dot-size="12"
      >
      </vue-slider>
    </div>

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

      <div class="footer-controls">
        <icon-park
          :icon="LeftOne"
          :size="20"
          theme="filled"
          fill="black"
          class="footer-icon btn-animation"
          @click="playerStore.playPrev"
        ></icon-park>
        <icon-park
          :icon="playIcon"
          :size="36"
          theme="filled"
          fill="black"
          class="footer-icon btn-animation"
          @click="playerStore.togglePlay"
        ></icon-park>
        <icon-park
          :icon="RightOne"
          :size="20"
          theme="filled"
          fill="black"
          class="footer-icon btn-animation"
          @click="playerStore.playNext"
        ></icon-park>
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
        <div class="footer-volume">
          <icon-park
            :icon="volumeIcon"
            :size="18"
            theme="filled"
            fill="black"
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
import { computed, ref } from 'vue'
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
import Player from './Player.vue'

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
.footer-root {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.progress-bar {
  margin-top: -6px;
  margin-bottom: -6px;
  top: 0;
  width: 100%;
  position: fixed;
  z-index: 9001;
}

.ea-footer {
  height: 64px;
  border-radius: 0 0 4px 4px;
  padding: 0 32px;
  width: 100%;
  display: flex;
  justify-content: space-around;
  align-items: center;
}

.footer-song {
  display: flex;
  align-items: center;
}

.footer-cover {
  width: 40px;
  height: 40px;
  margin-right: 16px;
  border-radius: 9999px;
  cursor: pointer;
  object-fit: cover;
}

.footer-song-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 144px;
}

.footer-song-name {
  font-size: 14px;
  font-weight: 700;
  width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.footer-song-singers {
  display: flex;
  gap: 8px;
  font-size: 12px;
  width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.footer-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-grow: 1;
  gap: 16px;
}

.footer-tools {
  display: flex;
  align-items: center;
  gap: 16px;
}

.footer-icon {
  padding: 4px;
  border-radius: 9999px;
  cursor: pointer;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    transform var(--motion-base) var(--ease-spring),
    scale var(--motion-base) var(--ease-spring);
}

.footer-icon:hover {
  background-color: rgba(243, 244, 246, 0.5);
}

.quality-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.footer-volume {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  width: 128px;
}

.volume-bar {
  width: 84px;
}

/* 进度条 / 音量条 hover 时滑块圆点轻微放大（vue-slider 内部结构） */
.progress-bar :deep(.vue-slider-dot-handle),
.volume-bar :deep(.vue-slider-dot-handle) {
  transition: transform var(--motion-fast) var(--ease-standard);
}

.progress-bar:hover :deep(.vue-slider-dot-handle),
.volume-bar:hover :deep(.vue-slider-dot-handle) {
  transform: scale(1.15);
}

/* ---------------- 播放队列抽屉 ---------------- */
.playlist-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.playlist-summary {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.playlist-title {
  font-size: 18px;
  font-weight: 700;
}

.playlist-meta {
  font-size: 12px;
  color: rgb(107, 114, 128);
}

.playlist-clear {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgb(229, 231, 235);
  background-color: #fff;
  color: rgb(55, 65, 81);
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-standard);
}

.playlist-clear:hover:not(:disabled) {
  background-color: rgb(243, 244, 246);
}

.playlist-clear:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.playlist-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.playlist-item {
  display: flex;
  gap: 12px;
  width: 100%;
  height: 44px;
  align-items: center;
  justify-content: space-between;
  border-radius: 8px;
  padding: 0 12px;
  cursor: default;
  transition: background-color var(--motion-fast) var(--ease-standard);
}

.playlist-item:hover {
  background-color: rgb(234, 239, 253);
}

.playlist-item.playing {
  background-color: rgb(234, 239, 253);
  color: rgb(51, 94, 234);
}

/* 当前播放曲的动感音条（与 MusicTable 同一套 class，本文件独立作用域） */
.music-bars {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 12px;
}

.music-bar {
  width: 3px;
  height: 12px;
  border-radius: 1px;
  background-color: currentColor;
  transform-origin: bottom;
  animation: halo-bar-bounce 0.9s var(--ease-in-out) infinite;
}

.music-bar:nth-child(2) {
  animation-delay: 0.2s;
}

.music-bar:nth-child(3) {
  animation-delay: 0.4s;
}

/* 暂停时音条静止，恢复播放后从当前相位继续摆动 */
.music-bars.is-paused .music-bar {
  animation-play-state: paused;
}

.playlist-index {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 20px;
  text-align: center;
  font-size: 12px;
  color: rgb(156, 163, 175);
}

.playlist-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.playlist-name {
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.playlist-singers {
  display: flex;
  gap: 4px;
  font-size: 12px;
  color: rgb(107, 114, 128);
  overflow: hidden;
  white-space: nowrap;
}

.playlist-duration {
  font-size: 12px;
  color: rgb(107, 114, 128);
  font-variant-numeric: tabular-nums;
}

.playlist-remove {
  cursor: pointer;
  color: rgb(156, 163, 175);
  opacity: 0;
  flex-shrink: 0;
  transition:
    opacity var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);
}

.playlist-item:hover .playlist-remove {
  opacity: 1;
}

.playlist-remove:hover {
  color: rgb(239, 68, 68);
}

.playlist-empty {
  padding: 32px 0;
  text-align: center;
  font-size: 14px;
  color: rgb(156, 163, 175);
}

.fm-playing {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  min-height: 200px;
  font-size: 16px;
  color: rgb(55, 65, 81);
}

/* ---------------- 音质选择 ---------------- */
.quality-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 260px;
}

.quality-title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 4px;
}

.quality-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.quality-option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 8px 12px;
  border: 0;
  border-radius: 8px;
  background-color: transparent;
  color: rgb(17, 24, 39);
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-standard);
}

.quality-option:hover {
  background-color: rgb(243, 244, 246);
}

.quality-option.active {
  color: rgb(51, 94, 234);
  background-color: rgb(234, 239, 253);
  font-weight: 700;
}

.quality-desc {
  margin-left: auto;
  font-size: 12px;
  color: rgb(156, 163, 175);
}

.quality-check {
  flex-shrink: 0;
}
</style>
