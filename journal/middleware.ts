import { type NextRequest } from 'next/server'
import { updateSession } from './lib/supabase/middleware'

export const runtime = 'experimental-edge'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/* (Next.js internals)
     * - favicon.ico
     * - auth/callback
     * - common static file extensions
     */
    '/((?!_next/.*|favicon.ico|auth/callback|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
