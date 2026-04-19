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
    // Floor 1 - Standard
    { id: '101', floor: 1, type: 'STANDARD', status: 'available' },
    { id: '102', floor: 1, type: 'STANDARD', status: 'occupied' },
    { id: '103', floor: 1, type: 'STANDARD', status: 'available' },
    { id: '104', floor: 1, type: 'STANDARD', status: 'dirty' },
    { id: '105', floor: 1, type: 'STANDARD', status: 'available' },
    { id: '106', floor: 1, type: 'STANDARD', status: 'maintenance' },
    // Floor 1 - Deluxe
    { id: '107', floor: 1, type: 'DELUXE', status: 'occupied' },
    { id: '108', floor: 1, type: 'DELUXE', status: 'available' },
    // Floor 2 - Standard
    { id: '201', floor: 2, type: 'STANDARD', status: 'occupied' },
    { id: '202', floor: 2, type: 'STANDARD', status: 'available' },
    { id: '203', floor: 2, type: 'STANDARD', status: 'available' },
    { id: '204', floor: 2, type: 'STANDARD', status: 'dirty' },
    { id: '205', floor: 2, type: 'STANDARD', status: 'available' },
    { id: '206', floor: 2, type: 'STANDARD', status: 'available' },
    // Floor 2 - Deluxe
    { id: '207', floor: 2, type: 'DELUXE', status: 'occupied' },
    { id: '208', floor: 2, type: 'DELUXE', status: 'available' },
    // Floor 3 - Suites
    { id: '301', floor: 3, type: 'SUITE', status: 'occupied' },
    { id: '302', floor: 3, type: 'SUITE', status: 'available' },
    { id: '303', floor: 3, type: 'SUITE', status: 'available' },
    { id: '304', floor: 3, type: 'SUITE', status: 'blocked' },
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
      company: 'Tech Corp',
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
      company: 'Global Industries',
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

  // ── Companies with contract rates ────────────────────────────────────────────
  const companyData = [
    {
      id: 'C001',
      name: 'Thai Airways International',
      contactName: 'Khun Somchai Phatthanachai',
      contactEmail: 'corporate@thaiairways.com',
      contactPhone: '+66 2 545 1000',
      rates: [
        { roomType: 'STANDARD', contractRate: 950 },
        { roomType: 'DELUXE', contractRate: 1450 },
        { roomType: 'SUITE', contractRate: 2800 },
      ],
    },
    {
      id: 'C002',
      name: 'US Embassy Bangkok',
      contactName: 'Jennifer Walsh',
      contactEmail: 'admin@usembassy.th',
      contactPhone: '+66 2 205 4000',
      rates: [
        { roomType: 'STANDARD', contractRate: 1050 },
        { roomType: 'DELUXE', contractRate: 1600 },
      ],
    },
    {
      id: 'C003',
      name: 'Discovery Travel Agency',
      contactName: 'Nattawut Siriwong',
      contactEmail: 'bookings@discoverythai.com',
      contactPhone: '+66 76 234 567',
      rates: [
        { roomType: 'STANDARD', contractRate: 980 },
        { roomType: 'DELUXE', contractRate: 1500 },
        { roomType: 'SUITE', contractRate: 2900 },
      ],
    },
    {
      id: 'C004',
      name: 'Bangkok Bank Headquarters',
      contactName: 'Wanchai Rattanakorn',
      contactEmail: 'travel@bangkokbank.com',
      contactPhone: '+66 2 231 4333',
      rates: [
        { roomType: 'STANDARD', contractRate: 1000 },
        { roomType: 'DELUXE', contractRate: 1550 },
        { roomType: 'SUITE', contractRate: 3000 },
      ],
    },
    {
      id: 'C005',
      name: 'Asia Pacific Consulting Group',
      contactName: 'Michael Chen',
      contactEmail: 'm.chen@asiapacific.co',
      contactPhone: '+65 6123 4567',
      rates: [
        { roomType: 'DELUXE', contractRate: 1480 },
        { roomType: 'SUITE', contractRate: 2750 },
      ],
    },
    {
      id: 'C006',
      name: 'Pearl of the East Tours',
      contactName: 'Supanee Kittipat',
      contactEmail: 'contracts@pearleast.com',
      contactPhone: '+66 76 345 678',
      rates: [
        { roomType: 'STANDARD', contractRate: 920 },
        { roomType: 'DELUXE', contractRate: 1420 },
      ],
    },
  ]

  for (const co of companyData) {
    const { id, rates, ...data } = co
    await prisma.company.upsert({
      where: { id },
      update: {},
      create: {
        id,
        ...data,
        hotelId: 'HOTEL-001',
        contractRates: {
          create: rates,
        },
      },
    })
  }

  // Link existing reservations to companies
  await prisma.reservation.update({
    where: { id: 'R001' },
    data: { companyId: 'C004' },
  })
  await prisma.reservation.update({
    where: { id: 'R002' },
    data: { companyId: 'C005' },
  })

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
