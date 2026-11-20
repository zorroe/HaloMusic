<template>
  <Teleport to="body">
    <!--
      打开契约保持不变：外部调用方继续写 <label for="xxx"> / <ea-button for="xxx">。
      checkbox 只作为「开关状态源」（原生 label 激活即可切换），
      :checked 负责可见/可交互，动效与 Esc、焦点管理由脚本同步的类名驱动，
      没有改成 v-model 受控组件。
    -->
    <input
      :id="modalId"
      ref="toggleRef"
      class="ea-modal-toggle"
      type="checkbox"
      aria-hidden="true"
      tabindex="-1"
      @change="handleToggleChange" />
    <div
      class="ea-modal-mask"
      :class="{
        'ea-modal-mask--open': open,
        'ea-modal-mask--closing': closing,
      }"
      :aria-hidden="!open"
      @animationend="handleMaskAnimationEnd">
      <label
        :for="modalId"
        class="ea-modal-backdrop"
        aria-label="关闭弹窗"></label>
      <div
        ref="boxRef"
        class="ea-modal-box"
        role="dialog"
        aria-modal="true"
        tabindex="-1">
        <div class="ea-modal-content">
          <slot></slot>
        </div>
        <div
          v-if="props.showBtn"
          class="ea-modal-actions">
          <ea-button
            :type="props.buttonType"
            class="font-bold"
            @click="handleConfirm"
            >确定</ea-button
          >
          <ea-button
            type="info"
            class="font-bold"
            @click="handleCancel"
            >取消</ea-button
          >
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

interface Props {
  id?: string
  buttonType?: 'primary' | 'danger' | 'info'
  showBtn?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  id: '',
  buttonType: 'danger',
  showBtn: true,
})

const emit = defineEmits<{
  confirm: []
  /** 非「确定」路径关闭时触发（Esc / 点遮罩 / 取消），供调用方按需清理状态 */
  close: []
}>()

/**
 * 打开中的弹窗栈：多层弹窗并存时只让最上层响应 Esc / Tab，
 * 避免一次按键把下面几层一起关掉。
 */
const modalStack: symbol[] = []
const instanceToken = Symbol('ea-modal')

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/** 退出动画 120ms，兜底计时器留一点余量；animationend 正常时会被提前清掉 */
const EXIT_FALLBACK_DELAY = 220

// 未传 id 时生成一个稳定且唯一的 id，保证 label[for] 与 checkbox 能关联
let modalSeed = 0
const fallbackId = `ea-modal-${(modalSeed += 1)}`
const modalId = computed(() => props.id || fallbackId)

const toggleRef = ref<HTMLInputElement | null>(null)
const boxRef = ref<HTMLElement | null>(null)

const open = ref(false)
const closing = ref(false)

/** 打开前的焦点位置，关闭后归还 */
let previousFocus: HTMLElement | null = null
let exitTimer: ReturnType<typeof setTimeout> | undefined

const findToggle = (): HTMLInputElement | null =>
  document.getElementById(modalId.value) as HTMLInputElement | null

/** 找到触发本弹窗的 label[for]（Header 菜单项 / ea-button / label 都是 label） */
const findTrigger = (): HTMLElement | null => {
  // NodeList 在 tsconfig 未启用 DOM.Iterable，这里转数组再遍历
  const labels = Array.from(
    document.querySelectorAll<HTMLLabelElement>('label[for]')
  )
  for (const label of labels) {
    if (label.htmlFor === modalId.value) return label
  }
  return null
}

const isTopModal = (): boolean =>
  modalStack[modalStack.length - 1] === instanceToken

const pushModalStack = () => {
  if (!modalStack.includes(instanceToken)) modalStack.push(instanceToken)
}

const popModalStack = () => {
  const index = modalStack.indexOf(instanceToken)
  if (index !== -1) modalStack.splice(index, 1)
}

const focusBox = () => {
  boxRef.value?.focus({ preventScroll: true })
}

/** 通用聚焦：label 默认不可聚焦，临时挂 tabindex 聚焦后再还原属性 */
const focusElement = (element: HTMLElement | null): boolean => {
  if (!element || !element.isConnected) return false
  element.focus({ preventScroll: true })
  if (document.activeElement === element) return true
  if (!(element instanceof HTMLLabelElement) || element.hasAttribute('tabindex')) {
    return false
  }
  element.setAttribute('tabindex', '-1')
  element.focus({ preventScroll: true })
  const focused = document.activeElement === element
  element.removeAttribute('tabindex')
  return focused
}

const restoreFocus = () => {
  const remembered = previousFocus ?? findTrigger()
  previousFocus = null
  void nextTick(() => {
    if (focusElement(remembered)) return
    if (focusElement(findTrigger())) return
    // 触发元素已经随菜单收起/列表刷新被移除时，退回到 checkbox 自身
    toggleRef.value?.focus({ preventScroll: true })
  })
}

