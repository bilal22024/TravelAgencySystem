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
          _sum: { travelerCount: 30 },
        },
        {
          agencyId: 'agency-2',
          _count: { _all: 1 },
          _sum: { travelerCount: 10 },
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
          paymentGroups: [{ allocatedAmount: 600 }],
        },
        {
          id: 'payment-2',
          agencyId: 'agency-2',
          amount: 500,
          currency: 'USD',
          status: 'ALLOCATED',
          paidAt: new Date('2026-06-08T00:00:00.000Z'),
          createdAt: new Date('2026-06-07T00:00:00.000Z'),
          paymentGroups: [{ allocatedAmount: 500 }],
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
    expect(report.rows[0]?.totalGroups).toBe(2)
    expect(report.rows[0]?.totalPax).toBe(30)
    expect(report.rows[1]?.paymentStatus).toBe('FULLY_PAID')
    expect(report.rows[1]?.outstandingBalance).toBe(0)
  })
})
