<template>
  <label
    class="ea-button btn-animation"
    :class="[props.type, props.size]">
    <slot></slot>
  </label>
</template>

<script setup lang="ts">
interface Props {
  type?: 'primary' | 'danger' | 'info'
  size?: 'small' | 'normal' | 'large'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'primary',
  size: 'normal',
})
</script>

<style scoped>
.ea-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  margin-bottom: 0.25rem;
  padding: 0.25rem 0.5rem;
  gap: 0.25rem;
  border-radius: 0.375rem;
  cursor: pointer;
  user-select: none;
  transition: all 300ms;
}

/* 按钮类型 */
.primary {
  background-color: var(--color-primary-bg);
  color: var(--color-primary);
}

.danger {
  background-color: var(--color-danger-bg);
  color: var(--color-danger);
}

.info {
  background-color: var(--color-secondary-bg);
  color: var(--color-text-muted);
}

/* 按钮大小 */
.small {
  min-width: 60px;
  height: 32px;
  font-size: 14px;
}

.normal {
  min-width: 80px;
  height: 40px;
  font-size: 16px;
}

.large {
  min-width: 100px;
  height: 48px;
  font-size: 18px;
}
</style>
