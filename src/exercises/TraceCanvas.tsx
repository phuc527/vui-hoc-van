import { useEffect, useMemo, useRef, useState } from 'react'
import { speak } from '../lib/speech'
import { evaluateHandwritingStrokes, traceScore, type Point } from '../lib/scoring'
import { layoutHandwriting, mapPoints, strokeStart } from '../lib/handwriting'
import type { TraceConfig } from '../lib/types'
import { Button } from '../components/ui'
import type { ExerciseProps } from './common'

const W = 480
const H = 360
const COLORS = ['#1572A1', '#FF7F6B', '#3BB273', '#9B5DE5']
const STROKE_COLORS = ['#FF7F6B', '#1572A1', '#3BB273', '#9B5DE5', '#E8A800']
// k = bội số bề rộng nét mẫu
const SIZES = [
  { k: 0.2, label: 'Nét rất nhỏ' }, { k: 0.35, label: 'Nét nhỏ' }, { k: 0.5, label: 'Nét vừa' },
  { k: 0.7, label: 'Nét to' }, { k: 1, label: 'Nét rất to' },
]

/**
 * Tô / đồ chữ theo mẫu chữ viết thường tiểu học trên nền ô li.
 * mode 'to': chữ mẫu màu nhạt + minh hoạ thứ tự nét (số, điểm đặt bút, nét chạy) – bé tô đè lên.
 * mode 'do': chữ nét chấm – bé đồ theo.
 * Chấm điểm: % điểm trên đường nét được phủ mực, trừ điểm nếu lem ra ngoài nhiều.
 */
