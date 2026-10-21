import { useId, useMemo, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { speak } from '../lib/speech'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ocean text-white shadow-[0_5px_0_#0B3D5C] hover:bg-lagoon',
  secondary: 'bg-white text-ocean-deep shadow-[0_5px_0_#7FD6E0] hover:bg-foam',
  ghost: 'bg-transparent text-ocean-deep hover:bg-white/50',
  danger: 'bg-coral text-white shadow-[0_5px_0_#c4553f]',
  success: 'bg-seaweed text-white shadow-[0_5px_0_#26834f]',
}

export function Button({ variant = 'primary', className = '', ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`min-h-[52px] rounded-2xl px-5 py-2 font-display text-xl font-bold transition active:translate-y-1 active:shadow-none disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    />
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[1.75rem] bg-white/90 p-5 shadow-lg backdrop-blur ${className}`}>{children}</div>
}

export function SpeakerButton({ text, className = '', size = 'md' }: { text: string; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'h-10 w-10 text-xl', md: 'h-14 w-14 text-2xl', lg: 'h-20 w-20 text-4xl' }[size]
  return (
    <button
      type="button"
      aria-label={`Nghe: ${text}`}
      onClick={(e) => { e.stopPropagation(); speak(text) }}
      className={`inline-flex items-center justify-center rounded-full bg-star shadow-[0_4px_0_#d9a800] transition active:translate-y-1 active:shadow-none ${s} ${className}`}
    >🔊</button>
  )
}

export function StarRating({ stars, size = 'text-3xl' }: { stars: number; size?: string }) {
  return (
    <span className={size} aria-label={`${stars} sao`}>
      {[0, 1, 2].map((i) => <span key={i} className={i < stars ? '' : 'opacity-25 grayscale'}>⭐</span>)}
    </span>
  )
}

export function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Whale className="h-20 w-20 animate-bob" />
    </div>
  )
}

export function Whale({ className = '', mood = 'happy' }: { className?: string; mood?: 'happy' | 'sad' }) {
  return (
    <svg viewBox="0 0 120 100" className={className} aria-hidden>
      <path d="M58 22c-3-10 6-16 6-16M64 20c3-9 12-10 12-10M60 21c0-8-8-12-8-12" stroke="#7FD6E0" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M10 60c0-22 20-36 48-36 30 0 46 18 46 36 0 16-16 28-46 28C30 88 10 78 10 60z" fill="#1572A1" />
      <path d="M18 70c10 10 26 14 40 14 22 0 36-6 42-16-8 6-22 8-42 8-16 0-28-2-40-6z" fill="#E8F7FA" />
      <path d="M100 52c8-10 14-12 18-8-4 4-4 10 0 14-4 4-12 2-18-6z" fill="#0B3D5C" />
      <circle cx="38" cy="54" r="5" fill="#0B3D5C" /><circle cx="39.5" cy="52.5" r="1.6" fill="#fff" />
      <circle cx="30" cy="64" r="4" fill="#FF7F6B" opacity=".6" />
      {mood === 'happy'
        ? <path d="M34 68q8 7 16 0" stroke="#0B3D5C" strokeWidth="3" fill="none" strokeLinecap="round" />
        : <path d="M34 72q8 -6 16 0" stroke="#0B3D5C" strokeWidth="3" fill="none" strokeLinecap="round" />}
    </svg>
  )
}

