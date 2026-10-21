import { createClient, type Session } from '@supabase/supabase-js'
import { buildSeedDB, type MockDB } from './mockData'

const url = (import.meta.env.VITE_SUPABASE_URL as string) ?? ''
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ?? ''

export const USERNAME_DOMAIN = 'bienchu.local'
export const usernameToEmail = (username: string) =>
  `${username.trim().toLowerCase()}@${USERNAME_DOMAIN}`

const isMock = !url || url.includes('placeholder') || url.includes('your-project')

const STORAGE_KEY = 'vui_hoc_mock_db_v3'
const SESSION_KEY = 'vui_hoc_mock_session_v3'

function loadDB(): MockDB {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as MockDB
  } catch { /* ignore */ }
  const seed = buildSeedDB()
  saveDB(seed)
  return seed
}

function saveDB(db: MockDB) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)) } catch { /* ignore */ }
}

function makeSession(id: string, username: string): Session {
  return {
    access_token: 'mock-token',
    refresh_token: 'mock-refresh',
    expires_in: 86400,
    token_type: 'bearer',
    user: {
      id,
      email: usernameToEmail(username),
      app_metadata: {},
      user_metadata: { username },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    },
  }
}

function createMockSupabase() {
  const listeners = new Set<(event: string, session: Session | null) => void>()

  const getCurrentSession = (): Session | null => {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (raw) return JSON.parse(raw) as Session
    } catch { /* ignore */ }
    // Tự động đăng nhập mặc định bằng tài khoản Giáo viên để có thể xem toàn bộ tính năng (kể cả /admin)
    const db = loadDB()
    const defaultUser = db.profiles[0]
    const s = makeSession(defaultUser.id, defaultUser.username)
    localStorage.setItem(SESSION_KEY, JSON.stringify(s))
    return s
  }

  const notify = (event: string, s: Session | null) => {
    listeners.forEach((cb) => cb(event, s))
  }

  const from = (table: keyof MockDB) => {
    const filters: ((row: Record<string, unknown>) => boolean)[] = []
    const orders: string[] = []
    let selectCols = '*'
    let mode: 'select' | 'insert' | 'update' | 'delete' = 'select'
    let payload: unknown = null
    let singleMode: 'none' | 'single' | 'maybeSingle' = 'none'

    const execute = async () => {
      const db = loadDB()
      const currentSession = getCurrentSession()
      const currentUserId = currentSession?.user?.id ?? 'student-1'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let rows = [...(db[table] as any[])]

      if (mode === 'insert') {
        const items = Array.isArray(payload) ? payload : [payload]
        const inserted = items.map((item) => {
          const nextId = rows.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1
          const row = {
            ...(table === 'unit_words' ? {} : { id: item.id ?? nextId }),
            ...(table === 'attempts' ? { user_id: currentUserId, created_at: new Date().toISOString() } : {}),
            ...(table === 'units' ? { published: true } : {}),
            ...item,
          }
          rows.push(row)
          return row
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(db[table] as any) = rows
        saveDB(db)
        const data = singleMode !== 'none' ? inserted[0] ?? null : inserted
        return { data, error: null }
      }

      if (mode === 'update') {
        rows = rows.map((r) => (filters.every((f) => f(r)) ? { ...r, ...(payload as object) } : r))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(db[table] as any) = rows
        saveDB(db)
        return { data: null, error: null }
      }

      if (mode === 'delete') {
        rows = rows.filter((r) => !filters.every((f) => f(r)))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(db[table] as any) = rows
        saveDB(db)
        return { data: null, error: null }
      }

      // SELECT
      let result = rows.filter((r) => filters.every((f) => f(r)))
      if (table === 'attempts') {
        const me = db.profiles.find((p) => p.id === currentUserId)
        if (me?.role !== 'teacher') {
          result = result.filter((r) => r.user_id === currentUserId)
        }
      }
      if (selectCols.includes('words(*)')) {
        result = result
          .map((r) => ({ words: db.words.find((w) => w.id === r.word_id) }))
          .filter((r) => Boolean(r.words))
      }
      for (const col of [...orders].reverse()) {
        const desc = col.startsWith('-')
        const keyName = desc ? col.slice(1) : col
        result.sort((a, b) => {
          const va = a[keyName] ?? ''
          const vb = b[keyName] ?? ''
          if (va < vb) return desc ? 1 : -1
          if (va > vb) return desc ? -1 : 1
          return 0
        })
      }
      if (singleMode === 'single') {
        if (!result[0]) return { data: null, error: { message: 'Không tìm thấy dữ liệu' } }
        return { data: result[0], error: null }
      }
      if (singleMode === 'maybeSingle') {
        return { data: result[0] ?? null, error: null }
      }
      return { data: result, error: null }
    }

    const builder = {
      select(cols = '*') { selectCols = cols; return builder },
      eq(col: string, val: unknown) { filters.push((r) => r[col] === val); return builder },
      order(col: string, opts?: { ascending?: boolean }) {
        orders.push(opts?.ascending === false ? `-${col}` : col)
        return builder
      },
      insert(values: unknown) { mode = 'insert'; payload = values; return builder },
      update(values: unknown) { mode = 'update'; payload = values; return builder },
      delete() { mode = 'delete'; return builder },
      single() { singleMode = 'single'; return builder },
      maybeSingle() { singleMode = 'maybeSingle'; return builder },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
        return execute().then(onfulfilled, onrejected)
      },
    }
    return builder
  }

  return {
    from,
    rpc: async (fnName: string, args?: { p_days?: number | null }) => {
      if (fnName === 'leaderboard') {
        const db = loadDB()
        const cutoff = args?.p_days ? Date.now() - args.p_days * 86400000 : 0
        const rows = db.profiles
          .filter((p) => p.role === 'student')
          .map((p) => {
            const mine = db.attempts.filter((a) => a.user_id === p.id && (!cutoff || new Date(a.created_at).getTime() >= cutoff))
            const best = new Map<number, number>()
            mine.forEach((a) => best.set(a.exercise_id, Math.max(best.get(a.exercise_id) ?? 0, a.stars)))
            const stars = [...best.values()].reduce((x, y) => x + y, 0)
            return { user_id: p.id, display_name: p.display_name ?? p.username, username: p.username, stars, exercises: best.size }
          })
          .filter((r) => r.exercises > 0)
          .sort((a, b) => b.stars - a.stars || b.exercises - a.exercises)
        return { data: rows, error: null }
      }
      return { data: [], error: null }
    },
    storage: {
      from: () => ({
        upload: async () => ({ data: {}, error: null }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: path } }),
      }),
    },
    auth: {
      getSession: async () => ({ data: { session: getCurrentSession() }, error: null }),
      onAuthStateChange: (cb: (event: string, session: Session | null) => void) => {
        listeners.add(cb)
        return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } }
      },
      signInWithPassword: async ({ email }: { email: string; password?: string }) => {
        const username = email.split('@')[0].trim().toLowerCase()
        const db = loadDB()
        let user = db.profiles.find((p) => p.username === username)
        if (!user) {
          user = {
            id: `user-${Date.now()}`,
            username,
            display_name: username === 'cogiao' || username === 'admin' ? 'Cô Giáo' : `Bé ${username}`,
            role: username === 'cogiao' || username === 'admin' || username === 'teacher' ? 'teacher' : 'student',
          }
          db.profiles.push(user)
          saveDB(db)
        }
        const s = makeSession(user.id, user.username)
        localStorage.setItem(SESSION_KEY, JSON.stringify(s))
        notify('SIGNED_IN', s)
        return { data: { session: s, user: s.user }, error: null }
      },
      signUp: async ({ email, options }: { email: string; password?: string; options?: { data?: { username?: string; display_name?: string } } }) => {
        const username = (options?.data?.username ?? email.split('@')[0]).trim().toLowerCase()
        const display_name = options?.data?.display_name ?? username
        const db = loadDB()
        let user = db.profiles.find((p) => p.username === username)
        if (!user) {
          user = {
            id: `user-${Date.now()}`,
            username,
            display_name,
            role: username === 'cogiao' || username === 'admin' || username === 'teacher' ? 'teacher' : 'student',
          }
          db.profiles.push(user)
          saveDB(db)
        }
        const s = makeSession(user.id, user.username)
        localStorage.setItem(SESSION_KEY, JSON.stringify(s))
        notify('SIGNED_IN', s)
        return { data: { session: s, user: s.user }, error: null }
      },
      signOut: async () => {
        localStorage.setItem(SESSION_KEY, 'null')
        notify('SIGNED_OUT', null)
        return { error: null }
      },
    },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = isMock ? createMockSupabase() : createClient(url, key)
