/**
 * Mẫu chữ viết thường tiểu học (chữ viết đứng, cỡ vừa – theo vở Tập viết lớp 1).
 * Đơn vị = 1 ô li. Đường kẻ dưới (đường chân chữ) y = 0, trục y hướng xuống.
 *  - a ă â c e ê i m n o ô ơ u ư v x: cao 2 ô li; r s: 2,25
 *  - t: 3 ô li · d đ: 4 · p q: 2 trên + 2 dưới · b h k l: 5 · g y: 2 trên + 3 dưới
 * Mỗi chữ là danh sách nét theo đúng thứ tự viết; mỗi nét là path SVG chỉ dùng lệnh M / L / C (tuyệt đối).
 */
export interface HandLetter { w: number; strokes: string[] }

// ---- các nét dùng lại ----
// nét cong kín: đặt bút dưới đường kẻ 3, vòng sang trái xuống đáy, lên bên phải và khép lại đúng điểm đặt bút
const RING = 'M 1.65,-1.7 C 1.45,-1.98 1.2,-2.05 0.95,-2.05 C 0.4,-2.05 0,-1.55 0,-1.0 C 0,-0.4 0.42,0 0.92,0 C 1.42,0 1.7,-0.45 1.7,-1.0 C 1.7,-1.3 1.68,-1.52 1.65,-1.7'
const hookRight = (x: number, top: number) =>
  `M ${x},${top} L ${x},-0.35 C ${x},-0.05 ${x + 0.2},0 ${x + 0.4},0 C ${x + 0.6},0 ${x + 0.75},-0.15 ${x + 0.8},-0.4`
const lift = (x: number, top = -2) => `M ${x - 0.5},${top + 0.85} L ${x},${top}`
const hump = (x0: number, x1: number, end: 'hook' | 'down') =>
  `M ${x0},-1.2 C ${x0 + 0.2},-1.8 ${x0 + 0.5},-2 ${x0 + 0.8},-2 C ${x1 - 0.1},-2 ${x1},-1.8 ${x1},-1.5 ` +
  (end === 'down' ? `L ${x1},0` : `L ${x1},-0.35 C ${x1},-0.05 ${x1 + 0.2},0 ${x1 + 0.4},0 C ${x1 + 0.6},0 ${x1 + 0.75},-0.15 ${x1 + 0.8},-0.4`)
const LOOP_UP = 'M 0,-1.6 C 0.5,-2.6 1.0,-3.6 1.0,-4.4 C 1.0,-4.85 0.8,-5 0.6,-5 C 0.4,-5 0.3,-4.8 0.3,-4.4'
const LOOP_DOWN = (x: number) => `M ${x},-2 L ${x},2.4 C ${x},3.1 ${x - 0.7},3.1 ${x - 0.7},2.5 C ${x - 0.7},1.8 ${x + 0.2},1.0 ${x + 0.8},0.3`
const U_FIRST = 'M 0,-1.1 L 0.5,-2 L 0.5,-0.5 C 0.5,-0.1 0.8,0 1.05,0 C 1.4,0 1.6,-0.3 1.65,-0.7'
const O_BODY = 'M 1.1,-2 C 0.45,-2.05 0,-1.45 0,-1.0 C 0,-0.35 0.45,0 1.0,0 C 1.6,0 1.95,-0.5 1.95,-1.05 C 1.95,-1.6 1.6,-2 1.1,-2'

// ---- dấu phụ ----
const breve = (cx: number) => `M ${cx - 0.45},-2.95 C ${cx - 0.3},-2.45 ${cx + 0.3},-2.45 ${cx + 0.45},-2.95`
const circ = (cx: number) => `M ${cx - 0.45},-2.4 L ${cx},-2.95 L ${cx + 0.45},-2.4`
const horn = (x: number) => `M ${x},-2 C ${x + 0.3},-2.05 ${x + 0.5},-2.3 ${x + 0.45},-2.6`
const dot = (x: number) => `M ${x},-2.95 L ${x},-2.7`

const A = [RING, hookRight(1.8, -2)]
const O = [O_BODY + ' C 1.4,-1.95 1.7,-1.75 2.2,-1.8']
const E = ['M 0.2,-0.9 C 0.9,-0.95 1.6,-1.2 1.6,-1.6 C 1.6,-1.9 1.3,-2.05 1.0,-2.0 C 0.4,-1.95 0,-1.4 0,-0.95 C 0,-0.35 0.45,0 1.0,0 C 1.4,0 1.7,-0.2 1.85,-0.5']
const U = [U_FIRST, hookRight(1.7, -2)]

