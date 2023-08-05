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
        :dot-size="12"
      >
      </vue-slider>
    </div>
    <div class="ea-footer">
      <div class="flex items-center">
        <div class="w-10 h-10 mr-4">
          <img
            :src="curMusic.picUrl"
            class="rounded-full w-10 h-10"
            @click="playerStore.openPlayerPage"
          />
        </div>
        <div class="flex flex-col justify-center items-center w-36">
          <div class="text-sm font-bold w-full truncate">
            {{ curMusic.name }}
          </div>
          <div class="text-xs flex gap-2 w-full truncate">
            <span
              v-for="singer in curMusic.singers"
              class="ea-link"
              @click="`/artist/${singer.id}`"
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
          @click="changeDrawerStatus(true)"
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
          @click="playerStore.openPlayerPage"
        ></icon-park>
      </div>
    </div>
    <ea-drawer :drawer-show="drawerShow" @close="changeDrawerStatus(false)">
      <div class="flex flex-col gap-2">
        <div
          v-for="music in musicBaseInfoList"
          class="playlist-item cursor-default"
          @dblclick.native="handlePlayMusic(music)"
          :class="{ playing: music.id == curMusic.id }"
        >
          <div class="flex-grow text-start cursor-pointer truncate">
            {{ music.name }}
          </div>
          <div class="flex gap-1 item-center text-xs justify-end truncate">
            <span v-for="singer in music.singers">{{ singer.name }}</span>
          </div>
          <div class="text-sm text-gray-500">
            {{ music.duration }}
          </div>
        </div>
      </div>
    </ea-drawer>
  </div>

  <Player :show="playerStore.showPlayerPage"> </Player>
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
import { computed, ref, watch } from "vue";
import { formatTrackTime, routeTo } from "@/utils/common";
import Player from "./Player.vue";
import { getMusicDetailApi } from "@/api/music";
import dayjs from "dayjs";
import { MusicBaseInfo } from "@/types/musicRel";

const playerStore = usePlayerStore();
const curMusic = computed(() => playerStore.song);
const volume = computed({
  get: () => playerStore.volume,
  set: (val) => {
    playerStore.setVolume(val);
  },
});

const musicBaseInfoList = ref<MusicBaseInfo[]>([]);

watch(
  () => playerStore.playList,
  async (newVal) => {
    if(newVal.length === 0) return
    const { songs } = await getMusicDetailApi(newVal.join(","));
    const list = songs.map((song: any) => {
      return {
        id: song.id,
        name: song.name,
        picUrl: song.al.picUrl,
        singers: song.ar.map((singer: any) => {
          return {
            id: singer.id,
            name: singer.name,
          };
        }),
        duration: dayjs(song.dt).format("mm:ss"),
      };
    });
    musicBaseInfoList.value = list;
  },
  {
    deep: true,
    immediate: true,
  }
);

const drawerShow = ref(false);

const handlePlayMusic = (music: MusicBaseInfo) => {
  playerStore.play(music.id);
};

const changeDrawerStatus = (status: boolean) => {
  drawerShow.value = status;
};

const curMusicDuration = computed(() => playerStore.duration);

const curMusicCurrentTime = computed({
  get: () => parseInt(playerStore.currentTime.toFixed(0)),
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
