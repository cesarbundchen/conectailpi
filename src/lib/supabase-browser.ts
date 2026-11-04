// Client Supabase para uso em componentes 'use client' (navegador)
// Separado de supabase.ts porque aquele importa next/headers (server-only)
import { createBrowserClient } from '@supabase/ssr'

export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
