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
          totalAmount: 400,
          agency: {
            id: 'agency-1',
            name: 'Atlas Travel',
            code: 'ATL',
          },
        },
        {
          id: 'group-2',
          code: 'ATL-G002',
          travelerCount: 10,
          totalAmount: 600,
          agency: {
            id: 'agency-1',
            name: 'Atlas Travel',
            code: 'ATL',
          },
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
                agency: {
                  id: 'agency-1',
                  name: 'Atlas Travel',
                  code: 'ATL',
                },
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
                agency: {
                  id: 'agency-1',
                  name: 'Atlas Travel',
                  code: 'ATL',
                },
              },
            },
          ],
        },
      ],
      filters: {
        includeBranches: false,
        scopeAgencyIds: ['agency-1'],
        branches: [],
      },
    })

    expect(report.agency.agentNumber).toBe('ATL')
    expect(report.businessSummary.totalGroups).toBe(2)
    expect(report.businessSummary.totalPassengers).toBe(30)
    expect(report.businessSummary.totalAmount).toBe(1000)
    expect(report.businessSummary.totalAmountPaid).toBe(1600)
    expect(report.businessSummary.remainingBalance).toBe(0)
    expect(report.businessSummary.advanceBalance).toBe(600)
    expect(report.businessSummary.netBalance).toBe(-600)
    expect(report.businessSummary.pricePerPax).toBeCloseTo(33.33, 2)
    expect(report.calculations.totalRevenue).toBe(1000)
    expect(report.calculations.totalPaid).toBe(1000)
    expect(report.groupDetails[0]?.groupAmount).toBe(400)
    expect(report.groupDetails[1]?.paymentStatus).toBe('ALLOCATED')
    expect(report.paymentHistory[0]?.receivedBy).toBe('Unassigned')
    expect(report.paymentHistory[1]?.paymentStatus).toBe('PARTIALLY_ALLOCATED')
    expect(report.paymentHistory[1]?.advanceBalance).toBe(600)
    expect(report.filters.includeBranches).toBe(false)
  })

  it('builds a consolidated parent report with branch group details and scope metadata', () => {
    const report = buildAgencyReport({
      agency: {
        id: 'parent-1',
        name: 'Fida Noor Travel',
        code: 'FNT',
        city: 'Jeddah',
        country: 'Saudi Arabia',
      },
      groups: [
        {
          id: 'group-parent',
          code: 'FNT-G001',
          travelerCount: 8,
          totalAmount: 800,
          agency: {
            id: 'parent-1',
            name: 'Fida Noor Travel',
            code: 'FNT',
          },
        },
        {
          id: 'group-branch',
          code: 'ANS-G001',
          travelerCount: 12,
          totalAmount: 1200,
          agency: {
            id: 'branch-1',
            name: 'Alansar Travel',
            code: 'ANS',
          },
        },
      ],
      payments: [
        {
          id: 'payment-parent',
          reference: 'PAY-100',
          amount: 1500,
          currency: 'USD',
          method: 'BANK_TRANSFER',
          status: 'PARTIALLY_ALLOCATED',
          paymentCity: 'Jeddah',
          description: 'Parent consolidated payment',
          paidAt: new Date('2026-06-10T00:00:00.000Z'),
          createdAt: new Date('2026-06-09T00:00:00.000Z'),
          agency: {
            id: 'parent-1',
            name: 'Fida Noor Travel',
            code: 'FNT',
            city: 'Jeddah',
            country: 'Saudi Arabia',
          },
          receivedBy: null,
          paymentGroups: [
            {
              allocatedAmount: 500,
              notes: 'Parent portion',
              group: {
                id: 'group-parent',
                code: 'FNT-G001',
                agency: {
                  id: 'parent-1',
                  name: 'Fida Noor Travel',
                  code: 'FNT',
                },
              },
            },
            {
              allocatedAmount: 700,
              notes: 'Branch portion',
              group: {
                id: 'group-branch',
                code: 'ANS-G001',
                agency: {
                  id: 'branch-1',
                  name: 'Alansar Travel',
                  code: 'ANS',
                },
              },
            },
          ],
        },
      ],
      filters: {
        includeBranches: true,
        scopeAgencyIds: ['parent-1', 'branch-1'],
        branches: [
          {
            id: 'branch-1',
            name: 'Alansar Travel',
            code: 'ANS',
            city: 'Makkah',
            country: 'Saudi Arabia',
          },
        ],
      },
    })

    expect(report.filters.includeBranches).toBe(true)
    expect(report.agency.reportScope).toBe('CONSOLIDATED')
    expect(report.agency.branches).toHaveLength(1)
    expect(report.businessSummary.totalGroups).toBe(2)
    expect(report.businessSummary.totalAmount).toBe(2000)
    expect(report.businessSummary.totalAmountPaid).toBe(1500)
    expect(report.businessSummary.advanceBalance).toBe(300)
    expect(
      report.groupDetails.find((group) => group.groupNumber === 'ANS-G001')?.agencyCode,
    ).toBe('ANS')
    expect(
      report.paymentHistory[0]?.paymentGroups.find((group) => group.groupNumber === 'ANS-G001')
        ?.agencyCode,
    ).toBe('ANS')
  })
})
