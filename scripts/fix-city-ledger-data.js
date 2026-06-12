// One-time data cleanup (safe to re-run — both steps are idempotent):
//
// 1. Backfill the missing CreditTransaction for city-ledger payments that were
//    posted before the fix that records them (ce4cf81). Currently known case:
//    RES-755JY6's first ฿5,200 "Payment — City Ledger".
// 2. Reconcile Company.creditUsed = sum of unpaid positive transactions, for
//    every company. creditUsed drifted while the increment fixes were landing.
//
// Run: node scripts/fix-city-ledger-data.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // ── 1. Backfill missing payment transactions ────────────────────────────────
  // Find city-ledger payment charges on company reservations, then check that a
  // matching positive transaction exists for the same reservation and amount.
  const clPayments = await prisma.charge.findMany({
    where: {
      category: 'PAYMENT',
      item: { startsWith: 'Payment — City Ledger' },
      amount: { lt: 0 },
      reservation: { companyId: { not: null } },
    },
    include: { reservation: { select: { id: true, reservationNumber: true, companyId: true, hotelId: true } } },
  })

  // Group payment charges by reservation + amount, compare counts with existing
  // transactions of the same amount, and create only the shortfall — re-running
  // the script never duplicates.
  const groups = new Map()
  for (const pay of clPayments) {
    const key = `${pay.reservation.id}|${Math.abs(pay.amount)}`
    if (!groups.has(key)) groups.set(key, { pay, count: 0 })
    groups.get(key).count++
  }

  for (const { pay, count } of groups.values()) {
    const amt = Math.abs(pay.amount)
    const existing = await prisma.creditTransaction.count({
      where: {
        reservationId: pay.reservation.id,
        folioId: null, // folio-linked postings are settlements, not payments
        amount: amt,
        type: 'city_ledger',
      },
    })
    for (let i = 0; i < count - existing; i++) {
      const tx = await prisma.creditTransaction.create({
        data: {
          companyId: pay.reservation.companyId,
          hotelId: pay.reservation.hotelId,
          reservationId: pay.reservation.id,
          amount: amt,
          description: `Post Payment — Res ${pay.reservation.id} (backfill)`,
          type: 'city_ledger',
          status: 'unpaid',
        },
      })
      console.log(`BACKFILLED tx #${tx.id}: ฿${amt} for ${pay.reservation.reservationNumber}`)
    }
  }

  // ── 2. Reconcile creditUsed for every company ──────────────────────────────
  const companies = await prisma.company.findMany({
    include: { creditTransactions: { where: { status: 'unpaid', amount: { gt: 0 } } } },
  })

  for (const c of companies) {
    const unpaidSum = c.creditTransactions.reduce((s, t) => s + t.amount, 0)
    if (Math.abs(unpaidSum - c.creditUsed) > 0.01) {
      await prisma.company.update({ where: { id: c.id }, data: { creditUsed: unpaidSum } })
      console.log(`RECONCILED ${c.name}: creditUsed ${c.creditUsed} -> ${unpaidSum}`)
    } else {
      console.log(`OK ${c.name}: creditUsed ${c.creditUsed}`)
    }
  }
}

main().finally(() => prisma.$disconnect())