/** Ngôi sao biển vàng có mặt cười (giống minh hoạ SGK) */
export function StarFace({ className = '', done = false }: { className?: string; done?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <path d="M50 4l13 29 31 3-23 21 7 31-28-16-28 16 7-31L6 36l31-3z"
        fill={done ? '#FFD23F' : '#FFE27A'} stroke="#E8A800" strokeWidth="3" strokeLinejoin="round" />
      <ellipse cx="38" cy="28" rx="10" ry="5" fill="#fff" opacity=".55" transform="rotate(-25 38 28)" />
      <circle cx="40" cy="44" r="3.2" fill="#5a3b00" /><circle cx="60" cy="44" r="3.2" fill="#5a3b00" />
      <circle cx="33" cy="54" r="4" fill="#FF7F6B" opacity=".45" /><circle cx="67" cy="54" r="4" fill="#FF7F6B" opacity=".45" />
      <path d={done ? 'M42 54q8 9 16 0' : 'M44 55q6 4 12 0'} stroke="#5a3b00" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    </svg>
  )
}

/** Nền đại dương động: bong bóng nổi, cá bơi, sóng chạy (hiệu ứng như GIF, làm bằng CSS) */
export function OceanBackground() {
  const bubbles = Array.from({ length: 14 }, (_, i) => ({
    left: (i * 37) % 100, size: 8 + ((i * 13) % 22), dur: 9 + ((i * 7) % 10), delay: (i * 1.7) % 12,
  }))
  const fish = [
    { top: '22%', dur: 28, delay: 0, emoji: '🐠', size: 'text-3xl' },
    { top: '58%', dur: 36, delay: 8, emoji: '🐟', size: 'text-2xl' },
    { top: '75%', dur: 44, delay: 18, emoji: '🐡', size: 'text-3xl' },
  ]
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {bubbles.map((b, i) => (
        <span key={i} className="bubble" style={{ left: `${b.left}%`, width: b.size, height: b.size, animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s` }} />
      ))}
      {fish.map((f, i) => (
        <span key={i} className={`fish ${f.size} opacity-70`} style={{ top: f.top, animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s` }}>
          <span className="inline-block -scale-x-100">{f.emoji}</span>
        </span>
      ))}
      <div className="absolute bottom-0 left-0 h-24 w-[200%]">
        <svg className="wave absolute bottom-0 h-full w-full" style={{ animationDuration: '14s' }} viewBox="0 0 1200 100" preserveAspectRatio="none">
          <path d="M0 40 Q75 10 150 40 T300 40 T450 40 T600 40 T750 40 T900 40 T1050 40 T1200 40 V100 H0z" fill="#20A4B8" opacity=".55" />
        </svg>
        <svg className="wave absolute bottom-0 h-3/4 w-full" style={{ animationDuration: '9s' }} viewBox="0 0 1200 100" preserveAspectRatio="none">
          <path d="M0 50 Q75 20 150 50 T300 50 T450 50 T600 50 T750 50 T900 50 T1050 50 T1200 50 V100 H0z" fill="#1572A1" opacity=".7" />
        </svg>
      </div>
    </div>
  )
}

type Creature = { emoji: string; top?: string; bottom?: string; left?: string; right?: string; size: string; anim: string; dur: number; delay?: number; flip?: boolean }

const SIDE_CREATURES: Creature[] = [
  // bên trái
  { emoji: '🐙', top: '12%', left: '8%', size: 'text-7xl', anim: 'creature-drift', dur: 7 },
  { emoji: '🪼', top: '30%', left: '24%', size: 'text-6xl', anim: 'creature-jelly', dur: 4.5, delay: 1 },
  { emoji: '🐢', top: '50%', left: '6%', size: 'text-7xl', anim: 'creature-drift', dur: 9, delay: 2, flip: true },
  { emoji: '🦐', top: '44%', left: '28%', size: 'text-4xl', anim: 'creature-bob', dur: 2.6 },
  { emoji: '🐠', top: '66%', left: '22%', size: 'text-5xl', anim: 'creature-drift', dur: 6, delay: .5, flip: true },
  { emoji: '🦀', bottom: '9%', left: '10%', size: 'text-5xl', anim: 'creature-scuttle', dur: 5 },
  { emoji: '🐚', bottom: '7%', left: '30%', size: 'text-4xl', anim: 'creature-bob', dur: 3.5, delay: 1 },
  // bên phải
  { emoji: '🐬', top: '10%', right: '18%', size: 'text-7xl', anim: 'creature-drift', dur: 6.5 },
  { emoji: '🐳', top: '26%', right: '4%', size: 'text-6xl', anim: 'creature-bob', dur: 4, delay: .8 },
  { emoji: '🦑', top: '40%', right: '24%', size: 'text-6xl', anim: 'creature-jelly', dur: 5, delay: 1.5 },
  { emoji: '🐡', top: '56%', right: '8%', size: 'text-5xl', anim: 'creature-drift', dur: 7.5, delay: 2 },
  { emoji: '🦞', top: '70%', right: '26%', size: 'text-5xl', anim: 'creature-bob', dur: 3, delay: .3 },
  { emoji: '⭐', bottom: '8%', right: '10%', size: 'text-5xl', anim: 'creature-sway', dur: 3.5 },
  { emoji: '🦭', bottom: '6%', right: '28%', size: 'text-6xl', anim: 'creature-bob', dur: 4.2, delay: 1.2 },
]

