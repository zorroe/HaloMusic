<template>
  <div class="ea-footer">
    <div class="flex items-center">
      <img
        src="https://p1.music.126.net/qOnH7nPxRZaOP0riFwOaMQ==/943380976686808.jpg"
        class="rounded-full w-10 h-10 mr-4"
      />
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
    <div class="flex justify-center items-center flex-grow">
      进度条和播放按钮区域
    </div>
    <div class="flex items-center gap-4">
      <div class="flex justify-center items-center gap-2">
        <icon-park :icon="volumnIcon" :size="20" @click="handleClickVolumn"></icon-park>
        <input
          type="range"
          min="0"
          max="100"
          :value="playerStore.volume"
          step="1"
          @input="handleVolumnChange"
          class="range range-xs"
        />
        <div class="w-10 text-sm text-end">{{ playerStore.volume }}</div>
      </div>
      <icon-park
        :icon="playModeIcon"
        :size="20"
        @click="playerStore.toggleLoop"
        class="footer-icon"
      ></icon-park>
      <icon-park class="footer-icon" :icon="MusicList" :size="20"></icon-park>
      <icon-park class="footer-icon" :icon="Up" :size="20"></icon-park>
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
} from "@icon-park/vue-next";
import { usePlayerStore } from "@/store";
import pinia from "@/store/store";
import { computed } from "vue";
import { openUrl } from "@/utils/common";

const playerStore = usePlayerStore(pinia);
const curMusic = computed(() => playerStore.song);
const volume = computed(() => playerStore.volume);

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

const handleClickVolumn = ()=>{
  if (playerStore.volume == 0) {
    playerStore.setVolume(60);
  } else {
    playerStore.setVolume(0);
  }
}

const handleVolumnChange = (event: any) => {
  playerStore.setVolume(event.target.value);
};
</script>

<style lang="scss" scoped>
.ea-footer {
  @apply h-16 rounded-b px-8 w-full flex justify-around border-t-2 border-gray-400 items-center;
}

.range-xs {
  height: 0.5rem /* 16px */;
}
.range-xs::-webkit-slider-runnable-track {
  height: 0.25rem /* 4px */;
}
.range-xs::-moz-range-track {
  height: 0.1rem /* 4px */;
}
.range-xs::-webkit-slider-thumb {
  height: 0.5rem /* 16px */;
  width: 0.5rem /* 16px */;
  --filler-offset: 0.1rem /* 6.4px */;
}
.range-xs::-moz-range-thumb {
  height: 1rem /* 16px */;
  width: 1rem /* 16px */;
  --filler-offset: 0.4rem /* 6.4px */;
}

.footer-icon{
  @apply p-1 rounded transition-all hover:bg-gray-100 duration-300 hover:scale-110 active:scale-90 
}
</style>
