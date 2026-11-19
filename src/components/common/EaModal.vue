<template>
  <Teleport to="body">
    <!--
      仍然沿用「隐藏 checkbox + label[for] 触发」的打开方式：
      外部调用方写 <label for="xxx"> 或 <ea-button for="xxx"> 即可打开，
      保持与原 daisyUI 版本一致的使用方式，但样式完全自绘，
      不再依赖 daisyUI 5 里语义已经变化的 modal / modal-toggle 等类。
    -->
    <input
      :id="modalId"
      class="ea-modal-toggle"
      type="checkbox"
      aria-hidden="true"
      tabindex="-1" />
    <div class="ea-modal-mask">
      <label
        :for="modalId"
        class="ea-modal-backdrop"
        aria-label="关闭弹窗"></label>
      <div
        class="ea-modal-box"
        role="dialog"
        aria-modal="true">
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
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

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
}>()

// 未传 id 时生成一个稳定且唯一的 id，保证 label[for] 与 checkbox 能关联
let modalSeed = 0
const fallbackId = `ea-modal-${(modalSeed += 1)}`
const modalId = computed(() => props.id || fallbackId)

const toggleRef = ref<HTMLInputElement | null>(null)

const findToggle = (): HTMLInputElement | null =>
  document.getElementById(modalId.value) as HTMLInputElement | null

const closeModal = () => {
  const toggle = toggleRef.value ?? findToggle()
  if (toggle) toggle.checked = false
}

const handleConfirm = () => {
  emit('confirm')
  closeModal()
}

const handleCancel = () => {
  closeModal()
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return
  const toggle = findToggle()
  if (toggle?.checked) closeModal()
}

onMounted(() => {
  toggleRef.value = findToggle()
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
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
  transition:
    opacity 200ms ease,
    visibility 200ms ease;
}

.ea-modal-toggle:checked + .ea-modal-mask {
  opacity: 1;
  visibility: visible;
}

.ea-modal-backdrop {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  cursor: pointer;
}

.ea-modal-box {
  position: relative;
  z-index: 1;
  min-width: 320px;
  max-width: 88vw;
  max-height: 80vh;
  overflow: auto;
  padding: 1.5rem;
  border-radius: 1rem;
  background-color: #ffffff;
  color: #111111;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.18);
  transform: scale(0.95);
  transition: transform 200ms ease;
}

.ea-modal-toggle:checked + .ea-modal-mask .ea-modal-box {
  transform: scale(1);
}

.ea-modal-content {
  font-size: 1rem;
}

.ea-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}
</style>
