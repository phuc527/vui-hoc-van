import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { supabase } from '../lib/supabase'
import { speak } from '../lib/speech'
import { Button, Card, Whale } from '../components/ui'

const TOOLS = [
  { id: 'timer', emoji: '⏰', title: 'Đồng hồ đếm ngược' },
  { id: 'picker', emoji: '🎯', title: 'Quay tên ngẫu nhiên' },
  { id: 'noise', emoji: '🔊', title: 'Đo tiếng ồn' },
  { id: 'board', emoji: '🖍️', title: 'Bảng trắng' },
] as const
type ToolId = typeof TOOLS[number]['id']

/** Tiện ích dùng trên lớp (trình chiếu lên màn hình lớn) */
export function ClassTools() {
  const [tool, setTool] = useState<ToolId>('timer')
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TOOLS.map((t) => (
          <button key={t.id} onClick={() => setTool(t.id)}
            className={`flex flex-col items-center gap-1 rounded-2xl p-3 font-display text-lg font-bold transition ${tool === t.id ? 'bg-ocean text-white shadow-[0_5px_0_#0B3D5C]' : 'bg-white/85 shadow-[0_5px_0_#7FD6E0] hover:-translate-y-0.5'}`}>
            <span className="text-4xl">{t.emoji}</span>{t.title}
          </button>
        ))}
      </div>
      {tool === 'timer' && <Timer />}
      {tool === 'picker' && <NamePicker />}
      {tool === 'noise' && <NoiseMeter />}
      {tool === 'board' && <Whiteboard />}
    </div>
  )
}

function beep(times = 3) {
  try {
    const ctx = new AudioContext()
    for (let i = 0; i < times; i++) {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination)
      const t = ctx.currentTime + i * 0.35
      g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
      o.start(t); o.stop(t + 0.3)
    }
  } catch { /* trình duyệt không hỗ trợ âm thanh */ }
}

/* ---------------- Đồng hồ ---------------- */
function Timer() {
  const [total, setTotal] = useState(60)
  const [left, setLeft] = useState(60)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running) return
    if (left <= 0) {
      setRunning(false); beep(); speak('Hết giờ rồi')
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } })
      return
    }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000)
    return () => clearTimeout(t)
  }, [running, left])

  const set = (s: number) => { setTotal(s); setLeft(s); setRunning(false) }
  const mm = String(Math.floor(left / 60)).padStart(2, '0'), ss = String(left % 60).padStart(2, '0')
  const pct = total ? left / total : 0

  return (
    <Card className="flex flex-col items-center gap-4">
      <div className="relative flex h-72 w-72 items-center justify-center">
        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#E8F7FA" strokeWidth="8" />
          <circle cx="50" cy="50" r="45" fill="none" stroke={left <= 10 ? '#FF7F6B' : '#20A4B8'} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 45} strokeDashoffset={2 * Math.PI * 45 * (1 - pct)} className="transition-all duration-1000 ease-linear" />
        </svg>
        <span className={`font-display text-7xl font-extrabold tabular-nums ${left <= 10 && running ? 'animate-pulse text-coral' : ''}`}>{mm}:{ss}</span>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {[30, 60, 120, 180, 300, 600].map((s) => (
          <button key={s} onClick={() => set(s)} className={`rounded-xl px-4 py-2 font-bold ${total === s ? 'bg-ocean text-white' : 'bg-foam'}`}>
            {s < 60 ? `${s} giây` : `${s / 60} phút`}
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <Button onClick={() => setRunning((r) => !r)} disabled={left <= 0}>{running ? '⏸ Tạm dừng' : '▶ Bắt đầu'}</Button>
        <Button variant="secondary" onClick={() => set(total)}>↺ Đặt lại</Button>
      </div>
    </Card>
  )
}

/* ---------------- Quay tên ---------------- */
function NamePicker() {
  const [text, setText] = useState('')
  const [current, setCurrent] = useState<string | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [removePicked, setRemovePicked] = useState(true)

  useEffect(() => {
    supabase.from('profiles').select('display_name, username').eq('role', 'student').order('display_name')
      .then(({ data }: { data: { display_name?: string | null; username: string }[] | null }) => {
        const names = (data ?? []).map((p) => p.display_name || p.username)
        setText((t) => t || names.join('\n'))
      })
  }, [])

  const names = text.split('\n').map((s) => s.trim()).filter(Boolean)
  const spin = () => {
    if (names.length === 0 || spinning) return
    setSpinning(true)
    let n = 0
    const steps = 22 + Math.floor(Math.random() * 10)
    const tick = () => {
      setCurrent(names[Math.floor(Math.random() * names.length)])
      if (++n < steps) { setTimeout(tick, 50 + n * 9); return }
      const pick = names[Math.floor(Math.random() * names.length)]
      setCurrent(pick); setSpinning(false); speak(`Mời bạn ${pick}`)
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 } })
      if (removePicked) setText(names.filter((x) => x !== pick).join('\n'))
    }
    tick()
  }

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_280px]">
      <Card className="flex min-h-[320px] flex-col items-center justify-center gap-5">
        <div className={`flex min-h-[140px] w-full items-center justify-center rounded-3xl bg-gradient-to-br from-star to-coral p-6 text-center font-display text-6xl font-extrabold text-white shadow-xl ${spinning ? '' : current ? 'animate-pop' : ''}`}>
          {current ?? '❓'}
        </div>
        <Button onClick={spin} disabled={spinning || names.length === 0} className="!text-2xl">🎯 Quay!</Button>
      </Card>
      <Card className="flex flex-col gap-2">
        <b>Danh sách ({names.length} bạn) – mỗi dòng một tên</b>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10}
          className="flex-1 rounded-xl border-2 border-aqua p-2 outline-none focus:border-ocean" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={removePicked} onChange={(e) => setRemovePicked(e.target.checked)} /> Bỏ tên đã được gọi
        </label>
      </Card>
    </div>
  )
}

