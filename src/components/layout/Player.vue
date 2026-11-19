<template>
  <Teleport to="body">
    <Transition name="player-page">
      <div v-show="showPlayerPage" class="ea-player-page">
        <div class="player-left">
          <div class="player-cover">
            <lmg
              :src="coverUrl"
              :width="500"
              :height="500"
              class="player-cover-img"
            />
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
  background: radial-gradient(transparent, rgb(255, 255, 255) 1px);
  background-size: 2px 2px;
  backdrop-filter: saturate(180%) blur(5px);
}

.player-left {
  display: flex;
  flex-direction: column;
  width: 50%;
  height: 100%;
  gap: 16px;
  justify-content: center;
  align-items: center;
}

.player-cover {
  width: 320px;
  height: 320px;
  border-radius: 16px;
  overflow: hidden;
}

.player-cover-img {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 16px;
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
  display: flex;
  flex-direction: column;
  width: 41.6667%;
  height: 100%;
  padding-top: 32px;
  margin-bottom: 32px;
  overflow-y: auto;
}

.lyric-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 48vh;
}

.lyric-line {
  padding: 4px 0;
  font-size: 18px;
  line-height: 1.4;
  color: rgb(75, 85, 99);
  cursor: pointer;
  transition:
    color 200ms ease,
    font-size 200ms ease;
}

.lyric-line:hover {
  color: rgb(17, 24, 39);
}

.is-sing {
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
  transition: background-color 200ms ease;
}

.player-close-icon:hover {
  background-color: rgba(243, 244, 246, 0.8);
}

.footer-icon {
  padding: 4px;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 300ms;
}

.footer-icon:hover {
  background-color: rgba(243, 244, 246, 0.5);
}

.player-page-enter-active,
.player-page-leave-active {
  transition: all 300ms ease-in-out;
}

.player-page-enter-from,
.player-page-leave-to {
  transform: translateY(100%);
}
</style>
