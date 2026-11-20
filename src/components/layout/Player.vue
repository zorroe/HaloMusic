<template>
  <Teleport to="body">
    <Transition name="player-page">
      <div v-show="showPlayerPage" class="ea-player-page">
        <!-- 环境光：模糊封面层兜底 + 取色渐变层（取色完成后淡入） -->
        <div v-if="ambientCoverUrl" class="player-ambient" aria-hidden="true">
          <img
            :src="ambientCoverUrl"
            class="player-ambient-img player-ambient-img--base"
            alt=""
          />
          <img :src="ambientCoverUrl" class="player-ambient-img" alt="" />
          <div class="player-ambient-veil"></div>
          <!-- 两层轮换做交叉淡入，避免切歌时颜色硬跳 -->
          <div
            v-for="(layer, index) in tintLayers"
            :key="index"
            class="player-ambient-tint"
            :class="{ 'is-visible': tintActiveIndex === index }"
            :style="tintStyle(layer)"
          ></div>
        </div>

        <div class="player-left">
          <div class="player-cover" :style="coverGlowStyle">
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
            <!-- 左侧工具区：睡眠定时 + 播放倍速 -->
            <div ref="sleepPanelRoot" class="player-control-tools">
              <button
                type="button"
                class="player-tool"
                :class="{ 'is-active': playerStore.sleepTimerRunning }"
                :aria-expanded="sleepPanelOpen"
                aria-haspopup="dialog"
                :title="sleepTimerTitle"
                @click="toggleSleepPanel"
              >
                <icon-park :icon="Timer" :size="16" />
                <span class="player-tool-text">{{ sleepTimerLabel }}</span>
              </button>
              <button
                type="button"
                class="player-tool player-tool--rate"
                :class="{ 'is-active': isPlaybackRateChanged }"
                :title="`点击切换播放速度（当前 ${playbackRateLabel}）`"
                @click="playerStore.cyclePlaybackRate()"
              >
                {{ playbackRateLabel }}
              </button>

              <Transition name="player-popover">
                <div
                  v-if="sleepPanelOpen"
                  class="player-sleep-panel"
                  role="dialog"
                  aria-label="睡眠定时"
                >
                  <div class="player-sleep-head">
                    <span class="player-sleep-title">睡眠定时</span>
                    <span
                      v-if="playerStore.sleepTimerRunning"
                      class="player-sleep-remaining"
                    >
                      剩余 {{ sleepTimerLabel }}
                    </span>
                  </div>
                  <div class="player-sleep-options">
                    <button
                      v-for="minutes in SLEEP_TIMER_OPTIONS"
                      :key="minutes"
                      type="button"
                      class="player-sleep-option"
                      @click="handleStartSleepTimer(minutes)"
                    >
                      {{ minutes }} 分钟
                    </button>
                  </div>
                  <button
                    v-if="playerStore.sleepTimerRunning"
                    type="button"
                    class="player-sleep-cancel"
                    @click="handleCancelSleepTimer"
                  >
                    取消定时
                  </button>
                </div>
              </Transition>
            </div>

            <!-- 中间播放控制：主按钮 44px，次按钮 20px -->
            <div class="player-transport">
              <icon-park
                :icon="LeftOne"
                :size="20"
                theme="filled"
                fill="currentColor"
                class="footer-icon btn-animation"
                @click="playerStore.playPrev"
              ></icon-park>
              <icon-park
                :icon="playIcon"
                :size="44"
                theme="filled"
                fill="currentColor"
                class="footer-icon btn-animation player-play-btn"
                @click="playerStore.togglePlay"
              ></icon-park>
              <icon-park
                :icon="RightOne"
                :size="20"
                theme="filled"
                fill="currentColor"
                class="footer-icon btn-animation"
                @click="playerStore.playNext"
              ></icon-park>
            </div>

            <!-- 右侧音量：hover 时条形展开，父级定宽避免这一行跳动 -->
            <div class="player-volume">
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import {
  Down,
  LeftOne,
  Pause,
  PlayOne,
  RightOne,
  Timer,
  VolumeMute,
  VolumeNotice,
  VolumeSmall,
} from '@icon-park/vue-next'
import { usePlayerStore } from '@/store/playerStore'
import pinia from '@/store/store'
import { formatTrackTime, routeTo } from '@/utils/common'
import { extractDominantColor } from '@/utils/color'
import type { PickedColor } from '@/utils/color'
import { formatSleepCountdown } from '@/utils/player-timer'

