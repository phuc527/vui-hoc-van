import { useState, type FormEvent } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fetchExercises, fetchLessons, fetchUnits, fetchWords, unitLabel, useAsync } from '../lib/api'
import {
  AM_SUBTYPE_LABELS, EXERCISE_LABELS, EXERCISE_TEMPLATES, UNIT_KIND_LABELS,
  type Attempt, type Exercise, type ExerciseType, type Profile, type UnitKind, type Word,
} from '../lib/types'
import { Button, Card, Loading, StarRating, WordImage } from '../components/ui'
import { ExerciseRunner } from '../exercises/ExerciseRunner'
import { ClassTools } from './ClassTools'

const input = 'rounded-xl border-2 border-aqua bg-white px-3 py-2 outline-none focus:border-ocean'

async function run(p: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await p
  if (error) alert('Lỗi: ' + error.message)
  return !error
}

export function AdminLayout() {
  const tab = ({ isActive }: { isActive: boolean }) =>
    `rounded-xl px-4 py-2 font-bold ${isActive ? 'bg-ocean text-white' : 'bg-white/80'}`
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-4xl font-extrabold">Trang giáo viên</h1>
      <nav className="flex flex-wrap gap-2">
        <NavLink end to="/admin" className={tab}>Học sinh</NavLink>
        <NavLink to="/admin/units" className={tab}>Âm / Vần / Thanh</NavLink>
        <NavLink to="/admin/words" className={tab}>Từ & hình</NavLink>
        <NavLink to="/admin/exercises" className={tab}>Bài tập</NavLink>
        <NavLink to="/admin/tien-ich" className={tab}>🧰 Tiện ích lớp học</NavLink>
      </nav>
      <Routes>
        <Route index element={<StudentsAdmin />} />
        <Route path="units" element={<UnitsAdmin />} />
        <Route path="words" element={<WordsAdmin />} />
        <Route path="exercises" element={<ExercisesAdmin />} />
        <Route path="tien-ich" element={<ClassTools />} />
      </Routes>
    </div>
  )
}

