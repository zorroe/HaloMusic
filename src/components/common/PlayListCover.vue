<template>
  <div class="cover-card">
    <div class="cover-card__media group">
      <lmg
        :src="props.data.picUrl"
        :width="300"
        :height="300"
        class="cover-card__img"
        @click="routeTo(`/playlist/${props.data.id}`)" />
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
      @click="routeTo(`/playlist/${props.data.id}`)">
      {{ props.data.name }}
    </div>
    <div class="cover-card__subtitle">
      <span
        v-if="props.data.creator"
        class="cover-card__creator"
        :title="`by ${props.data.creator.nickname}`"
        @click="handleOpenCreator"
        >by {{ props.data.creator.nickname }}</span
      >
      <span
        v-else
        class="cover-card__creator"></span>
      <span class="cover-card__count">
        <icon-park
          :icon="PlayOne"
          theme="filled"
          fill="currentColor"
          :size="11" />
        {{ playCount }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PlayOne } from '@icon-park/vue-next'
import type { PlayListBaseInfo } from '@/types/playListRel'
import { openUrl, routeTo } from '@/utils/common'
import { playAllByPlayListId } from '@/api/playList'

/* 歌单封面图组件（接口保持不变：data） */
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

.cover-card__subtitle {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--color-text-muted);
}

.cover-card__creator {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.cover-card__creator:hover {
  color: var(--color-primary);
}

.cover-card__count {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex: none;
  font-variant-numeric: tabular-nums;
}
</style>
