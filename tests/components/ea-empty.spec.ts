// @vitest-environment happy-dom
/**
 * EaEmpty 组件测试：标题/描述渲染、compact 类名、action-text 按钮与 action 事件。
 */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import EaEmpty from '@/components/common/EaEmpty.vue'
import EaButton from '@/components/common/EaButton.vue'

/** EaEmpty 内部用到了全局组件 icon-park / ea-button，测试里注册真实按钮、其余用 stub */
const mountEmpty = (props: Record<string, unknown> = {}) =>
  mount(EaEmpty, {
    props,
    global: {
      stubs: { 'icon-park': true },
      components: { 'ea-button': EaButton },
    },
  })

describe('EaEmpty', () => {
  it('渲染 title / description，compact 时追加缩略类名', () => {
    const wrapper = mountEmpty({
      title: '首页加载失败',
      description: '请检查网络后重试',
    })
    expect(wrapper.find('.ea-empty__title').text()).toBe('首页加载失败')
    expect(wrapper.find('.ea-empty__desc').text()).toBe('请检查网络后重试')
    expect(wrapper.classes()).toContain('ea-empty')
    expect(wrapper.classes()).not.toContain('ea-empty--compact')

    const compact = mountEmpty({ title: '没有内容', compact: true })
    expect(compact.classes()).toContain('ea-empty--compact')
  })

  it('action-text 渲染操作按钮，点击 emit action', async () => {
    const wrapper = mountEmpty({ actionText: '重新加载' })
    const button = wrapper.find('.ea-empty__action .ea-button')
    expect(button.exists()).toBe(true)
    expect(button.text()).toContain('重新加载')

    await button.trigger('click')
    expect(wrapper.emitted('action')).toHaveLength(1)
  })

  it('未传 action-text / action 插槽时不渲染操作区', () => {
    const wrapper = mountEmpty({ title: '暂无数据' })
    expect(wrapper.find('.ea-empty__action').exists()).toBe(false)
  })
})