/* ---------------- Học sinh ---------------- */
function StudentsAdmin() {
  const { data, loading, error } = useAsync(async () => {
    const [p, a] = await Promise.all([
      supabase.from('profiles').select('*').order('username'),
      supabase.from('attempts').select('*'),
    ])
    if (p.error) throw p.error
    if (a.error) throw a.error
    return { profiles: p.data as Profile[], attempts: a.data as Attempt[] }
  }, [])
  if (loading) return <Loading />
  if (error || !data) return <p className="text-coral">{error}</p>
  return (
    <Card>
      <table className="w-full text-left">
        <thead><tr className="border-b-2 border-aqua"><th className="py-2">Tên đăng nhập</th><th>Tên</th><th>Vai trò</th><th>Số bài</th><th>Tổng sao (cao nhất mỗi bài)</th><th>Lần cuối</th></tr></thead>
        <tbody>
          {data.profiles.map((p) => {
            const mine = data.attempts.filter((a) => a.user_id === p.id)
            const best = new Map<number, number>()
            mine.forEach((a) => best.set(a.exercise_id, Math.max(best.get(a.exercise_id) ?? 0, a.stars)))
            const last = mine.map((a) => a.created_at).sort().at(-1)
            return (
              <tr key={p.id} className="border-b border-foam">
                <td className="py-2 font-bold">{p.username}</td><td>{p.display_name}</td>
                <td>{p.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}</td>
                <td>{best.size}</td><td>⭐ {[...best.values()].reduce((x, y) => x + y, 0)}</td>
                <td>{last ? new Date(last).toLocaleString('vi-VN') : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Card>
  )
}

/* ---------------- Units ---------------- */
function UnitsAdmin() {
  const { data, loading, reload } = useAsync(() => fetchUnits(undefined, true), [])
  const [kind, setKind] = useState<UnitKind>('am')
  const [subtype, setSubtype] = useState('chinh')
  const [value, setValue] = useState('')
  const [title, setTitle] = useState('')

  const add = async (e: FormEvent) => {
    e.preventDefault()
    const ok = await run(supabase.from('units').insert({
      kind, value: value.trim(), title: title.trim() || null, subtype: kind === 'am' ? subtype : null,
      order_index: (data?.filter((u) => u.kind === kind).length ?? 0) + 1,
    }))
    if (ok) { setValue(''); setTitle(''); reload() }
  }
  if (loading) return <Loading />
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <form onSubmit={add} className="flex flex-wrap items-end gap-2">
          <select className={input} value={kind} onChange={(e) => setKind(e.target.value as UnitKind)}>
            {Object.entries(UNIT_KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {kind === 'am' && (
            <select className={input} value={subtype} onChange={(e) => setSubtype(e.target.value)}>
              {Object.entries(AM_SUBTYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          )}
          <input className={input} placeholder="Giá trị (vd: ngh, oan, sắc)" value={value} onChange={(e) => setValue(e.target.value)} required />
          <input className={input} placeholder="Tiêu đề (tuỳ chọn)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Button type="submit">Thêm</Button>
        </form>
      </Card>
      {(['am', 'van', 'thanh'] as UnitKind[]).map((k) => (
        <Card key={k}>
          <h2 className="mb-2 font-display text-2xl font-bold">{UNIT_KIND_LABELS[k]}</h2>
          <div className="flex flex-wrap gap-2">
            {data?.filter((u) => u.kind === k).map((u) => (
              <span key={u.id} className={`flex items-center gap-2 rounded-xl px-3 py-1 ${u.published ? 'bg-foam' : 'bg-gray-200 line-through'}`}>
                <b>{unitLabel(u)}</b>{u.subtype && <small>({AM_SUBTYPE_LABELS[u.subtype]})</small>}
                <button title="Ẩn/hiện" onClick={async () => { await run(supabase.from('units').update({ published: !u.published }).eq('id', u.id)); reload() }}>👁</button>
                <button title="Xoá" onClick={async () => { if (confirm(`Xoá "${u.value}" và toàn bộ bài tập của nó?`)) { await run(supabase.from('units').delete().eq('id', u.id)); reload() } }}>🗑</button>
              </span>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}

/* ---------------- Words ---------------- */
function WordsAdmin() {
  const { data, loading, reload } = useAsync(async () => {
    const [words, units, links] = await Promise.all([
      fetchWords(), fetchUnits(undefined, true),
      (supabase.from('unit_words').select('*') as Promise<{ data?: { unit_id: number; word_id: number }[] }>).then((r) => r.data ?? []),
    ])
    return { words, units, links }
  }, [])
  const [text, setText] = useState('')
  const [emoji, setEmoji] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [unitIds, setUnitIds] = useState<number[]>([])
  const [busy, setBusy] = useState(false)

  const upload = async (f: File) => {
    const path = `${crypto.randomUUID()}.${f.name.split('.').pop() ?? 'png'}`
    const { error } = await supabase.storage.from('word-images').upload(path, f)
    if (error) { alert('Upload lỗi: ' + error.message); return null }
    return supabase.storage.from('word-images').getPublicUrl(path).data.publicUrl
  }

  const add = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const image_url = file ? await upload(file) : null
    const { data: w, error } = await supabase.from('words')
      .insert({ text: text.trim().normalize('NFC'), emoji: emoji.trim() || null, image_url }).select().single()
    if (error) alert('Lỗi: ' + error.message)
    else if (unitIds.length) await run(supabase.from('unit_words').insert(unitIds.map((u) => ({ unit_id: u, word_id: (w as Word).id }))))
    setBusy(false)
    if (!error) { setText(''); setEmoji(''); setFile(null); setUnitIds([]); reload() }
  }

  const replaceImage = async (w: Word, f: File) => {
    const url = await upload(f)
    if (url) { await run(supabase.from('words').update({ image_url: url }).eq('id', w.id)); reload() }
  }

  if (loading || !data) return <Loading />
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <form onSubmit={add} className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <input className={input} placeholder="Từ (vd: con cá)" value={text} onChange={(e) => setText(e.target.value)} required />
            <input className={`${input} w-28`} placeholder="Emoji 🐟" value={emoji} onChange={(e) => setEmoji(e.target.value)} />
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div>
            <p className="mb-1 font-bold">Gắn với âm / vần / thanh:</p>
            <div className="flex max-h-32 flex-wrap gap-1 overflow-auto">
              {data.units.map((u) => (
                <label key={u.id} className={`cursor-pointer rounded-lg px-2 py-1 text-sm ${unitIds.includes(u.id) ? 'bg-ocean text-white' : 'bg-foam'}`}>
                  <input type="checkbox" className="hidden" checked={unitIds.includes(u.id)}
                    onChange={(e) => setUnitIds(e.target.checked ? [...unitIds, u.id] : unitIds.filter((x) => x !== u.id))} />
                  {UNIT_KIND_LABELS[u.kind]} {unitLabel(u)}
                </label>
              ))}
            </div>
          </div>
          <Button type="submit" disabled={busy} className="self-start">{busy ? 'Đang lưu…' : 'Thêm từ'}</Button>
        </form>
      </Card>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {data.words.map((w) => (
          <Card key={w.id} className="flex flex-col items-center gap-2 !p-3 text-center">
            <WordImage emoji={w.emoji} imageUrl={w.image_url} text={w.text} className="h-20 w-20 text-5xl" />
            <b className="text-xl">{w.text}</b>
            <small className="text-ocean">
              {data.links.filter((l) => l.word_id === w.id).map((l) => {
                const u = data.units.find((x) => x.id === l.unit_id)
                return u ? unitLabel(u) : ''
              }).join(', ') || '—'}
            </small>
            <div className="flex gap-2 text-sm">
              <label className="cursor-pointer underline">Đổi ảnh
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && replaceImage(w, e.target.files[0])} />
              </label>
              <button className="text-coral" onClick={async () => { if (confirm(`Xoá "${w.text}"?`)) { await run(supabase.from('words').delete().eq('id', w.id)); reload() } }}>Xoá</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

/* ---------------- Exercises ---------------- */
function ExercisesAdmin() {
  const { data, loading, reload } = useAsync(async () => {
    const [units, lessons, words, exercises] = await Promise.all([fetchUnits(undefined, true), fetchLessons(), fetchWords(), fetchExercises({})])
    return { units, lessons, words, exercises }
  }, [])
  const [editing, setEditing] = useState<Partial<Exercise> | null>(null)
  const [configText, setConfigText] = useState('')
  const [preview, setPreview] = useState<Exercise | null>(null)
  const [filter, setFilter] = useState('')
  const [lessonNo, setLessonNo] = useState('')
  const [lessonTitle, setLessonTitle] = useState('')

  if (loading || !data) return <Loading />

  const startNew = () => {
    setEditing({ type: 'read', title: '', unit_id: data.units[0]?.id ?? null, lesson_id: null, order_index: 1 })
    setConfigText(JSON.stringify(EXERCISE_TEMPLATES.read, null, 2))
  }
  const startEdit = (e: Exercise) => { setEditing(e); setConfigText(JSON.stringify(e.config, null, 2)) }

  const save = async () => {
    if (!editing) return
    let config: unknown
    try { config = JSON.parse(configText) } catch { alert('Cấu hình JSON không hợp lệ'); return }
    const row = {
      type: editing.type, title: editing.title, unit_id: editing.unit_id ?? null,
      lesson_id: editing.lesson_id ?? null, order_index: editing.order_index ?? 0, config,
    }
    const ok = editing.id
      ? await run(supabase.from('exercises').update(row).eq('id', editing.id))
      : await run(supabase.from('exercises').insert(row))
    if (ok) { setEditing(null); reload() }
  }

  const addLesson = async (e: FormEvent) => {
    e.preventDefault()
    const n = Number(lessonNo)
    if (await run(supabase.from('lessons').insert({ number: n, title: lessonTitle, order_index: n }))) { setLessonNo(''); setLessonTitle(''); reload() }
  }

  const owner = (e: Exercise) => {
    if (e.lesson_id) { const l = data.lessons.find((x) => x.id === e.lesson_id); return l ? `Bài ${l.number}` : '' }
    const u = data.units.find((x) => x.id === e.unit_id)
    return u ? `${UNIT_KIND_LABELS[u.kind]} ${unitLabel(u)}` : ''
  }
  const list = data.exercises.filter((e) => !filter || owner(e).toLowerCase().includes(filter.toLowerCase()) || e.title.toLowerCase().includes(filter.toLowerCase()))

  if (preview) {
    const u = data.units.find((x) => x.id === preview.unit_id)
    return (
      <Card>
        <Button variant="secondary" onClick={() => setPreview(null)} className="mb-4">← Quay lại</Button>
        <ExerciseRunner preview exercise={preview} unit={u} unitWords={[]} allWords={data.words} />
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <form onSubmit={addLesson} className="flex flex-wrap items-center gap-2">
          <b>Thêm bài ôn tập SGK:</b>
          <input className={`${input} w-24`} type="number" placeholder="Số bài" value={lessonNo} onChange={(e) => setLessonNo(e.target.value)} required />
          <input className={input} placeholder="Tên bài" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} required />
          <Button type="submit" variant="secondary">Thêm bài</Button>
        </form>
      </Card>

      {editing ? (
        <Card className="flex flex-col gap-3">
          <h2 className="font-display text-2xl font-bold">{editing.id ? 'Sửa' : 'Thêm'} bài tập</h2>
          <div className="flex flex-wrap gap-2">
            <select className={input} value={editing.type} onChange={(e) => {
              const t = e.target.value as ExerciseType
              setEditing({ ...editing, type: t })
              if (!editing.id) setConfigText(JSON.stringify(EXERCISE_TEMPLATES[t], null, 2))
            }}>
              {Object.entries(EXERCISE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input className={input} placeholder="Tiêu đề" value={editing.title ?? ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            <select className={input} value={editing.lesson_id ? `l${editing.lesson_id}` : `u${editing.unit_id}`} onChange={(e) => {
              const v = e.target.value
              setEditing({ ...editing, unit_id: v[0] === 'u' ? Number(v.slice(1)) : null, lesson_id: v[0] === 'l' ? Number(v.slice(1)) : null })
            }}>
              <optgroup label="Bài ôn tập">{data.lessons.map((l) => <option key={l.id} value={`l${l.id}`}>Bài {l.number}: {l.title}</option>)}</optgroup>
              <optgroup label="Âm / Vần / Thanh">{data.units.map((u) => <option key={u.id} value={`u${u.id}`}>{UNIT_KIND_LABELS[u.kind]} {unitLabel(u)}</option>)}</optgroup>
            </select>
            <input className={`${input} w-24`} type="number" title="Thứ tự" value={editing.order_index ?? 0} onChange={(e) => setEditing({ ...editing, order_index: Number(e.target.value) })} />
          </div>
          <label className="font-bold">Cấu hình (JSON) – dấu thanh trong bài ghép: ´ ` ? ~ .</label>
          <textarea className={`${input} h-64 font-mono text-sm`} value={configText} onChange={(e) => setConfigText(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={save}>Lưu</Button>
            <Button variant="secondary" onClick={() => {
              try { setPreview({ ...(editing as Exercise), config: JSON.parse(configText) }) } catch { alert('JSON không hợp lệ') }
            }}>Xem thử</Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>Huỷ</Button>
          </div>
        </Card>
      ) : (
        <div className="flex gap-2">
          <Button onClick={startNew}>+ Bài tập mới</Button>
          <input className={input} placeholder="Lọc (vd: Vần oc, Bài 50)" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
      )}

      <Card>
        <table className="w-full text-left">
          <thead><tr className="border-b-2 border-aqua"><th className="py-2">Thuộc</th><th>Tiêu đề</th><th>Dạng</th><th /></tr></thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.id} className="border-b border-foam">
                <td className="py-2">{owner(e)}</td><td>{e.title}</td><td>{EXERCISE_LABELS[e.type]}</td>
                <td className="flex justify-end gap-2 py-2">
                  <button onClick={() => setPreview(e)}>▶️</button>
                  <button onClick={() => startEdit(e)}>✏️</button>
                  <button onClick={async () => { if (confirm('Xoá bài tập?')) { await run(supabase.from('exercises').delete().eq('id', e.id)); reload() } }}>🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p className="py-4">Không có bài tập.</p>}
        <p className="mt-2 text-sm text-ocean"><StarRating stars={3} size="text-sm" /> Học sinh được 3 sao khi đạt ≥ 90 điểm.</p>
      </Card>
    </div>
  )
}
