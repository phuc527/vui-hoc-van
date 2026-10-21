import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, usernameToEmail } from '../lib/supabase'
import type { Profile } from '../lib/types'

interface AuthCtx {
  session: Session | null
  profile: Profile | null
  loading: boolean
  signIn: (username: string, password: string) => Promise<string | null>
  signUp: (username: string, displayName: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/

function translateError(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'Sai tên đăng nhập hoặc mật khẩu.'
  if (/already registered|already exists/i.test(msg)) return 'Tên đăng nhập này đã có người dùng.'
  if (/email not confirmed/i.test(msg)) return 'Tài khoản chưa được kích hoạt. Hãy tắt "Confirm email" trong Supabase.'
  if (/at least 6/i.test(msg)) return 'Mật khẩu cần ít nhất 6 ký tự.'
  return msg
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) { setProfile(null); return }
    const { data } = await supabase.from('profiles').select('*').eq('id', s.user.id).maybeSingle()
    setProfile(data as Profile | null)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }: { data: { session: Session | null } }) => {
      setSession(data.session)
      await loadProfile(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e: unknown, s: Session | null) => {
      setSession(s)
      // tránh gọi supabase trực tiếp trong callback (deadlock của supabase-js)
      setTimeout(() => loadProfile(s), 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  const signIn = async (username: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password })
    return error ? translateError(error.message) : null
  }

  const signUp = async (username: string, displayName: string, password: string) => {
    const u = username.trim().toLowerCase()
    if (!USERNAME_RE.test(u)) return 'Tên đăng nhập chỉ gồm chữ thường không dấu, số, dấu _ (3–20 ký tự).'
    const { data, error } = await supabase.auth.signUp({
      email: usernameToEmail(u),
      password,
      options: { data: { username: u, display_name: displayName.trim() || u } },
    })
    if (error) return translateError(error.message)
    if (!data.session) return 'Đã tạo tài khoản nhưng chưa đăng nhập được. Hãy tắt "Confirm email" trong Supabase rồi đăng nhập lại.'
    return null
  }

  const signOut = async () => { await supabase.auth.signOut() }

  return (
    <Ctx.Provider value={{ session, profile, loading, signIn, signUp, signOut }}>{children}</Ctx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth must be used inside AuthProvider')
  return c
}
