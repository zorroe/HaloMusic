// @vitest-environment happy-dom
/**
 * EaSkeleton 组件测试：5 种 variant 的结构、width/height 数字转 px、radius 透传。
 */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import EaSkeleton from '@/components/common/EaSkeleton.vue'

describe('EaSkeleton', () => {
  it('card：封面 + 两行标题，width 数字转 px、radius 透传到封面', () => {
    const wrapper = mount(EaSkeleton, {
      props: { variant: 'card', width: 160, radius: '10px' },
    })

    const card = wrapper.find('.ea-skeleton-card')
    expect(card.exists()).toBe(true)
    expect(card.attributes('style')).toContain('width: 160px')
    expect(wrapper.find('.ea-skeleton-card__cover').exists()).toBe(true)
    expect(wrapper.findAll('.ea-skeleton-card__line')).toHaveLength(2)
    expect(
      wrapper.find('.ea-skeleton-card__cover').attributes('style')
    ).toContain('border-radius: 10px')
  })

  it('row：与歌曲列表行高一致的封面 + 两行文字 + 尾部', () => {
    const wrapper = mount(EaSkeleton, { props: { variant: 'row' } })

    expect(wrapper.find('.ea-skeleton-row').exists()).toBe(true)
    expect(wrapper.find('.ea-skeleton-row__cover').exists()).toBe(true)
    expect(wrapper.findAll('.ea-skeleton-row__line')).toHaveLength(2)
    expect(wrapper.find('.ea-skeleton-row__tail').exists()).toBe(true)
  })

  it('rect：宽高数字转 px、字符串原样透传、radius 生效', () => {
    const numeric = mount(EaSkeleton, {
      props: { variant: 'rect', width: 120, height: 20, radius: '6px' },
    })
    const numericStyle =
      numeric.find('.halo-skeleton').attributes('style') ?? ''
    expect(numeric.find('.ea-skeleton-rect').exists()).toBe(true)
    expect(numericStyle).toContain('width: 120px')
    expect(numericStyle).toContain('height: 20px')
    expect(numericStyle).toContain('border-radius: 6px')

    const stringSize = mount(EaSkeleton, {
      props: { variant: 'rect', width: '50%' },
    })
    expect(stringSize.find('.ea-skeleton-rect').attributes('style')).toContain(
      'width: 50%'
    )
  })

  it('circle / text 使用各自的形状类名', () => {
    const circle = mount(EaSkeleton, { props: { variant: 'circle' } })
    expect(circle.find('.ea-skeleton-circle').exists()).toBe(true)

    const text = mount(EaSkeleton, { props: { variant: 'text' } })
    expect(text.find('.ea-skeleton-text').exists()).toBe(true)
  })
})
