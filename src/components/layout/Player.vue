<template>
  <Teleport to="body">
    <Transition name="player-page">
      <div v-show="showPlayerPage" class="ea-player-page">
        <!-- 环境光：用当前封面做两层模糊光晕，空封面时不渲染 -->
        <div v-if="ambientCoverUrl" class="player-ambient" aria-hidden="true">
          <img
            :src="ambientCoverUrl"
            class="player-ambient-img player-ambient-img--base"
            alt=""
          />
          <img :src="ambientCoverUrl" class="player-ambient-img" alt="" />
          <div class="player-ambient-veil"></div>
        </div>

        <div class="player-left">
          <div class="player-cover">
            <div
              class="player-vinyl"
              :class="{ 'is-playing': !playerStore.paused }"
            >
              <lmg
                :src="coverUrl"
                :width="500"
                :height="500"
                class="player-cover-img"
              />
            </div>
          </div>

          <div class="player-song">
            <div class="player-song-name">{{ songName }}</div>
            <div class="player-song-singers">
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

          <div class="player-progress">
            <span class="player-time">{{
              formatTime(playerStore.currentTime)
            }}</span>
            <div class="player-progress-bar">
              <vue-slider
                v-model="progress"
                :min="0"
                :max="sliderMax"
                :interval="1"
                :lazy="true"
                :drag-on-click="true"
                :duration="0"
                :disabled="playerStore.duration <= 0"
                :tooltip-formatter="formatTime"
                :dot-size="12"
                :height="4"
              >
              </vue-slider>
            </div>
            <span class="player-time">{{
              formatTime(playerStore.duration)
            }}</span>
          </div>

          <div class="player-controls">
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

          <div class="player-volume">
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
        </div>

        <div class="player-lyric-panel">
          <div ref="lyricContainer" class="lyric-list">
            <div v-if="lyrics.length === 0" class="lyric-empty">暂无歌词</div>
            <div
              v-for="(line, idx) in lyrics"
              :key="`${idx}-${line.time}`"
              :ref="(el) => setLyricRef(el, idx)"
              class="lyric-line"
              :class="{ 'is-sing': idx === playerStore.activeLyricIndex }"
              @click="handleSeekLyric(line.time)"
            >
              <span>{{ line.text }}</span>
            </div>
          </div>
        </div>

        <div class="player-close">
          <icon-park
            :icon="Down"
            :size="20"
            class="player-close-icon"
            @click="playerStore.closePlayerPage"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import {
  Down,
  LeftOne,
  Pause,
  PlayOne,
  RightOne,
  VolumeMute,
  VolumeNotice,
  VolumeSmall,
} from '@icon-park/vue-next'
import { usePlayerStore } from '@/store/playerStore'
import pinia from '@/store/store'
import { formatTrackTime, routeTo } from '@/utils/common'

const playerStore = usePlayerStore(pinia)

const showPlayerPage = computed(() => playerStore.showPlayerPage)
const lyrics = computed(() => playerStore.lyrics)

const song = computed(() => playerStore.current.currentSong)
const coverUrl = computed(() => song.value?.al?.picUrl || '')
/**
 * 环境光层用的封面地址：
 * - 空封面返回 ''，模板据此不渲染环境光层；
 * - 与 Image.vue 完全相同的 https 升级 + param 缩略参数，命中同一份图片缓存，不额外下载。
 */
