<template>
  <div
    class="flex items-center"
    style="-webkit-app-region: drag">
    <div class="text-xs ml-4 select-none">HaloMusic</div>
    <div class="flex-1"></div>
    <icon-park
      @click="windowMinimize"
      class="button-primary"
      :icon="Minus"
      :size="16"></icon-park>
    <icon-park
      @click="windowMaxRestore"
      class="button-primary"
      :icon="Split"
      v-if="isMax"
      :size="16"></icon-park>
    <icon-park
      @click="maxRestore"
      class="button-primary"
      :icon="Stretching"
      v-else
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
import { onMounted, ref } from 'vue'
import { ipcRenderer } from 'electron'

const isMax = ref('false')

const maxRestore = () => {
  windowMaxRestore()
  ipcRenderer.send('isMax')
}

onMounted(() => {
  ipcRenderer.on('isMaximized', (_, value) => {
    isMax.value = value
  })
  ipcRenderer.send('isMax')
})
</script>

<style scoped></style>
