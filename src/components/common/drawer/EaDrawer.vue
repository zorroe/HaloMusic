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
 * 监听挂在遮罩节点上（不是 document）：节点随 v-if 销毁而自然回收，
 * 不存在监听累积泄漏，也不需要手动 add/remove。
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
  top: 56px;
  bottom: 64px;
  overflow: auto;
  overflow-x: hidden;
  border-radius: 8px;
  padding: 12px;
  background-color: var(--color-card-bg);
  color: var(--color-text);
  box-shadow: 0 20px 48px var(--color-shadow-strong);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 12px;
  will-change: transform;
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
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background-color: var(--color-secondary-bg);
  transition: background-color var(--motion-fast) var(--ease-standard);
}

.ea-drawer-content-header-close:hover {
  background-color: var(--color-hover);
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
  background: radial-gradient(transparent, var(--color-mask-noise) 1px);
  background-size: 2px 2px;
  backdrop-filter: saturate(180%) blur(10px);
  z-index: 9998;
}

/* ---------------------------------------------------------------------------
 * 过渡：遮罩只做淡入淡出，内容单独从右侧滑入滑出（不再整体位移）
 * 时长/曲线统一取 motion.css 的 token
 *
 * 注意：<Transition> 按「根节点」的 transition 总时长决定何时移除过渡类名。
 * 入场时内容滑入 320ms 比遮罩淡入 200ms 长，所以根节点额外声明一个同样 320ms 的
 * transform 过渡（根节点本身不位移）来让 Transition 等满 320ms，避免内容滑到一半被截断。
 * ------------------------------------------------------------------------- */
.drawer-enter-active {
  transition:
    opacity var(--motion-base) var(--ease-enter),
    transform var(--motion-slow) var(--ease-enter);
}

.drawer-leave-active {
  transition:
    opacity var(--motion-fast) var(--ease-exit),
    transform var(--motion-fast) var(--ease-exit);
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-active .ea-drawer-content {
  transition: transform var(--motion-slow) var(--ease-enter);
}

.drawer-leave-active .ea-drawer-content {
  transition: transform var(--motion-fast) var(--ease-exit);
}

.drawer-enter-from .ea-drawer-content,
.drawer-leave-to .ea-drawer-content {
  transform: translateX(100%);
}
</style>
