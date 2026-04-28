import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  console.log('[auth/callback] params:', { code: !!code, token_hash: !!token_hash, type })

  if (token_hash && type) {
    const url = new URL(`${origin}/set-password`)
    url.searchParams.set('token_hash', token_hash)
    url.searchParams.set('type', type)
    return NextResponse.redirect(url.toString())
  }

  if (code) {
    const redirectResponse = NextResponse.redirect(`${origin}/set-password`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              redirectResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    console.log('[auth/callback] exchangeCodeForSession error:', error?.message ?? 'none')

    if (!error) return redirectResponse
  }

  console.log('[auth/callback] falling through to error redirect')
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
