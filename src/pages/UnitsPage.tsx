import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchUnits, unitLabel, useAsync } from '../lib/api'
import { AM_SUBTYPE_LABELS, UNIT_KIND_LABELS, type UnitKind } from '../lib/types'
import { Loading } from '../components/ui'

/** Chữ càng ngắn càng to – để dấu (˘ ˆ ʼ ´ ` ? ~ .) hiện rõ trên/dưới chữ */
const labelSize = (t: string) => {
  const n = [...t].length
  if (n <= 2) return 'text-4xl sm:text-5xl'
  if (n === 3) return 'text-3xl sm:text-4xl'
  if (n === 4) return 'text-2xl sm:text-3xl'
  return 'px-1 text-base sm:text-xl'
}

const SUBTYPE_EMOJI: Record<string, string> = { chinh: '🐚', phu: '🦀', ghep: '🐙' }
const AM_SUB_STORAGE_KEY = 'vui_hoc_am_sub'

export function UnitsPage({ kind }: { kind: UnitKind }) {
  const { data, loading, error } = useAsync(() => fetchUnits(kind), [kind])
  const [searchParams, setSearchParams] = useSearchParams()
  const [sub, setSubState] = useState<string>(() => {
    const fromUrl = searchParams.get('sub')
    if (fromUrl && fromUrl in AM_SUBTYPE_LABELS) return fromUrl
    try {
      const saved = sessionStorage.getItem(AM_SUB_STORAGE_KEY)
      if (saved && saved in AM_SUBTYPE_LABELS) return saved
    } catch { /* ignore */ }
    return 'chinh'
  })

  const setSub = (k: string) => {
    setSubState(k)
    try { sessionStorage.setItem(AM_SUB_STORAGE_KEY, k) } catch { /* ignore */ }
    setSearchParams({ sub: k }, { replace: true })
  }
  if (loading) return <Loading />
  if (error) return <p className="text-coral">Lỗi: {error}</p>
  const units = (data ?? []).filter((u) => kind !== 'am' || u.subtype === sub)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-4xl font-extrabold">Đảo {UNIT_KIND_LABELS[kind]}</h1>
      {kind === 'am' && (
        <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-3 sm:grid-cols-3">
          {Object.entries(AM_SUBTYPE_LABELS).map(([k, v]) => (
            <button key={k} onClick={() => setSub(k)}
              className={`flex items-center justify-center gap-2 whitespace-nowrap rounded-[1.75rem] px-4 py-3 font-display text-2xl font-extrabold transition lg:text-3xl ${sub === k
                ? 'scale-105 bg-ocean text-white shadow-[0_7px_0_#0B3D5C]'
                : 'bg-white/85 text-ocean-deep shadow-[0_7px_0_#7FD6E0] hover:-translate-y-1'}`}>
              <span className="text-3xl sm:text-4xl">{SUBTYPE_EMOJI[k]}</span>{v}
            </button>
          ))}
        </div>
      )}
      <div className="mx-auto grid w-full max-w-4xl grid-cols-4 gap-3 sm:grid-cols-5 sm:gap-4 md:grid-cols-6">
        {units.map((u, i) => {
          const label = unitLabel(u)
          return (
            <Link key={u.id} to={`/unit/${u.id}`}
              className="flex aspect-square animate-pop items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-white to-aqua text-center font-body font-extrabold leading-none text-ocean-deep shadow-xl transition hover:-rotate-3 hover:scale-105"
              style={{ animationDelay: `${i * 30}ms` }}>
              {/* "Thanh sắc ( ´ )" → dấu xuống dòng riêng, không bị ngắt giữa ngoặc */}
              <span className={`${labelSize(label)} whitespace-pre-line pt-[0.15em] leading-tight`}>{label.replace(/\s*\(\s*(\S)\s*\)/, '\n( $1 )')}</span>
            </Link>
          )
        })}
      </div>
      {units.length === 0 && <p>Chưa có nội dung.</p>}
    </div>
  )
}
