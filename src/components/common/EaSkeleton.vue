<template>
  <!-- 卡片骨架：方形封面 + 两行标题 -->
  <div
    v-if="variant === 'card'"
    class="ea-skeleton-card"
    :style="{ width: cssWidth }">
    <div
      class="halo-skeleton ea-skeleton-card__cover"
      :style="{ borderRadius: radius }"></div>
    <div class="halo-skeleton ea-skeleton-card__line"></div>
    <div
      class="halo-skeleton ea-skeleton-card__line ea-skeleton-card__line--short"></div>
  </div>

  <!-- 列表行骨架：与 MusicTable 行高一致 -->
  <div
    v-else-if="variant === 'row'"
    class="ea-skeleton-row">
    <div class="halo-skeleton ea-skeleton-row__cover"></div>
    <div class="ea-skeleton-row__body">
      <div class="halo-skeleton ea-skeleton-row__line"></div>
      <div
        class="halo-skeleton ea-skeleton-row__line ea-skeleton-row__line--short"></div>
    </div>
    <div class="halo-skeleton ea-skeleton-row__tail"></div>
  </div>

  <!-- 基础形状 -->
  <div
    v-else
    class="halo-skeleton"
    :class="`ea-skeleton-${variant}`"
    :style="blockStyle"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

defineOptions({
  name: 'eaSkeleton',
})

type Variant = 'rect' | 'circle' | 'text' | 'card' | 'row'

interface Props {
  variant?: Variant
  /** rect / circle 的宽；card 的卡片宽度 */
  width?: string | number
  /** rect / circle 的高 */
  height?: string | number
  /** 圆角，默认 rect 8px、text 4px */
  radius?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'rect',
  width: undefined,
  height: undefined,
  radius: undefined,
})

const toCssSize = (value: string | number | undefined): string | undefined => {
  if (value === undefined) return undefined
  return typeof value === 'number' ? `${value}px` : value
}

const cssWidth = computed(() => toCssSize(props.width) ?? '100%')

const blockStyle = computed(() => {
  const style: Record<string, string> = {}
  const width = toCssSize(props.width)
  const height = toCssSize(props.height)
  if (width) style.width = width
  if (height) style.height = height
  if (props.radius) style.borderRadius = props.radius
  return style
})
</script>

<style scoped>
/* 卡片骨架：比例与封面卡片一致（正方形封面 + 标题 + 副标题） */
.ea-skeleton-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  min-width: 0;
}

.ea-skeleton-card__cover {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: var(--radius-md);
}

.ea-skeleton-card__line {
  height: 10px;
  width: 78%;
  border-radius: var(--radius-sm);
}

.ea-skeleton-card__line--short {
  width: 46%;
}

/* 行骨架：与 MusicTable 行高（52px）保持一致，避免加载完成后的跳动 */
.ea-skeleton-row {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 52px;
  padding: 0 12px;
}

.ea-skeleton-row__cover {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  flex: none;
}

.ea-skeleton-row__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.ea-skeleton-row__line {
  height: 10px;
  width: 58%;
  border-radius: var(--radius-sm);
}

.ea-skeleton-row__line--short {
  width: 30%;
}

.ea-skeleton-row__tail {
  width: 40px;
  height: 10px;
  border-radius: var(--radius-sm);
  flex: none;
}

.ea-skeleton-rect {
  width: 100%;
  height: 16px;
  border-radius: var(--radius-sm);
}

.ea-skeleton-circle {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
}

.ea-skeleton-text {
  width: 100%;
  height: 10px;
  border-radius: 6px;
}
</style>
