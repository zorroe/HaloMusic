<template>
  <div class="flex items-center h-6">
    <div class="text-xs ml-4 select-none">HaloMusic</div>
    <div
      class="flex-1 h-full"
      style="-webkit-app-region: drag"></div>
    <icon-park
      @click="windowMinimize"
      class="button-primary"
      :icon="Minus"
      :size="16"></icon-park>
    <icon-park
      @click="maxRestore"
      class="button-primary"
      :icon="isMax ? Split : Stretching"
      :size="16"></icon-park>
    <icon-park
      @click="windowClose"
      class="button-primary hover:bg-red-500 hover:text-white"
      :icon="Close"
      :size="16"></icon-park>
  </div>
</template>

<script setup lang="ts">
import { Close, Split, Stretching, Minus } from '@icon-park/vue-next'
import { windowClose, windowMaxRestore, windowMinimize } from '@/utils/common'
import { onBeforeMount, ref } from 'vue'
import { ipcRenderer } from 'electron'

const isMax = ref(false)

const maxRestore = () => {
  windowMaxRestore()
}

onBeforeMount(() => {
  ipcRenderer.on('isMaximized', (_, value) => {
    isMax.value = value
  })
})
</script>

<style scoped></style>
