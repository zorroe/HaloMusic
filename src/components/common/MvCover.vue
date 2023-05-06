<template>
  <div class="flex flex-col w-64 h-40">
    <div class="group cover justify-center cursor-pointer">
        <lmg
        :src="props.data.picUrl"
        :width="400"
        :height="200"
        class="w-60 h-32 rounded-lg"
      ></lmg>
      <icon-park
        :icon="PlayOne"
        fill="white"
        theme="filled"
        :size="24"
        class="cover-play group-hover:opacity-100"
      ></icon-park>
    </div>
    <div class="flex w-full justify-center gap-4 text-sm "><span class="ea-link" @click="openUrl(`https://music.163.com/#/artist?id=${creator.id}`)" v-for="creator in props.data.creators">{{ creator.name }}</span></div>
  </div>
</template>

<script setup lang="ts">
import { MvBaseInfo } from '@/types/mvRel';
import { openUrl } from '@/utils/common';
import { PlayOne } from '@icon-park/vue-next';

/* mv封面图组件 */
interface Props {
  data: MvBaseInfo;
}

const props = withDefaults(defineProps<Props>(), {
  data: () => ({} as MvBaseInfo),
});
</script>

<style scoped>

</style>