<template>
  <Teleport to="body">
    <Transition name="ea-context-menu">
      <div
        v-if="props.visible"
        ref="menuRef"
        class="ea-context-menu"
        role="menu"
        :style="{ left: `${position.left}px`, top: `${position.top}px` }"
        @pointerdown.stop
        @contextmenu.prevent>
        <button
          v-for="item in props.items"
          :key="item.key"
          type="button"
          role="menuitem"
          class="ea-context-menu__item"
          :class="{
            'ea-context-menu__item--danger': item.danger,
            'ea-context-menu__item--disabled': item.disabled,
          }"
          :disabled="item.disabled"
          @click="handleSelect(item)">
          <component
            :is="item.icon"
            v-if="item.icon"
            :size="16"
            class="ea-context-menu__icon" />
          <span class="ea-context-menu__label">{{ item.label }}</span>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts">
import type { Component } from 'vue'

/**
 * 右键菜单项定义。
 * icon 传 IconPark 组件（如 PlayOne），由菜单内部以 <component :is> 渲染。
 */
export interface EaContextMenuItem {
  key: string
  label: string
  icon?: Component
  /** 危险操作（删除/清理等）使用功能色高亮 */
  danger?: boolean
  disabled?: boolean
}
</script>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

defineOptions({
  name: 'eaContextMenu',
})

interface Props {
  items: EaContextMenuItem[]
  visible: boolean
  /** 鼠标位置（viewport 坐标，menu 用 fixed 定位） */
  x: number
  y: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [key: string]
  close: []
}>()

/** 菜单与视口的留白，越界翻转后也不会贴死边缘 */
const VIEWPORT_MARGIN = 8

const menuRef = ref<HTMLElement | null>(null)
const position = ref({ left: 0, top: 0 })

/** 视口边界翻转：右/下越界时把菜单翻到鼠标左/上方，仍越界则贴边 */
const updatePosition = () => {
  const el = menuRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const maxLeft = window.innerWidth - VIEWPORT_MARGIN - rect.width
  const maxTop = window.innerHeight - VIEWPORT_MARGIN - rect.height
  const left = Math.max(VIEWPORT_MARGIN, Math.min(props.x, maxLeft))
  const top = Math.max(VIEWPORT_MARGIN, Math.min(props.y, maxTop))
  position.value = { left, top }
}

// 打开 / 移动坐标时：先用鼠标位置渲染，DOM 就绪后再按真实尺寸纠正（nextTick 在浏览器绘制前完成，不会闪）
watch(
  () => [props.visible, props.x, props.y] as const,
  () => {
    if (!props.visible) return
    position.value = { left: props.x, top: props.y }
    void nextTick(updatePosition)
  },
  { immediate: true }
)

const close = () => {
  emit('close')
}

const handleSelect = (item: EaContextMenuItem) => {
  if (item.disabled) return
  emit('select', item.key)
  close()
}

const handleKeydown = (event: KeyboardEvent) => {
  if (!props.visible || event.key !== 'Escape') return
  event.preventDefault()
  close()
}

/** 点击菜单外部关闭；pointerdown 捕获阶段生效，点别处时不必等 click */
const handlePointerDown = (event: PointerEvent) => {
  if (!props.visible) return
  const target = event.target
  if (target instanceof Node && menuRef.value?.contains(target)) return
  close()
}

/** 任意滚动容器（含虚拟列表内部滚动）滚动时关闭，避免菜单和行脱节 */
const handleScroll = (event: Event) => {
  if (!props.visible) return
  const target = event.target
  if (target instanceof Node && menuRef.value?.contains(target)) return
  close()
}

/** 窗口尺寸变化时重新做边界翻转，而不是直接关掉菜单 */
const handleResize = () => {
  if (!props.visible) return
  updatePosition()
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('pointerdown', handlePointerDown, true)
  document.addEventListener('scroll', handleScroll, true)
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('pointerdown', handlePointerDown, true)
  document.removeEventListener('scroll', handleScroll, true)
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.ea-context-menu {
  position: fixed;
  z-index: 9600;
  min-width: 168px;
  max-width: 260px;
  max-height: 60vh;
  overflow-y: auto;
  padding: 6px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background-color: var(--color-card-bg-strong);
  color: var(--color-text);
  box-shadow: 0 12px 32px var(--color-shadow-strong);
  user-select: none;
}

.ea-context-menu__item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  text-align: left;
  cursor: pointer;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);
}

.ea-context-menu__item:hover:not(:disabled) {
  background-color: var(--color-hover);
}

.ea-context-menu__item:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}

.ea-context-menu__item--danger {
  color: var(--color-danger);
}

.ea-context-menu__item--danger:hover:not(:disabled) {
  background-color: var(--color-danger-bg);
}

.ea-context-menu__item--disabled,
.ea-context-menu__item:disabled {
  color: var(--color-text-subtle);
  cursor: default;
  opacity: 0.7;
}

.ea-context-menu__icon {
  flex: none;
}

.ea-context-menu__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 入场/退场统一走全局 halo-pop 系列 keyframes */
.ea-context-menu-enter-active {
  animation: halo-pop-in var(--motion-fast) var(--ease-enter) both;
}

.ea-context-menu-leave-active {
  animation: halo-pop-out var(--motion-fast) var(--ease-exit) both;
}
</style>
