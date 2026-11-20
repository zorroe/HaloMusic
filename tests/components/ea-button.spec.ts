// @vitest-environment happy-dom
/**
 * EaButton 组件测试：type/size 类名、slot 内容渲染、原生点击事件。
 */
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import EaButton from '@/components/common/EaButton.vue'

describe('EaButton', () => {
  it('按 type / size 渲染对应类名', () => {
    const wrapper = mount(EaButton, {
      props: { type: 'danger', size: 'large' },
    })

    expect(wrapper.element.tagName).toBe('LABEL')
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['ea-button', 'btn-animation', 'danger', 'large'])
    )

    const info = mount(EaButton, { props: { type: 'info', size: 'small' } })
    expect(info.classes()).toEqual(expect.arrayContaining(['info', 'small']))
  })

  it('渲染 slot 内容并可触发原生点击', async () => {
    const onClick = vi.fn()
    const wrapper = mount(EaButton, {
      slots: { default: '<span class="label">播放全部</span>' },
    })

    expect(wrapper.find('.label').text()).toBe('播放全部')

    wrapper.element.addEventListener('click', onClick)
    await wrapper.trigger('click')
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