const ambientCoverUrl = computed(() => {
  const raw = coverUrl.value?.trim()
  if (!raw) return ''
  const normalized = raw.startsWith('http://') ? `https://${raw.slice(7)}` : raw
  // data: / blob: 等特殊地址不能拼 query，原样返回
  if (!/^https?:\/\//i.test(normalized)) return normalized
  try {
    const url = new URL(normalized, window.location.href)
    url.searchParams.set('param', '500y500')
    return url.toString()
  } catch {
    return normalized
  }
})
const songName = computed(() => song.value?.name || '')
const singers = computed(() => song.value?.ar || [])

const playIcon = computed(() => (playerStore.paused ? PlayOne : Pause))

const volumeIcon = computed(() => {
  if (playerStore.volume === 0) return VolumeMute
  if (playerStore.volume <= 60) return VolumeSmall
  return VolumeNotice
})

const volume = computed({
  get: () => playerStore.volume,
  set: (value: number) => playerStore.setVolume(value),
})

const sliderMax = computed(() =>
  playerStore.duration > 0 ? playerStore.duration : 1
)

const progress = computed({
  get: () => Math.min(playerStore.currentTime, sliderMax.value),
  set: (value: number) => playerStore.seek(value),
})

/** 统一时间格式化：0 秒也要显示 0:00（formatTrackTime 对 0 返回空串） */
const formatTime = (value: number | string): string => {
  const seconds = Number(value)
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00'
  return formatTrackTime(seconds) || '0:00'
}

// ---------------- 歌词滚动：watch 当前行 + scrollIntoView（替代裸 setInterval） ----------------
const lyricContainer = ref<HTMLElement | null>(null)
const lyricRefs = ref<Array<HTMLElement | null>>([])

const setLyricRef = (
  el: Element | ComponentPublicInstance | null,
  index: number
) => {
  lyricRefs.value[index] = (el as HTMLElement | null) ?? null
}

const scrollToActiveLyric = (behavior: ScrollBehavior = 'smooth') => {
  const index = playerStore.activeLyricIndex
  if (index < 0) {
    // 尚未开始/刚切歌：回到顶部，避免停留在上一首的位置
    lyricContainer.value?.scrollTo({ top: 0, behavior })
    return
  }
  const target = lyricRefs.value[index]
  if (!target) return
  target.scrollIntoView({ block: 'center', behavior })
}

watch(
  () => [playerStore.activeLyricIndex, playerStore.lyricStr] as const,
  async () => {
    if (!showPlayerPage.value) return
    await nextTick()
    scrollToActiveLyric()
  }
)

// 打开播放页时先定位到当前行（隐藏时 scrollIntoView 无效）
watch(showPlayerPage, async (visible) => {
  if (!visible) return
  await nextTick()
  scrollToActiveLyric('auto')
})

onBeforeUnmount(() => {
  // watch 由 setup 作用域自动停止；这里只释放 DOM 引用，避免组件卸载后仍持有节点
  lyricRefs.value = []
  lyricContainer.value = null
})

const handleSeekLyric = (time: number) => {
  playerStore.seek(time)
}
</script>

<style scoped>
.ea-player-page {
  position: fixed;
  top: 25px;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  display: flex;
  overflow: hidden;
  background: radial-gradient(transparent, rgb(255, 255, 255) 1px);
  background-size: 2px 2px;
  backdrop-filter: saturate(180%) blur(5px);
}

/* ---------------- 环境光：当前封面模糊成大色块，慢速漂移 ---------------- */
.player-ambient {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.player-ambient-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.55;
  filter: blur(64px) saturate(1.4);
  transform: scale(1.2);
  transform-origin: center;
  animation: halo-ambient-drift 36s var(--ease-in-out) infinite;
  will-change: transform;
}

/* 底层只做静态放大垫底，避免两层大图同时高频重绘 */
.player-ambient-img--base {
  opacity: 0.45;
  animation: none;
  will-change: auto;
}

/* 渐变遮罩：压住色块保证歌名/歌词可读 */
.player-ambient-veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    160deg,
    rgba(255, 255, 255, 0.86) 0%,
    rgba(255, 255, 255, 0.54) 45%,
    rgba(255, 255, 255, 0.92) 100%
  );
}

.player-left {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  width: 50%;
  height: 100%;
  gap: 16px;
  justify-content: center;
  align-items: center;
}

/* ---------------- 黑胶唱片：播放中旋转，暂停冻结角度 ---------------- */
.player-cover {
  width: 320px;
  height: 320px;
  border-radius: 50%;
  box-shadow:
    0 20px 48px rgba(15, 23, 42, 0.26),
    0 2px 8px rgba(15, 23, 42, 0.12);
}

.player-vinyl {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  background-color: #14161c;
  animation: halo-vinyl-spin 20s linear infinite;
  /* 暂停时冻结时间轴：唱片停在当前角度，而不是回到 0deg */
  animation-play-state: paused;
  will-change: transform;
}

