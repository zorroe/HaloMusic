<template>
  <label
    class="ea-button btn-animation"
    :class="[props.type, props.size]"
    role="button"
    tabindex="0"
    @keydown="handleKeydown">
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

/**
 * 根节点是 <label>（部分调用方依赖 label[for] 打开弹窗），没有原生键盘可达性，
 * 这里补 role/tabindex + Enter/Space 手动触发 click，保证纯键盘也能操作。
 */
const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  const target = event.currentTarget as HTMLElement | null
  target?.click()
}
</script>

<style scoped>
/* 统一胶囊按钮：圆角、字号、过渡全部走设计 token；type/size 类名保持不变 */
.ea-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: fit-content;
  padding: 0 16px;
  border: 1px solid transparent;
  border-radius: var(--radius-full);
  cursor: pointer;
  user-select: none;
  font-weight: 600;
  color: var(--color-text);
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    border-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard),
    transform var(--motion-fast) var(--ease-standard);
}

.ea-button:active {
  transform: scale(0.97);
}

/* 按钮类型 */
.ea-button.primary {
  background-color: var(--color-primary);
  color: var(--color-on-primary);
}

.ea-button.primary:hover {
  background-color: var(--color-primary);
  filter: brightness(1.06);
}

.ea-button.danger {
  background-color: var(--color-danger-bg);
  color: var(--color-danger);
}

.ea-button.danger:hover {
  background-color: color-mix(
    in srgb,
    var(--color-danger) 20%,
    transparent
  );
}

.ea-button.info {
  background-color: var(--color-secondary-bg);
  color: var(--color-text-muted);
}

.ea-button.info:hover {
  background-color: var(--color-hover);
  color: var(--color-text);
}

/* 按钮大小 */
.ea-button.small {
  height: 30px;
  font-size: 0.8125rem;
}

.ea-button.normal {
  height: 34px;
  font-size: 0.875rem;
}

.ea-button.large {
  height: 40px;
  font-size: 0.9375rem;
  padding: 0 20px;
}
</style>
