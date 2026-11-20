<template>
  <div class="flex flex-col w-64 h-40">
    <div class="group cover justify-center cursor-pointer">
      <lmg
        :src="props.data.picUrl"
        :width="320"
        :height="180"
        class="cover-img w-60 h-32 rounded-lg"
        @click="routeTo(`/mv/${props.data.id}`)"></lmg>
      <icon-park
        :icon="PlayOne"
        fill="white"
        theme="filled"
        :size="24"
        class="cover-play group-hover:opacity-100"
        title="播放 MV"
        @click.stop="routeTo(`/mv/${props.data.id}`)"></icon-park>
    </div>
    <div class="flex w-full justify-center gap-4 text-sm">
      <span
        class="mt-2 ea-link truncate"
        @click="routeTo(`/mv/${props.data.id}`)">
        {{ props.data.name }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MvBaseInfo } from '@/types/mvRel'
import { routeTo } from '@/utils/common'
import { PlayOne } from '@icon-park/vue-next'

/* mv封面图组件 */
interface Props {
  data?: MvBaseInfo
}

const props = withDefaults(defineProps<Props>(), {
  data: () => ({}) as MvBaseInfo,
})
</script>

<style scoped>
/* hover 时封面微放大 + 阴影加深，只动 transform / box-shadow / opacity */
.cover-img {
  transition:
    transform var(--motion-base) var(--ease-standard),
    box-shadow var(--motion-base) var(--ease-standard),
    opacity var(--motion-base) var(--ease-standard);
}

.cover:hover .cover-img {
  transform: scale(1.04);
  box-shadow: 0 14px 32px var(--color-shadow-strong);
}

</style>
