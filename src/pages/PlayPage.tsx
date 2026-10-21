import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  bestStars, fetchExercises, fetchLessonByNumber, fetchLessons, fetchMyAttempts, fetchUnit,
  fetchUnitWords, fetchWords, unitLabel, useAsync,
} from '../lib/api'
import { EXERCISE_LABELS, UNIT_KIND_LABELS, type Exercise, type Unit, type Word } from '../lib/types'
import { Card, Loading, StarRating } from '../components/ui'
import { ExerciseRunner } from '../exercises/ExerciseRunner'
import { Flashcards } from '../components/Flashcards'

function Player({ title, exercises, unit, unitWords, allWords, stars, onSaved }: {
  title: string; exercises: Exercise[]; unit?: Unit | null; unitWords: Word[]; allWords: Word[]
  stars: Map<number, number>; onSaved: () => void
}) {
  const [idx, setIdx] = useState(0)
  const ex = exercises[idx]
  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-display text-3xl font-extrabold">{title}</h1>
      <div className="flex flex-wrap gap-2">
        {exercises.map((e, i) => (
          <button key={e.id} onClick={() => { setIdx(i); onSaved() }}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2 font-bold ${i === idx ? 'bg-ocean text-white' : 'bg-white/80 text-ocean-deep'}`}>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-star text-ocean-deep">{i + 1}</span>
            {e.title}
            <StarRating stars={stars.get(e.id) ?? 0} size="text-sm" />
          </button>
        ))}
      </div>
      {ex ? (
        <Card>
          <p className="mb-2 inline-block rounded-full bg-foam px-3 py-1 text-sm font-bold text-ocean">{EXERCISE_LABELS[ex.type]}</p>
          <ExerciseRunner exercise={ex} unit={unit} unitWords={unitWords} allWords={allWords}
            onNext={idx + 1 < exercises.length ? () => { setIdx(idx + 1); onSaved() } : undefined} />
        </Card>
      ) : <p>Chưa có bài tập.</p>}
    </div>
  )
}

export function UnitPage() {
  const id = Number(useParams().id)
  const [cards, setCards] = useState(false)
  const { data, loading, error, reload } = useAsync(async () => {
    const [unit, unitWords, allWords, exercises, attempts] = await Promise.all([
      fetchUnit(id), fetchUnitWords(id), fetchWords(), fetchExercises({ unitId: id }), fetchMyAttempts(),
    ])
    return { unit, unitWords, allWords, exercises, stars: bestStars(attempts) }
  }, [id])
  if (loading && !data) return <Loading />
  if (error || !data) return <p className="text-coral">Lỗi: {error}</p>
  const { unit } = data
  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <Link to={unit.kind === 'am' && unit.subtype ? `/am?sub=${unit.subtype}` : `/${unit.kind}`} className="font-bold text-ocean-deep">← {UNIT_KIND_LABELS[unit.kind]}</Link>
        {data.unitWords.length > 0 && (
          <button onClick={() => setCards(true)} className="rounded-xl bg-white/85 px-4 py-2 font-bold text-ocean-deep shadow hover:bg-white">📽️ Trình chiếu thẻ từ</button>
        )}
      </div>
      <Player title={`${UNIT_KIND_LABELS[unit.kind]} ${unitLabel(unit)}`} {...data} onSaved={reload} />
      {cards && <Flashcards title={`${UNIT_KIND_LABELS[unit.kind]} ${unitLabel(unit)}`} words={data.unitWords} onClose={() => setCards(false)} />}
    </>
  )
}

export function LessonPage() {
  const number = Number(useParams().number)
  const { data, loading, error, reload } = useAsync(async () => {
    const lesson = await fetchLessonByNumber(number)
    const [allWords, exercises, attempts] = await Promise.all([
      fetchWords(), fetchExercises({ lessonId: lesson.id }), fetchMyAttempts(),
    ])
    return { lesson, allWords, exercises, stars: bestStars(attempts) }
  }, [number])
  if (loading && !data) return <Loading />
  if (error || !data) return <p className="text-coral">Lỗi: {error}</p>
  return (
    <>
      <Link to="/bai" className="mb-3 inline-block font-bold text-ocean-deep">← Các bài ôn tập</Link>
      <Player title={`Bài ${data.lesson.number}: ${data.lesson.title}`} unitWords={[]} {...data} onSaved={reload} />
    </>
  )
}

export function LessonsList() {
  const { data, loading, error } = useAsync(fetchLessons, [])
  if (loading) return <Loading />
  if (error) return <p className="text-coral">Lỗi: {error}</p>
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-4xl font-extrabold">Ôn tập theo bài</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {(data ?? []).map((l) => (
          <Link key={l.id} to={`/bai/${l.number}`}
            className="flex items-center gap-4 rounded-[2rem] bg-gradient-to-r from-[#9B2C8F] to-[#C04BAE] p-5 text-white shadow-xl transition hover:-translate-y-1">
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-star font-display text-3xl font-extrabold text-[#9B2C8F]">{l.number}</span>
            <span className="font-display text-2xl font-bold uppercase">{l.title}</span>
          </Link>
        ))}
      </div>
      {data?.length === 0 && <p>Chưa có bài ôn tập.</p>}
    </div>
  )
}
