import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  const reservation = await prisma.reservation.findUnique({
    where: { id: params.id },
    select: { hotelId: true },
  })

  if (!reservation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (reservation.hotelId !== hotelId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { smoking, bed, pillow, floor, view, temperature, allergies, amenities, notes } = body

  const data: Record<string, string | null> = {}
  if (smoking !== undefined) data.smoking = smoking || null
  if (bed !== undefined) data.bed = bed || null
  if (pillow !== undefined) data.pillow = pillow || null
  if (floor !== undefined) data.floor = floor || null
  if (view !== undefined) data.view = view || null
  if (temperature !== undefined) data.temperature = temperature || null
  if (allergies !== undefined) data.allergies = allergies || null
  if (amenities !== undefined) data.amenities = amenities || null
  if (notes !== undefined) data.notes = notes || null

  const preferences = await prisma.preferences.upsert({
    where: { reservationId: params.id },
    update: data,
    create: { reservationId: params.id, ...data },
  })

  return NextResponse.json(preferences)
}
