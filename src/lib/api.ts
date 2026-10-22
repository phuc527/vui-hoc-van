import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { UNIT_KIND_LABELS, type Attempt, type Exercise, type Lesson, type Unit, type UnitKind, type Word } from './types'

/** Hook nhỏ thay cho react-query: chạy fn, trả về data/error/reload */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps)
  const reload = useCallback(() => {
    setLoading(true)
    run().then((d) => { setData(d); setError(null) })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [run])
  useEffect(reload, [reload])
  return { data, error, loading, reload }
}

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message)
  return data as T
}

export const fetchUnits = async (kind?: UnitKind, includeHidden = false) => {
  let q = supabase.from('units').select('*').order('kind').order('subtype').order('order_index')
  if (kind) q = q.eq('kind', kind)
  if (!includeHidden) q = q.eq('published', true)
  return unwrap<Unit[]>(await q)
}

export const fetchUnit = async (id: number) =>
  unwrap<Unit>(await supabase.from('units').select('*').eq('id', id).single())

export const fetchWords = async () =>
  unwrap<Word[]>(await supabase.from('words').select('*').order('text'))

export const fetchUnitWords = async (unitId: number) => {
  const rows = unwrap<unknown[]>(
    await supabase.from('unit_words').select('words(*)').eq('unit_id', unitId),
  ) as { words: Word }[]
  return rows.map((r) => r.words)
}

export const fetchExercises = async (by: { unitId?: number; lessonId?: number }) => {
  let q = supabase.from('exercises').select('*').order('order_index')
  if (by.unitId) q = q.eq('unit_id', by.unitId)
  if (by.lessonId) q = q.eq('lesson_id', by.lessonId)
  return unwrap<Exercise[]>(await q)
}

export const fetchLessons = async () =>
  unwrap<Lesson[]>(await supabase.from('lessons').select('*').order('order_index'))

export const fetchLessonByNumber = async (n: number) =>
  unwrap<Lesson>(await supabase.from('lessons').select('*').eq('number', n).single())

export const fetchMyAttempts = async () =>
  unwrap<Attempt[]>(await supabase.from('attempts').select('*').order('created_at', { ascending: false }))

export const saveAttempt = async (exerciseId: number, score: number, stars: number) =>
  unwrap(await supabase.from('attempts').insert({ exercise_id: exerciseId, score, stars }))

/** Sao cao nhất của mỗi bài tập */
export function bestStars(attempts: Attempt[]): Map<number, number> {
  const m = new Map<number, number>()
  for (const a of attempts) m.set(a.exercise_id, Math.max(m.get(a.exercise_id) ?? 0, a.stars))
  return m
}

export const unitLabel = (u: Unit) => u.title ?? u.value
/** "Vần ao", "Thanh hỏi ( ˀ )" – không lặp "Thanh Thanh" khi tiêu đề đã có tên loại */
export const unitFullLabel = (u: Unit) => {
  const label = unitLabel(u), kind = UNIT_KIND_LABELS[u.kind]
  return label.startsWith(kind) ? label : `${kind} ${label}`
}

export interface RankRow { user_id: string; display_name: string; username: string; stars: number; exercises: number }

/** Bảng xếp hạng học sinh theo tổng sao (cao nhất mỗi bài); days = 7 → tuần này */
export const fetchLeaderboard = async (days: number | null) =>
  unwrap<RankRow[]>(await supabase.rpc('leaderboard', { p_days: days }))