export const HAND_LETTERS: Record<string, HandLetter> = {
  a: { w: 2.6, strokes: A },
  ă: { w: 2.6, strokes: [...A, breve(1.0)] },
  â: { w: 2.6, strokes: [...A, circ(1.0)] },
  b: { w: 2.0, strokes: [LOOP_UP + ' L 0.3,-0.3 C 0.45,-0.05 0.7,0 0.9,0 C 1.35,0 1.65,-0.5 1.65,-1.1 C 1.65,-1.7 1.4,-2 1.15,-2 C 0.95,-2 0.95,-1.7 1.2,-1.65 C 1.5,-1.6 1.8,-1.65 2.0,-1.75'] },
  c: { w: 2.0, strokes: ['M 1.75,-1.6 C 1.7,-1.95 1.3,-2.05 1.05,-2.0 C 0.4,-1.95 0,-1.4 0,-1.0 C 0,-0.35 0.45,0 1.0,0 C 1.45,0 1.75,-0.25 1.9,-0.55'] },
  d: { w: 2.6, strokes: [RING, hookRight(1.8, -4)] },
  đ: { w: 2.6, strokes: [RING, hookRight(1.8, -4), 'M 1.2,-3 L 2.4,-3'] },
  e: { w: 1.9, strokes: E },
  ê: { w: 1.9, strokes: [...E, circ(0.95)] },
  g: { w: 2.6, strokes: [RING, LOOP_DOWN(1.8)] },
  h: { w: 2.3, strokes: [LOOP_UP + ' L 0.3,0', hump(0.3, 1.5, 'hook')] },
  i: { w: 1.3, strokes: [lift(0.5) + ' L 0.5,-0.35 C 0.5,-0.05 0.7,0 0.9,0 C 1.1,0 1.25,-0.15 1.3,-0.4', dot(0.5)] },
  k: { w: 2.3, strokes: [LOOP_UP + ' L 0.3,0', 'M 0.3,-1.2 C 0.5,-1.8 0.9,-2.05 1.3,-2 C 1.7,-1.95 1.6,-1.2 0.9,-1.1 C 1.2,-1.1 1.5,-0.9 1.5,-0.5 L 1.5,-0.35 C 1.5,-0.05 1.7,0 1.9,0 C 2.1,0 2.25,-0.15 2.3,-0.4'] },
  l: { w: 1.2, strokes: [LOOP_UP + ' L 0.3,-0.35 C 0.3,-0.05 0.5,0 0.7,0 C 0.9,0 1.05,-0.15 1.1,-0.4'] },
  m: { w: 3.6, strokes: ['M 0,-1.6 C 0.15,-1.95 0.6,-2.1 0.6,-1.7 L 0.6,0', hump(0.6, 1.7, 'down'), hump(1.7, 2.8, 'hook')] },
  n: { w: 2.6, strokes: ['M 0,-1.6 C 0.15,-1.95 0.6,-2.1 0.6,-1.7 L 0.6,0', hump(0.6, 1.8, 'hook')] },
  o: { w: 2.2, strokes: O },
  ô: { w: 2.2, strokes: [...O, circ(1.0)] },
  ơ: { w: 2.4, strokes: [O_BODY, horn(1.8)] },
  p: { w: 2.5, strokes: [lift(0.5), 'M 0.5,-2 L 0.5,2', hump(0.5, 1.7, 'hook')] },
  q: { w: 2.2, strokes: [RING, 'M 1.8,-2 L 1.8,2'] },
  r: { w: 2.2, strokes: ['M 0,-1.2 L 0.6,-2.25 C 0.65,-2.05 0.6,-1.95 0.8,-1.95 C 1.1,-1.95 1.3,-2.1 1.5,-2.0 C 1.4,-1.5 1.35,-0.8 1.35,-0.35 C 1.35,-0.05 1.55,0 1.75,0 C 1.95,0 2.1,-0.15 2.15,-0.4'] },
  s: { w: 1.7, strokes: ['M 0,-1.2 L 0.7,-2.25 C 0.75,-2.0 0.7,-1.95 0.9,-1.85 C 1.4,-1.6 1.55,-1.2 1.4,-0.6 C 1.25,-0.1 0.8,0 0.55,-0.15 C 0.35,-0.3 0.55,-0.6 0.8,-0.5'] },
  t: { w: 1.4, strokes: [lift(0.6, -2.2), hookRight(0.6, -3), 'M 0.05,-2 L 1.2,-2'] },
  u: { w: 2.5, strokes: U },
  ư: { w: 2.6, strokes: [...U, horn(1.7)] },
  v: { w: 2.3, strokes: ['M 0,-1.6 C 0.15,-1.95 0.5,-2.05 0.55,-1.7 L 0.6,-0.6 C 0.65,-0.15 0.9,0 1.15,0 C 1.6,0 1.8,-0.9 1.75,-2.0 C 1.75,-1.75 1.9,-1.65 2.2,-1.7'] },
  x: { w: 1.9, strokes: ['M 0,-1.7 C 0.2,-2 0.6,-2.05 0.85,-1.8 C 1.1,-1.5 1.1,-0.5 0.85,-0.2 C 0.6,0.05 0.2,0 0,-0.3', 'M 1.8,-1.7 C 1.6,-2 1.2,-2.05 0.95,-1.8 C 0.7,-1.5 0.7,-0.5 0.95,-0.2 C 1.2,0.05 1.6,0 1.85,-0.3'] },
  y: { w: 2.6, strokes: [U_FIRST, LOOP_DOWN(1.7)] },
}

