<template>
  <div
    class="ea-empty"
    :class="{ 'ea-empty--compact': compact }">
    <div
      class="ea-empty__icon"
      aria-hidden="true">
      <slot name="icon">
        <icon-park
          :icon="Inbox"
          :size="compact ? 30 : 46"
          theme="outline"
          fill="currentColor" />
      </slot>
    </div>

    <p
      v-if="title"
      class="ea-empty__title">
      {{ title }}
    </p>
    <p
      v-if="description"
      class="ea-empty__desc">
      {{ description }}
    </p>

    <div
      v-if="$slots.action || actionText"
      class="ea-empty__action">
      <slot name="action">
        <ea-button
          type="primary"
          @click="emit('action')">
          <span class="ea-empty__action-text">{{ actionText }}</span>
        </ea-button>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Inbox } from '@icon-park/vue-next'

defineOptions({
  name: 'eaEmpty',
})

interface Props {
  title?: string
  description?: string
  /** 缩略版：用于卡片/侧栏等小空间 */
  compact?: boolean
  /** 传了文案就自动渲染「重试/操作」按钮，点击抛 action 事件 */
  actionText?: string
}

withDefaults(defineProps<Props>(), {
  title: '',
  description: '',
  compact: false,
  actionText: '',
})

const emit = defineEmits<{ action: [] }>()
</script>

<style scoped>
.ea-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 80px 16px;
  text-align: center;
  color: var(--color-secondary, #7a7a7b);
}

.ea-empty--compact {
  gap: 6px;
  padding: 28px 12px;
}

.ea-empty__icon {
  color: color-mix(in srgb, var(--color-secondary, #7a7a7b) 55%, transparent);
  display: flex;
  animation: halo-rise var(--motion-base) var(--ease-standard) both;
}

.ea-empty__title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text, #000);
}

.ea-empty--compact .ea-empty__title {
  font-size: 15px;
}

.ea-empty__desc {
  font-size: 14px;
  line-height: 1.5;
  max-width: 28rem;
}

.ea-empty__action {
  margin-top: 6px;
}

.ea-empty__action-text {
  font-size: 14px;
  font-weight: 700;
  padding: 0 6px;
}
</style>
