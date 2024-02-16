<template>
  <div class="flex flex-col w-full">
    <div class="progress-bar">
      <vue-slider
        v-model="curMusicCurrentTime"
        :min="0"
        :max="curMusicDuration || 30"
        :interval="1"
        :drag-on-click="true"
        :duration="0"
        :tooltip-formatter="formatTrackTime"
        :height="2"
        :dot-size="12">
      </vue-slider>
    </div>
    <div class="ea-footer">
      <div class="flex items-center">
        <div class="w-10 h-10 mr-4">
          <img
            :src="curMusic?.al.picUrl"
            class="rounded-full w-10 h-10"
            @click="playerStore.openPlayerPage" />
        </div>
        <div class="flex flex-col justify-center items-center w-36">
          <div class="text-sm font-bold w-full truncate">
            {{ curMusic?.name }}
          </div>
          <div class="text-xs flex gap-2 w-full truncate">
            <span
              v-for="singer in curMusic?.ar"
              class="ea-link"
              @click="routeTo(`/artist/${singer.id}`)">
              {{ singer.name }}
            </span>
          </div>
        </div>
      </div>
      <div class="flex justify-center items-center flex-grow gap-4">
        <icon-park
          :icon="LeftOne"
          :size="20"
          theme="filled"
          fill="black"
          class="footer-icon btn-animation"
          @click="playerStore.playPrev"></icon-park>
        <icon-park
          :icon="playIcon"
          :size="36"
          theme="filled"
          fill="black"
          class="footer-icon btn-animation"
          @click="playerStore.tooglePlay"></icon-park>
        <icon-park
          :icon="RightOne"
          :size="20"
          theme="filled"
          fill="black"
          class="footer-icon btn-animation"
          @click="playerStore.playNext"></icon-park>
      </div>
      <div class="flex items-center gap-4">
        <icon-park
          :icon="playModeIcon"
          :size="20"
          @click="playerStore.toggleLoop"
          class="footer-icon btn-animation"></icon-park>
        <icon-park
          class="footer-icon btn-animation"
          :icon="MusicList"
          :size="20"
          @click="changeDrawerStatus(true)"></icon-park>
        <label
          for="song-quality"
          class="footer-icon btn-animation"
          ><icon-park
            class=""
            :icon="VoiceOne"
            :size="20"
            @click="chooseQuality"></icon-park
        ></label>

        <div class="flex justify-center items-center gap-2 w-32">
          <icon-park
            :icon="volumeIcon"
            :size="18"
            theme="filled"
            fill="black"
            @click="handleClickVolume"></icon-park>
          <div class="volume-bar">
            <vue-slider
              v-model="volume"
              :min="0"
              :max="100"
              :interval="1"
              :drag-on-click="true"
              :duration="0"
              tooltip="none"
              :dot-size="12">
            </vue-slider>
          </div>
        </div>
        <icon-park
          class="footer-icon btn-animation"
          :icon="Up"
          :size="20"
          @click="playerStore.openPlayerPage"></icon-park>
      </div>
    </div>
    <ea-drawer
      :drawer-show="drawerShow"
      @close="changeDrawerStatus(false)">
      <div
        v-if="!isFm"
        class="flex flex-col gap-2">
        <div
          v-for="music in playlist"
          class="playlist-item cursor-default"
          @dblclick.native="handlePlayMusic(music)"
          :class="{ playing: music.id == curMusic.id }">
          <div class="flex-grow text-start cursor-pointer truncate">
            {{ music.name }}
          </div>
          <div class="flex gap-1 item-center text-xs justify-end truncate">
            <span v-for="singer in music.ar">{{ singer.name }}</span>
          </div>
          <div class="text-sm text-gray-500">
            {{ formatTrackTime(music.dt / 1000) }}
          </div>
        </div>
      </div>
      <div
        v-else
        class="flex justify-center items-center w-full h-full">
        私人FM播放中
      </div>
    </ea-drawer>
    <ea-modal
      id="song-quality"
      :showBtn="false">
      <div class="text-base whitespace-pre-wrap">ddd</div>
    </ea-modal>
  </div>

  <Player :show="showPlayerPage"> </Player>
</template>

<script setup lang="ts">
import {
  VolumeSmall,
  VolumeMute,
  ShuffleOne,
  MusicList,
  VolumeNotice,
  PlayCycle,
  PlayOnce,
  Up,
  PlayOne,
  Pause,
  LeftOne,
  RightOne,
  VoiceOne,
} from '@icon-park/vue-next'
import { usePlayerStore } from '@/store/playerStore'
import pinia from '@/store/store'
import { computed, ref } from 'vue'
import { formatTrackTime, routeTo } from '@/utils/common'
import Player from './Player.vue'
var _ = require('lodash')
import { MusicBaseInfo } from '@/types/musicRel'

const playerStore = usePlayerStore(pinia)
const curMusic = computed(() => playerStore.current.currentSong)
const volume = computed({
  get: () => playerStore.volume,
  set: val => {
    playerStore.setVolume(val)
  },
})
const isFm = computed(() => playerStore.isFm)

const playlist = computed(() => playerStore.playlist)
const drawerShow = ref(false)
const showPlayerPage = computed(() => playerStore.showPlayerPage)

const handlePlayMusic = (music: MusicBaseInfo) => {
  playerStore.playOne(music.id + '')
}

const changeDrawerStatus = (status: boolean) => {
  drawerShow.value = status
}

const curMusicDuration = computed(() =>
  Number((playerStore.current.currentSong?.dt / 1000).toFixed(0))
)

const curMusicCurrentTime = computed({
  get: () => Number(playerStore.currentTime),
  set: val => {
    playerStore.changeSlider(val)
  },
})

// 播放图标
const playIcon = computed(() => {
  if (!playerStore.paused) {
    return Pause
  } else {
    return PlayOne
  }
})

// 音量图标
const volumeIcon = computed(() => {
  if (volume.value == 0) {
    return VolumeMute
  } else if (volume.value <= 60) {
    return VolumeSmall
  } else {
    return VolumeNotice
  }
})

// 播放模式图标
const playModeIcon = computed(() => {
  if (playerStore.cycleMode === 0) {
    return PlayOnce
  } else if (playerStore.cycleMode === 1) {
    return PlayCycle
  } else if (playerStore.cycleMode === 2) {
    return ShuffleOne
  }
})

const handleClickVolume = () => {
  if (playerStore.volume == 0) {
    playerStore.setVolume(60)
  } else {
    playerStore.setVolume(0)
  }
}

const chooseQuality = () => {
  console.log('选择音质')
}
</script>

<style lang="scss" scoped>
.progress-bar {
  margin-top: -6px;
  margin-bottom: -6px;
  top: 0;
  width: 100%;
  position: fixed;
  z-index: 9001;
}

.ea-footer {
  @apply h-16 rounded-b px-8 w-full flex justify-around items-center;
}

.footer-icon {
  @apply p-1 rounded-full hover:bg-gray-100 hover:bg-opacity-50;
}

.playlist-item {
  @apply flex gap-8 w-full h-10 items-center justify-between rounded-lg px-4;

  &:hover {
    background-color: rgb(234, 239, 253);
  }
}
</style>
