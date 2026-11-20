<template>
  <div
    :class="[
      'ea-notify',
      `ea-notify--${state}`,
      `ea-notify--type-${props.type}`,
    ]"
    @mouseenter="clearTimer"
    @mouseleave="startTimer"
    @animationend="handleAnimationEnd">
    <div class="ea-notify-body">
      <span class="ea-notify__icon">
        <component
          :is="iconCom"
          fill="currentColor"
          :size="18" />
      </span>
      <div class="ea-notify-content">
        <component
          :is="messageComponent"
          v-if="messageComponent" />
        <span v-else>{{ messageText }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, isVNode, onBeforeUnmount, onMounted, ref } from 'vue'
import type { VNode } from 'vue'
import { Attention, CheckOne, CloseOne, Info } from '@icon-park/vue-next'
import type { Icon } from '@icon-park/vue-next/lib/runtime'
import type { NotifyType } from './notify'

interface Props {
  message?: string | VNode
  /** 毫秒；<=0 表示常驻 */
  duration?: number
  type?: NotifyType
  /** 退场动画结束后回调（notify.ts 用它真正卸载并移除 DOM） */
  onClosed?: () => void
  /** 组件挂载后把「请求关闭」的能力交给 notify.ts，用于超限淘汰时也走退场动画 */
  registerClose?: (close: () => void) => void
}

const props = withDefaults(defineProps<Props>(), {
  message: '',
  duration: 3000,
  type: 'info',
  onClosed: undefined,
  registerClose: undefined,
})

type NotifyPhase = 'entering' | 'visible' | 'leaving'

/** 退场动画 140ms，兜底计时器放宽到 200ms；animationend 正常时会被提前清掉 */
const LEAVE_FALLBACK_DELAY = 200

const state = ref<NotifyPhase>('entering')

let timer: ReturnType<typeof setTimeout> | undefined
let leaveFallback: ReturnType<typeof setTimeout> | undefined
let finished = false

/** 图标颜色走 CSS 语义色（--color-info/success/warning/danger），这里只决定图标形状 */
const iconMap: Record<NotifyType, Icon> = {
  info: Info,
  success: CheckOne,
  warning: Attention,
  error: CloseOne,
}

const iconCom = computed(() => iconMap[props.type] ?? iconMap.info)

const messageText = computed(() =>
  typeof props.message === 'string' ? props.message : ''
)

const messageComponent = computed(() => {
  const message = props.message
  if (message && typeof message === 'object' && isVNode(message)) {
    return () => message
  }
  return null
})

const clearTimer = () => {
  if (timer !== undefined) {
    clearTimeout(timer)
    timer = undefined
  }
}

const clearLeaveFallback = () => {
  if (leaveFallback !== undefined) {
    clearTimeout(leaveFallback)
    leaveFallback = undefined
  }
}

const startTimer = () => {
  clearTimer()
  if (state.value === 'leaving' || finished) return
  if (props.duration > 0) {
    timer = setTimeout(requestClose, props.duration)
  }
}

/** 退场动画播完（或兜底计时器到点）后通知 notify.ts 卸载节点 */
const finish = () => {
  if (finished) return
  finished = true
  clearTimer()
  clearLeaveFallback()
  props.onClosed?.()
}

/** 请求关闭：先播 halo-slide-out-right + fade，动画结束再卸载 */
const requestClose = () => {
  if (state.value === 'leaving' || finished) return
  clearTimer()
  state.value = 'leaving'
  leaveFallback = setTimeout(finish, LEAVE_FALLBACK_DELAY)
}

const handleAnimationEnd = (event: AnimationEvent) => {
  if (event.target !== event.currentTarget) return
  if (state.value === 'leaving') {
    finish()
    return
  }
  // 入场动画结束：切到显式终态的 visible 类，移除动画时不会回跳到初始透明态
  if (state.value === 'entering') state.value = 'visible'
}

onMounted(() => {
  props.registerClose?.(requestClose)
  startTimer()
})

onBeforeUnmount(() => {
  clearTimer()
  clearLeaveFallback()
})
</script>

<style scoped>
.ea-notify {
  width: 100%;
  max-width: 320px;
  margin-top: 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-card-bg-strong);
  color: var(--color-text);
  box-shadow: var(--shadow-lg);
  padding: 0 14px;
  font-weight: 500;
  overflow: hidden;
  opacity: 0;
  transform: translateX(24px);
  will-change: transform, opacity;
}

/* 入场：halo-slide-in-right，220ms（= motion-base 200ms + 20ms），--ease-enter
 * 错峰延迟由 notify.ts 通过 wrapper 上的 --ea-notify-delay 传入 */
.ea-notify--entering {
  animation: halo-slide-in-right calc(var(--motion-base) + 20ms)
    var(--ease-enter) forwards;
  animation-delay: var(--ea-notify-delay, 0ms);
}

/* 稳定态：显式写终态，入场动画移除后不会闪回透明 */
.ea-notify--visible {
  opacity: 1;
  transform: none;
}

/* 退场：halo-slide-out-right（含 fade），140ms（= motion-fast 120ms + 20ms），--ease-exit
 * 显式 animation-delay: 0ms，避免继承入场错峰而延迟移除 */
.ea-notify--leaving {
  animation: halo-slide-out-right calc(var(--motion-fast) + 20ms)
    var(--ease-exit) forwards;
  animation-delay: 0ms;
}

.ea-notify-body {
  display: flex;
  gap: 10px;
  justify-content: flex-start;
  align-items: center;
  min-height: 46px;
  padding: 8px 0;
}

.ea-notify__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  color: var(--color-text-muted);
}

.ea-notify--type-info .ea-notify__icon {
  color: var(--color-info);
}

.ea-notify--type-success .ea-notify__icon {
  color: var(--color-success);
}

.ea-notify--type-warning .ea-notify__icon {
  color: var(--color-warning);
}

.ea-notify--type-error .ea-notify__icon {
  color: var(--color-danger);
}

.ea-notify-content {
  display: flex;
  align-items: center;
  min-width: 0;
  font-size: 0.8125rem;
  line-height: 1.5;
  word-break: break-all;
}
</style>
