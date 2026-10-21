import { describe, expect, it } from 'vitest'
import { applyTone, composeSyllable, findRhyme, stripTone } from './vietnamese'
import { evaluateHandwritingStrokes, percent, starsFor, traceScore } from './scoring'

describe('composeSyllable', () => {
  it.each([
    [['b', 'a', '`'], 'bà'],
    [['c', 'a', '´'], 'cá'],
    [['m', 'eo', '`'], 'mèo'],
    [['th', 'o', '?'], 'thỏ'],
    [['m', 'u', '~'], 'mũ'],
    [['m', 'e', '.'], 'mẹ'],
    [['ng', 'h', 'e', '´'], 'nghé'],
    [['n', 'g', 'h'], 'ngh'],
  ])('%j → %s', (parts, expected) => {
    expect(composeSyllable(parts)).toBe(expected)
  })
})

describe('applyTone', () => {
  it.each([
    ['hoa', '`', 'hoà'],
    ['qua', '?', 'quả'],
    ['gia', '`', 'già'],
    ['thuy', '?', 'thuỷ'],
    ['muong', '`', 'muòng'],
    ['mương', '`', 'mường'],
    ['thoc', '´', 'thóc'],
    ['moc', '´', 'móc'],
    ['mua', '`', 'mùa'],
    ['khoai', '´', 'khoái'],
    ['tiên', '´', 'tiến'],
    ['mưa', '?', 'mửa'],
  ])('%s + %s → %s', (s, m, expected) => {
    expect(applyTone(s, m)).toBe(expected)
  })
})

describe('findRhyme', () => {
  const R = ['ac', 'ăc', 'âc', 'oc', 'ôc', 'uc', 'ưc', 'at', 'ăt', 'ât', 'ot', 'ôt', 'ơt', 'ut', 'ưt']
  it('tô vần trong tiếng', () => {
    expect(findRhyme('thóc', R)).toEqual([2, 4])
    expect(findRhyme('mắt', R)).toEqual([1, 3])
    expect(findRhyme('ớt', R)).toEqual([0, 2])
    expect(findRhyme('giấc', R)).toEqual([2, 4])
    expect(findRhyme('mơ', R)).toBeNull()
    expect(findRhyme('lửa', R)).toBeNull()
  })
  it('không cắt giữa cụm nguyên âm', () => {
    expect(findRhyme('thuốc', ['oc', 'ôc'])).toBeNull()
  })
  it('stripTone giữ dấu phụ', () => {
    expect(stripTone('xắc')).toBe('xăc')
  })
})

describe('scoring', () => {
  it('stars', () => {
    expect([100, 90, 89, 70, 40, 39, 0].map(starsFor)).toEqual([3, 3, 2, 2, 1, 0, 0])
  })
  it('percent', () => {
    expect(percent(2, 3)).toBe(67)
    expect(percent(0, 0)).toBe(0)
  })
  it('traceScore', () => {
    const target = Array.from({ length: 10 }, (_, i) => ({ x: i, y: 0 }))
    expect(traceScore(target, () => true, 0)).toBe(100)
    expect(traceScore(target, (x) => x < 5, 0.1)).toBe(50)
    expect(traceScore(target, () => true, 0.85)).toBe(50)
    expect(traceScore(target, () => true, 0, 2.6)).toBe(0)
    expect(traceScore([], () => true, 0)).toBe(0)
  })
  it('evaluateHandwritingStrokes chống tô bôi đen (cheat) và chấm đúng nét vẽ', () => {
    const paths = ['M 0,0 L 100,0']
    // Vẽ đúng theo đường nét mẫu -> 100 điểm
    const goodStroke = [[{ x: 0, y: 0 }, { x: 50, y: 2 }, { x: 100, y: 0 }]]
    expect(evaluateHandwritingStrokes(paths, goodStroke, 12)).toBeGreaterThanOrEqual(90)

    // Cheat: tô quẹt đi quẹt lại phủ kín cả vùng -> 0 điểm
    const scribbleCheat = [[
      { x: 0, y: -30 }, { x: 100, y: -30 }, { x: 0, y: -15 }, { x: 100, y: -15 },
      { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 15 }, { x: 100, y: 15 },
      { x: 0, y: 30 }, { x: 100, y: 30 },
    ]]
    expect(evaluateHandwritingStrokes(paths, scribbleCheat, 12)).toBeLessThan(30)
  })
})

import { HAND_LETTERS, layoutHandwriting, mapPoints, strokeStart } from './handwriting'
import { chunkText } from './speech'

describe('handwriting – mẫu chữ viết thường', () => {
  const VI_LOWER = [...'aăâbcdđeêghiklmnoôơpqrstuưvxy']

  it('có đủ 29 chữ cái tiếng Việt', () => {
    expect(VI_LOWER).toHaveLength(29)
    for (const c of VI_LOWER) expect(HAND_LETTERS[c], c).toBeDefined()
  })

  it('chiều cao đúng mẫu (ô li)', () => {
    const h = (c: string) => { const l = layoutHandwriting(c)!; return [l.minY, l.maxY] }
    expect(h('a')[0]).toBeCloseTo(-2, 0)      // 2 ô li
    expect(h('l')[0]).toBeCloseTo(-5, 0)      // 5 ô li
    expect(h('d')[0]).toBeCloseTo(-4, 0)      // 4 ô li
    expect(h('t')[0]).toBeCloseTo(-3, 0)      // 3 ô li
    expect(h('g')[1]).toBeGreaterThan(2.5)    // khuyết dưới 3 ô li
    expect(h('p')[1]).toBeCloseTo(2, 0)
  })

  it('ghép âm nhiều chữ cái, chữ hoa thì trả null', () => {
    const ngh = layoutHandwriting('ngh')!
    expect(ngh.strokes.length).toBe(HAND_LETTERS.n.strokes.length + HAND_LETTERS.g.strokes.length + HAND_LETTERS.h.strokes.length)
    expect(ngh.maxX).toBeGreaterThan(6)
    expect(layoutHandwriting('A')).toBeNull()
  })

  it('mapPoints / strokeStart', () => {
    expect(mapPoints('M 1,-2 L 3,4', (x, y) => [x * 10, y + 1])).toBe('M 10,-1 L 30,5')
    expect(strokeStart('M 1.5,-2 C 0,0 0,0 0,0')).toEqual([1.5, -2])
  })
})

describe('chunkText – cắt đoạn cho giọng online', () => {
  it('giữ nguyên câu ngắn', () => {
    expect(chunkText('con cá')).toEqual([{ text: 'con cá', start: 0 }])
  })
  it('cắt câu dài ≤ max ký tự, start trỏ đúng vị trí', () => {
    const t = 'Gà mẹ dẫn đàn con đi ăn. Đàn con chạy theo mẹ. Mẹ bới đất tìm giun cho con ăn.'
    const parts = chunkText(t, 30)
    expect(parts.length).toBeGreaterThan(1)
    for (const p of parts) {
      expect(p.text.length).toBeLessThanOrEqual(30)
      expect(t.slice(p.start).startsWith(p.text)).toBe(true)
    }
  })
})
