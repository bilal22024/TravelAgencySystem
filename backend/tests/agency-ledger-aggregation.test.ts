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
      },
      payments: [
        {
          id: 'payment-1',
          reference: 'PAY-001',
          amount: 1000,
          currency: 'USD',
          description: 'May payment',
          paidAt: new Date('2026-05-01T10:00:00.000Z'),
          createdAt: new Date('2026-05-01T09:00:00.000Z'),
          paymentGroups: [
            {
              id: 'pg-1',
              allocatedAmount: 300,
              notes: 'Allocated to group',
              createdAt: new Date('2026-05-03T10:00:00.000Z'),
              group: {
                code: 'ATL-G001',
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
          paymentGroups: [
            {
              id: 'pg-2',
              allocatedAmount: 50,
              notes: null,
              createdAt: new Date('2026-06-06T10:00:00.000Z'),
              group: {
                code: 'ATL-G002',
              },
            },
          ],
        },
      ],
      filters: {
        dateFrom: new Date('2026-06-01T00:00:00.000Z'),
        dateTo: new Date('2026-06-30T23:59:59.999Z'),
      },
    })

    expect(ledger.summary.openingBalance).toBe(700)
    expect(ledger.summary.totalCredits).toBe(200)
    expect(ledger.summary.totalDebits).toBe(50)
    expect(ledger.summary.outstandingBalance).toBe(850)
    expect(ledger.entries[0]?.description).toBe('Opening Balance')
    expect(ledger.entries[1]?.type).toBe('payment')
    expect(ledger.entries[1]?.runningBalance).toBe(900)
    expect(ledger.entries[2]?.type).toBe('adjustment')
    expect(ledger.entries[2]?.runningBalance).toBe(850)
    expect(ledger.entries[3]?.description).toBe('Outstanding Balance')
  })
})
