import { describe, expect, it } from 'vitest'
import { buildAgencyLedger } from '../src/modules/reports/application/agency-ledger-aggregation.js'

describe('agency ledger aggregation', () => {
  it('builds opening balance, chronological entries, and outstanding balance from existing payments and allocations', () => {
    const ledger = buildAgencyLedger({
      agency: {
        id: 'agency-1',
        name: 'Atlas Travel',
        code: 'ATL',
        city: 'Dubai',
        country: 'UAE',
        openingBalance: 0,
      },
      groups: [
        {
          id: 'group-1',
          code: 'ATL-G001',
          totalAmount: 1200,
          createdAt: new Date('2026-05-01T08:00:00.000Z'),
          agency: {
            id: 'agency-1',
            name: 'Atlas Travel',
            code: 'ATL',
          },
        },
        {
          id: 'group-2',
          code: 'ATL-G002',
          totalAmount: 250,
          createdAt: new Date('2026-06-04T08:00:00.000Z'),
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
          description: 'May payment',
          paidAt: new Date('2026-05-01T10:00:00.000Z'),
          createdAt: new Date('2026-05-01T09:00:00.000Z'),
          agencyId: 'agency-1',
          agency: {
            id: 'agency-1',
            name: 'Atlas Travel',
            code: 'ATL',
          },
          paymentGroups: [
            {
              id: 'pg-1',
              allocatedAmount: 300,
              notes: 'Allocated to group',
              createdAt: new Date('2026-05-03T10:00:00.000Z'),
              group: {
                id: 'group-1',
                agencyId: 'agency-1',
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
          amount: 200,
          currency: 'USD',
          description: 'June payment',
          paidAt: new Date('2026-06-05T10:00:00.000Z'),
          createdAt: new Date('2026-06-05T09:00:00.000Z'),
          agencyId: 'agency-1',
          agency: {
            id: 'agency-1',
            name: 'Atlas Travel',
            code: 'ATL',
          },
          paymentGroups: [
            {
              id: 'pg-2',
              allocatedAmount: 50,
              notes: null,
              createdAt: new Date('2026-06-06T10:00:00.000Z'),
              group: {
                id: 'group-2',
                agencyId: 'agency-1',
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
        dateFrom: new Date('2026-06-01T00:00:00.000Z'),
        dateTo: new Date('2026-06-30T23:59:59.999Z'),
        includeBranches: false,
        scopeAgencyIds: ['agency-1'],
        branches: [],
      },
    })

    expect(ledger.summary.openingBalance).toBe(200)
    expect(ledger.summary.totalCredits).toBe(200)
    expect(ledger.summary.totalDebits).toBe(250)
    expect(ledger.summary.outstandingBalance).toBe(250)
    expect(ledger.summary.advanceBalance).toBe(0)
    expect(ledger.summary.netBalance).toBe(250)
    expect(ledger.entries[0]?.description).toBe('Opening Balance')
    expect(ledger.entries[1]?.type).toBe('group_charge')
    expect(ledger.entries[1]?.runningBalance).toBe(450)
    expect(ledger.entries[2]?.type).toBe('payment')
    expect(ledger.entries[2]?.runningBalance).toBe(250)
    expect(ledger.entries[3]?.description).toBe('Closing Net Balance')
    expect(ledger.filters.includeBranches).toBe(false)
  })

  it('builds a consolidated parent ledger without double-counting internal parent-to-branch allocations', () => {
    const ledger = buildAgencyLedger({
      agency: {
        id: 'parent-1',
        name: 'Fida Noor Travel',
        code: 'FNT',
        city: 'Jeddah',
        country: 'Saudi Arabia',
        openingBalance: 0,
      },
      groups: [
        {
          id: 'group-parent',
          code: 'FNT-G001',
          totalAmount: 500,
          createdAt: new Date('2026-07-01T08:00:00.000Z'),
          agency: {
            id: 'parent-1',
            name: 'Fida Noor Travel',
            code: 'FNT',
          },
        },
        {
          id: 'group-branch',
          code: 'ANS-G001',
          totalAmount: 600,
          createdAt: new Date('2026-07-02T08:00:00.000Z'),
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
          reference: 'PAY-200',
          amount: 1000,
          currency: 'USD',
          description: null,
          paidAt: new Date('2026-07-03T10:00:00.000Z'),
          createdAt: new Date('2026-07-03T09:00:00.000Z'),
          agencyId: 'parent-1',
          agency: {
            id: 'parent-1',
            name: 'Fida Noor Travel',
            code: 'FNT',
          },
          paymentGroups: [
            {
              id: 'pg-parent',
              allocatedAmount: 400,
              notes: 'Parent allocation',
              createdAt: new Date('2026-07-03T11:00:00.000Z'),
              group: {
                id: 'group-parent',
                agencyId: 'parent-1',
                code: 'FNT-G001',
                agency: {
                  id: 'parent-1',
                  name: 'Fida Noor Travel',
                  code: 'FNT',
                },
              },
            },
            {
              id: 'pg-branch',
              allocatedAmount: 500,
              notes: 'Branch allocation',
              createdAt: new Date('2026-07-03T11:30:00.000Z'),
              group: {
                id: 'group-branch',
                agencyId: 'branch-1',
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

    expect(ledger.filters.includeBranches).toBe(true)
    expect(ledger.agency.reportScope).toBe('CONSOLIDATED')
    expect(ledger.summary.totalDebits).toBe(1100)
    expect(ledger.summary.totalCredits).toBe(1000)
    expect(ledger.summary.outstandingBalance).toBe(100)
    expect(ledger.entries.filter((entry) => entry.type === 'payment_allocation')).toHaveLength(0)
    expect(ledger.entries.find((entry) => entry.type === 'payment')?.description).toBe(
      'Payment Received - FNT',
    )
  })
})
