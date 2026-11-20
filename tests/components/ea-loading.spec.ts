// @vitest-environment happy-dom
/**
 * EaLoading 组件测试：文案、block 类、size 内联样式、无障碍属性。
 */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import EaLoading from '@/components/common/EaLoading.vue'

describe('EaLoading', () => {
  it('渲染文案并带 role=status / aria-label 无障碍属性', () => {
    const wrapper = mount(EaLoading, { props: { text: '正在加载歌单' } })

    expect(wrapper.find('.ea-loading__text').text()).toBe('正在加载歌单')
    expect(wrapper.attributes('role')).toBe('status')
    expect(wrapper.attributes('aria-label')).toBe('正在加载歌单')
  })

  it('无文案时 aria-label 回退为“加载中”', () => {
    const wrapper = mount(EaLoading)
    expect(wrapper.find('.ea-loading__text').exists()).toBe(false)
    expect(wrapper.attributes('aria-label')).toBe('加载中')
    expect(wrapper.classes()).not.toContain('ea-loading--block')
  })

  it('block 时追加整页加载类名', () => {
    const wrapper = mount(EaLoading, { props: { block: true } })
    expect(wrapper.classes()).toContain('ea-loading--block')
  })

  it('size 影响加载环的宽高与边框宽度', () => {
    const wrapper = mount(EaLoading, { props: { size: 48 } })
    const ringStyle =
      wrapper.find('.ea-loading__ring').attributes('style') ?? ''
    expect(ringStyle).toContain('width: 48px')
    expect(ringStyle).toContain('height: 48px')
    // 边框宽度 = max(2, round(48 / 12)) = 4px
    expect(ringStyle).toContain('border-width: 4px')
  })
})
