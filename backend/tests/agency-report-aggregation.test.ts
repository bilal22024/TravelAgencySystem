import { describe, expect, it } from 'vitest'
import { buildAgencyReport } from '../src/modules/reports/application/agency-report-aggregation.js'

describe('agency report aggregation', () => {
  it('builds agency totals, group rows, and payment history from existing payment allocations', () => {
    const report = buildAgencyReport({
      agency: {
        id: 'agency-1',
        name: 'Atlas Travel',
        code: 'ATL',
        city: 'Dubai',
        country: 'UAE',
      },
      groups: [
        {
          id: 'group-1',
          code: 'ATL-G001',
          travelerCount: 20,
        },
        {
          id: 'group-2',
          code: 'ATL-G002',
          travelerCount: 10,
        },
      ],
      payments: [
        {
          id: 'payment-1',
          reference: 'PAY-001',
          amount: 1000,
          currency: 'USD',
          method: 'BANK_TRANSFER',
          status: 'PARTIALLY_ALLOCATED',
          paymentCity: 'Dubai',
          description: 'First collection',
          paidAt: new Date('2026-05-10T00:00:00.000Z'),
          createdAt: new Date('2026-05-09T00:00:00.000Z'),
          agency: {
            id: 'agency-1',
            name: 'Atlas Travel',
            code: 'ATL',
            city: 'Dubai',
            country: 'UAE',
          },
          receivedBy: {
            firstName: 'Nadia',
            lastName: 'Rahman',
            email: 'nadia@atlas.travel',
          },
          paymentGroups: [
            {
              allocatedAmount: 400,
              notes: 'Applied to first group',
              group: {
                id: 'group-1',
                code: 'ATL-G001',
              },
            },
          ],
        },
        {
          id: 'payment-2',
          reference: 'PAY-002',
          amount: 600,
          currency: 'USD',
          method: 'CASH',
          status: 'ALLOCATED',
          paymentCity: 'Dubai',
          description: 'Second collection',
          paidAt: new Date('2026-05-12T00:00:00.000Z'),
          createdAt: new Date('2026-05-11T00:00:00.000Z'),
          agency: {
            id: 'agency-1',
            name: 'Atlas Travel',
            code: 'ATL',
            city: 'Dubai',
            country: 'UAE',
          },
          receivedBy: null,
          paymentGroups: [
            {
              allocatedAmount: 600,
              notes: 'Applied to second group',
              group: {
                id: 'group-2',
                code: 'ATL-G002',
              },
            },
          ],
        },
      ],
      filters: {},
    })

    expect(report.agency.agentNumber).toBe('ATL')
    expect(report.businessSummary.totalGroups).toBe(2)
    expect(report.businessSummary.totalPassengers).toBe(30)
    expect(report.businessSummary.totalAmount).toBe(1000)
    expect(report.businessSummary.totalAmountPaid).toBe(1600)
    expect(report.businessSummary.remainingBalance).toBe(600)
    expect(report.businessSummary.pricePerPax).toBeCloseTo(33.33, 2)
    expect(report.calculations.totalRevenue).toBe(1600)
    expect(report.calculations.totalPaid).toBe(1000)
    expect(report.groupDetails[0]?.groupAmount).toBe(400)
    expect(report.groupDetails[1]?.paymentStatus).toBe('ALLOCATED')
    expect(report.paymentHistory[0]?.receivedBy).toBe('Unassigned')
    expect(report.paymentHistory[1]?.paymentStatus).toBe('PARTIALLY_ALLOCATED')
  })
})