// Rạn san hô SVG: cành tô gradient (gốc đậm → ngọn sáng) + polyp tròn ở ngọn, quạt lưới mờ, san hô não có khối
const CORAL_SHAPES = {
  stag: 'M50 120V72M50 92L30 62V36M30 62L17 47V28M50 82L70 56V30M70 56L84 41V22M50 72L46 40V14M46 40L58 26',
  fan: 'M50 120V84M50 84L22 50L14 20M22 50L30 24M50 84L40 40L38 10M50 84L60 40L64 12M50 84L78 50L86 22M78 50L70 26M40 40L48 18',
  tube: 'M30 120V58M45 120V34M60 120V48M75 120V66M52 120V20',
  bush: 'M50 120V90M50 90Q30 80 26 60M50 90Q70 80 74 60M26 60Q18 50 20 36M26 60Q36 50 34 38M74 60Q66 50 68 36M74 60Q84 50 80 38M50 90V54M50 54Q42 44 44 30M50 54Q58 44 56 30',
}
const TIPS: Record<keyof typeof CORAL_SHAPES, [number, number][]> = {
  stag: [[30, 36], [17, 28], [70, 30], [84, 22], [46, 14], [58, 26]],
  fan: [[14, 20], [30, 24], [38, 10], [64, 12], [86, 22], [70, 26], [48, 18]],
  tube: [[30, 58], [45, 34], [60, 48], [75, 66], [52, 20]],
  bush: [[20, 36], [34, 38], [68, 36], [80, 38], [44, 30], [56, 30]],
}
const FAN_FILL = 'M50 112L12 52L10 18L40 6L66 8L90 20L86 54Z'
const shade = (c: string, k: string, p: number) => `color-mix(in srgb, ${c} ${p}%, ${k})`
type CoralKind = keyof typeof CORAL_SHAPES | 'brain' | 'puff' | 'weed'
// san hô mềm dạng bông cải: các cụm tròn chồng nhau [cx, cy, r]
const PUFF: [number, number, number][] = [[50, 92, 26], [26, 96, 18], [74, 96, 18], [36, 70, 20], [64, 70, 20], [50, 50, 20], [30, 50, 13], [70, 50, 13], [50, 30, 13]]

