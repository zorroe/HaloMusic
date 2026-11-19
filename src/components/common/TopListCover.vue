<template>
  <div class="flex flex-col w-48 h-64">
    <div class="cover group cursor-pointer">
      <lmg
        :src="props.data.picUrl"
        :width="300"
        :height="300"
        class="w-48 h-48 rounded-xl"
        @click="routeTo(`/playlist/${props.data.id}`)"></lmg>
      <icon-park
        :icon="PlayOne"
        fill="white"
        theme="filled"
        :size="24"
        class="cover-play group-hover:opacity-100"
        title="播放全部"
        @click.stop="handlePlayAll"></icon-park>
    </div>
    <div
      class="text-center text-base font-bold hover:decoration-black hover:underline truncate cursor-pointer"
      @click="routeTo(`/playlist/${props.data.id}`)">
      {{ props.data.name }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { PlayOne } from '@icon-park/vue-next'
import type { PlayListBaseInfo } from '@/types/playListRel'
import { playAllByPlayListId } from '@/api/playList'
import { routeTo } from '@/utils/common'

/* 排行榜封面图组件 */
interface Props {
  data?: PlayListBaseInfo
}

const props = withDefaults(defineProps<Props>(), {
  data: () => ({}) as PlayListBaseInfo,
})

const handlePlayAll = () => {
  playAllByPlayListId(props.data.id).catch((error: unknown) => {
    console.error('[HaloMusic] play toplist failed:', error)
  })
}
</script>

<style scoped></style>