const GAP = 0.45

export interface HandLayout {
  /** nét đã dời vị trí (vẫn theo đơn vị ô li) */
  strokes: string[]
  minX: number; maxX: number; minY: number; maxY: number
}

/** Ghép các chữ cái (vd "ngh") thành dãy nét; trả về null nếu có ký tự chưa có mẫu (chữ hoa, số…) */
export function layoutHandwriting(glyph: string): HandLayout | null {
  const chars = [...glyph.normalize('NFC')]
  if (chars.length === 0 || chars.some((c) => !HAND_LETTERS[c])) return null
  const strokes: string[] = []
  let x = 0
  for (const c of chars) {
    const L = HAND_LETTERS[c]
    strokes.push(...L.strokes.map((d) => mapPoints(d, (px, py) => [px + x, py])))
    x += L.w + GAP
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const d of strokes) mapPoints(d, (px, py) => {
    minX = Math.min(minX, px); maxX = Math.max(maxX, px); minY = Math.min(minY, py); maxY = Math.max(maxY, py)
    return [px, py]
  })
  return { strokes, minX, maxX, minY: Math.min(minY, -2), maxY: Math.max(maxY, 0) }
}

/** Biến đổi từng cặp toạ độ trong path M/L/C */
export function mapPoints(d: string, f: (x: number, y: number) => [number, number]): string {
  return d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, a, b) => {
    const [x, y] = f(Number(a), Number(b))
    return `${round(x)},${round(y)}`
  })
}

/** Điểm đặt bút (điểm đầu tiên của nét) */
export function strokeStart(d: string): [number, number] {
  const m = d.match(/M\s*(-?\d*\.?\d+),(-?\d*\.?\d+)/)
  return m ? [Number(m[1]), Number(m[2])] : [0, 0]
}

/** Lấy danh sách các điểm mẫu dọc theo path SVG (chỉ gồm M, L, C tuyệt đối) */
export function samplePathPoints(d: string, step = 4): { x: number; y: number }[] {
  const tokens = d.match(/[MLC]|-?\d*\.?\d+/g) ?? []
  const pts: { x: number; y: number }[] = []
  let cx = 0, cy = 0, i = 0
  const pushSeg = (x0: number, y0: number, x1: number, y1: number) => {
    const dist = Math.hypot(x1 - x0, y1 - y0)
    const n = Math.max(1, Math.ceil(dist / step))
    for (let k = 1; k <= n; k++) {
      pts.push({ x: x0 + ((x1 - x0) * k) / n, y: y0 + ((y1 - y0) * k) / n })
    }
  }
  while (i < tokens.length) {
    const cmd = tokens[i++]
    if (cmd === 'M') {
      cx = Number(tokens[i++]); cy = Number(tokens[i++])
      pts.push({ x: cx, y: cy })
    } else if (cmd === 'L') {
      const nx = Number(tokens[i++]), ny = Number(tokens[i++])
      pushSeg(cx, cy, nx, ny)
      cx = nx; cy = ny
    } else if (cmd === 'C') {
      const x1 = Number(tokens[i++]), y1 = Number(tokens[i++])
      const x2 = Number(tokens[i++]), y2 = Number(tokens[i++])
      const x3 = Number(tokens[i++]), y3 = Number(tokens[i++])
      const approxLen = Math.hypot(x1 - cx, y1 - cy) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x3 - x2, y3 - y2)
      const n = Math.max(4, Math.ceil(approxLen / step))
      let px = cx, py = cy
      for (let k = 1; k <= n; k++) {
        const t = k / n, u = 1 - t
        const nx = u * u * u * cx + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3
        const ny = u * u * u * cy + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3
        pts.push({ x: nx, y: ny })
        px = nx; py = ny
      }
      cx = px; cy = py
    }
  }
  return pts
}

const round = (n: number) => Math.round(n * 100) / 100
