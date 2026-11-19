<template>
  <Component
    :is="props.icon"
    :theme="props.theme"
    :size="props.size"
    :spin="props.spin"
    :fill="props.fill"
    :stroke-linecap="props.strokeLinecap"
    :stroke-linejoin="props.strokeLinejoin"
    :stroke-width="props.strokeWidth"
  />
</template>

<script setup lang="ts">
import type { Icon } from '@icon-park/vue-next/lib/runtime'

interface Props {
  icon: Icon
  theme?: 'outline' | 'filled' | 'two-tone' | 'multi-color'
  size?: number | string
  spin?: boolean
  fill?: string | string[]
  strokeLinecap?: 'butt' | 'round' | 'square'
  strokeLinejoin?: 'miter' | 'round' | 'bevel'
  /** 设置默认值为 2，否则会出现线条粗细不一致的问题 */
  strokeWidth?: number
}

const props = withDefaults(defineProps<Props>(), {
  theme: 'outline',
  size: 16,
  spin: false,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  strokeWidth: 2,
})
</script>
