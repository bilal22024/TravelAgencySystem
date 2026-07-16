import { describe, expect, it } from 'vitest'
import { buildReportSummary } from '../src/modules/reports/application/report-aggregation.js'

describe('report aggregation', () => {
  it('aggregates revenue, balances, and ranking breakdowns', () => {
    const summary = buildReportSummary({
      year: 2026,
      agencies: [
        {
          id: 'agency-1',
          name: 'Atlas Travel',
          code: 'ATL',
          country: 'UAE',
          isActive: true,
        },
        {
          id: 'agency-2',
          name: 'Sky Bridge',
          code: 'SKY',
          country: 'Saudi Arabia',
          isActive: false,
        },
      ],
      payments: [
        {
          id: 'payment-1',
          reference: 'PAY-001',
          amount: 1000,
          currency: 'USD',
          status: 'PENDING',
          paidAt: new Date('2026-01-10T00:00:00.000Z'),
          createdAt: new Date('2026-01-09T00:00:00.000Z'),
          agencyId: 'agency-1',
          agency: {
            id: 'agency-1',
            name: 'Atlas Travel',
            code: 'ATL',
            country: 'UAE',
            isActive: true,
          },
          paymentGroups: [{ allocatedAmount: 400 }],
        },
        {
          id: 'payment-2',
          reference: 'PAY-002',
          amount: 500,
          currency: 'USD',
          status: 'ALLOCATED',
          paidAt: new Date('2026-02-05T00:00:00.000Z'),
          createdAt: new Date('2026-02-04T00:00:00.000Z'),
          agencyId: 'agency-2',
          agency: {
            id: 'agency-2',
            name: 'Sky Bridge',
            code: 'SKY',
            country: 'Saudi Arabia',
            isActive: false,
          },
          paymentGroups: [{ allocatedAmount: 500 }],
        },
      ],
    })

    expect(summary.totals.totalRevenue).toBe(1500)
    expect(summary.totals.outstandingBalance).toBe(600)
    expect(summary.totals.allocatedRevenue).toBe(900)
    expect(summary.totals.activeAgencyCount).toBe(1)
    expect(summary.monthlyRevenue[0]?.revenue).toBe(1000)
    expect(summary.monthlyRevenue[1]?.revenue).toBe(500)
    expect(summary.countryRevenue[0]?.country).toBe('UAE')
    expect(summary.countryRevenue[0]?.outstandingBalance).toBe(600)
    expect(summary.agencyRevenue[0]?.agencyCode).toBe('ATL')
    expect(summary.outstandingBalances).toHaveLength(1)
  })
})
