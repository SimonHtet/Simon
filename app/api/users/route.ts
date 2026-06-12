import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import bcrypt from 'bcryptjs'

function strip(user: { id: string; name: string | null; email: string; role: string; hotelId: string; createdAt: Date }) {
  const { ...safe } = user
  return safe
}

export async function GET(_req: NextRequest) {
  const { hotelId, role, error } = await getSessionOrUnauthorized()
  if (error) return error
  if (!hasPermission(role!, 'VIEW_ALL_USERS')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    where: { hotelId: hotelId! },
    select: { id: true, name: true, email: true, role: true, hotelId: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const { hotelId, role, error } = await getSessionOrUnauthorized()
  if (error) return error
  if (!hasPermission(role!, 'MANAGE_USERS')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { name, email, password, userRole } = body

  if (!email?.trim() || !password?.trim() || !userRole) {
    return NextResponse.json({ error: 'email, password and role are required' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  }

  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {
      name: name?.trim() || null,
      email: email.trim().toLowerCase(),
      password: hashed,
      role: userRole,
      hotelId: hotelId!,
    },
    select: { id: true, name: true, email: true, role: true, hotelId: true, createdAt: true },
  })
  return NextResponse.json(user, { status: 201 })
}
