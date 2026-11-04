import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'

export async function POST(request: Request) {
  const sb = createServerSupabase()
  await sb.auth.signOut()
  const origin = new URL(request.url).origin
  return NextResponse.redirect(`${origin}/login`, { status: 303 })
}