export function TraceCanvas({ config, onFinish }: ExerciseProps<TraceConfig>) {
  const glyph = config.glyph
  const hand = useMemo(() => layoutHandwriting(glyph), [glyph])

  // tỉ lệ: 1 ô li = s px; căn giữa chữ
  const geo = useMemo(() => {
    if (!hand) return null
    const s = Math.min(52, (W * 0.8) / (hand.maxX - hand.minX), (H * 0.86) / (hand.maxY - hand.minY))
    const x0 = W / 2 - s * (hand.minX + hand.maxX) / 2
    const y0 = H / 2 - s * (hand.minY + hand.maxY) / 2
    const tf = (d: string) => mapPoints(d, (x, y) => [x0 + s * x, y0 + s * y])
    return { s, x0, y0, paths: hand.strokes.map(tf), starts: hand.strokes.map((d) => strokeStart(tf(d))) }
  }, [hand])

  const brush = geo ? Math.max(14, geo.s * 0.6) : 26 // bề rộng nét mẫu; vùng chấm điểm tính theo nó
  const [sizeK, setSizeK] = useState(0.5)
  const pen = brush * sizeK
  const fontSize = Math.min(260, Math.floor(620 / Math.max(1, [...glyph].length)))
  const font = `800 ${fontSize}px Nunito, sans-serif`

  const ref = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)
  const userStrokes = useRef<Point[][]>([])
  const [color, setColor] = useState(COLORS[0])
  const [hasInk, setHasInk] = useState(false)
  const [result, setResult] = useState<number | null>(null)
  const [demo, setDemo] = useState(0) // đổi key để chạy lại minh hoạ

  useEffect(() => { speak(glyph) }, [glyph])

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }
  }
  const stroke = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const ctx = ref.current!.getContext('2d')!
    ctx.strokeStyle = color; ctx.lineWidth = pen; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke()
  }
  const down = (e: React.PointerEvent) => {
    if (result !== null) return
    ref.current!.setPointerCapture(e.pointerId)
    drawing.current = true
    const p = pos(e)
    last.current = p
    userStrokes.current.push([p])
    stroke(p, p)
    setHasInk(true)
  }
  const move = (e: React.PointerEvent) => {
    if (!drawing.current || !last.current) return
    const p = pos(e)
    stroke(last.current, p)
    last.current = p
    const cur = userStrokes.current[userStrokes.current.length - 1]
    if (cur) cur.push(p)
  }
  const up = () => { drawing.current = false; last.current = null }

  const clear = () => {
    ref.current!.getContext('2d')!.clearRect(0, 0, W, H)
    userStrokes.current = []
    setHasInk(false); setResult(null)
  }

  const check = () => {
    const mk = (width: number) => {
      const c = document.createElement('canvas'); c.width = W; c.height = H
      const ctx = c.getContext('2d')!
      ctx.strokeStyle = '#000'; ctx.fillStyle = '#000'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      if (geo) {
        ctx.lineWidth = width
        geo.paths.forEach((d) => ctx.stroke(new Path2D(d)))
      } else {
        ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(glyph, W / 2, H / 2 + 10)
        if (width > 6) { ctx.lineWidth = width; ctx.strokeText(glyph, W / 2, H / 2 + 10) }
      }
      return ctx.getImageData(0, 0, W, H).data
    }
    const lineMask = mk(6)                        // đường tâm nét mẫu
    const expectedMask = mk(Math.max(10, pen))    // diện tích mực chuẩn nếu viết đúng 1 lần
    const wideMask = mk(Math.max(brush * 0.9, pen * 1.15)) // vùng cho phép quanh nét mẫu
    const ink = ref.current!.getContext('2d')!.getImageData(0, 0, W, H).data
    const alpha = (d: Uint8ClampedArray, x: number, y: number) => d[(Math.round(y) * W + Math.round(x)) * 4 + 3]

    const target: { x: number; y: number }[] = []
    for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) if (alpha(lineMask, x, y) > 128) target.push({ x, y })
    let inkTotal = 0, inkOut = 0, expectedTotal = 0
    for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x += 4) {
      if (alpha(expectedMask, x, y) > 128) expectedTotal++
      if (alpha(ink, x, y) > 0) { inkTotal++; if (alpha(wideMask, x, y) === 0) inkOut++ }
    }
    const overInkRatio = expectedTotal > 0 ? inkTotal / expectedTotal : 1
    // Đổi ngưỡng lem ra ngoài chặt hơn (nhân hệ số 2 để tô ra ngoài > 18% là bắt đầu bị trừ nặng)
    const pixelScore = traceScore(target, (x, y) => alpha(ink, x, y) > 0, inkTotal ? (inkOut / inkTotal) * 2 : 0, overInkRatio)

    let score = pixelScore
    if (geo) {
      const tolerance = Math.max(12, brush * 0.65, pen * 0.65)
      const strokeScore = evaluateHandwritingStrokes(geo.paths, userStrokes.current, tolerance)
      // Kết hợp cả điểm đường nét vector (chống tô bôi đen, kiểm tra hướng & độ bám nét) và điểm pixel
      score = Math.min(pixelScore, strokeScore)
    }
    setResult(score)
    speak(score >= 70 ? 'Giỏi quá' : 'Cố lên nhé')
  }

  const STROKE_DUR = 1.2
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-lg text-ocean">
        {config.mode === 'do' ? 'Đồ theo nét chấm nhé!' : 'Xem cách viết, rồi tô theo đúng thứ tự nét nhé!'}
      </p>
      <div className="relative w-full max-w-[480px] touch-none select-none overflow-hidden rounded-3xl border-4 border-aqua bg-white shadow-inner"
        style={{ aspectRatio: `${W} / ${H}` }}>
        <svg key={demo} className="absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${H}`} aria-hidden>
          {geo ? (
            <>
              {/* ô li như vở Tập viết: kẻ ngang mỗi ô li, đậm hơn ở đường kẻ chân chữ */}
              {Array.from({ length: 40 }, (_, i) => i - 20).map((k) => {
                const y = geo.y0 + k * geo.s
                if (y < 0 || y > H) return null
                return <line key={`h${k}`} x1="0" x2={W} y1={y} y2={y}
                  stroke={k === 0 ? '#20A4B8' : '#BFE8EE'} strokeWidth={k === 0 ? 2 : 1} />
              })}
              {Array.from({ length: 60 }, (_, i) => i - 30).map((k) => {
                const x = geo.x0 + k * geo.s
                if (x < 0 || x > W) return null
                return <line key={`v${k}`} y1="0" y2={H} x1={x} x2={x} stroke="#E3F5F8" strokeWidth="1" />
              })}
              {/* chữ mẫu */}
              {geo.paths.map((d, i) => (
                <path key={`g${i}`} d={d} fill="none" strokeLinecap="round" strokeLinejoin="round"
                  stroke={config.mode === 'do' ? '#8C9BA8' : '#D6EEF2'}
                  strokeWidth={config.mode === 'do' ? 3.5 : brush}
                  strokeDasharray={config.mode === 'do' ? '1 9' : undefined} />
              ))}
              {/* minh hoạ nét chạy theo thứ tự */}
              {config.mode === 'to' && geo.paths.map((d, i) => (
                <path key={`a${i}`} d={d} fill="none" strokeLinecap="round" strokeLinejoin="round"
                  stroke={STROKE_COLORS[i % STROKE_COLORS.length]} strokeWidth={4}
                  pathLength={1} strokeDasharray="1" strokeDashoffset="1"
                  style={{ animation: `draw ${STROKE_DUR}s ease-in-out ${0.4 + i * (STROKE_DUR + 0.25)}s forwards` }} />
              ))}
              {/* điểm đặt bút + số thứ tự nét */}
              {geo.starts.map(([x, y], i) => (
                <g key={`s${i}`}>
                  <circle cx={x} cy={y} r={6} fill={STROKE_COLORS[i % STROKE_COLORS.length]} />
                  {geo.paths.length > 1 && (
                    <text x={x + (i % 2 ? 16 : -16)} y={y - 8} fontSize="15" fontWeight="800" fill={STROKE_COLORS[i % STROKE_COLORS.length]}
                      textAnchor="middle" fontFamily="Nunito, sans-serif">{i + 1}</text>
                  )}
                </g>
              ))}
            </>
          ) : (
            // ký tự chưa có mẫu viết tay (vd chữ hoa) → dùng chữ in
            <>
              {[90, 180, 270].map((y) => <line key={y} x1="0" x2={W} y1={y} y2={y} stroke="#7FD6E0" strokeDasharray="4 6" />)}
              <text x={W / 2} y={H / 2 + 10} textAnchor="middle" dominantBaseline="middle" style={{ font }}
                fill={config.mode === 'do' ? 'none' : '#E8F7FA'} stroke={config.mode === 'do' ? '#9aa9b5' : '#20A4B8'}
                strokeWidth={config.mode === 'do' ? 3 : 4} strokeDasharray={config.mode === 'do' ? '2 9' : undefined}
                strokeLinecap="round">{glyph}</text>
            </>
          )}
        </svg>
        <canvas ref={ref} width={W} height={H} className="absolute inset-0 h-full w-full opacity-80"
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {SIZES.map(({ k, label }) => (
          <button key={k} aria-label={label} title={label} aria-pressed={sizeK === k} onClick={() => setSizeK(k)}
            className={`flex h-11 w-11 items-center justify-center rounded-full border-4 bg-white ${sizeK === k ? 'scale-110 border-ocean-deep' : 'border-aqua'}`}>
            <span className="rounded-full" style={{ background: color, width: 4 + 18 * k, height: 4 + 18 * k }} />
          </button>
        ))}
        <span className="mx-1 h-8 w-px bg-aqua" aria-hidden />
        {COLORS.map((c) => (
          <button key={c} aria-label="Chọn màu" onClick={() => setColor(c)}
            className={`h-11 w-11 rounded-full border-4 ${color === c ? 'scale-110 border-ocean-deep' : 'border-white'}`} style={{ background: c }} />
        ))}
        {geo && config.mode === 'to' && (
          <Button variant="secondary" className="ml-2 !min-h-[44px] !text-base" onClick={() => setDemo((d) => d + 1)}>▶ Xem cách viết</Button>
        )}
      </div>
      {result === null ? (
        <div className="flex gap-3">
          <Button variant="secondary" onClick={clear}>Xoá</Button>
          <Button onClick={check} disabled={!hasInk}>Xong rồi!</Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <p className={`font-display text-3xl font-bold ${result >= 70 ? 'text-seaweed' : 'text-coral'}`}>
            {result >= 70 ? `Đẹp lắm! (${result} điểm)` : `Được ${result} điểm – tô theo nét mẫu nhé!`}
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={clear}>Tô lại</Button>
            <Button variant="success" onClick={() => onFinish(result)}>Tiếp tục</Button>
          </div>
        </div>
      )}
    </div>
  )
}
