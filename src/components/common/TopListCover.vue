<template>
  <div class="flex flex-col w-48 h-64 cursor-pointer">
    <div class="cover group">
      <lmg
        :src="picUrl"
        :width="300"
        :height="300"
        class="w-48 h-48 rounded-xl"
      ></lmg>
      <icon-park
        :icon="PlayOne"
        fill="white"
        theme="filled"
        :size="24"
        class="cover-play group-hover:opacity-100"
      ></icon-park>
    </div>
    <div
      class="text-center text-base font-bold hover:decoration-black hover:underline truncate"
    >
      {{ props.data.name }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { PlayListBaseInfo } from "@/types/playListRel";
import { PlayOne } from "@icon-park/vue-next";
import { computed } from "vue";

/* 歌单封面图组件 */
interface Props {
  data: PlayListBaseInfo;
}

const props = withDefaults(defineProps<Props>(), {
  data: () => ({} as PlayListBaseInfo),
});

const picUrl = computed(() => props.data.picUrl);
</script>

<style lang="scss" scoped></style>
