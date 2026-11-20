<template>
  <div
    class="ea-loading"
    :class="{ 'ea-loading--block': block }"
    role="status"
    :aria-label="text || '加载中'">
    <span
      class="ea-loading__ring"
      :style="ringStyle"></span>
    <span
      v-if="text"
      class="ea-loading__text"
      >{{ text }}</span
    >
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

defineOptions({
  name: 'eaLoading',
})

interface Props {
  /** 加载环直径（px） */
  size?: number
  /** 加载文案 */
  text?: string
  /** 占满整块区域（居中、带上下留白），用于整页加载 */
  block?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 28,
  text: '',
  block: false,
})

const ringStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  borderWidth: `${Math.max(2, Math.round(props.size / 12))}px`,
}))
</script>

<style scoped>
.ea-loading {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--color-secondary, #7a7a7b);
}

.ea-loading--block {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 14px;
  padding: 120px 0;
}

.ea-loading__ring {
  display: inline-block;
  border-style: solid;
  border-radius: 50%;
  border-color: color-mix(in srgb, var(--color-secondary, #7a7a7b) 26%, transparent);
  border-top-color: var(--color-primary, #335eea);
  animation: halo-spin var(--motion-spin, 800ms) linear infinite;
  flex: none;
}

.ea-loading__text {
  font-size: 14px;
  line-height: 1.4;
}
</style>