/** 睡眠定时可选分钟数 */
const SLEEP_TIMER_OPTIONS = [15, 30, 60] as const

/**
 * 「展开睡眠定时面板」的一次性事件名。
 * Footer 的睡眠入口需要先打开播放页再展开面板，跨组件通信走 window 事件，
 * 避免为了一个 UI 开关去改 store（store 不在本任务写入范围）。与 Footer.vue 保持一致。
 */
const OPEN_SLEEP_TIMER_EVENT = 'halo:open-sleep-timer-panel'

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

// ---------------- 封面取色：环境光渐变 + 唱片氛围光 ----------------
/** 当前生效的取色结果（null 表示取色失败，回退主题色 / 纯模糊层） */
const palette = ref<PickedColor | null>(null)
/** 两层渐变轮换，切歌时一层淡出一层淡入，避免颜色硬跳 */
const tintLayers = ref<Array<PickedColor | null>>([null, null])
/** 当前可见的渐变层下标，-1 表示没有可见层 */
const tintActiveIndex = ref(-1)

/** 把一层渐变的颜色写成 CSS 变量（CSS 里配合 color-mix 控制透明度） */
const tintStyle = (layer: PickedColor | null): string =>
  layer
    ? `--player-tint-primary: ${layer.primary}; --player-tint-secondary: ${layer.secondary}`
    : ''

/** 唱片氛围光：取色失败时样式为空，CSS 回退 --color-primary */
const coverGlowStyle = computed(() =>
  palette.value ? `--player-accent-primary: ${palette.value.primary}` : ''
)

/** 取色结果交叉淡入：先写隐藏层，再把可见指针切过去 */
const applyPalette = (next: PickedColor) => {
  palette.value = next
  const inactiveIndex = tintActiveIndex.value === 0 ? 1 : 0
  tintLayers.value[inactiveIndex] = next
  tintActiveIndex.value = inactiveIndex
}

const resetPalette = () => {
  palette.value = null
  tintActiveIndex.value = -1
}

// 封面变化或播放页打开时取色；关闭页面时不取色（避免后台白白下载封面）
// 切歌后旧请求的结果直接丢弃，避免串色
let paletteRequestId = 0
watch(
  [ambientCoverUrl, showPlayerPage],
  async ([url, visible]) => {
    const requestId = ++paletteRequestId
    if (!url || !visible) {
      resetPalette()
      return
    }
    try {
      const picked = await extractDominantColor(url)
      if (requestId !== paletteRequestId) return
      if (picked) applyPalette(picked)
      else resetPalette()
    } catch {
      if (requestId !== paletteRequestId) return
      // 跨域 / 加载失败 / 超时：保留模糊封面层，氛围光回退主题色
      resetPalette()
    }
  },
  { immediate: true }
)

// ---------------- 睡眠定时 / 播放倍速（UI 只读 store，不自己起计时器） ----------------
const sleepPanelOpen = ref(false)
const sleepPanelRoot = ref<HTMLElement | null>(null)

const sleepTimerLabel = computed(() =>
  playerStore.sleepTimerRunning
    ? formatSleepCountdown(playerStore.sleepTimerRemaining)
    : '定时'
)

const sleepTimerTitle = computed(() =>
  playerStore.sleepTimerRunning
    ? `睡眠定时剩余 ${sleepTimerLabel.value}，点击调整`
    : '睡眠定时'
)

/** 1 → `1x`，1.25 → `1.25x`（去掉浮点误差与多余的 .0） */
const playbackRateLabel = computed(() => {
  const rate = Number(playerStore.playbackRate)
  const normalized = Number.isFinite(rate) && rate > 0 ? rate : 1
  return `${Number(normalized.toFixed(2))}x`
})

const isPlaybackRateChanged = computed(
  () => Number(playerStore.playbackRate) !== 1
)

const toggleSleepPanel = () => {
  sleepPanelOpen.value = !sleepPanelOpen.value
}

const closeSleepPanel = () => {
  sleepPanelOpen.value = false
}

const handleStartSleepTimer = (minutes: number) => {
  playerStore.startSleepTimer(minutes)
  closeSleepPanel()
}

const handleCancelSleepTimer = () => {
  playerStore.cancelSleepTimer()
  closeSleepPanel()
}

