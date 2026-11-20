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
  gap: 8px;
  padding: 64px 16px;
  text-align: center;
  color: var(--color-text-muted);
}

.ea-empty--compact {
  gap: 4px;
  padding: 24px 12px;
}

/* 图标放在弱化圆形底盘上，和卡片表面语言一致 */
.ea-empty__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  margin-bottom: 6px;
  border-radius: var(--radius-full);
  background-color: var(--color-secondary-bg);
  color: var(--color-text-subtle);
  animation: halo-rise var(--motion-base) var(--ease-standard) both;
}

.ea-empty--compact .ea-empty__icon {
  width: 44px;
  height: 44px;
  margin-bottom: 2px;
}

.ea-empty__title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.4;
  color: var(--color-text);
}

.ea-empty--compact .ea-empty__title {
  font-size: 0.8125rem;
}

.ea-empty__desc {
  margin: 0;
  max-width: 28rem;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--color-text-muted);
}

.ea-empty--compact .ea-empty__desc {
  font-size: 0.75rem;
}

.ea-empty__action {
  margin-top: 8px;
}

.ea-empty__action-text {
  padding: 0 4px;
  font-size: 0.8125rem;
  font-weight: 600;
}
</style>