// San hô sừng hươu như ảnh mẫu: cành dày, cong, chẻ đôi/ba nhiều tầng, thon dần, nốt sần dọc cành (seed cố định)
type Seg = [number, number, number, number, number, number, number] // x1 y1 qx qy x2 y2 độ dày
const GROW = {
  stag: { depth: 3, len: 28, spread: .55, w: 19, trunks: 3 },
  tube: { depth: 4, len: 20, spread: .7, w: 12, trunks: 2 },  // nhánh mảnh xoè rộng (san hô xanh)
  bush: { depth: 2, len: 22, spread: .95, w: 17, trunks: 4 }, // bụi thấp, dày
}
function growCoral(seed: number, style: keyof typeof GROW) {
  let s = seed * 9301 + 49297
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647
  const c = GROW[style], segs: Seg[] = [], tips: [number, number, number][] = []
  const go = (x: number, y: number, a: number, len: number, w: number, d: number) => {
    a = Math.max(-1.25, Math.min(1.25, a))
    const x2 = x + Math.sin(a) * len, y2 = y - Math.cos(a) * len, bend = (r() - .5) * len * .45
    segs.push([x, y, (x + x2) / 2 + bend, (y + y2) / 2, x2, y2, w])
    if (d <= 0) { tips.push([x2, y2, w * .4]); return }
    const n = r() < .3 ? 3 : 2
    for (let i = 0; i < n; i++) go(x2, y2, a * .85 + (i - (n - 1) / 2) * c.spread * (.7 + r() * .6), len * (.7 + r() * .18), w * .74, d - 1)
  }
  for (let t = 0; t < c.trunks; t++) go(50 + (t - (c.trunks - 1) / 2) * 8, 120, (t - (c.trunks - 1) / 2) * .35 + (r() - .5) * .3, c.len * (.8 + r() * .4), c.w, c.depth - (t % 2))
  // khung nhìn ôm sát cành → san hô luôn đầy ô chứa, gốc chạm đáy
  const xs = segs.flatMap((g) => [g[0], g[4]]), ys = segs.map((g) => g[5])
  const minX = Math.min(...xs) - 6, maxX = Math.max(...xs) + 6, minY = Math.min(...ys) - 6
  return { segs, tips, box: `${minX} ${minY} ${maxX - minX} ${120 - minY}` }
}

function BranchCoral({ kind, color, seed }: { kind: keyof typeof GROW; color: string; seed: number }) {
  const id = useId()
  const dark = shade(color, '#1b1440', 55), light = shade(color, 'white', 55)
  const { segs, tips, box } = useMemo(() => growCoral(seed, kind), [seed, kind])
  const path = (g: Seg) => `M${g[0]} ${g[1]}Q${g[2]} ${g[3]} ${g[4]} ${g[5]}`
  const at = (g: Seg, t: number, i: number) => (1 - t) ** 2 * g[i] + 2 * (1 - t) * t * g[i + 2] + t * t * g[i + 4]
  return (
    <svg viewBox={box} preserveAspectRatio="xMidYMax meet" className="h-full w-full" overflow="visible">
      <defs><linearGradient id={id} x1="0" y1="120" x2="0" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor={dark} /><stop offset=".4" stopColor={color} /><stop offset="1" stopColor={light} /></linearGradient></defs>
      {/* bóng bên phải → khối 3D */}
      {segs.map((g, i) => <path key={`s${i}`} d={path(g)} transform="translate(1.4 .6)" fill="none" stroke={dark} strokeWidth={g[6]} strokeLinecap="round" opacity=".55" />)}
      {segs.map((g, i) => <path key={`b${i}`} d={path(g)} fill="none" stroke={`url(#${id})`} strokeWidth={g[6]} strokeLinecap="round" />)}
      {segs.map((g, i) => <path key={`h${i}`} d={path(g)} transform={`translate(${-g[6] * .22} 0)`} fill="none" stroke="white" strokeWidth={g[6] * .2} strokeLinecap="round" opacity=".3" />)}
      {/* nốt sần (polyp) dọc cành */}
      {segs.map((g, i) => g[6] > 3 && [.3, .7].map((t) => (
        <circle key={`p${i}${t}`} cx={at(g, t, 0) + (t > .5 ? 1 : -1) * g[6] * .3} cy={at(g, t, 1)} r={g[6] * .16} fill={dark} opacity=".35" />)))}
      {tips.map(([x, y, w], i) => <circle key={`t${i}`} cx={x} cy={y} r={w} fill={light} />)}
    </svg>
  )
}