/** 点击面板与入口以外的地方收起面板 */
const handleDocumentPointerDown = (event: PointerEvent) => {
  if (!sleepPanelOpen.value) return
  const target = event.target
  if (target instanceof Node && sleepPanelRoot.value?.contains(target)) return
  closeSleepPanel()
}

const handleDocumentKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') closeSleepPanel()
}

/** Footer 睡眠入口：打开播放页的同时展开面板 */
const handleOpenSleepTimerRequest = () => {
  sleepPanelOpen.value = true
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown)
  document.addEventListener('keydown', handleDocumentKeydown)
  window.addEventListener(OPEN_SLEEP_TIMER_EVENT, handleOpenSleepTimerRequest)
})

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
  if (!visible) {
    // 播放页关闭时顺手收起睡眠面板，避免下次打开时残留
    closeSleepPanel()
    return
  }
  await nextTick()
  scrollToActiveLyric('auto')
})

onBeforeUnmount(() => {
  // watch 由 setup 作用域自动停止；这里释放 DOM 引用与全局监听，避免卸载后残留
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  document.removeEventListener('keydown', handleDocumentKeydown)
  window.removeEventListener(
    OPEN_SLEEP_TIMER_EVENT,
    handleOpenSleepTimerRequest
  )
  lyricRefs.value = []
  lyricContainer.value = null
  sleepPanelRoot.value = null
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
  /* 取色交叉淡入时长：任务要求的 600~800ms 区间，集中在这里维护 */
  --player-color-fade: 700ms;
  color: var(--color-text);
  background-color: var(--color-navbar-bg);
  background-image: radial-gradient(
    transparent,
    var(--color-surface-noise) 1px
  );
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

/* 渐变遮罩：用主题底色压住色块，保证歌名/歌词可读（深浅色主题自动适配） */
.player-ambient-veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    160deg,
    color-mix(in srgb, var(--color-body-bg) 86%, transparent) 0%,
    color-mix(in srgb, var(--color-body-bg) 54%, transparent) 45%,
    color-mix(in srgb, var(--color-body-bg) 92%, transparent) 100%
  );
}

/* 取色渐变层：主色 / 辅色两团径向渐变，叠在遮罩之上形成整体氛围色。
 * 颜色先与主题底色按比例混合（浅色变粉彩、深色自动压暗），保证两种主题下的文字对比度；
 * 两层之间只做 opacity 交叉淡入，不渐变 background-image 本身。 */
.player-ambient-tint {
  --player-tint-alpha-primary: 52%;
  --player-tint-alpha-secondary: 40%;
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
  background-image:
    radial-gradient(
      120% 90% at 18% 12%,
      color-mix(
          in srgb,
          color-mix(
              in srgb,
              var(--player-tint-primary, var(--color-primary)) 55%,
              var(--color-body-bg)
            )
            var(--player-tint-alpha-primary),
          transparent
        )
        0%,
      transparent 58%
    ),
    radial-gradient(
      110% 85% at 82% 88%,
      color-mix(
          in srgb,
          color-mix(
              in srgb,
              var(--player-tint-secondary, var(--color-primary)) 55%,
              var(--color-body-bg)
            )
            var(--player-tint-alpha-secondary),
          transparent
        )
        0%,
      transparent 62%
    );
  transition: opacity var(--player-color-fade) var(--ease-standard);
}

.player-ambient-tint.is-visible {
  opacity: 1;
}

/* 深色主题下降一档强度，保证浅色文字的对比度 */
[data-theme='dark'] .player-ambient-tint {
  --player-tint-alpha-primary: 44%;
  --player-tint-alpha-secondary: 36%;
}

.player-left {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  width: 50%;
  height: 100%;
  gap: clamp(12px, 2vh, 20px);
  justify-content: center;
  align-items: center;
}

/* ---------------- 黑胶唱片：播放中旋转，暂停冻结角度 ---------------- */
.player-cover {
  width: clamp(180px, 38vh, 320px);
  height: clamp(180px, 38vh, 320px);
  border-radius: 50%;
  /* 外圈氛围光跟随取色主色；取色失败时回退品牌色 */
  box-shadow:
    0 0 80px
      color-mix(
        in srgb,
        var(--player-accent-primary, var(--color-primary)) 30%,
        transparent
      ),
    0 20px 48px var(--color-shadow-strong),
    0 2px 8px var(--color-shadow);
  transition: box-shadow var(--player-color-fade) var(--ease-standard);
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
  color: var(--color-secondary);
  min-width: 36px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

/* ---------------- 底部控制区：左工具 / 中播放 / 右音量 ---------------- */
.player-controls {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  width: min(600px, 100%);
  margin-top: 4px;
}

/* 左：睡眠定时 + 播放倍速入口 */
.player-control-tools {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  justify-self: start;
}

.player-tool {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: 9999px;
  background-color: var(--color-secondary-bg);
  color: var(--color-text-muted);
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    border-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);
}

