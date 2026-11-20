<template>
  <div class="cover-card">
    <div class="cover-card__media group">
      <lmg
        :src="props.data.picUrl"
        :width="320"
        :height="180"
        class="cover-card__img"
        @click="routeTo(`/mv/${props.data.id}`)" />
      <span
        class="cover-card__badge"
        aria-hidden="true">
        MV
      </span>
      <icon-park
        :icon="PlayOne"
        fill="currentColor"
        theme="filled"
        :size="20"
        class="cover-play"
        title="播放 MV"
        @click.stop="routeTo(`/mv/${props.data.id}`)"></icon-park>
    </div>
    <div
      class="cover-card__title"
      :title="props.data.name"
      @click="routeTo(`/mv/${props.data.id}`)">
      {{ props.data.name }}
    </div>
    <div
      v-if="props.data.creators?.length"
      class="cover-card__subtitle">
      <span
        v-for="creator in props.data.creators"
        :key="creator.id"
        class="cover-card__artist"
        :title="creator.name">{{ creator.name }}</span
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MvBaseInfo } from '@/types/mvRel'
import { routeTo } from '@/utils/common'
import { PlayOne } from '@icon-park/vue-next'

/* mv封面图组件（接口保持不变：data；视频封面保持 16:9，避免裁切画面） */
interface Props {
  data?: MvBaseInfo
}

const props = withDefaults(defineProps<Props>(), {
  data: () => ({}) as MvBaseInfo,
})
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
  aspect-ratio: 16 / 9;
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

/* 视频角标：静态装饰，不参与交互 */
.cover-card__badge {
  position: absolute;
  left: 8px;
  bottom: 8px;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  background-color: color-mix(in srgb, var(--color-mask) 72%, transparent);
  color: var(--color-on-primary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  pointer-events: none;
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
  gap: 6px;
  min-width: 0;
  overflow: hidden;
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--color-text-muted);
}

.cover-card__artist {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
