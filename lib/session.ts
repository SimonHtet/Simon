import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from './auth'

export async function getSessionOrUnauthorized() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return {
      session: null,
      hotelId: null,
      role: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  const hotelId = (session.user as any).hotelId ?? 'HOTEL-001'
  const role = (session.user as any).role ?? 'front_desk'
  return { session, hotelId, role, error: null }
}
