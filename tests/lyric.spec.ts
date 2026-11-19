import { describe, expect, it } from 'vitest'
import { findActiveLyricIndex, parseLrc } from '../src/utils/lyric'

describe('parseLrc', () => {
  it('解析基础时间戳并保留歌词文本', () => {
    const lines = parseLrc('[00:12.34]第一行\n[00:15.60]第二行')
    expect(lines).toEqual([
      { time: 12.34, text: '第一行' },
      { time: 15.6, text: '第二行' },
    ])
  })

  it('兼容 mm:ss / mm:ss.xx / mm:ss.xxx / mm:ss:xx 四种时间戳写法', () => {
    const lines = parseLrc(
      [
        '[00:01]无小数',
        '[00:02.5]一位小数',
        '[00:03.34]两位小数',
        '[00:04.345]三位小数',
        '[00:05:67]冒号毫秒',
      ].join('\n')
    )
    expect(lines.map((line) => line.time)).toEqual([1, 2.5, 3.34, 4.345, 5.67])
    expect(lines.map((line) => line.text)).toEqual([
      '无小数',
      '一位小数',
      '两位小数',
      '三位小数',
      '冒号毫秒',
    ])
  })

  it('一行多时间戳会展开为多条歌词', () => {
    const lines = parseLrc('[00:10.00][00:20.00]重复出现的副歌')
    expect(lines).toEqual([
      { time: 10, text: '重复出现的副歌' },
      { time: 20, text: '重复出现的副歌' },
    ])
  })

  it('应用 [offset:±ms] 全局偏移（正值延后、负值提前）', () => {
    const delayed = parseLrc('[offset:+500]\n[00:10.00]延后')
    expect(delayed[0].time).toBeCloseTo(10.5, 5)

    const advanced = parseLrc('[offset:-500]\n[00:10.00]提前')
    expect(advanced[0].time).toBeCloseTo(9.5, 5)

    // 负偏移把时间推到 0 之前时兜底为 0
    const clamped = parseLrc('[offset:-5000]\n[00:01.00]越界')
    expect(clamped[0].time).toBe(0)
  })

  it('跳过元信息标签、空行、CRLF 与脏行，只保留有效歌词', () => {
    const lrc = [
      '\uFEFF[ti:测试歌曲]',
      '[ar:测试歌手]',
      '[al:测试专辑]',
      '[by:player-core]',
      '',
      '   ',
      '这是一行没有时间戳的脏数据',
      '[00:01.00]第一句',
      '\r',
      '[00:02.00]',
      '[00:03.00]第三句',
    ].join('\r\n')

    expect(parseLrc(lrc)).toEqual([
      { time: 1, text: '第一句' },
      { time: 3, text: '第三句' },
    ])
  })

  it('乱序歌词按时间升序输出，相同时间保持原始顺序', () => {
    const lines = parseLrc(
      [
        '[00:30.00]最晚',
        '[00:10.00]最早',
        '[00:20.00]相同时间A',
        '[00:20.00]相同时间B',
      ].join('\n')
    )
    expect(lines.map((line) => line.text)).toEqual([
      '最早',
      '相同时间A',
      '相同时间B',
      '最晚',
    ])
  })

  it('只有标签没有歌词或空字符串时返回空数组', () => {
    expect(parseLrc('[ti:只有标题]')).toEqual([])
    expect(parseLrc('[00:00.00]')).toEqual([])
    expect(parseLrc('')).toEqual([])
    // 运行时可能传入非字符串的脏数据
    expect(parseLrc(undefined as unknown as string)).toEqual([])
  })
})

describe('findActiveLyricIndex', () => {
  const lines = parseLrc(
    ['[00:01.00]第一句', '[00:05.00]第二句', '[00:10.00]第三句'].join('\n')
  )

  it('未开始、正好命中、行间、最后一行、超出结尾、空数组与非法时间的边界', () => {
    expect(findActiveLyricIndex(lines, 0)).toBe(-1)
    expect(findActiveLyricIndex(lines, 0.999)).toBe(-1)
    expect(findActiveLyricIndex(lines, 1)).toBe(0)
    expect(findActiveLyricIndex(lines, 4.99)).toBe(0)
    expect(findActiveLyricIndex(lines, 5)).toBe(1)
    expect(findActiveLyricIndex(lines, 9.999)).toBe(1)
    expect(findActiveLyricIndex(lines, 10)).toBe(2)
    expect(findActiveLyricIndex(lines, 999)).toBe(2)

    expect(findActiveLyricIndex([], 12)).toBe(-1)
    expect(findActiveLyricIndex(lines, Number.NaN)).toBe(-1)
    expect(findActiveLyricIndex(lines, Number.POSITIVE_INFINITY)).toBe(-1)
  })
})
