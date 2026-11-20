<template>
  <div class="cover-card">
    <div class="cover-card__media">
      <lmg
        :src="props.data.avatarUrl"
        :width="300"
        :height="300"
        class="cover-card__img"
        @click="handleOpenProfile" />
    </div>
    <div
      class="cover-card__title"
      :title="props.data.nickname"
      @click="handleOpenProfile">
      {{ props.data.nickname }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UserProfile } from '@/types/userRel'
import { openUrl } from '@/utils/common'

/* 用户头像组件（接口保持不变：data） */
interface Props {
  data: UserProfile
}

const props = defineProps<Props>()

const handleOpenProfile = () => {
  if (!props.data?.userId) return
  openUrl(`https://music.163.com/#/user/home?id=${props.data.userId}`)
}
</script>

<style scoped>
.cover-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
}

/* 用户头像保持圆形语义，其余视觉与方形封面统一 */
.cover-card__media {
  position: relative;
  width: 100%;
  max-width: 132px;
  aspect-ratio: 1 / 1;
  border-radius: var(--radius-full);
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
  border-radius: var(--radius-full);
  cursor: pointer;
}

.cover-card__title {
  max-width: 100%;
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
