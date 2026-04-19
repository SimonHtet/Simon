export type RoomStatus = 'available' | 'occupied' | 'dirty' | 'maintenance' | 'blocked';
export type ReservationStatus = 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';

export interface RoomType {
  name: string;
  rate: number;
  color: string;
}

export interface Room {
  id: string;
  floor: number;
  type: string;
  status: RoomStatus;
  resId: string | null;
}

export interface Charge {
  id: number;
  item: string;
  amount: number;
  date: string;
  category?: string;
}

export interface Trace {
  id: number;
  text: string;
  date: string;
  status: 'pending' | 'resolved';
  department: string;
}

export interface Package {
  active: boolean;
  licensePlate?: string;
  carModel?: string;
}

export interface Reservation {
  id: string;
  hotel_id: string;
  reservation_number: string;
  guest_id: string;
  guest: string;
  firstName?: string;
  lastName?: string;
  preferredName?: string;
  birthday?: string;
  company?: string;
  vipStatus?: string;
  passportNumber?: string;
  visaDetails?: string;
  flightNumber?: string;
  arrivalDate?: string;
  departureDate?: string;
  nationality: string;
  room: string;
  room_id: string;
  room_type_id: string;
  status: ReservationStatus;
  checkIn: string;
  checkOut: string;
  check_in_date: string;
  check_out_date: string;
  rate: number;
  rate_per_night: number;
  total_nights: number;
  total_amount: number;
  adults?: number;
  children?: number;
  booking_reference?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  charges: Charge[];
  traces?: Trace[];
  packages?: {
    [key: string]: Package;
  };
  eta?: string;
  source?: string;
  specials?: string;
  isMaster?: boolean;
  masterResId?: string;
  actual_check_in?: string;
  actual_check_out?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  move_reason?: string;
  preferences?: {
    smoking?: string;
    bed?: string;
    pillow?: string;
  };
}

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning';
}

export interface ModalState {
  type: string | null;
  data: any;
}