/* ---------------- Đo tiếng ồn ---------------- */
function NoiseMeter() {
  const [level, setLevel] = useState(0)
  const [limit, setLimit] = useState(60)
  const [on, setOn] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const stop = useRef<() => void>(() => {})
  const lastWarn = useRef(0)

  useEffect(() => () => stop.current(), [])

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const ctx = new AudioContext()
      const an = ctx.createAnalyser(); an.fftSize = 1024
      ctx.createMediaStreamSource(stream).connect(an)
      const buf = new Float32Array(an.fftSize)
      let raf = 0
      const loop = () => {
        an.getFloatTimeDomainData(buf)
        const rms = Math.sqrt(buf.reduce((a, x) => a + x * x, 0) / buf.length)
        setLevel((l) => l * 0.8 + Math.min(100, rms * 400) * 0.2)
        raf = requestAnimationFrame(loop)
      }
      loop()
      stop.current = () => { cancelAnimationFrame(raf); stream.getTracks().forEach((t) => t.stop()); ctx.close() }
      setOn(true); setErr(null)
    } catch {
      setErr('Không mở được micro. Hãy cho phép trình duyệt dùng micro.')
    }
  }

  const loud = level > limit
  useEffect(() => {
    if (loud && Date.now() - lastWarn.current > 4000) { lastWarn.current = Date.now(); speak('Các con trật tự nào') }
  }, [loud])

  return (
    <Card className={`flex flex-col items-center gap-4 transition-colors ${loud ? '!bg-coral/20' : ''}`}>
      <Whale className={`h-40 w-40 ${loud ? 'animate-shake' : 'animate-bob'}`} mood={loud ? 'sad' : 'happy'} />
      <p className="font-display text-4xl font-extrabold">{loud ? 'Suỵt! Ồn quá rồi 🤫' : on ? 'Lớp mình trật tự lắm 👍' : 'Bật micro để đo'}</p>
      <div className="relative h-10 w-full max-w-xl overflow-hidden rounded-full bg-foam">
        <div className={`h-full rounded-full transition-all ${level > limit ? 'bg-coral' : level > limit * 0.7 ? 'bg-star' : 'bg-seaweed'}`} style={{ width: `${level}%` }} />
        <div className="absolute inset-y-0 w-1 bg-ocean-deep" style={{ left: `${limit}%` }} />
      </div>
      <label className="flex items-center gap-3">Ngưỡng ồn
        <input type="range" min={10} max={95} value={limit} onChange={(e) => setLimit(Number(e.target.value))} />
      </label>
      {!on ? <Button onClick={start}>🎤 Bật micro</Button> : <Button variant="secondary" onClick={() => { stop.current(); setOn(false); setLevel(0) }}>Tắt</Button>}
      {err && <p className="text-coral">{err}</p>}
    </Card>
  )
}

/* ---------------- Bảng trắng ---------------- */
const PENS = ['#0B3D5C', '#FF7F6B', '#3BB273', '#1572A1', '#9B5DE5', '#E8A800']
function Whiteboard() {
  const ref = useRef<HTMLCanvasElement>(null)
  const last = useRef<{ x: number; y: number } | null>(null)
  const [color, setColor] = useState(PENS[0])
  const [size, setSize] = useState(6)
  const [eraser, setEraser] = useState(false)
  const W = 1200, H = 700

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }
  }
  const line = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const ctx = ref.current!.getContext('2d')!
    ctx.globalCompositeOperation = eraser ? 'destination-out' : 'source-over'
    ctx.strokeStyle = color; ctx.lineWidth = eraser ? size * 5 : size; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {PENS.map((c) => (
          <button key={c} aria-label="Màu bút" onClick={() => { setColor(c); setEraser(false) }}
            className={`h-10 w-10 rounded-full border-4 ${color === c && !eraser ? 'scale-110 border-ocean-deep' : 'border-white'}`} style={{ background: c }} />
        ))}
        <input type="range" min={2} max={24} value={size} onChange={(e) => setSize(Number(e.target.value))} aria-label="Cỡ bút" />
        <button onClick={() => setEraser((x) => !x)} className={`rounded-xl px-3 py-2 font-bold ${eraser ? 'bg-ocean text-white' : 'bg-foam'}`}>🧽 Tẩy</button>
        <button onClick={() => ref.current!.getContext('2d')!.clearRect(0, 0, W, H)} className="rounded-xl bg-foam px-3 py-2 font-bold">🗑 Xoá hết</button>
        <button onClick={() => ref.current?.requestFullscreen?.()} className="ml-auto rounded-xl bg-foam px-3 py-2 font-bold">⛶ Toàn màn hình</button>
      </div>
      <canvas ref={ref} width={W} height={H}
        className="w-full touch-none rounded-2xl border-4 border-aqua bg-white [background-image:linear-gradient(#E3F5F8_1px,transparent_1px)] [background-size:100%_28px]"
        onPointerDown={(e) => { ref.current!.setPointerCapture(e.pointerId); last.current = pos(e); line(last.current, last.current) }}
        onPointerMove={(e) => { if (!last.current) return; const p = pos(e); line(last.current, p); last.current = p }}
        onPointerUp={() => { last.current = null }} onPointerCancel={() => { last.current = null }} />
    </Card>
  )
}
