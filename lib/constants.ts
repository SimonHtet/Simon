export const ROOM_TYPES: Record<string, { name: string; rate: number }> = {
  STANDARD:   { name: 'Standard Room', rate: 1200 },
  DELUXE:     { name: 'Deluxe Garden', rate: 1800 },
  SUITE:      { name: 'Ocean Suite',   rate: 3500 },
  POOL_VILLA: { name: 'Pool Villa',    rate: 6500 },
}

export const HOTEL_NAME = 'STAYWISE RESORT & SPA'
export const LOCATION = 'Phuket, Thailand'

export const ROOM_STATUS_LABELS: Record<string, string> = {
  available: 'Available',
  occupied: 'Occupied',
  dirty: 'Dirty',
  maintenance: 'Maintenance',
  blocked: 'Blocked',
}

export const RESERVATION_STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
  cancelled: 'Cancelled',
  no_show: 'No Show',
}

export const BOOKING_SOURCES = [
  'Direct',
  'Booking.com',
  'Expedia',
  'Agoda',
  'Walk-in',
  'Corporate',
  'Travel Agent',
  'OTA',
]

export const CHARGE_CATEGORIES = [
  'ROOM',
  'F&B',
  'SPA',
  'LAUNDRY',
  'MINIBAR',
  'TRANSPORT',
  'MISC',
]

export const PAYMENT_TYPES = [
  'Cash',
  'Credit Card',
  'Debit Card',
  'Bank Transfer',
  'City Ledger',
]

export const DEPARTMENTS = [
  'FRONT OFFICE',
  'HOUSEKEEPING',
  'F&B',
  'SPA',
  'MAINTENANCE',
  'MANAGEMENT',
]

export const VIP_STATUSES = ['VIP1', 'VIP2', 'VIP3', 'VVIP', 'CIP']

export const PACKAGE_TYPES = [
  { id: 'PARKING',       label: 'Parking (Car)' },
  { id: 'BREAKFAST',     label: 'Daily Breakfast' },
  { id: 'AIRPORT',       label: 'Airport Transfer' },
  { id: 'EXTRA_BED',     label: 'Extra Bed' },
  { id: 'LATE_CHECKOUT', label: 'Late Check-out' },
  { id: 'EARLY_CHECKIN', label: 'Early Check-in' },
  { id: 'LAUNDRY',       label: 'Laundry Package' },
  { id: 'SPA',           label: 'Spa & Wellness' },
]
