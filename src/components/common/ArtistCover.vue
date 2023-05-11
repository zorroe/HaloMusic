<template>
  <div class="flex flex-col w-40 h-52">
    <div class="cover group cursor-pointer">
      <lmg
        :src="picUrl"
        :width="300"
        :height="300"
        class="w-40 h-40 rounded-full"
        @click="routeTo(`/artist/${props.data.id}`)"
      ></lmg>
      <icon-park
        :icon="PlayOne"
        fill="white"
        theme="filled"
        :size="24"
        class="cover-play group-hover:opacity-100"
        @click="playAllByArtistId(props.data.id)"
      ></icon-park>
    </div>
    <div
      class="text-center cursor-pointer mt-2 text-base font-bold hover:decoration-black hover:underline truncate"
      @click="routeTo(`/artist/${props.data.id}`)"
    >
      {{ props.data.name }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { PlayOne } from "@icon-park/vue-next";
import { ArtistBaseInfo } from "@/types/artistRel";
import {playAllByArtistId} from "@/api/artist";
import { computed } from "vue";
import { routeTo } from "@/utils/common";

/* 歌手封面图组件 */
interface Props {
  data: ArtistBaseInfo;
}

const props = withDefaults(defineProps<Props>(), {
  data: () => ({} as ArtistBaseInfo),
});

const picUrl = computed(() => props.data.picUrl);
</script>

<style lang="scss" scoped></style>
