<template>
  <img
    v-if="displaySrc"
    :src="displaySrc"
    class="lmg"
    :class="{ 'lmg--error': failed }"
    loading="lazy"
    alt=""
    @load="handleLoaded"
    @error="handleError" />
  <div
    v-else
    class="lmg lmg--placeholder"
    aria-hidden="true"></div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

interface Props {
  src?: string
  width?: number
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  src: '',
  width: 200,
  height: 200,
})

const failed = ref(false)

/**
 * 网易云图片服务的缩略参数是 `?param=WxH`。
 * 原始地址已经带 query（很常见：`?v=1&param=...`）时不能再直接拼 `?`，
 * 否则会得到 `...?v=1?param=200y200` 这种非法 URL。
 * 这里统一用 URL 对象处理，并顺手把 http 升级为 https（CSP 只放行 https 图片）。
 */
const displaySrc = computed(() => {
  const raw = props.src?.trim()
  if (!raw) return ''
  const normalized = raw.startsWith('http://') ? `https://${raw.slice(7)}` : raw
  try {
    const url = new URL(normalized, window.location.href)
    url.searchParams.set('param', `${props.width}y${props.height}`)
    return url.toString()
  } catch {
    // data: / blob: 等特殊地址不参与缩略
    return normalized
  }
})

const handleLoaded = (event: Event) => {
  failed.value = false
  const target = event.target as HTMLImageElement
  target.classList.add('gradual-appear')
}

const handleError = () => {
  failed.value = true
}

// 图片地址变化时重置失败状态，避免列表复用节点后一直显示占位图
watch(displaySrc, () => {
  failed.value = false
})
</script>

<style scoped>
.lmg {
  opacity: 0;
  transition: all 300ms linear;
}

.lmg.gradual-appear {
  opacity: 1;
}

.lmg.gradual-appear:active {
  transform: scale(0.95);
}

.lmg--error,
.lmg--placeholder {
  opacity: 1;
  background-color: var(--color-secondary-bg);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23bbbbbb'%3E%3Cpath d='M12 3v10.55A4 4 0 1014 17V7h4V3h-6z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: center;
  background-size: 40%;
}

.lmg--error {
  object-fit: contain;
}
</style>
