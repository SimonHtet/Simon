export interface RoomType {
  id: string
  name: string
  rate: number
}

export type RoomStatus = 'available' | 'occupied' | 'dirty' | 'maintenance' | 'blocked'

export interface Room {
  id: string
  floor: number
  type: string
  status: RoomStatus
  resId?: string | null
  hotelId?: string
}

export interface Guest {
  id: string
  name: string
  firstName?: string | null
  lastName?: string | null
  preferredName?: string | null
  birthday?: string | null
  nationality?: string | null
  email?: string | null
  phone?: string | null
  passportNumber?: string | null
  passportExpiry?: string | null
  language?: string | null
  memberNumber?: string | null
  vipStatus?: string | null
  company?: string | null
  city?: string | null
  country?: string | null
  hotelId?: string
}

export interface Charge {
  id: number
  reservationId?: string
  item: string
  amount: number
  date: string
  category?: string | null
}

export type TraceStatus = 'pending' | 'resolved'

export interface Trace {
  id: number
  reservationId?: string
  text: string
  date: string
  status: TraceStatus
  department: string
}

export interface Package {
  id: number
  reservationId?: string
  pkgId: string
  active: boolean
  licensePlate?: string | null
  carModel?: string | null
}

export type ReservationStatus =
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled'
  | 'no_show'

export interface Preferences {
  id?: number
  reservationId?: string
  smoking?: string | null
  bed?: string | null
  pillow?: string | null
}

export interface Reservation {
  id: string
  reservationNumber: string
  hotelId?: string
  guestId: string
  guest?: Guest
  guestName: string
  nationality?: string | null
  roomId: string
  room?: Room
  roomTypeId: string
  status: ReservationStatus
  checkIn: string
  checkOut: string
  rate: number
  totalNights: number
  totalAmount: number
  adults: number
  children: number
  source?: string | null
  bookingReference?: string | null
  vipStatus?: string | null
  passportNumber?: string | null
  passportExpiry?: string | null
  company?: string | null
  specials?: string | null
  eta?: string | null
  flightNumber?: string | null
  visaDetails?: string | null
  preferredName?: string | null
  birthday?: string | null
  language?: string | null
  memberNumber?: string | null
  city?: string | null
  country?: string | null
  createdBy?: string | null
  notes?: string | null
  turndown: boolean
  dnm: boolean
  actualCheckIn?: string | Date | null
  actualCheckOut?: string | Date | null
  cancelledAt?: string | Date | null
  cancellationReason?: string | null
  moveReason?: string | null
  isMaster: boolean
  masterResId?: string | null
  charges: Charge[]
  traces: Trace[]
  packages: Package[]
  preferences?: Preferences | null
  createdAt?: string | Date
  updatedAt?: string | Date
}

export interface DashboardStats {
  todayArrivals: number
  todayDepartures: number
  inHouse: number
  availableRooms: number
  totalRooms: number
  occupancyRate: number
  pendingTraces: number
}
