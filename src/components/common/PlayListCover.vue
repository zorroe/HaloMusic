<template>
  <div class="flex flex-col w-48 h-64">
    <div class="group cover cursor-pointer">
      <icon-park
        :icon="PlayOne"
        fill="white"
        theme="filled"
        :size="24"
        class="cover-play group-hover:opacity-100 peer"
        title="播放全部"
        @click.stop="handlePlayAll"></icon-park>
      <lmg
        :src="props.data.picUrl"
        :width="300"
        :height="300"
        class="cover-img w-48 h-48 rounded-xl peer-hover:shadow-xl hover:shadow-xl"
        @click="routeTo(`/playlist/${props.data.id}`)"></lmg>
    </div>
    <div class="flex items-center justify-end px-1">
      <div
        v-if="props.data.creator"
        class="flex-grow text-xs text-[var(--color-text-subtle)] min-w-0 truncate">
        <span> by: </span>
        <span
          class="hover:underline active:text-[var(--color-text-muted)] cursor-pointer"
          @click="handleOpenCreator">
          {{ props.data.creator?.nickname }}
        </span>
      </div>
      <div class="flex items-center">
        <icon-park
          :icon="PlayOne"
          fill="gray"
          theme="filled"
          :size="10"></icon-park>
        <div class="cursor-default text-xs text-[var(--color-text-muted)] py-1">
          {{ playCount }}
        </div>
      </div>
    </div>
    <div
      class="w-min max-w-full cursor-pointer px-1 text-center text-base font-bold hover:decoration-[var(--color-text)] hover:underline truncate"
      @click="routeTo(`/playlist/${props.data.id}`)">
      {{ props.data.name }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PlayOne } from '@icon-park/vue-next'
import type { PlayListBaseInfo } from '@/types/playListRel'
import { openUrl, routeTo } from '@/utils/common'
import { playAllByPlayListId } from '@/api/playList'

/* 歌单封面图组件 */
interface Props {
  data?: PlayListBaseInfo
}

const props = withDefaults(defineProps<Props>(), {
  data: () => ({}) as PlayListBaseInfo,
})

const playCount = computed(() => {
  const count = props.data.playCount ?? 0
  if (count < 10000) return count
  if (count < 100000000) return `${(count / 10000).toFixed(1)}万`
  return `${(count / 100000000).toFixed(1)}亿`
})

const handlePlayAll = () => {
  playAllByPlayListId(props.data.id).catch((error: unknown) => {
    console.error('[HaloMusic] play playlist failed:', error)
  })
}

const handleOpenCreator = () => {
  const creatorId = props.data.creator?.id
  if (!creatorId) return
  openUrl(`https://music.163.com/#/user/home?id=${creatorId}`)
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