.player-tool:hover {
  border-color: var(--color-border-strong);
  color: var(--color-text);
}

.player-tool.is-active {
  border-color: var(--color-primary);
  background-color: var(--color-primary-bg);
  color: var(--color-primary);
}

.player-tool-text,
.player-tool--rate {
  font-variant-numeric: tabular-nums;
}

.player-tool--rate {
  justify-content: center;
  min-width: 46px;
}

/* 睡眠定时面板（绝对定位于入口上方，不参与文档流） */
.player-sleep-panel {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 186px;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background-color: var(--color-card-bg);
  box-shadow: 0 16px 40px var(--color-shadow-strong);
}

/* 面板开合复用全局浮层 keyframes */
.player-popover-enter-active {
  animation: halo-pop-in var(--motion-base) var(--ease-enter) both;
}

.player-popover-leave-active {
  animation: halo-pop-out var(--motion-fast) var(--ease-exit) both;
}

.player-sleep-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.player-sleep-title {
  font-size: 12px;
  font-weight: 700;
}

.player-sleep-remaining {
  color: var(--color-primary);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.player-sleep-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.player-sleep-option {
  padding: 6px 4px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background-color: var(--color-input-bg);
  color: var(--color-text);
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    border-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);
}

.player-sleep-option:hover {
  border-color: var(--color-primary);
  background-color: var(--color-primary-bg);
  color: var(--color-primary);
}

.player-sleep-cancel {
  padding: 6px 4px;
  border: 0;
  border-radius: 8px;
  background-color: transparent;
  color: var(--color-danger);
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-standard);
}

.player-sleep-cancel:hover {
  background-color: var(--color-danger-bg);
}

/* 中：播放控制（主按钮 44px 实心圆，次按钮 20px 图标） */
.player-transport {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  justify-self: center;
}

.player-transport .player-play-btn {
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  box-shadow: 0 8px 20px
    color-mix(in srgb, var(--color-primary) 32%, transparent);
}

/* 用 .player-transport 提高优先级，覆盖 .footer-icon:hover 的浅色悬停底 */
.player-transport .player-play-btn:hover {
  background-color: color-mix(
    in srgb,
    var(--color-primary) 86%,
    var(--color-on-primary)
  );
}

/* 右：音量。父级定宽，条形只在内部展开，不推挤控制区其它元素 */
.player-volume {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  width: 128px;
  min-width: 0;
  justify-self: end;
}

.player-volume .volume-bar {
  width: 32px;
  transition: width var(--motion-base) var(--ease-standard);
}

.player-volume:hover .volume-bar,
.player-volume:focus-within .volume-bar {
  width: 96px;
}

.player-lyric-panel {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  width: 41.6667%;
  height: 100%;
  padding-top: 40px;
  margin-bottom: 32px;
  overflow-y: auto;
  /* 当前行 scale(1.05) 的溢出只在视觉上，不额外产生横向滚动条 */
  overflow-x: hidden;
}

.lyric-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 46vh;
}

/* 非当前行：半透明 + 轻模糊 + 微缩，当前行清晰放大，形成聚焦感 */
.lyric-line {
  padding: 4px 0;
  font-size: 18px;
  line-height: 1.5;
  color: var(--color-text-muted);
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
  color: var(--color-text);
}

.is-sing {
  opacity: 1;
  filter: none;
  transform: scale(1.05);
  color: var(--color-primary);
  font-weight: 800;
  font-size: 32px;
  line-height: 1.35;
}

.lyric-empty {
  padding: 24px 0;
  font-size: 18px;
  color: var(--color-text-subtle);
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
  background-color: var(--color-hover);
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
  background-color: var(--color-hover);
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
.player-page-enter-active .player-controls {
  animation: halo-rise var(--motion-base) var(--ease-standard) 20ms both;
}

.player-page-enter-active .lyric-list {
  animation: halo-rise var(--motion-base) var(--ease-standard) 60ms both;
}
</style>
