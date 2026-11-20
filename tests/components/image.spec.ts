// @vitest-environment happy-dom
/**
 * Image 组件测试：懒加载、URL 参数拼接（保留已有 query）、https 升级、
 * load 后的入场类、error 失败态与占位图。
 */
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import Image from '@/components/common/Image.vue'

describe('Image', () => {
  it('渲染 img：loading=lazy、http 升级 https、保留原 query 并追加 param', () => {
    const wrapper = mount(Image, {
      props: { src: 'http://p1.music.126.net/a.jpg?v=1' },
    })
    const img = wrapper.find('img')

    expect(img.exists()).toBe(true)
    expect(img.attributes('loading')).toBe('lazy')
    expect(img.attributes('alt')).toBe('')

    const src = img.attributes('src') ?? ''
    expect(src.startsWith('https://')).toBe(true)
    expect(src).toContain('v=1')
    expect(src).toContain('param=200y200')
    // 已带 query 时用 & 追加，而不是再拼一个 ?
    expect(src).not.toContain('?v=1?param')
  })

  it('width / height 参与缩略参数', () => {
    const wrapper = mount(Image, {
      props: {
        src: 'https://p1.music.126.net/a.jpg',
        width: 100,
        height: 60,
      },
    })
    expect(wrapper.find('img').attributes('src')).toContain('param=100y60')
  })

  it('load 事件后追加 gradual-appear 入场类', async () => {
    const wrapper = mount(Image, {
      props: { src: 'https://p1.music.126.net/a.jpg' },
    })
    const img = wrapper.find('img')
    expect(img.classes()).not.toContain('gradual-appear')

    await img.trigger('load')
    expect(img.classes()).toContain('gradual-appear')
  })

  it('error 标记失败态；src 变化后重置；空 src 渲染占位块', async () => {
    const wrapper = mount(Image, {
      props: { src: 'https://p1.music.126.net/a.jpg' },
    })
    await wrapper.find('img').trigger('error')
    expect(wrapper.find('img').classes()).toContain('lmg--error')

    await wrapper.setProps({ src: 'https://p1.music.126.net/b.jpg' })
    await nextTick()
    expect(wrapper.find('img').classes()).not.toContain('lmg--error')

    const empty = mount(Image, { props: { src: '' } })
    expect(empty.find('img').exists()).toBe(false)
    expect(empty.find('.lmg--placeholder').exists()).toBe(true)
  })
})
