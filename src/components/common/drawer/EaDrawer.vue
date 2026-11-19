<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div
        v-if="props.drawerShow"
        id="ea-drawer-shadow"
        class="ea-drawer-body"
        @click="handleShadowClick">
        <div class="ea-drawer-content">
          <div
            v-if="props.title"
            class="ea-drawer-content-header">
            <span class="ea-drawer-content-header-title">
              {{ props.title }}
            </span>
            <div
              v-show="props.iconClose || !props.shadowClose"
              class="ea-drawer-content-header-close"
              @click="emit('close')">
              关
            </div>
          </div>
          <div class="ea-drawer-content-main">
            <slot></slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
interface Props {
  drawerShow?: boolean
  /** 点击遮罩是否关闭 */
  shadowClose?: boolean
  /** 是否总是显示关闭按钮 */
  iconClose?: boolean
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  drawerShow: false,
  shadowClose: true,
  iconClose: false,
  title: '',
})

const emit = defineEmits<{
  close: []
}>()

/**
 * 只有直接点中遮罩本身才关闭。
 *
 * 旧实现是在 document 上挂 click 监听，drawerShow 初始为 false 时 watch
 * 不触发、组件卸载时也不 remove，监听会随着开关抽屉不断累积（内存泄漏）。
 * 现在监听挂在遮罩节点上，节点随 v-if 销毁而自然回收，无需手动清理。
 */
const handleShadowClick = (event: MouseEvent) => {
  if (!props.shadowClose) return
  if (event.target === event.currentTarget) emit('close')
}
</script>

<style scoped>
.ea-drawer-content {
  position: fixed;
  width: 30%;
  max-width: 30%;
  right: 0px;
  top: 66px;
  bottom: 66px;
  overflow: auto;
  overflow-x: hidden;
  border-radius: 8px;
  padding: 12px;
  background-color: rgba(255, 255, 255, 0.9);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ea-drawer-content-header {
  font-size: 32px;
  font-weight: 800;
  display: flex;
}

.ea-drawer-content-header-title {
  width: 80%;
  text-align: start;
}

.ea-drawer-content-header-close {
  width: 20%;
  text-align: center;
  cursor: pointer;
  border: 1px black solid;
}

.ea-drawer-content-main {
  flex-grow: 1;
}

.ea-drawer-body {
  position: fixed;
  height: 100%;
  width: 100%;
  top: 0px;
  right: 0px;
  display: flex;
  background: radial-gradient(transparent, rgba(0, 0, 0, 0.1) 1px);
  background-size: 2px 2px;
  backdrop-filter: saturate(180%) blur(10px);
  z-index: 9998;
}

.drawer-enter-active,
.drawer-leave-active {
  transition: all 500ms ease-in-out;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-active .ea-drawer-content,
.drawer-leave-active .ea-drawer-content {
  transition: all 500ms ease-in-out;
}

.drawer-enter-from .ea-drawer-content,
.drawer-leave-to .ea-drawer-content {
  transform: translateX(100%);
}
</style>