.player-vinyl.is-playing {
  animation-play-state: running;
}

/* 唱片沟槽 */
.player-vinyl::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: 50%;
  background: repeating-radial-gradient(
    circle at 50% 50%,
    rgba(0, 0, 0, 0.34) 0,
    rgba(0, 0, 0, 0.34) 1px,
    rgba(255, 255, 255, 0.1) 1px,
    rgba(255, 255, 255, 0.1) 3px
  );
  opacity: 0.5;
  pointer-events: none;
}

/* 中心轴点 */
.player-vinyl::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 2;
  width: 13%;
  height: 13%;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: radial-gradient(
    circle at 50% 50%,
    #f8fafc 0 30%,
    rgba(148, 163, 184, 0.85) 31% 46%,
    #0f1115 47% 100%
  );
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.4);
  pointer-events: none;
}

.player-cover-img {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.player-song {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  max-width: 80%;
}

.player-song-name {
  font-size: 20px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.player-song-singers {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 14px;
  justify-content: center;
}

.player-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 60%;
  min-width: 320px;
}

.player-progress-bar {
  flex: 1;
}

.player-time {
  font-size: 12px;
  color: rgb(122, 122, 123);
  min-width: 36px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.player-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
}

.player-volume {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  width: 128px;
}

.player-lyric-panel {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  width: 41.6667%;
  height: 100%;
  padding-top: 32px;
  margin-bottom: 32px;
  overflow-y: auto;
  /* 当前行 scale(1.05) 的溢出只在视觉上，不额外产生横向滚动条 */
  overflow-x: hidden;
}

.lyric-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 48vh;
}

/* 非当前行：半透明 + 轻模糊 + 微缩，当前行清晰放大，形成聚焦感 */
.lyric-line {
  padding: 4px 0;
  font-size: 18px;
  line-height: 1.4;
  color: rgb(75, 85, 99);
  cursor: pointer;
  opacity: 0.42;
  filter: blur(1.1px);
  transform: scale(0.97);
  transform-origin: left center;
  transition:
    transform var(--motion-base) var(--ease-standard),
    opacity var(--motion-base) var(--ease-standard),
    filter var(--motion-base) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);
}

.lyric-line:hover {
  color: rgb(17, 24, 39);
}

.is-sing {
  opacity: 1;
  filter: none;
  transform: scale(1.05);
  color: rgb(51, 94, 234);
  font-weight: 800;
  font-size: 32px;
  line-height: 1.2;
}

.lyric-empty {
  padding: 24px 0;
  font-size: 18px;
  color: rgb(156, 163, 175);
}

.player-close {
  position: relative;
  z-index: 1;
  display: flex;
  width: 8.3333%;
  justify-content: center;
}

.player-close-icon {
  margin-top: 8px;
  padding: 4px;
  height: fit-content;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-standard);
}

.player-close-icon:hover {
  background-color: rgba(243, 244, 246, 0.8);
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

/* 进度条 / 音量条 hover 时滑块圆点轻微放大（vue-slider 内部结构） */
.player-progress-bar :deep(.vue-slider-dot-handle),
.volume-bar :deep(.vue-slider-dot-handle) {
  transition: transform var(--motion-fast) var(--ease-standard);
}

.player-progress-bar:hover :deep(.vue-slider-dot-handle),
.volume-bar:hover :deep(.vue-slider-dot-handle) {
  transform: scale(1.15);
}

/* 开合过渡：慢速回弹曲线，保留上滑位移 */
.player-page-enter-active,
.player-page-leave-active {
  transition: transform var(--motion-slow) var(--ease-spring);
}

.player-page-enter-from,
.player-page-leave-to {
  transform: translateY(100%);
}

/* 内容错峰入场：封面 20ms、歌词 60ms，halo-rise 淡入上移 */
.player-page-enter-active .player-cover,
.player-page-enter-active .player-song,
.player-page-enter-active .player-progress,
.player-page-enter-active .player-controls,
.player-page-enter-active .player-volume {
  animation: halo-rise var(--motion-base) var(--ease-standard) 20ms both;
}

.player-page-enter-active .lyric-list {
  animation: halo-rise var(--motion-base) var(--ease-standard) 60ms both;
}
</style>