function Coral({ kind, color, sw, seed }: { kind: CoralKind; color: string; sw: number; seed: number }) {
  if (kind === 'stag' || kind === 'tube' || kind === 'bush') return <BranchCoral kind={kind} color={color} seed={seed} />
  return <OtherCoral kind={kind} color={color} sw={sw} />
}

function OtherCoral({ kind, color, sw }: { kind: CoralKind; color: string; sw: number }) {
  const id = useId()
  const dark = shade(color, '#1b1440', 55), light = shade(color, 'white', 55)
  if (kind === 'brain') return (
    <svg viewBox="0 0 100 60" className="h-full w-full">
      <defs><radialGradient id={id} cx=".4" cy=".3" r=".8"><stop offset="0" stopColor={light} /><stop offset=".55" stopColor={color} /><stop offset="1" stopColor={dark} /></radialGradient></defs>
      <path d="M4 60Q2 14 50 8Q98 14 96 60Z" fill={`url(#${id})`} />
      <path d="M18 52Q20 30 34 24Q46 34 50 20Q56 34 66 24Q80 30 82 52M30 56Q34 40 44 38Q50 46 58 38Q68 42 70 56"
        fill="none" stroke={dark} strokeWidth="2" strokeLinecap="round" opacity=".55" />
    </svg>
  )
  if (kind === 'puff') return (
    <svg viewBox="0 0 100 120" className="h-full w-full" overflow="visible">
      <defs><radialGradient id={id} cx=".35" cy=".3" r=".75"><stop offset="0" stopColor={light} /><stop offset=".6" stopColor={color} /><stop offset="1" stopColor={dark} /></radialGradient></defs>
      {PUFF.map(([x, y, r], i) => <g key={i}>
        <circle cx={x} cy={y} r={r} fill={`url(#${id})`} />
        {[0, 1, 2].map((j) => <circle key={j} cx={x - r * 0.35 + j * r * 0.35} cy={y - r * 0.3 + (j % 2) * r * 0.3} r={r * 0.09} fill={light} opacity=".8" />)}
      </g>)}
    </svg>
  )
  if (kind === 'weed') return (
    <svg viewBox="0 0 100 120" className="h-full w-full" overflow="visible">
      <defs><linearGradient id={id} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor={dark} /><stop offset="1" stopColor={light} /></linearGradient></defs>
      {['M40 120C20 90 60 70 38 40C28 24 40 10 46 4C44 20 52 30 50 46C48 70 62 92 52 120Z', 'M60 120C76 96 50 80 66 54C74 40 66 28 62 20C72 30 80 44 76 58C70 80 82 100 72 120Z']
        .map((w, i) => <path key={i} d={w} fill={`url(#${id})`} />)}
    </svg>
  )
  const d = CORAL_SHAPES[kind]
  return (
    <svg viewBox="0 0 100 120" className="h-full w-full" overflow="visible">
      <defs><linearGradient id={id} x1="0" y1="120" x2="0" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor={dark} /><stop offset=".45" stopColor={color} /><stop offset="1" stopColor={light} /></linearGradient></defs>
      {kind === 'fan' && <>
        <path d={FAN_FILL} fill={`url(#${id})`} opacity=".45" />
        {/* lưới quạt */}
        <path d={FAN_FILL} fill="none" stroke={light} strokeWidth="1" opacity=".5" strokeDasharray="1 3" />
        {[30, 50, 70].map((y) => <path key={y} d={`M14 ${y}Q50 ${y - 14} 88 ${y}`} fill="none" stroke={light} strokeWidth="1" opacity=".45" />)}
      </>}
      <path d={d} fill="none" stroke={`url(#${id})`} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      {/* vệt sáng một bên cành cho có khối */}
      <path d={d} fill="none" stroke="white" strokeWidth={Math.max(1, sw * 0.22)} strokeLinecap="round" strokeLinejoin="round"
        opacity=".28" transform={`translate(${-sw * 0.22} 0)`} />
      {TIPS[kind].map(([x, y], i) => kind === 'tube'
        ? <ellipse key={i} cx={x} cy={y} rx={sw * 0.62} ry={sw * 0.3} fill={dark} stroke={light} strokeWidth="1.5" />
        : <circle key={i} cx={x} cy={y} r={sw * 0.6} fill={light} />)}
    </svg>
  )
}

