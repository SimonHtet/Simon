import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import bcrypt from 'bcryptjs'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, role, session, error } = await getSessionOrUnauthorized()
  if (error) return error
  if (!hasPermission(role!, 'MANAGE_USERS')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const target = await prisma.user.findUnique({ where: { id: params.id } })
  if (!target || target.hotelId !== hotelId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const { name, userRole, password } = body

  const data: Record<string, unknown> = {}
  if (name !== undefined) data.name = name?.trim() || null
  if (userRole !== undefined) {
    // Prevent removing the last admin
    if (target.role === 'admin' && userRole !== 'admin') {
      const adminCount = await prisma.user.count({ where: { hotelId: hotelId!, role: 'admin' } })
      if (adminCount <= 1) {
        return NextResponse.json({ error: 'Cannot demote the last admin' }, { status: 400 })
      }
    }
    data.role = userRole
  }
  if (password?.trim()) {
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }
    data.password = await bcrypt.hash(password, 10)
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data,
    select: { id: true, name: true, email: true, role: true, hotelId: true, createdAt: true },
  })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, role, session, error } = await getSessionOrUnauthorized()
  if (error) return error
  if (!hasPermission(role!, 'MANAGE_USERS')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const currentUserId = (session!.user as any).id
  if (params.id === currentUserId) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  const target = await prisma.user.findUnique({ where: { id: params.id } })
  if (!target || target.hotelId !== hotelId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (target.role === 'admin') {
    const adminCount = await prisma.user.count({ where: { hotelId: hotelId!, role: 'admin' } })
    if (adminCount <= 1) {
      return NextResponse.json({ error: 'Cannot delete the last admin' }, { status: 400 })
    }
  }

  await prisma.user.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
