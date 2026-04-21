import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // ── Hotel ──────────────────────────────────────────────────────────────────
  await prisma.hotel.upsert({
    where: { id: 'HOTEL-001' },
    update: {},
    create: {
      id: 'HOTEL-001',
      name: 'STAYWISE RESORT & SPA',
      location: 'Phuket, Thailand',
    },
  })

  // ── Users ──────────────────────────────────────────────────────────────────
  const adminPw = await bcrypt.hash('admin1234', 10)
  const frontPw = await bcrypt.hash('front1234', 10)

  await prisma.user.upsert({
    where: { email: 'admin@staywise.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@staywise.com',
      password: adminPw,
      role: 'admin',
      hotelId: 'HOTEL-001',
    },
  })

  await prisma.user.upsert({
    where: { email: 'frontdesk@staywise.com' },
    update: {},
    create: {
      name: 'Front Desk',
      email: 'frontdesk@staywise.com',
      password: frontPw,
      role: 'front_desk',
      hotelId: 'HOTEL-001',
    },
  })

  // ── Rooms ──────────────────────────────────────────────────────────────────
  const rooms = [
    // ── Floor 1 (10 rooms) — Standard & Deluxe ────────────────────────────────
    { id: '101', floor: 1, type: 'STANDARD', status: 'available' },
    { id: '102', floor: 1, type: 'STANDARD', status: 'occupied' },
    { id: '103', floor: 1, type: 'STANDARD', status: 'available' },
    { id: '104', floor: 1, type: 'STANDARD', status: 'dirty' },
    { id: '105', floor: 1, type: 'STANDARD', status: 'available' },
    { id: '106', floor: 1, type: 'STANDARD', status: 'maintenance' },
    { id: '107', floor: 1, type: 'DELUXE',   status: 'occupied' },
    { id: '108', floor: 1, type: 'DELUXE',   status: 'available' },
    { id: '109', floor: 1, type: 'DELUXE',   status: 'available' },
    { id: '110', floor: 1, type: 'DELUXE',   status: 'dirty' },

    // ── Floor 2 (10 rooms) — Standard & Deluxe ────────────────────────────────
    { id: '201', floor: 2, type: 'STANDARD', status: 'occupied' },
    { id: '202', floor: 2, type: 'STANDARD', status: 'available' },
    { id: '203', floor: 2, type: 'STANDARD', status: 'available' },
    { id: '204', floor: 2, type: 'STANDARD', status: 'dirty' },
    { id: '205', floor: 2, type: 'STANDARD', status: 'available' },
    { id: '206', floor: 2, type: 'STANDARD', status: 'available' },
    { id: '207', floor: 2, type: 'DELUXE',   status: 'occupied' },
    { id: '208', floor: 2, type: 'DELUXE',   status: 'available' },
    { id: '209', floor: 2, type: 'DELUXE',   status: 'available' },
    { id: '210', floor: 2, type: 'DELUXE',   status: 'available' },

    // ── Floor 3 (10 rooms) — Deluxe & Suite ───────────────────────────────────
    { id: '301', floor: 3, type: 'SUITE',  status: 'occupied' },
    { id: '302', floor: 3, type: 'SUITE',  status: 'available' },
    { id: '303', floor: 3, type: 'SUITE',  status: 'available' },
    { id: '304', floor: 3, type: 'SUITE',  status: 'blocked' },
    { id: '305', floor: 3, type: 'DELUXE', status: 'available' },
    { id: '306', floor: 3, type: 'DELUXE', status: 'available' },
    { id: '307', floor: 3, type: 'DELUXE', status: 'dirty' },
    { id: '308', floor: 3, type: 'SUITE',  status: 'available' },
    { id: '309', floor: 3, type: 'SUITE',  status: 'available' },
    { id: '310', floor: 3, type: 'SUITE',  status: 'maintenance' },

    // ── Floor 4 (10 rooms) — Suite & Pool Villa ───────────────────────────────
    { id: '401', floor: 4, type: 'SUITE',      status: 'available' },
    { id: '402', floor: 4, type: 'SUITE',      status: 'available' },
    { id: '403', floor: 4, type: 'POOL_VILLA', status: 'occupied' },
    { id: '404', floor: 4, type: 'POOL_VILLA', status: 'available' },
    { id: '405', floor: 4, type: 'POOL_VILLA', status: 'available' },
    { id: '406', floor: 4, type: 'POOL_VILLA', status: 'available' },
    { id: '407', floor: 4, type: 'POOL_VILLA', status: 'dirty' },
    { id: '408', floor: 4, type: 'POOL_VILLA', status: 'available' },
    { id: '409', floor: 4, type: 'POOL_VILLA', status: 'blocked' },
    { id: '410', floor: 4, type: 'POOL_VILLA', status: 'available' },
  ]

  for (const room of rooms) {
    await prisma.room.upsert({
      where: { id: room.id },
      update: { status: room.status },
      create: { ...room, hotelId: 'HOTEL-001' },
    })
  }

  // ── Guests ─────────────────────────────────────────────────────────────────
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  const addDays = (d: Date, n: number) => {
    const r = new Date(d)
    r.setDate(r.getDate() + n)
    return r
  }

  const guestData = [
    { id: 'G001', name: 'James Anderson', firstName: 'James', lastName: 'Anderson', nationality: 'American', email: 'j.anderson@email.com', phone: '+1 555 0101', passportNumber: 'US123456', vipStatus: 'VIP1', company: 'Tech Corp' },
    { id: 'G002', name: 'Sophie Laurent', firstName: 'Sophie', lastName: 'Laurent', nationality: 'French', email: 'sophie.l@email.fr', phone: '+33 6 12 34 56 78', passportNumber: 'FR789012' },
    { id: 'G003', name: 'Hiroshi Tanaka', firstName: 'Hiroshi', lastName: 'Tanaka', nationality: 'Japanese', email: 'h.tanaka@corp.jp', phone: '+81 90 1234 5678', passportNumber: 'JA345678', vipStatus: 'VVIP', company: 'Global Industries' },
    { id: 'G004', name: 'Amara Okafor', firstName: 'Amara', lastName: 'Okafor', nationality: 'Nigerian', email: 'amara.o@gmail.com', phone: '+234 801 234 5678' },
    { id: 'G005', name: 'Elena Petrova', firstName: 'Elena', lastName: 'Petrova', nationality: 'Russian', email: 'e.petrova@mail.ru', phone: '+7 916 123 45 67', passportNumber: 'RU901234' },
    { id: 'G006', name: 'Michael Chen', firstName: 'Michael', lastName: 'Chen', nationality: 'Singaporean', email: 'm.chen@singapore.com', phone: '+65 9123 4567', passportNumber: 'SG567890', company: 'Asia Pacific Ltd' },
  ]

  for (const g of guestData) {
    await prisma.guest.upsert({
      where: { id: g.id },
      update: {},
      create: { ...g, hotelId: 'HOTEL-001' },
    })
  }

  // ── Reservations ───────────────────────────────────────────────────────────
  const reservationData = [
    // 1. Checked in (James Anderson) - Room 102
    {
      id: 'R001',
      reservationNumber: 'RES-AA1001',
      guestId: 'G001',
      guestName: 'James Anderson',
      nationality: 'American',
      roomId: '102',
      roomTypeId: 'STANDARD',
      status: 'checked_in',
      checkIn: fmt(addDays(today, -2)),
      checkOut: fmt(addDays(today, 1)),
      rate: 1200,
      totalNights: 3,
      totalAmount: 3600,
      adults: 1,
      children: 0,
      source: 'Direct',
      vipStatus: 'VIP1',
      passportNumber: 'US123456',
      isMaster: false,
      actualCheckIn: addDays(today, -2),
    },
    // 2. Checked in (Hiroshi Tanaka) - Room 301 Suite
    {
      id: 'R002',
      reservationNumber: 'RES-BB2002',
      guestId: 'G003',
      guestName: 'Hiroshi Tanaka',
      nationality: 'Japanese',
      roomId: '301',
      roomTypeId: 'SUITE',
      status: 'checked_in',
      checkIn: fmt(addDays(today, -1)),
      checkOut: fmt(addDays(today, 3)),
      rate: 3500,
      totalNights: 4,
      totalAmount: 14000,
      adults: 2,
      children: 0,
      source: 'Corporate',
      vipStatus: 'VVIP',
      passportNumber: 'JA345678',
      specials: 'Ocean view room, champagne on arrival',
      isMaster: false,
      actualCheckIn: addDays(today, -1),
    },
    // 3. Checked in (Sophie Laurent) - Room 107 Deluxe
    {
      id: 'R003',
      reservationNumber: 'RES-CC3003',
      guestId: 'G002',
      guestName: 'Sophie Laurent',
      nationality: 'French',
      roomId: '107',
      roomTypeId: 'DELUXE',
      status: 'checked_in',
      checkIn: fmt(today),
      checkOut: fmt(addDays(today, 5)),
      rate: 1800,
      totalNights: 5,
      totalAmount: 9000,
      adults: 2,
      children: 1,
      source: 'Booking.com',
      isMaster: false,
      actualCheckIn: today,
    },
    // 4. Confirmed (arriving today) - Michael Chen - Room 207
    {
      id: 'R004',
      reservationNumber: 'RES-DD4004',
      guestId: 'G006',
      guestName: 'Michael Chen',
      nationality: 'Singaporean',
      roomId: '207',
      roomTypeId: 'DELUXE',
      status: 'confirmed',
      checkIn: fmt(today),
      checkOut: fmt(addDays(today, 3)),
      rate: 1800,
      totalNights: 3,
      totalAmount: 5400,
      adults: 1,
      children: 0,
      source: 'Agoda',
      bookingReference: 'AGD-987654',
      eta: '14:00',
      flightNumber: 'SQ981',
      isMaster: false,
    },
    // 5. Confirmed (arriving tomorrow) - Elena Petrova - Room 201
    {
      id: 'R005',
      reservationNumber: 'RES-EE5005',
      guestId: 'G005',
      guestName: 'Elena Petrova',
      nationality: 'Russian',
      roomId: '201',
      roomTypeId: 'STANDARD',
      status: 'confirmed',
      checkIn: fmt(addDays(today, 1)),
      checkOut: fmt(addDays(today, 4)),
      rate: 1200,
      totalNights: 3,
      totalAmount: 3600,
      adults: 1,
      children: 0,
      source: 'Expedia',
      isMaster: false,
    },
    // 6. Confirmed (future) - Amara Okafor - Room 203
    {
      id: 'R006',
      reservationNumber: 'RES-FF6006',
      guestId: 'G004',
      guestName: 'Amara Okafor',
      nationality: 'Nigerian',
      roomId: '203',
      roomTypeId: 'STANDARD',
      status: 'confirmed',
      checkIn: fmt(addDays(today, 5)),
      checkOut: fmt(addDays(today, 8)),
      rate: 1200,
      totalNights: 3,
      totalAmount: 3600,
      adults: 2,
      children: 2,
      source: 'Direct',
      specials: 'Extra bed required',
      isMaster: false,
    },
    // 7. Checked out (past) - James Anderson previous stay
    {
      id: 'R007',
      reservationNumber: 'RES-GG7007',
      guestId: 'G001',
      guestName: 'James Anderson',
      nationality: 'American',
      roomId: '104',
      roomTypeId: 'STANDARD',
      status: 'checked_out',
      checkIn: fmt(addDays(today, -10)),
      checkOut: fmt(addDays(today, -7)),
      rate: 1200,
      totalNights: 3,
      totalAmount: 3600,
      adults: 1,
      children: 0,
      source: 'Direct',
      isMaster: false,
      actualCheckIn: addDays(today, -10),
      actualCheckOut: addDays(today, -7),
    },
    // 8. Cancelled
    {
      id: 'R008',
      reservationNumber: 'RES-HH8008',
      guestId: 'G002',
      guestName: 'Sophie Laurent',
      nationality: 'French',
      roomId: '205',
      roomTypeId: 'STANDARD',
      status: 'cancelled',
      checkIn: fmt(addDays(today, -5)),
      checkOut: fmt(addDays(today, -3)),
      rate: 1200,
      totalNights: 2,
      totalAmount: 2400,
      adults: 1,
      children: 0,
      source: 'Booking.com',
      isMaster: false,
      cancelledAt: addDays(today, -6),
      cancellationReason: 'Change of travel plans',
    },
  ]

  for (const res of reservationData) {
    const { id, ...data } = res
    await prisma.reservation.upsert({
      where: { id },
      update: {},
      create: { id, ...data, hotelId: 'HOTEL-001' },
    })
  }

  // ── Companies ──────────────────────────────────────────────────────────────
  const bangkokAgency = await prisma.company.upsert({
    where: { id: 'CO001' },
    update: {},
    create: {
      id: 'CO001',
      hotelId: 'HOTEL-001',
      name: 'Bangkok Travel Agency',
      type: 'AGENT',
      contactName: 'Somchai Wongthong',
      contactEmail: 'somchai@bkktravelagency.th',
      contactPhone: '+66 2 456 7890',
      contractRates: { STANDARD: 15, DELUXE: 15, SUITE: 10, POOL_VILLA: 10 },
      active: true,
    },
  })

  await prisma.company.upsert({
    where: { id: 'CO002' },
    update: {},
    create: {
      id: 'CO002',
      hotelId: 'HOTEL-001',
      name: 'Siam Corporate Group',
      type: 'COMPANY',
      contactName: 'Narinee Charoenpong',
      contactEmail: 'narinee@siamcorporate.th',
      contactPhone: '+66 2 789 0123',
      contractRates: { STANDARD: 20, DELUXE: 18, SUITE: 12, POOL_VILLA: 8 },
      blackoutStart: '2025-12-20',
      blackoutEnd: '2026-01-05',
      active: true,
    },
  })

  // Link R004 to Bangkok Travel Agency
  await prisma.reservation.update({
    where: { id: 'R004' },
    data: { companyId: bangkokAgency.id },
  })

  // Update room resId for occupied rooms
  const occupiedRooms: Record<string, string> = {
    '102': 'R001',
    '107': 'R003',
    '201': 'R005',
    '207': 'R004',
    '301': 'R002',
  }

  for (const [roomId, resId] of Object.entries(occupiedRooms)) {
    await prisma.room.update({
      where: { id: roomId },
      data: { resId },
    })
  }

  // ── Charges ────────────────────────────────────────────────────────────────
  // Delete before recreating so re-runs don't duplicate rows
  await prisma.charge.deleteMany({ where: { reservationId: 'R001' } })
  await prisma.charge.deleteMany({ where: { reservationId: 'R002' } })

  // ── Charges for R001 (James Anderson) ──────────────────────────────────────
  const r001Charges = [
    { reservationId: 'R001', item: 'Room Charge (1N)', amount: 1200, date: fmt(addDays(today, -2)), category: 'ROOM' },
    { reservationId: 'R001', item: 'Room Charge (2N)', amount: 1200, date: fmt(addDays(today, -1)), category: 'ROOM' },
    { reservationId: 'R001', item: 'Mini Bar', amount: 450, date: fmt(addDays(today, -1)), category: 'MINIBAR' },
    { reservationId: 'R001', item: 'Breakfast x2', amount: 600, date: fmt(today), category: 'F&B' },
  ]
  for (const charge of r001Charges) {
    await prisma.charge.create({ data: charge })
  }

  // ── Charges for R002 (Hiroshi Tanaka - VVIP) ───────────────────────────────
  const r002Charges = [
    { reservationId: 'R002', item: 'Suite Charge (1N)', amount: 3500, date: fmt(addDays(today, -1)), category: 'ROOM' },
    { reservationId: 'R002', item: 'Spa Treatment', amount: 4500, date: fmt(today), category: 'SPA' },
    { reservationId: 'R002', item: 'Welcome Champagne', amount: 1200, date: fmt(addDays(today, -1)), category: 'F&B' },
    { reservationId: 'R002', item: 'Payment — Credit Card', amount: -5000, date: fmt(today), category: 'PAYMENT' },
  ]
  for (const charge of r002Charges) {
    await prisma.charge.create({ data: charge })
  }

  await prisma.trace.deleteMany({ where: { reservationId: { in: ['R001', 'R002', 'R004'] } } })
  await prisma.package.deleteMany({ where: { reservationId: { in: ['R001', 'R002'] } } })

  // ── Traces for R002 (Hiroshi Tanaka) ──────────────────────────────────────
  const r002Traces = [
    { reservationId: 'R002', text: 'Guest requested extra pillows and blankets', date: fmt(addDays(today, -1)), status: 'resolved', department: 'HOUSEKEEPING' },
    { reservationId: 'R002', text: 'VIP amenities setup: fruit basket, champagne, flowers', date: fmt(today), status: 'resolved', department: 'FRONT OFFICE' },
    { reservationId: 'R002', text: 'Arrange airport transfer on checkout day', date: fmt(addDays(today, 3)), status: 'pending', department: 'FRONT OFFICE' },
  ]
  for (const trace of r002Traces) {
    await prisma.trace.create({ data: trace })
  }

  // ── Traces for R001 (James Anderson) ─────────────────────────────────────
  await prisma.trace.create({
    data: {
      reservationId: 'R001',
      text: 'Check room AC - guest reported not cold enough',
      date: fmt(addDays(today, -1)),
      status: 'pending',
      department: 'MAINTENANCE',
    },
  })

  // ── Traces for R004 (Michael Chen - arriving today) ───────────────────────
  await prisma.trace.create({
    data: {
      reservationId: 'R004',
      text: 'Late check-out requested for tomorrow - confirm with management',
      date: fmt(today),
      status: 'pending',
      department: 'FRONT OFFICE',
    },
  })

  // ── Packages for R002 ─────────────────────────────────────────────────────
  await prisma.package.create({
    data: {
      reservationId: 'R002',
      pkgId: 'AIRPORT',
      active: true,
    },
  })
  await prisma.package.create({
    data: {
      reservationId: 'R002',
      pkgId: 'SPA',
      active: true,
    },
  })

  // ── Package for R001 ──────────────────────────────────────────────────────
  await prisma.package.create({
    data: {
      reservationId: 'R001',
      pkgId: 'PARKING',
      active: true,
      licensePlate: 'CA-ABC123',
      carModel: 'Toyota Camry',
    },
  })

  // ── Additional Companies & Agents ─────────────────────────────────────────
  const additionalCompanies = [
    {
      id: 'CO003',
      name: 'Siam Business Group',
      type: 'COMPANY' as const,
      contactName: 'Wichai Boonmee',
      contactEmail: 'wichai@siambusiness.th',
      contactPhone: '+66 2 234 5678',
      contractRates: { STANDARD: 18, DELUXE: 16, SUITE: 12, POOL_VILLA: 8 },
      active: true,
    },
    {
      id: 'CO004',
      name: 'Bangkok Hospital Group',
      type: 'COMPANY' as const,
      contactName: 'Dr. Panida Srisuk',
      contactEmail: 'panida@bangkokhospital.th',
      contactPhone: '+66 2 345 6789',
      contractRates: { STANDARD: 15, DELUXE: 12, SUITE: 10, POOL_VILLA: 8 },
      active: true,
    },
    {
      id: 'CO005',
      name: 'PTT Public Company',
      type: 'COMPANY' as const,
      contactName: 'Krit Tangcharoen',
      contactEmail: 'krit.t@ptt.th',
      contactPhone: '+66 2 537 2000',
      contractRates: { STANDARD: 20, DELUXE: 18, SUITE: 15, POOL_VILLA: 10 },
      active: true,
    },
    {
      id: 'CO006',
      name: 'Central Group',
      type: 'COMPANY' as const,
      contactName: 'Supaporn Chirathivat',
      contactEmail: 'supaporn@centralgroup.th',
      contactPhone: '+66 2 101 1111',
      contractRates: { STANDARD: 22, DELUXE: 20, SUITE: 15, POOL_VILLA: 12 },
      active: true,
    },
    {
      id: 'CO007',
      name: 'Minor Hotels Corporate',
      type: 'COMPANY' as const,
      contactName: 'James Davidson',
      contactEmail: 'jdavidson@minorhotels.com',
      contactPhone: '+66 2 365 6000',
      contractRates: { STANDARD: 25, DELUXE: 22, SUITE: 18, POOL_VILLA: 15 },
      active: true,
    },
    {
      id: 'CO008',
      name: 'Asia Pacific Tours',
      type: 'AGENT' as const,
      contactName: 'Linh Nguyen',
      contactEmail: 'linh@asiapacifictours.com',
      contactPhone: '+66 2 456 7891',
      contractRates: { STANDARD: 12, DELUXE: 12, SUITE: 8, POOL_VILLA: 8 },
      active: true,
    },
    {
      id: 'CO009',
      name: 'Japan Travel Bureau',
      type: 'AGENT' as const,
      contactName: 'Kenji Yamamoto',
      contactEmail: 'k.yamamoto@jtb.co.jp',
      contactPhone: '+81 3 3276 7777',
      contractRates: { STANDARD: 15, DELUXE: 12, SUITE: 10, POOL_VILLA: 8 },
      active: true,
    },
    {
      id: 'CO010',
      name: 'Kuoni Travel Thailand',
      type: 'AGENT' as const,
      contactName: 'Sarah Mitchell',
      contactEmail: 's.mitchell@kuoni.th',
      contactPhone: '+66 2 632 0800',
      contractRates: { STANDARD: 18, DELUXE: 15, SUITE: 12, POOL_VILLA: 10 },
      active: true,
    },
    {
      id: 'CO011',
      name: 'TUI Thailand',
      type: 'AGENT' as const,
      contactName: 'Hans Müller',
      contactEmail: 'h.muller@tui.th',
      contactPhone: '+66 2 636 9000',
      contractRates: { STANDARD: 20, DELUXE: 18, SUITE: 12, POOL_VILLA: 10 },
      active: true,
    },
    {
      id: 'CO012',
      name: 'Thomas Cook Asia',
      type: 'AGENT' as const,
      contactName: 'Priya Sharma',
      contactEmail: 'p.sharma@thomascook.asia',
      contactPhone: '+66 2 252 4050',
      contractRates: { STANDARD: 15, DELUXE: 14, SUITE: 10, POOL_VILLA: 8 },
      active: true,
    },
  ]

  for (const co of additionalCompanies) {
    await prisma.company.upsert({
      where: { id: co.id },
      update: {},
      create: { ...co, hotelId: 'HOTEL-001' },
    })
  }

  // ── Charge Codes ──────────────────────────────────────────────────────────
  const chargeCodes = [
    // F&B (1xx)
    { code: '101', category: 'F&B', description: 'Breakfast', price: 350 },
    { code: '102', category: 'F&B', description: 'Lunch', price: 450 },
    { code: '103', category: 'F&B', description: 'Dinner', price: 650 },
    { code: '104', category: 'F&B', description: 'Room Service', price: 500 },
    { code: '105', category: 'F&B', description: 'Beverages', price: 200 },
    // Housekeeping (3xx)
    { code: '301', category: 'Housekeeping', description: 'Laundry Service', price: 300 },
    { code: '302', category: 'Housekeeping', description: 'Dry Cleaning', price: 500 },
    { code: '303', category: 'Housekeeping', description: 'Extra Towels', price: 150 },
    { code: '304', category: 'Housekeeping', description: 'Turndown Service', price: 200 },
    { code: '305', category: 'Housekeeping', description: 'Extra Amenities', price: 100 },
    // Spa (5xx)
    { code: '501', category: 'Spa', description: 'Thai Massage (60 min)', price: 1200 },
    { code: '502', category: 'Spa', description: 'Swedish Massage (90 min)', price: 1800 },
    { code: '503', category: 'Spa', description: 'Facial Treatment', price: 1500 },
    { code: '504', category: 'Spa', description: 'Aromatherapy', price: 2000 },
    { code: '505', category: 'Spa', description: 'Body Scrub', price: 1600 },
    // Transport (6xx)
    { code: '601', category: 'Transport', description: 'Airport Transfer (1-way)', price: 800 },
    { code: '602', category: 'Transport', description: 'Airport Transfer (return)', price: 1500 },
    { code: '603', category: 'Transport', description: 'Taxi Booking', price: 300 },
    { code: '604', category: 'Transport', description: 'Car Rental (per day)', price: 1200 },
    // Minibar (7xx)
    { code: '701', category: 'Minibar', description: 'Minibar Consumption', price: 450 },
    { code: '702', category: 'Minibar', description: 'Premium Spirits', price: 800 },
    { code: '703', category: 'Minibar', description: 'Soft Drinks & Snacks', price: 250 },
    // Misc (9xx)
    { code: '901', category: 'Misc', description: 'Parking (per day)', price: 200 },
    { code: '902', category: 'Misc', description: 'Business Center', price: 150 },
  ]

  for (const cc of chargeCodes) {
    await prisma.chargeCode.upsert({
      where: { code: cc.code },
      update: {},
      create: { ...cc, active: true, hotelId: 'HOTEL-001' },
    })
  }

  console.log('✅ Database seeded successfully!')
  console.log('   Admin: admin@staywise.com / admin1234')
  console.log('   Staff: frontdesk@staywise.com / front1234')
  console.log(`   Rooms: ${rooms.length}`)
  console.log(`   Reservations: ${reservationData.length}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