const getFocusableElements = (): HTMLElement[] => {
  const box = boxRef.value
  if (!box) return []
  return Array.from(box.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
}

/** Tab / Shift+Tab 焦点圈定在弹窗内 */
const trapFocus = (event: KeyboardEvent) => {
  const box = boxRef.value
  if (!box) return
  const focusables = getFocusableElements()
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  if (!first || !last) {
    event.preventDefault()
    focusBox()
    return
  }
  const active = document.activeElement
  if (active instanceof HTMLElement && !box.contains(active)) {
    event.preventDefault()
    first.focus()
    return
  }
  if (active === box) {
    event.preventDefault()
    if (event.shiftKey) {
      last.focus()
    } else {
      first.focus()
    }
    return
  }
  if (event.shiftKey) {
    if (active === first) {
      event.preventDefault()
      last.focus()
    }
    return
  }
  if (active === last) {
    event.preventDefault()
    first.focus()
  }
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (!open.value || !isTopModal()) return
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    requestClose(true)
    return
  }
  if (event.key === 'Tab') trapFocus(event)
}

const addOpenListeners = () => {
  removeOpenListeners()
  document.addEventListener('keydown', handleDocumentKeydown)
}

const removeOpenListeners = () => {
  document.removeEventListener('keydown', handleDocumentKeydown)
}

const clearExitTimer = () => {
  if (exitTimer !== undefined) {
    clearTimeout(exitTimer)
    exitTimer = undefined
  }
}

const startExitTimer = () => {
  clearExitTimer()
  exitTimer = setTimeout(finishClosing, EXIT_FALLBACK_DELAY)
}

/** 退出动画真正结束后再收尾（动画因 reduced-motion 被跳过时由兜底计时器收尾） */
const finishClosing = () => {
  if (!closing.value) return
  closing.value = false
  clearExitTimer()
  restoreFocus()
}

const handleMaskAnimationEnd = (event: AnimationEvent) => {
  // 弹窗内容的 pop 动画也会冒泡到遮罩，只处理遮罩自身的动画
  if (event.target !== event.currentTarget) return
  if (!closing.value) return
  finishClosing()
}

const openDialog = () => {
  clearExitTimer()
  previousFocus = (() => {
    const active = document.activeElement
    if (
      active instanceof HTMLElement &&
      active !== toggleRef.value &&
      active !== document.body &&
      !boxRef.value?.contains(active)
    ) {
      return active
    }
    return findTrigger() ?? toggleRef.value
  })()
  closing.value = false
  pushModalStack()
  addOpenListeners()
  // 先置 false 再由 nextTick 置 true：保证连续开关时 --open 类被重新添加，入场动画可重播
  open.value = false
  void nextTick(() => {
    open.value = true
    void nextTick(focusBox)
  })
}

const closeDialog = (shouldEmitClose: boolean) => {
  if (!open.value && !closing.value) return
  open.value = false
  closing.value = true
  removeOpenListeners()
  popModalStack()
  startExitTimer()
  if (shouldEmitClose) emit('close')
}

/** 关闭并取消勾选（Esc / 取消 / 点遮罩统一走这里） */
const requestClose = (shouldEmitClose: boolean) => {
  const toggle = toggleRef.value ?? findToggle()
  if (toggle) toggle.checked = false
  closeDialog(shouldEmitClose)
}

const handleToggleChange = () => {
  if (toggleRef.value?.checked) {
    openDialog()
  } else {
    // 原生 label[for] 激活 / 外部 .click() 关闭都会走到这里
    closeDialog(true)
  }
}

const handleConfirm = () => {
  emit('confirm')
  requestClose(false)
}

const handleCancel = () => {
  requestClose(true)
}

onMounted(() => {
  toggleRef.value = findToggle()
})

onBeforeUnmount(() => {
  removeOpenListeners()
  clearExitTimer()
  popModalStack()
  previousFocus = null
})
</script>

<style scoped>
.ea-modal-toggle {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.ea-modal-mask {
  position: fixed;
  inset: 0;
  z-index: 9300;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

/* 打开态：:checked 只负责可见 / 可交互，动效交给下面两个状态类 */
.ea-modal-toggle:checked + .ea-modal-mask {
  visibility: visible;
  pointer-events: auto;
}

/* 入场：遮罩 halo-fade-in（200ms --ease-enter） */
.ea-modal-mask--open {
  animation: halo-fade-in var(--motion-base) var(--ease-enter) forwards;
}

/* 退场：遮罩 halo-fade-out（120ms --ease-exit）；
   此规则必须写在基础 .ea-modal-mask 之后，才能在取消勾选后短暂保持可见，
   让退出动画完整播完再隐藏。 */
.ea-modal-mask--closing {
  visibility: visible;
  pointer-events: none;
  animation: halo-fade-out var(--motion-fast) var(--ease-exit) forwards;
}

.ea-modal-backdrop {
  position: absolute;
  inset: 0;
  background-color: var(--color-mask);
  backdrop-filter: blur(2px);
  cursor: pointer;
}

.ea-modal-box {
  position: relative;
  z-index: 1;
  width: min(440px, 92vw);
  min-width: 320px;
  max-height: min(80vh, 720px);
  overflow: auto;
  padding: 24px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background-color: var(--color-card-bg-strong);
  color: var(--color-text);
  box-shadow: var(--shadow-lg);
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

/* 入场：弹窗 halo-pop-in（上浮 + 0.98 -> 1 缩放） */
.ea-modal-mask--open .ea-modal-box {
  animation: halo-pop-in var(--motion-base) var(--ease-enter) forwards;
}

/* 退场：弹窗 halo-pop-out（120ms --ease-exit） */
.ea-modal-mask--closing .ea-modal-box {
  animation: halo-pop-out var(--motion-fast) var(--ease-exit) forwards;
}

.ea-modal-content {
  font-size: 0.9375rem;
  line-height: 1.6;
}

.ea-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}
</style>
