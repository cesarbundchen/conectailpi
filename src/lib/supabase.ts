import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function createServerSupabase() {
  const cookieStore = cookies()
  return createServerClient(URL, ANON, {
    cookies: {
      get(name: string) { return cookieStore.get(name)?.value },
      set(name: string, value: string, o: CookieOptions) { try { cookieStore.set({ name, value, ...o }) } catch {} },
      remove(name: string, o: CookieOptions) { try { cookieStore.set({ name, value: '', ...o }) } catch {} },
    },
  })
}


export function createAdminSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada')
  return createClient(URL, key, { auth: { autoRefreshToken: false, persistSession: false } })
}
