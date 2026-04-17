import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { RoomStatus, ReservationStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getStatusColor(status: RoomStatus): string {
  switch (status) {
    case 'available':
      return 'bg-emerald-500'
    case 'occupied':
      return 'bg-blue-500'
    case 'dirty':
      return 'bg-amber-500'
    case 'maintenance':
      return 'bg-red-500'
    case 'blocked':
      return 'bg-gray-500'
    default:
      return 'bg-gray-400'
  }
}

export function getStatusBgColor(status: RoomStatus): string {
  switch (status) {
    case 'available':
      return 'bg-emerald-50 border-emerald-200'
    case 'occupied':
      return 'bg-blue-50 border-blue-200'
    case 'dirty':
      return 'bg-amber-50 border-amber-200'
    case 'maintenance':
      return 'bg-red-50 border-red-200'
    case 'blocked':
      return 'bg-gray-50 border-gray-200'
    default:
      return 'bg-gray-50 border-gray-200'
  }
}

export function getResStatusBadge(status: ReservationStatus): string {
  switch (status) {
    case 'confirmed':
      return 'bg-sky-100 text-sky-700 border border-sky-200'
    case 'checked_in':
      return 'bg-emerald-100 text-emerald-700 border border-emerald-200'
    case 'checked_out':
      return 'bg-gray-100 text-gray-600 border border-gray-200'
    case 'cancelled':
      return 'bg-red-100 text-red-700 border border-red-200'
    case 'no_show':
      return 'bg-orange-100 text-orange-700 border border-orange-200'
    default:
      return 'bg-gray-100 text-gray-600 border border-gray-200'
  }
}

export function getResStatusLabel(status: ReservationStatus): string {
  switch (status) {
    case 'confirmed':
      return 'Confirmed'
    case 'checked_in':
      return 'Checked In'
    case 'checked_out':
      return 'Checked Out'
    case 'cancelled':
      return 'Cancelled'
    case 'no_show':
      return 'No Show'
    default:
      return status
  }
}

export function calculateNights(checkIn: string, checkOut: string): number {
  const ci = new Date(checkIn)
  const co = new Date(checkOut)
  const diff = co.getTime() - ci.getTime()
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)))
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function generateReservationNumber(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = 'RES-'
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function maskPassport(passport: string | null | undefined): string | null {
  if (!passport) return null
  if (passport.length <= 4) return '****'
  return passport.slice(0, 2) + '****' + passport.slice(-3)
}
