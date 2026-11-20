<template>
  <div class="flex flex-col w-48 h-64">
    <div class="cover group cursor-pointer">
      <lmg
        :src="props.data.picUrl"
        :width="300"
        :height="300"
        class="cover-img w-48 h-48 rounded-xl"
        @click="routeTo(`/album/${props.data.id}`)"></lmg>
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
      class="text-left max-w-full text-base font-bold hover:decoration-black hover:underline cursor-pointer truncate"
      @click="routeTo(`/album/${props.data.id}`)">
      {{ props.data.name }}
    </div>
    <div
      class="text-left max-w-full text-xs text-gray-500 truncate flex gap-1 cursor-pointer">
      <span
        v-for="artist in props.data.artists"
        :key="artist.id"
        class="hover:underline"
        @click="routeTo(`/artist/${artist.id}`)"
        >{{ artist.name }}</span
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { PlayOne } from '@icon-park/vue-next'
import type { AlbumBaseInfo } from '@/types/albumRel'
import { playAllByAlbumId } from '@/api/album'
import { routeTo } from '@/utils/common'

/* 专辑封面图组件 */
interface Props {
  data?: AlbumBaseInfo
}

const props = withDefaults(defineProps<Props>(), {
  data: () => ({}) as AlbumBaseInfo,
})

const handlePlayAll = () => {
  playAllByAlbumId(props.data.id).catch((error: unknown) => {
    console.error('[HaloMusic] play album failed:', error)
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
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.18);
}

</style>
