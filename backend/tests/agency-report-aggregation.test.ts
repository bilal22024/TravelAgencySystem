import { describe, expect, it } from 'vitest'
import { buildAgencyReport } from '../src/modules/reports/application/agency-report-aggregation.js'

describe('agency report aggregation', () => {
  it('builds single-agency totals using direct payments, external allocations, and payer-owned advance separately', () => {
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
                agencyId: 'agency-1',
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
                agencyId: 'agency-1',
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
        visibleAgencyIds: ['agency-1'],
        branches: [],
      },
    })

    expect(report.agency.agentNumber).toBe('ATL')
    expect(report.businessSummary.totalGroups).toBe(2)
    expect(report.businessSummary.totalPassengers).toBe(30)
    expect(report.businessSummary.totalAmount).toBe(1000)
    expect(report.businessSummary.totalPaymentsReceived).toBe(1600)
    expect(report.businessSummary.parentPaymentsAllocatedToAgency).toBe(0)
    expect(report.businessSummary.totalAllocatedToGroups).toBe(1000)
    expect(report.businessSummary.outstandingBalance).toBe(0)
    expect(report.businessSummary.agencyOwnedAdvanceBalance).toBe(600)
    expect(report.businessSummary.netBalance).toBe(-600)
    expect(report.businessSummary.pricePerPax).toBeCloseTo(33.33, 2)
    expect(report.calculations.totalGroupAmount).toBe(1000)
    expect(report.calculations.directPaymentsByAgency).toBe(1600)
    expect(report.calculations.totalAllocatedToGroups).toBe(1000)
    expect(report.groupDetails[0]?.groupAmount).toBe(400)
    expect(report.groupDetails[1]?.paymentStatus).toBe('ALLOCATED')
    expect(report.paymentHistory[0]?.receivedBy).toBe('Unassigned')
    expect(report.paymentHistory[1]?.paymentStatus).toBe('PARTIALLY_ALLOCATED')
    expect(report.paymentHistory[1]?.remainingSourceBalance).toBe(600)
    expect(report.filters.includeBranches).toBe(false)
  })

  it('does not assign parent-owned advance to a branch report', () => {
    const report = buildAgencyReport({
      agency: {
        id: 'branch-1',
        name: 'Arab Quraishi Travel',
        code: 'AQT',
        city: 'Makkah',
        country: 'Saudi Arabia',
        parentAgency: {
          id: 'parent-1',
          name: 'Almuhajir Travel',
          code: 'ALM',
          city: 'Riyadh',
          country: 'Saudi Arabia',
          agencyType: 'PARENT',
        },
      },
      groups: [
        {
          id: 'group-1',
          code: 'AQT-2506-01',
          travelerCount: 31,
          totalAmount: 465,
          agency: {
            id: 'branch-1',
            name: 'Arab Quraishi Travel',
            code: 'AQT',
          },
        },
      ],
      payments: [
        {
          id: 'payment-parent',
          reference: 'PAY-PARENT',
          amount: 2500,
          currency: 'USD',
          method: 'BANK_TRANSFER',
          status: 'PARTIALLY_ALLOCATED',
          paymentCity: 'Riyadh',
          description: 'Parent payment',
          paidAt: new Date('2026-06-10T00:00:00.000Z'),
          createdAt: new Date('2026-06-09T00:00:00.000Z'),
          agency: {
            id: 'parent-1',
            name: 'Almuhajir Travel',
            code: 'ALM',
            city: 'Riyadh',
            country: 'Saudi Arabia',
          },
          receivedBy: null,
          paymentGroups: [
            {
              allocatedAmount: 305,
              notes: 'Allocated to AQT',
              group: {
                id: 'group-1',
                code: 'AQT-2506-01',
                agencyId: 'branch-1',
                agency: {
                  id: 'branch-1',
                  name: 'Arab Quraishi Travel',
                  code: 'AQT',
                },
              },
            },
            {
              allocatedAmount: 270,
              notes: 'Allocated to IKH',
              group: {
                id: 'group-2',
                code: 'IKH-2506-01',
                agencyId: 'branch-2',
                agency: {
                  id: 'branch-2',
                  name: 'Ikhlas Travel',
                  code: 'IKH',
                },
              },
            },
          ],
        },
        {
          id: 'payment-branch',
          reference: 'PAY-BRANCH',
          amount: 700,
          currency: 'USD',
          method: 'ONLINE',
          status: 'PARTIALLY_ALLOCATED',
          paymentCity: 'Makkah',
          description: 'Branch payment',
          paidAt: new Date('2026-06-11T00:00:00.000Z'),
          createdAt: new Date('2026-06-10T00:00:00.000Z'),
          agency: {
            id: 'branch-1',
            name: 'Arab Quraishi Travel',
            code: 'AQT',
            city: 'Makkah',
            country: 'Saudi Arabia',
          },
          receivedBy: null,
          paymentGroups: [
            {
              allocatedAmount: 500,
              notes: 'Allocated to AQT',
              group: {
                id: 'group-1',
                code: 'AQT-2506-01',
                agencyId: 'branch-1',
                agency: {
                  id: 'branch-1',
                  name: 'Arab Quraishi Travel',
                  code: 'AQT',
                },
              },
            },
          ],
        },
      ],
      filters: {
        includeBranches: false,
        scopeAgencyIds: ['branch-1'],
        visibleAgencyIds: ['branch-1'],
        branches: [],
      },
    })

    expect(report.businessSummary.totalAmount).toBe(465)
    expect(report.businessSummary.totalPaymentsReceived).toBe(700)
    expect(report.businessSummary.parentPaymentsAllocatedToAgency).toBe(305)
    expect(report.businessSummary.totalAllocatedToGroups).toBe(805)
    expect(report.businessSummary.outstandingBalance).toBe(0)
    expect(report.businessSummary.agencyOwnedAdvanceBalance).toBe(200)
    expect(report.businessSummary.netBalance).toBe(-200)
    expect(report.paymentHistory).toHaveLength(2)
    expect(report.paymentHistory[1]?.sourcePaymentAmount).toBe(2500)
    expect(report.paymentHistory[1]?.allocatedToVisibleScope).toBe(305)
    expect(report.paymentHistory[1]?.remainingSourceBalance).toBe(1925)
    expect(report.paymentHistory[1]?.remainingBalanceOwnerAgencyCode).toBe('ALM')
  })

  it('builds a consolidated parent report with branch group details and counts each payment and advance once', () => {
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
                agencyId: 'parent-1',
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
                agencyId: 'branch-1',
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
        visibleAgencyIds: ['parent-1', 'branch-1'],
        branches: [
          {
            id: 'branch-1',
            name: 'Alansar Travel',
            code: 'ANS',
            city: 'Makkah',
            country: 'Saudi Arabia',
            agencyType: 'BRANCH',
          },
        ],
      },
    })

    expect(report.filters.includeBranches).toBe(true)
    expect(report.agency.reportScope).toBe('CONSOLIDATED')
    expect(report.agency.branches).toHaveLength(1)
    expect(report.businessSummary.totalGroups).toBe(2)
    expect(report.businessSummary.totalAmount).toBe(2000)
    expect(report.businessSummary.totalPaymentsReceived).toBe(1500)
    expect(report.businessSummary.parentPaymentsAllocatedToAgency).toBe(0)
    expect(report.businessSummary.totalAllocatedToGroups).toBe(1200)
    expect(report.businessSummary.outstandingBalance).toBe(800)
    expect(report.businessSummary.agencyOwnedAdvanceBalance).toBe(300)
    expect(report.businessSummary.netBalance).toBe(500)
    expect(
      report.groupDetails.find((group) => group.groupNumber === 'ANS-G001')?.agencyCode,
    ).toBe('ANS')
    expect(
      report.paymentHistory[0]?.paymentGroups.find((group) => group.groupNumber === 'ANS-G001')
        ?.agencyCode,
    ).toBe('ANS')
    expect(report.paymentHistory[0]?.allocatedToVisibleScope).toBe(1200)
    expect(report.paymentHistory[0]?.remainingSourceBalance).toBe(300)
    expect(report.businessSummary.parentOwnedPayments).toBe(1500)
    expect(report.businessSummary.branchOwnedPayments).toBe(0)
  })

  it('supports consolidated scope filtered to one agency within the family', () => {
    const report = buildAgencyReport({
      agency: {
        id: 'parent-1',
        name: 'Alansar Travel',
        code: 'ANS',
        city: 'Dammam',
        country: 'Saudi Arabia',
      },
      groups: [
        {
          id: 'group-branch',
          code: 'MUT-2506-01',
          travelerCount: 27,
          totalAmount: 270,
          agency: {
            id: 'branch-1',
            name: 'Mutamer Travel',
            code: 'MUT',
          },
        },
      ],
      payments: [
        {
          id: 'payment-parent',
          reference: 'ANS-001',
          amount: 500,
          currency: 'USD',
          method: 'BANK_TRANSFER',
          status: 'PARTIALLY_ALLOCATED',
          paymentCity: 'Dammam',
          description: 'Parent payment',
          paidAt: new Date('2026-06-10T00:00:00.000Z'),
          createdAt: new Date('2026-06-09T00:00:00.000Z'),
          agency: {
            id: 'parent-1',
            name: 'Alansar Travel',
            code: 'ANS',
            city: 'Dammam',
            country: 'Saudi Arabia',
          },
          receivedBy: null,
          paymentGroups: [
            {
              allocatedAmount: 100,
              notes: null,
              group: {
                id: 'group-parent',
                code: 'ANS-2506-01',
                agencyId: 'parent-1',
                agency: {
                  id: 'parent-1',
                  name: 'Alansar Travel',
                  code: 'ANS',
                },
              },
            },
            {
              allocatedAmount: 200,
              notes: null,
              group: {
                id: 'group-branch',
                code: 'MUT-2506-01',
                agencyId: 'branch-1',
                agency: {
                  id: 'branch-1',
                  name: 'Mutamer Travel',
                  code: 'MUT',
                },
              },
            },
          ],
        },
        {
          id: 'payment-branch',
          reference: 'MUT-001',
          amount: 250,
          currency: 'USD',
          method: 'CASH',
          status: 'ALLOCATED',
          paymentCity: 'Madinah',
          description: 'Branch payment',
          paidAt: new Date('2026-06-12T00:00:00.000Z'),
          createdAt: new Date('2026-06-11T00:00:00.000Z'),
          agency: {
            id: 'branch-1',
            name: 'Mutamer Travel',
            code: 'MUT',
            city: 'Madinah',
            country: 'Saudi Arabia',
          },
          receivedBy: null,
          paymentGroups: [
            {
              allocatedAmount: 70,
              notes: null,
              group: {
                id: 'group-branch',
                code: 'MUT-2506-01',
                agencyId: 'branch-1',
                agency: {
                  id: 'branch-1',
                  name: 'Mutamer Travel',
                  code: 'MUT',
                },
              },
            },
          ],
        },
      ],
      filters: {
        includeBranches: true,
        scopeAgencyIds: ['parent-1', 'branch-1'],
        visibleAgencyIds: ['branch-1'],
        visibleAgency: {
          id: 'branch-1',
          name: 'Mutamer Travel',
          code: 'MUT',
          city: 'Madinah',
          country: 'Saudi Arabia',
          agencyType: 'BRANCH',
        },
        branches: [
          {
            id: 'branch-1',
            name: 'Mutamer Travel',
            code: 'MUT',
            city: 'Madinah',
            country: 'Saudi Arabia',
            agencyType: 'BRANCH',
          },
        ],
      },
    })

    expect(report.agency.scopeLabel).toContain('Filtered to Mutamer Travel')
    expect(report.agency.visibleAgencyFilter?.agentNumber).toBe('MUT')
    expect(report.businessSummary.totalAmount).toBe(270)
    expect(report.businessSummary.totalPaymentsReceived).toBe(250)
    expect(report.businessSummary.parentPaymentsAllocatedToAgency).toBe(200)
  })
})
