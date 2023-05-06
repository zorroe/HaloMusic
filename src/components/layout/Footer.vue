<template>
  <div class="ea-footer">
    <img
      src="https://p1.music.126.net/qOnH7nPxRZaOP0riFwOaMQ==/943380976686808.jpg"
      class="rounded-full w-10 h-10"
    />
    <div class="flex justify-center items-center flex-grow">
      进度条和播放按钮区域
    </div>
    <div class="flex items-center gap-6">
      <icon-park :icon="volumnIcon" :size="20"></icon-park>
      <icon-park :icon="playModeIcon" :size="20"></icon-park>
      <icon-park :icon="MusicList" :size="20"></icon-park>
      <icon-park :icon="Up" :size="20"></icon-park>
      
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

const playerStore = usePlayerStore(pinia);

// 音量图标
const volumnIcon = computed(() => {
  if (playerStore.volume == 0) {
    return VolumeMute;
  } else if (playerStore.volume <= 60) {
    return VolumeSmall;
  } else {
    return VolumeNotice;
  }
});

// 播放模式图标
const playModeIcon = computed(()=>{
  if(playerStore.loopType === 0){
    return PlayOnce
  }else if(playerStore.loopType === 1){
    return PlayCycle
  }else if(playerStore.loopType === 2){
    return ShuffleOne
  }
})

</script>

<style lang="scss" scoped>
.ea-footer {
  @apply h-16 rounded-b px-8 w-full flex justify-around border-t-2 border-gray-400 items-center;
}
</style>
