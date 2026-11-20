<template>
  <div class="flex flex-col w-40 h-52">
    <div class="cover group cursor-pointer">
      <lmg
        :src="props.data.picUrl"
        :width="300"
        :height="300"
        class="cover-img w-40 h-40 rounded-full"
        @click="routeTo(`/artist/${props.data.id}`)"></lmg>
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
      class="text-center cursor-pointer mt-2 text-base font-bold hover:decoration-[var(--color-text)] hover:underline truncate"
      @click="routeTo(`/artist/${props.data.id}`)">
      {{ props.data.name }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { PlayOne } from '@icon-park/vue-next'
import type { ArtistBaseInfo } from '@/types/artistRel'
import { playAllByArtistId } from '@/api/artist'
import { routeTo } from '@/utils/common'

/* 歌手封面图组件 */
interface Props {
  data?: ArtistBaseInfo
}

const props = withDefaults(defineProps<Props>(), {
  data: () => ({}) as ArtistBaseInfo,
})

const handlePlayAll = () => {
  playAllByArtistId(props.data.id).catch((error: unknown) => {
    console.error('[HaloMusic] play artist failed:', error)
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