// [vị trí ngang, cạnh, loại, màu, chiều cao (vh), độ dày nét, lớp sau?]
const REEF: [string, 'left' | 'right', CoralKind, string, number, number, boolean?][] = [
  // lớp sau (nhạt, xanh hơn)
  ['4%', 'left', 'fan', '#7FA7E0', 40, 4, true], ['18%', 'left', 'stag', '#8FB8D8', 34, 0, true], ['30%', 'left', 'tube', '#6FC3C9', 22, 0, true],
  ['3%', 'right', 'stag', '#8FB8D8', 40, 0, true], ['17%', 'right', 'fan', '#9C8BD9', 32, 4, true], ['29%', 'right', 'bush', '#6FC3C9', 20, 0, true],
  // lớp trước: tông màu như ảnh mẫu (hồng san hô, cam, vàng, xanh dương)
  ['-4%', 'left', 'stag', '#F2848A', 36, 0], ['9%', 'left', 'stag', '#F59A3E', 28, 0], ['20%', 'left', 'bush', '#EBC35A', 22, 0],
  ['1%', 'left', 'bush', '#F59A3E', 18, 0], ['28%', 'left', 'stag', '#F2848A', 18, 0], ['15%', 'left', 'tube', '#E58FB0', 20, 0],
  ['12%', 'left', 'brain', '#D97BA0', 8, 0], ['25%', 'left', 'brain', '#8DBA4A', 7, 0],
  ['-4%', 'right', 'stag', '#F59A3E', 38, 0], ['9%', 'right', 'tube', '#4F9BE0', 26, 0], ['17%', 'right', 'stag', '#F2848A', 26, 0],
  ['24%', 'right', 'bush', '#EBC35A', 22, 0], ['2%', 'right', 'bush', '#EBC35A', 18, 0], ['30%', 'right', 'stag', '#F59A3E', 16, 0],
  ['12%', 'right', 'brain', '#8DBA4A', 7, 0], ['26%', 'right', 'brain', '#D97BA0', 8, 0],
]

const ROCK = 'M0 30V14Q8 2 20 10Q30 0 44 9Q56 2 68 12Q82 6 100 20V30Z'

/** Rạn san hô hai bên đáy biển; hiện trên mọi màn hình (mobile nhỏ hơn). */
export function CoralReef() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 -z-10 h-[45vh] overflow-hidden opacity-70 [--reef:0.55vh] sm:opacity-100 sm:[--reef:1vh]" aria-hidden>
      {/* cát */}
      <div className="absolute inset-x-0 bottom-0 h-[5vh] bg-gradient-to-t from-[#E9D7B0] to-[#E9D7B0]/0" />
      {/* đá */}
      {(['left', 'right'] as const).map((side) => (
        <svg key={side} style={{ [side]: 0 }} className={`absolute bottom-0 h-[13vh] w-[38%] ${side === 'right' ? '-scale-x-100' : ''}`} viewBox="0 0 100 30" preserveAspectRatio="none">
          <path d={ROCK} fill="#7E4F7A" />
          <path d={ROCK} fill="#A86E9C" transform="translate(0 4)" />
          <circle cx="24" cy="20" r="2" fill="#6A3F7E" /><circle cx="60" cy="18" r="1.5" fill="#6A3F7E" /><circle cx="78" cy="24" r="2" fill="#6A3F7E" />
        </svg>
      ))}
      {REEF.map(([pos, side, kind, color, h, sw, back], i) => (
        <span key={i} className={`creature bottom-[2vh] ${kind === 'brain' ? '' : 'creature-sway'} ${back ? 'opacity-60' : ''}`}
          style={{ [side]: pos, height: `min(calc(${h} * var(--reef)), ${h * 9}px)`, aspectRatio: kind === 'brain' ? '100 / 60' : '100 / 120',
            animationDuration: `${4 + (i % 4)}s`, animationDelay: `${i * .3}s`, filter: back ? 'blur(.5px)' : undefined }}>
          <Coral kind={kind} color={color} sw={sw} seed={i + 1} />
        </span>
      ))}
    </div>
  )
}

