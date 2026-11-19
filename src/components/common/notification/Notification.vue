<template>
  <div
    :class="[
      'ea-notify',
      { 'ea-notify-visible': visible, 'ea-notify-invisible': !visible },
    ]"
    @mouseenter="clearTimer"
    @mouseleave="startTimer">
    <div class="ea-notify-body">
      <component
        :is="iconCom.component"
        :fill="iconCom.color"
        :size="24" />
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
import {
  Attention,
  CheckOne,
  CloseOne,
  Info,
} from '@icon-park/vue-next'
import type { Icon } from '@icon-park/vue-next/lib/runtime'
import type { NotifyType } from './notify'

interface Props {
  message?: string | VNode
  /** 毫秒；<=0 表示常驻 */
  duration?: number
  type?: NotifyType
  /** 关闭动画结束后的回调（由 notify.ts 传入，用于卸载节点） */
  onClosed?: () => void
}

const props = withDefaults(defineProps<Props>(), {
  message: '',
  duration: 3000,
  type: 'info',
  onClosed: undefined,
})

const visible = ref(true)
let timer: ReturnType<typeof setTimeout> | undefined
let closeTimer: ReturnType<typeof setTimeout> | undefined

const iconMap: Record<NotifyType, { component: Icon; color: string }> = {
  info: { component: Info, color: '#1890ff' },
  success: { component: CheckOne, color: '#52c41a' },
  warning: { component: Attention, color: '#faad14' },
  error: { component: CloseOne, color: '#f5222d' },
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

const startTimer = () => {
  clearTimer()
  if (props.duration > 0) {
    timer = setTimeout(close, props.duration)
  }
}

const clearTimer = () => {
  if (timer !== undefined) {
    clearTimeout(timer)
    timer = undefined
  }
}

const close = () => {
  if (!visible.value) return
  visible.value = false
  // 等收缩动画跑完再通知父级卸载，避免节点瞬间消失
  closeTimer = setTimeout(() => {
    props.onClosed?.()
  }, 500)
}

onMounted(() => {
  startTimer()
})

onBeforeUnmount(() => {
  clearTimer()
  if (closeTimer !== undefined) {
    clearTimeout(closeTimer)
    closeTimer = undefined
  }
})
</script>

<style scoped>
.ea-notify {
  width: 256px;
  transition: all 500ms;
  background-color: rgb(255, 255, 255);
  box-shadow: rgb(0 0 0 / 10%) 0px 0px 16px 0px;
  animation: fade-in 200ms ease-in-out;
  padding: 0px 16px;
  font-weight: 700;
  overflow: hidden;
}

@keyframes fade-in {
  0% {
    transform: translateX(300px);
  }
}

.ea-notify-visible {
  height: 64px;
  margin-top: 16px;
  border-radius: 10px;
  opacity: 1;
}

.ea-notify-invisible {
  height: 0px;
  margin: 0px;
  opacity: 0;
}

.ea-notify-body {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
  height: 64px;
}

.ea-notify-content {
  display: flex;
  align-items: center;
  min-width: 0;
  word-break: break-all;
}
</style>
