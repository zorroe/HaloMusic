<template>
  <!-- 小列表：保持整表渲染（不产生内层滚动容器，页面主滚动行为不变） -->
  <div
    v-if="!isVirtual"
    class="flex flex-col w-full">
    <div
      v-for="(item, index) in props.items"
      :key="index"
      class="ea-virtual-list__plain-row">
      <slot
        :item="item"
        :index="index" />
    </div>
  </div>

  <!-- 长列表：固定行高窗口化，顶部/底部用 spacer 撑出完整滚动高度 -->
  <div
    v-else
    ref="containerRef"
    class="ea-virtual-list"
    :style="{ maxHeight: props.maxHeight }"
    @scroll.passive="handleScroll">
    <div
      class="ea-virtual-list__spacer"
      :style="{ height: `${topSpacerHeight}px` }"></div>
    <div
      v-for="row in visibleRows"
      :key="row.index"
      class="ea-virtual-list__row"
      :style="{ height: `${props.itemHeight}px` }">
      <slot
        :item="row.item"
        :index="row.index" />
    </div>
    <div
      class="ea-virtual-list__spacer"
      :style="{ height: `${bottomSpacerHeight}px` }"></div>
  </div>
</template>

<script setup lang="ts" generic="T">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { VNode } from 'vue'

defineOptions({
  name: 'eaVirtualList',
})

interface Props {
  items: readonly T[]
  /** 固定行高（px）；调用方的行 DOM 高度必须与它一致 */
  itemHeight?: number
  /** 可视区上下额外渲染的缓冲行数，滚动时避免白屏 */
  buffer?: number
  /** items 数量超过该阈值才启用窗口化，否则按普通列表整表渲染 */
  threshold?: number
  /**
   * 虚拟模式下的最大高度。
   * 页面外层 .content 已是滚动容器（100vh 布局），内层虚拟列表不能再撑满全屏，
   * 否则页面滚动条与内层滚动条互相打架；预留 Header(56px) + Footer(64px) 及上下留白。
   */
  maxHeight?: string
}

const props = withDefaults(defineProps<Props>(), {
  itemHeight: 64,
  buffer: 6,
  threshold: 80,
  maxHeight: 'calc(100vh - 200px)',
})

defineSlots<{
  default(props: { item: T; index: number }): VNode[]
}>()

const containerRef = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const viewportHeight = ref(0)

const isVirtual = computed(() => props.items.length > props.threshold)

/** 首个完全/部分可见行（不包含 buffer） */
const firstVisibleIndex = computed(() =>
  Math.floor(scrollTop.value / props.itemHeight)
)

/** 最后一个可见行（不包含 buffer），viewport 未测量时至少渲染 1 行 */
const lastVisibleIndex = computed(() => {
  const visibleCount = Math.ceil(viewportHeight.value / props.itemHeight)
  return firstVisibleIndex.value + Math.max(1, visibleCount)
})

const startIndex = computed(() =>
  isVirtual.value
    ? Math.max(0, firstVisibleIndex.value - props.buffer)
    : 0
)

const endIndex = computed(() =>
  isVirtual.value
    ? Math.min(props.items.length, lastVisibleIndex.value + props.buffer)
    : props.items.length
)

interface VisibleRow {
  item: T
  index: number
}

const visibleRows = computed<VisibleRow[]>(() => {
  const rows: VisibleRow[] = []
  for (let index = startIndex.value; index < endIndex.value; index += 1) {
    rows.push({ item: props.items[index], index })
  }
  return rows
})

const topSpacerHeight = computed(() =>
  isVirtual.value ? startIndex.value * props.itemHeight : 0
)

const bottomSpacerHeight = computed(() =>
  isVirtual.value
    ? Math.max(0, (props.items.length - endIndex.value) * props.itemHeight)
    : 0
)

const measureViewport = () => {
  const el = containerRef.value
  viewportHeight.value = el ? el.clientHeight : 0
}

const handleScroll = () => {
  const el = containerRef.value
  if (!el) return
  scrollTop.value = el.scrollTop
}

const handleWindowResize = () => {
  measureViewport()
}

let resizeObserver: ResizeObserver | undefined

const disconnectObserver = () => {
  resizeObserver?.disconnect()
  resizeObserver = undefined
  window.removeEventListener('resize', handleWindowResize)
}

/** 观察容器尺寸（窗口拉伸 / 侧栏变化都会影响可视行数）；无 ResizeObserver 时退回 resize 事件 */
const observeContainer = () => {
  disconnectObserver()
  const el = containerRef.value
  if (!el) return
  // 容器刚挂载时 scrollTop 归零，同步一下避免沿用旧值算错窗口
  scrollTop.value = el.scrollTop
  measureViewport()
  if (typeof ResizeObserver === 'undefined') {
    window.addEventListener('resize', handleWindowResize)
    return
  }
  resizeObserver = new ResizeObserver(measureViewport)
  resizeObserver.observe(el)
}

watch(isVirtual, () => {
  void nextTick(observeContainer)
})

/** 行数变化（加载更多 / 切换歌单）时把越界的 scrollTop 夹回合法范围 */
watch(
  () => props.items.length,
  () => {
    const el = containerRef.value
    if (!el) return
    const maxScroll = Math.max(
      0,
      props.items.length * props.itemHeight - el.clientHeight
    )
    if (el.scrollTop > maxScroll) {
      el.scrollTop = maxScroll
      scrollTop.value = el.scrollTop
    }
  }
)

onMounted(() => {
  void nextTick(observeContainer)
})

onBeforeUnmount(disconnectObserver)

/** 滚动到指定行（顶对齐），越界会被夹到首/末行 */
const scrollToIndex = (index: number) => {
  const el = containerRef.value
  if (!el) return
  const maxIndex = Math.max(0, props.items.length - 1)
  const target = Math.min(Math.max(Math.trunc(index), 0), maxIndex)
  el.scrollTop = target * props.itemHeight
  scrollTop.value = el.scrollTop
}

const scrollToTop = () => {
  const el = containerRef.value
  if (!el) return
  el.scrollTop = 0
  scrollTop.value = 0
}

defineExpose({
  scrollToIndex,
  scrollToTop,
})
</script>

<style scoped>
.ea-virtual-list {
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
}

/* 顶部 / 底部占位：撑出总高度，让内层滚动条与真实列表长度一致 */
.ea-virtual-list__spacer {
  width: 100%;
  pointer-events: none;
}

/* 窗口化单行：固定高度，行内容由调用方 slot 渲染 */
.ea-virtual-list__row {
  width: 100%;
}

/* 非窗口化时保留原有整表布局（行高由 slot 内容自己决定） */
.ea-virtual-list__plain-row {
  width: 100%;
}
</style>
