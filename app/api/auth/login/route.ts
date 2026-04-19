import { NextRequest, NextResponse } from 'next/server'
import { checkLoginRateLimit } from '@/lib/ratelimit'

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for') ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1'

  const { allowed, remaining } = checkLoginRateLimit(ip)

  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Try again in 15 minutes.' },
      {
        status: 429,
        headers: { 'Retry-After': '900' },
      }
    )
  }

  return NextResponse.json({ allowed: true, remaining })
}
