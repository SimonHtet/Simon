// One-off diagnostic: dump Jiraphon's reservation, charges, folios, company credit
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const reservations = await prisma.reservation.findMany({
    where: { guestName: { contains: 'iraphon', mode: 'insensitive' } },
    include: {
      charges: { orderBy: { id: 'asc' } },
      folios: { include: { charges: { include: { charge: true } } }, orderBy: { createdAt: 'asc' } },
      company: true,
    },
  })

  for (const r of reservations) {
    console.log('=== RESERVATION ===')
    console.log({
      id: r.id, resNo: r.reservationNumber, guest: r.guestName, status: r.status,
      room: r.roomId, type: r.roomTypeId, checkIn: r.checkIn, checkOut: r.checkOut,
      rate: r.rate, totalNights: r.totalNights, totalAmount: r.totalAmount,
      actualCheckIn: r.actualCheckIn, companyId: r.companyId,
      company: r.company ? { name: r.company.name, creditLimit: r.company.creditLimit, creditUsed: r.company.creditUsed } : null,
    })
    console.log('--- CHARGES (all) ---')
    for (const c of r.charges) {
      console.log(`#${c.id} | ${c.date} | ${c.category ?? '-'} | ${c.item} | ${c.amount}`)
    }
    console.log('--- FOLIOS ---')
    for (const f of r.folios) {
      const sum = f.charges.reduce((s, fc) => s + fc.charge.amount, 0)
      console.log(`Folio #${f.id} "${f.name}" status=${f.status} pm=${f.paymentMethod} settledAt=${f.settledAt} chargesSum=${sum}`)
      for (const fc of f.charges) {
        console.log(`   charge #${fc.charge.id} | ${fc.charge.date} | ${fc.charge.category ?? '-'} | ${fc.charge.item} | ${fc.charge.amount}`)
      }
    }
    const tx = await prisma.creditTransaction.findMany({ where: { reservationId: r.id } })
    console.log('--- CREDIT TRANSACTIONS (this res) ---')
    for (const t of tx) {
      console.log(`#${t.id} | ${t.type} | ${t.status} | folio=${t.folioId} | ${t.amount} | ${t.description} | ${t.createdAt.toISOString()}`)
    }
  }

  const audits = await prisma.nightAudit.findMany({ orderBy: { businessDate: 'desc' }, take: 10 })
  console.log('--- NIGHT AUDITS (last 10) ---')
  for (const a of audits) console.log(`${a.businessDate} | posted=${a.chargesPosted} | total=${a.totalAmount} | by=${a.runBy}`)
}

main().finally(() => prisma.$disconnect())
