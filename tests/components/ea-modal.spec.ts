// @vitest-environment happy-dom
/**
 * EaModal 组件测试。
 *
 * 说明：
 * - 组件用 <Teleport to="body">，因此这里不做 teleport stub，而是直接查询 document
 *   （与真实运行时一致，避免 stub 重渲染导致 DOM 节点身份变化）；
 * - happy-dom 对「点击 label[for] 激活 checkbox」的支持不完整，打开路径用
 *   `input.checked = true + dispatchEvent('change')`（等价于用户勾选）验证开态，
 *   label[for] 与 checkbox 的关联性单独断言属性。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import EaModal from '@/components/common/EaModal.vue'
import EaButton from '@/components/common/EaButton.vue'

const wrappers: VueWrapper[] = []

const mountModal = (props: Record<string, unknown> = {}) => {
  const wrapper = mount(EaModal, {
    props,
    slots: { default: '<div class="modal-body">弹窗内容</div>' },
    global: {
      // 组件内部使用全局注册的 ea-button，这里注册真实按钮以便测试确认/取消事件
      components: { 'ea-button': EaButton },
    },
  })
  wrappers.push(wrapper)
  return wrapper
}

const query = <T extends Element>(selector: string): T | null =>
  document.querySelector<T>(selector)

const queryAll = (selector: string): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>(selector))

const toggleInput = (): HTMLInputElement | null =>
  query<HTMLInputElement>('input.ea-modal-toggle')

/** 勾选 checkbox -> change 事件 -> openDialog（内部两次 nextTick 才置 --open 类） */
const openModal = async () => {
  const input = toggleInput()
  expect(input).not.toBeNull()
  input!.checked = true
  input!.dispatchEvent(new Event('change', { bubbles: true }))
  await nextTick()
  await nextTick()
}

/** 点击弹窗底部的确定/取消按钮（EaButton 渲染为 label，原生 click 会冒泡到 Vue 监听） */
const clickAction = async (index: number) => {
  const buttons = queryAll('.ea-modal-actions .ea-button')
  expect(buttons).toHaveLength(2)
  buttons[index]!.click()
  await nextTick()
}

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  document.body.innerHTML = ''
})

describe('EaModal', () => {
  it('初始为关闭态：checkbox 未勾选、遮罩 aria-hidden、默认渲染确定/取消按钮', () => {
    mountModal()

    const input = toggleInput()
    expect(input).not.toBeNull()
    expect(input!.checked).toBe(false)

    const mask = query('.ea-modal-mask')
    expect(mask).not.toBeNull()
    expect(mask!.getAttribute('aria-hidden')).toBe('true')
    expect(mask!.classList.contains('ea-modal-mask--open')).toBe(false)
    expect(query('.ea-modal-content')?.textContent).toContain('弹窗内容')

    // backdrop 的 label[for] 与 checkbox id 关联（保持调用方 id + label[for] 打开契约）
    const backdrop = query<HTMLLabelElement>('label.ea-modal-backdrop')
    expect(backdrop).not.toBeNull()
    expect(backdrop!.htmlFor).toBe(input!.id)
    expect(queryAll('.ea-modal-actions .ea-button')).toHaveLength(2)
  })

  it('showBtn=false 时不渲染操作按钮', () => {
    mountModal({ showBtn: false })
    expect(queryAll('.ea-modal-actions .ea-button')).toHaveLength(0)
  })

  it('勾选后进入开态：遮罩加 --open 类、aria-hidden=false、dialog 可聚焦', async () => {
    mountModal()
    await openModal()

    const mask = query('.ea-modal-mask')
    expect(mask!.classList.contains('ea-modal-mask--open')).toBe(true)
    expect(mask!.getAttribute('aria-hidden')).toBe('false')
    expect(toggleInput()!.checked).toBe(true)

    const box = query('.ea-modal-box')
    expect(box?.getAttribute('role')).toBe('dialog')
    expect(box?.getAttribute('tabindex')).toBe('-1')
  })

  it('确定按钮 emit confirm 并关闭（不 emit close）', async () => {
    const wrapper = mountModal()
    await openModal()
    await clickAction(0)

    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('close')).toBeUndefined()
    expect(toggleInput()!.checked).toBe(false)
  })

  it('取消按钮 emit close 并取消勾选', async () => {
    const wrapper = mountModal()
    await openModal()
    await clickAction(1)

    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(toggleInput()!.checked).toBe(false)
  })

  it('Esc 关闭已打开的弹窗并 emit close', async () => {
    const wrapper = mountModal()
    await openModal()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()

    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(toggleInput()!.checked).toBe(false)
    expect(
      query('.ea-modal-mask')?.classList.contains('ea-modal-mask--closing')
    ).toBe(true)
  })
})