/** Sinh vật biển trang trí hai bên (ẩn trên màn hình nhỏ để không che form). */
export function SeaCreatures() {
  return (
    <>
    <CoralReef />
    <div className="pointer-events-none fixed inset-0 -z-10 hidden overflow-hidden lg:block" aria-hidden>
      {SIDE_CREATURES.map((c, i) => (
        <span key={i} className={`creature ${c.anim} ${c.size}`}
          style={{ top: c.top, bottom: c.bottom, left: c.left, right: c.right, animationDuration: `${c.dur}s`, animationDelay: `${c.delay ?? 0}s` }}>
          <span className={`inline-block ${c.flip ? '-scale-x-100' : ''}`}>{c.emoji}</span>
        </span>
      ))}
    </div>
    </>
  )
}

/** Chữ nhún nhảy từng ký tự. */
export function BouncyTitle({ text, className = '' }: { text: string; className?: string }) {
  const colors = ['text-ocean-deep', 'text-ocean', 'text-lagoon', 'text-coral']
  let n = 0
  return (
    <h1 className={className} aria-label={text}>
      {text.split(' ').map((word, w) => (
        <span key={w} aria-hidden className="inline-block whitespace-nowrap">
          {[...word].map((ch) => {
            const i = n++
            return (
              <span key={i} className={`title-letter ${colors[i % colors.length]}`} style={{ animationDelay: `${i * .12}s` }}>{ch}</span>
            )
          })}
        </span>
      )).reduce<ReactNode[]>((acc, el, i) => (i ? [...acc, ' ', el] : [el]), [])}
    </h1>
  )
}

export function WordImage({ emoji, imageUrl, text, className = 'h-24 w-24 text-6xl' }:
  { emoji?: string | null; imageUrl?: string | null; text: string; className?: string }) {
  if (imageUrl) return <img src={imageUrl} alt={text} className={`${className} rounded-2xl object-cover`} />
  if (text.trim().toLowerCase() === 'thớt' || text.trim().toLowerCase() === 'cái thớt') {
    return (
      <span className={`${className} inline-flex items-center justify-center rounded-2xl bg-foam p-2.5`} role="img" aria-label={text}>
        <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-sm" aria-hidden>
          {/* Cạnh dày 3D của thớt gỗ */}
          <rect x="14" y="12" width="72" height="80" rx="14" fill="#A66A38" />
          {/* Mặt thớt gỗ sáng */}
          <rect x="14" y="8" width="72" height="78" rx="14" fill="#DFA066" stroke="#8C5326" strokeWidth="3" />
          {/* Lỗ treo thớt trên đầu */}
          <rect x="38" y="15" width="24" height="9" rx="4.5" fill="#E8F7FA" stroke="#8C5326" strokeWidth="2.5" />
          {/* Vân gỗ tự nhiên */}
          <path d="M26 36H74M24 52H68M30 68H72" stroke="#C5834B" strokeWidth="3" strokeLinecap="round" opacity=".65" />
        </svg>
      </span>
    )
  }
  return <span className={`${className} inline-flex items-center justify-center rounded-2xl bg-foam`} role="img" aria-label={text}>{emoji ?? '🖼️'}</span>
}
