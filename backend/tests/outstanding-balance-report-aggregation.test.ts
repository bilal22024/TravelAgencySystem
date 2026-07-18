import { describe, expect, it } from 'vitest'
import { buildOutstandingBalanceReport } from '../src/modules/reports/application/outstanding-balance-report-aggregation.js'

describe('outstanding balance report aggregation', () => {
  it('builds agency rows, summary cards, and derived payment statuses from existing payment data', () => {
    const report = buildOutstandingBalanceReport({
      agencies: [
        {
          id: 'agency-1',
          name: 'Al Noor Travel',
          code: 'ANR',
          city: 'Dubai',
          country: 'UAE',
        },
        {
          id: 'agency-2',
          name: 'Skyline Tours',
          code: 'SKY',
          city: 'Cairo',
          country: 'Egypt',
        },
      ],
      groupStats: [
        {
          agencyId: 'agency-1',
          _count: { _all: 2 },
          _sum: { travelerCount: 30, totalAmount: 1000 },
        },
        {
          agencyId: 'agency-2',
          _count: { _all: 1 },
          _sum: { travelerCount: 10, totalAmount: 500 },
        },
      ],
      payments: [
        {
          id: 'payment-1',
          agencyId: 'agency-1',
          amount: 1000,
          currency: 'USD',
          status: 'PARTIALLY_ALLOCATED',
          paidAt: new Date('2026-06-10T00:00:00.000Z'),
          createdAt: new Date('2026-06-09T00:00:00.000Z'),
          paymentGroups: [{ allocatedAmount: 600, group: { agencyId: 'agency-1' } }],
        },
        {
          id: 'payment-2',
          agencyId: 'agency-2',
          amount: 500,
          currency: 'USD',
          status: 'ALLOCATED',
          paidAt: new Date('2026-06-08T00:00:00.000Z'),
          createdAt: new Date('2026-06-07T00:00:00.000Z'),
          paymentGroups: [{ allocatedAmount: 500, group: { agencyId: 'agency-2' } }],
        },
      ],
      filters: {
        sortBy: 'outstandingBalance',
        sortOrder: 'desc',
      },
    })

    expect(report.summary.totalOutstandingAmount).toBe(400)
    expect(report.summary.totalFullyPaidAgencies).toBe(1)
    expect(report.summary.totalPartiallyPaidAgencies).toBe(1)
    expect(report.summary.totalUnpaidAgencies).toBe(0)
    expect(report.rows[0]?.agencyName).toBe('Al Noor Travel')
    expect(report.rows[0]?.paymentStatus).toBe('PARTIALLY_PAID')
    expect(report.rows[0]?.outstandingBalance).toBe(400)
    expect(report.rows[0]?.advanceBalance).toBe(400)
    expect(report.rows[0]?.netBalance).toBe(0)
    expect(report.rows[0]?.totalGroups).toBe(2)
    expect(report.rows[0]?.totalPax).toBe(30)
    expect(report.rows[1]?.paymentStatus).toBe('FULLY_PAID')
    expect(report.rows[1]?.outstandingBalance).toBe(0)
  })

  it('keeps parent-owned advance off the receiving branch row', () => {
    const report = buildOutstandingBalanceReport({
      agencies: [
        {
          id: 'parent-1',
          name: 'Almuhajir Travel',
          code: 'ALM',
          city: 'Riyadh',
          country: 'Saudi Arabia',
        },
        {
          id: 'branch-1',
          name: 'Arab Quraishi Travel',
          code: 'AQT',
          city: 'Makkah',
          country: 'Saudi Arabia',
        },
      ],
      groupStats: [
        {
          agencyId: 'branch-1',
          _count: { _all: 1 },
          _sum: { travelerCount: 31, totalAmount: 465 },
        },
      ],
      payments: [
        {
          id: 'payment-parent',
          agencyId: 'parent-1',
          amount: 1000,
          currency: 'USD',
          status: 'PARTIALLY_ALLOCATED',
          paidAt: new Date('2026-06-10T00:00:00.000Z'),
          createdAt: new Date('2026-06-09T00:00:00.000Z'),
          paymentGroups: [{ allocatedAmount: 300, group: { agencyId: 'branch-1' } }],
        },
        {
          id: 'payment-branch',
          agencyId: 'branch-1',
          amount: 700,
          currency: 'USD',
          status: 'PARTIALLY_ALLOCATED',
          paidAt: new Date('2026-06-11T00:00:00.000Z'),
          createdAt: new Date('2026-06-10T00:00:00.000Z'),
          paymentGroups: [{ allocatedAmount: 500, group: { agencyId: 'branch-1' } }],
        },
      ],
      filters: {
        sortBy: 'agencyName',
        sortOrder: 'asc',
      },
    })

    const branchRow = report.rows.find((row) => row.agentNumber === 'AQT')
    const parentRow = report.rows.find((row) => row.agentNumber === 'ALM')

    expect(branchRow?.totalAmountPaid).toBe(1000)
    expect(branchRow?.outstandingBalance).toBe(0)
    expect(branchRow?.advanceBalance).toBe(200)
    expect(branchRow?.netBalance).toBe(-200)
    expect(parentRow?.advanceBalance).toBe(700)
  })
})
