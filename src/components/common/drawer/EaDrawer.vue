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
/* 右侧浮层：避开顶栏与播放条，做成悬浮卡片 */
.ea-drawer-content {
  position: fixed;
  width: min(400px, 34vw);
  max-width: 34vw;
  right: 8px;
  top: calc(var(--topbar-height, 56px) + 8px);
  bottom: calc(var(--playerbar-height, 72px) + 8px);
  overflow: auto;
  overflow-x: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 16px;
  background-color: var(--color-card-bg);
  color: var(--color-text);
  box-shadow: var(--shadow-lg);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 12px;
  will-change: transform;
}

.ea-drawer-content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--color-border);
}

.ea-drawer-content-header-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 1rem;
  font-weight: 700;
  text-align: start;
}

.ea-drawer-content-header-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 26px;
  height: 26px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background-color: transparent;
  color: var(--color-text-muted);
  font-size: 12px;
  cursor: pointer;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);
}

.ea-drawer-content-header-close:hover {
  background-color: var(--color-hover);
  color: var(--color-text);
}

.ea-drawer-content-main {
  flex-grow: 1;
  min-height: 0;
}

.ea-drawer-body {
  position: fixed;
  inset: 0;
  display: flex;
  background-color: var(--color-mask);
  backdrop-filter: saturate(180%) blur(8px);
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
