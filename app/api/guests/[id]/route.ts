import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  const guest = await prisma.guest.findFirst({
    where: { id: params.id, hotelId: hotelId! },
  })

  if (!guest) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const { preferenceNotes, specialRequests } = body

  const data: Record<string, string | null> = {}
  if (preferenceNotes !== undefined) data.preferenceNotes = preferenceNotes || null
  if (specialRequests !== undefined) data.specialRequests = specialRequests || null

  const updated = await prisma.guest.update({
    where: { id: params.id },
    data,
  })

  return NextResponse.json(updated)
}
