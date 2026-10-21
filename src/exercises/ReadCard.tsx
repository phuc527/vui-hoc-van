import { useState } from 'react'
import { speak } from '../lib/speech'
import type { ReadConfig } from '../lib/types'
import { Button, WordImage } from '../components/ui'
import { HighlightedText, type ExerciseProps } from './common'

/** Đọc: thẻ âm/vần/thanh to + các tiếng/từ ví dụ. Bé chạm nghe hết là hoàn thành. */
export function ReadCard({ config, unit, unitWords, allWords, onFinish }: ExerciseProps<ReadConfig>) {
  const main = unit?.kind === 'thanh' ? null : unit?.value
  const examples = (config.examples ?? []).map((t) => allWords.find((w) => w.text === t) ?? { id: -1, text: t, emoji: null, image_url: null })
  const seen = new Set<string>()
  const items = [...examples, ...unitWords].filter((w) => {
    if (seen.has(w.text)) return false
    seen.add(w.text)
    return true
  })
  const [heard, setHeard] = useState<Set<string>>(new Set())
  const rhymes = unit?.kind === 'van' ? [unit.value] : []

  const hear = (t: string) => { speak(t); setHeard((s) => new Set(s).add(t)) }
  const allHeard = items.every((w) => heard.has(w.text)) && (!main || heard.has(main))

  return (
    <div className="flex flex-col items-center gap-6">
      {main && (
        <button onClick={() => hear(main)}
          className="animate-pop rounded-[2rem] border-8 border-star bg-white px-12 py-4 font-display text-8xl font-extrabold text-ocean-deep shadow-xl transition hover:scale-105 active:scale-95">
          {main}
        </button>
      )}
      {unit?.kind === 'thanh' && <p className="font-display text-4xl font-bold text-ocean-deep">{unit.title}</p>}
      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {items.map((w) => (
          <button key={w.text} onClick={() => hear(w.text)}
            className={`flex flex-col items-center gap-1 rounded-3xl border-4 bg-white p-3 shadow transition active:scale-95 ${heard.has(w.text) ? 'border-seaweed' : 'border-aqua'}`}>
            {(w.emoji || w.image_url) && <WordImage emoji={w.emoji} imageUrl={w.image_url} text={w.text} className="h-20 w-20 text-5xl" />}
            <HighlightedText text={w.text} rhymes={rhymes} className="font-display text-2xl font-bold" />
            <span className="text-sm text-ocean">{heard.has(w.text) ? '✅ đã nghe' : '🔊 chạm để nghe'}</span>
          </button>
        ))}
      </div>
      {items.length === 0 && !main && <p>Chưa có từ minh hoạ.</p>}
      <Button variant="success" disabled={!allHeard} onClick={() => onFinish(100)}>
        {allHeard ? 'Con đọc xong rồi! ✔' : 'Chạm vào tất cả để nghe nhé'}
      </Button>
    </div>
  )
}
