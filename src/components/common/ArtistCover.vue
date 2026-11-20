<template>
  <div class="cover-card">
    <div class="cover-card__media group">
      <lmg
        :src="props.data.picUrl"
        :width="300"
        :height="300"
        class="cover-card__img"
        @click="routeTo(`/artist/${props.data.id}`)" />
      <icon-park
        :icon="PlayOne"
        fill="currentColor"
        theme="filled"
        :size="20"
        class="cover-play"
        title="播放全部"
        @click.stop="handlePlayAll"></icon-park>
    </div>
    <div
      class="cover-card__title"
      :title="props.data.name"
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

/* 歌手封面图组件（接口保持不变：data） */
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
.cover-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  min-width: 0;
}

.cover-card__media {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: var(--radius-md);
  overflow: hidden;
  background-color: var(--color-secondary-bg);
  transition:
    transform var(--motion-base) var(--ease-standard),
    box-shadow var(--motion-base) var(--ease-standard);
}

.cover-card__media:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.cover-card__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: var(--radius-md);
  cursor: pointer;
}

.cover-card__title {
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.4;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.cover-card__title:hover {
  color: var(--color-primary);
}
</style>
