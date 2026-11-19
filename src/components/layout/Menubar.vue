<template>
  <div class="flex items-center h-6">
    <div class="text-xs ml-4 select-none">HaloMusic</div>
    <div
      class="flex-1 h-full"
      style="-webkit-app-region: drag"
      title="双击切换最大化"
      @dblclick="toggleMaximize"></div>
    <icon-park
      class="button-primary"
      :icon="Minus"
      :size="16"
      title="最小化"
      @click="minimize"></icon-park>
    <icon-park
      class="button-primary"
      :icon="isMax ? Split : Stretching"
      :size="16"
      title="最大化/还原"
      @click="toggleMaximize"></icon-park>
    <icon-park
      class="button-primary hover:bg-red-500 hover:text-white"
      :icon="Close"
      :size="16"
      title="关闭"
      @click="closeWindow"></icon-park>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Close, Minus, Split, Stretching } from '@icon-park/vue-next'
import { bridge } from '@/utils/bridge'

defineOptions({
  name: 'menubar',
})

const isMax = ref(false)
let unsubscribe: (() => void) | undefined

const minimize = () => bridge.window.minimize()
const toggleMaximize = () => bridge.window.toggleMaximize()
const closeWindow = () => bridge.window.close()

onMounted(() => {
  if (!bridge.isElectron) return
  bridge.window
    .isMaximized()
    .then(value => {
      isMax.value = value
    })
    .catch(error => {
      console.error('[HaloMusic] query maximized state failed:', error)
    })
  // 订阅主进程推送的最大化状态；组件卸载时必须取消订阅，避免监听泄漏
  unsubscribe = bridge.window.onMaximizeChange(value => {
    isMax.value = value
  })
})

onBeforeUnmount(() => {
  unsubscribe?.()
  unsubscribe = undefined
})
</script>

<style scoped></style>
