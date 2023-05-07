<template>
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
      :dot-size="12"
    >
    </vue-slider>
  </div>
  <div class="ea-footer">
    <div class="flex items-center">
      <div class="w-10 h-10 mr-4">
        <img :src="curMusic.picUrl" class="rounded-full w-10 h-10" />
      </div>
      <div class="flex flex-col justify-center items-center w-36">
        <div class="text-sm font-bold w-full truncate">
          {{ curMusic.name }}
        </div>
        <div class="text-xs flex gap-2 w-full truncate">
          <span
            v-for="singer in curMusic.singers"
            class="ea-link"
            @click="openUrl(`https://music.163.com/#/artist?id=${singer.id}`)"
          >
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
        @click="playerStore.prev"
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
        @click="playerStore.next"
      ></icon-park>
    </div>
    <div class="flex items-center gap-4">
      <icon-park
        :icon="playModeIcon"
        :size="20"
        @click="playerStore.toggleLoop"
        class="footer-icon btn-animation"
      ></icon-park>
      <icon-park
        class="footer-icon btn-animation"
        :icon="MusicList"
        :size="20"
        @click="routeTo('/curPlayList')"
      ></icon-park>
      <div class="flex justify-center items-center gap-2 w-32">
        <icon-park
          :icon="volumnIcon"
          :size="18"
          theme="filled"
          fill="black"
          @click="handleClickVolumn"
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
        class="footer-icon btn-animation"
        :icon="Up"
        :size="20"
      ></icon-park>
    </div>
  </div>
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
} from "@icon-park/vue-next";
import { usePlayerStore } from "@/store";
import pinia from "@/store/store";
import { computed, watch } from "vue";
import { openUrl, formatTrackTime } from "@/utils/common";
import { routeTo } from "@/utils/common";

const playerStore = usePlayerStore(pinia);
const curMusic = computed(() => playerStore.song);
const volume = computed({
  get: () => playerStore.volume,
  set: (val) => {
    playerStore.setVolume(val);
  },
});

const curMusicDuration = computed(() => playerStore.duration);

const curMusicCurrentTime = computed({
  get: () => playerStore.currentTime,
  set: (val) => {
    playerStore.onSliderChange(val);
  },
});

// 播放完毕之后自动播放下一首
watch(curMusicCurrentTime, () => {
  if (curMusicCurrentTime.value === curMusicDuration.value) {
    playerStore.playEnd();
  }
});

// 播放图标
const playIcon = computed(() => {
  if (playerStore.isPlaying) {
    return Pause;
  } else {
    return PlayOne;
  }
});

// 音量图标
const volumnIcon = computed(() => {
  if (volume.value == 0) {
    return VolumeMute;
  } else if (volume.value <= 60) {
    return VolumeSmall;
  } else {
    return VolumeNotice;
  }
});

// 播放模式图标
const playModeIcon = computed(() => {
  if (playerStore.loopType === 0) {
    return PlayOnce;
  } else if (playerStore.loopType === 1) {
    return PlayCycle;
  } else if (playerStore.loopType === 2) {
    return ShuffleOne;
  }
});

const handleClickVolumn = () => {
  if (playerStore.volume == 0) {
    playerStore.setVolume(60);
  } else {
    playerStore.setVolume(0);
  }
};
</script>

<style lang="scss" scoped>
.progress-bar {
  margin-top: -6px;
  margin-bottom: -6px;
  @apply w-full;
}

.ea-footer {
  @apply h-16 rounded-b px-8 w-full flex justify-around items-center;
}

.volume-bar {
  width: 84px;
}

.footer-icon {
  @apply p-1 rounded hover:bg-gray-100;
}
</style>
