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
/* 懒加载图片：未加载完成前保持透明，加载完成后按 token 时长淡入 */
.lmg {
  opacity: 0;
  transition: opacity var(--motion-base) var(--ease-standard);
}

.lmg.gradual-appear {
  opacity: 1;
}

/* 失败 / 空地址统一用弱化表面兜底，避免出现浏览器裂图 */
.lmg--error,
.lmg--placeholder {
  opacity: 1;
  background-color: var(--color-secondary-bg);
}

.lmg--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}

.lmg--placeholder::after {
  content: '♪';
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text-subtle);
  opacity: 0.72;
}

.lmg--error {
  object-fit: contain;
}
</style>
