<template>
  <div class="flex flex-col w-48 h-64">
    <div class="group cover cursor-pointer">
      <lmg
        :src="picUrl"
        :width="300"
        :height="300"
        class="w-48 h-48 rounded-xl"
        @click="routeTo(`/playlist/${props.data.id}`)"
      ></lmg>
      <icon-park
        :icon="PlayOne"
        fill="white"
        theme="filled"
        :size="24"
        class="cover-play group-hover:opacity-100"
        @click="playAllByPlayListId(props.data.id)"
      ></icon-park>
    </div>
    <div class="flex items-center justify-end px-1">
      <div class="flex-grow text-xs text-gray-400" v-if="props.data.creator">
        <span> by: </span>
        <span
          class="hover:underline active:text-gray-600 cursor-pointer"
          @click="
            openUrl(
              `https://music.163.com/#/user/home?id=${props.data.creator?.id}`
            )
          "
        >
          {{ props.data.creator?.nickname }}
        </span>
      </div>
      <div class="flex items-center">
        <icon-park
          :icon="PlayOne"
          fill="gray"
          theme="filled"
          :size="10"
        ></icon-park>
        <div class="cursor-default text-xs text-gray-600 py-1">
          {{ playCount }}
        </div>
      </div>
    </div>
    <div
      class="w-min max-w-full cursor-pointer px-1 text-center text-base font-bold hover:decoration-black hover:underline truncate"
      @click="`/playlist/${props.data.id}`"
    >
      {{ props.data.name }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { PlayListBaseInfo } from "@/types/playListRel";
import { PlayOne } from "@icon-park/vue-next";
import { computed } from "vue";
import { openUrl, routeTo } from "@/utils/common";
import {playAllByPlayListId} from "@/api/playList";

/* 歌单封面图组件 */
interface Props {
  data: PlayListBaseInfo;
}

const props = withDefaults(defineProps<Props>(), {
  data: () => ({} as PlayListBaseInfo),
});

const picUrl = computed(() => props.data.picUrl);

const playCount = computed(() => {
  const count = props.data.playCount;
  if (count < 10000) {
    return count;
  } else if (count < 100000000) {
    return (count / 10000).toFixed(1) + "万";
  } else {
    return (count / 100000000).toFixed(1) + "亿";
  }
});
</script>

<style lang="scss" scoped></style>
