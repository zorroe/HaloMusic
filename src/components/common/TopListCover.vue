<template>
  <div class="flex flex-col w-48 h-64">
    <div class="cover group cursor-pointer">
      <lmg
        :src="props.data.picUrl"
        :width="300"
        :height="300"
        class="cover-img w-48 h-48 rounded-xl"
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
      class="text-center text-base font-bold hover:decoration-[var(--color-text)] hover:underline truncate cursor-pointer"
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

<style scoped>
/* hover 时封面微放大 + 阴影加深，只动 transform / box-shadow / opacity */
.cover-img {
  transition:
    transform var(--motion-base) var(--ease-standard),
    box-shadow var(--motion-base) var(--ease-standard),
    opacity var(--motion-base) var(--ease-standard);
}

.cover:hover .cover-img {
  transform: scale(1.04);
  box-shadow: 0 14px 32px var(--color-shadow-strong);
}

</style>
