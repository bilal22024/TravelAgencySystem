import { describe, expect, it } from 'vitest'
import {
  getAllocationCoverage,
  getPaymentStatusBreakdown,
} from '@/features/reports/selectors'

describe('report selectors', () => {
  it('calculates allocation coverage from payments and allocations', () => {
    const coverage = getAllocationCoverage(
      [
        {
          id: 'payment-1',
          agencyId: 'agency-1',
          receivedByUserId: null,
          receiptNumber: null,
          reference: 'PAY-1',
          amount: 100,
          currency: 'USD',
          method: 'BANK_TRANSFER',
          status: 'PENDING',
          paymentCity: null,
          description: null,
          paidAt: null,
          createdAt: '',
          updatedAt: '',
          allocatedAmount: 40,
          remainingBalance: 60,
          allocationCount: 1,
        },
      ],
      [
        {
          id: 'alloc-1',
          paymentId: 'payment-1',
          groupId: 'group-1',
          allocatedAmount: 40,
          notes: null,
          createdAt: '',
          updatedAt: '',
        },
      ],
    )

    expect(coverage.allocatedTotal).toBe(40)
    expect(coverage.paymentTotal).toBe(100)
    expect(coverage.coverageRate).toBe(0.4)
  })

  it('groups payment counts by status', () => {
    expect(
      getPaymentStatusBreakdown([
        {
          id: 'payment-1',
          agencyId: 'agency-1',
          receivedByUserId: null,
          receiptNumber: null,
          reference: 'PAY-1',
          amount: 100,
          currency: 'USD',
          method: 'BANK_TRANSFER',
          status: 'PENDING',
          paymentCity: null,
          description: null,
          paidAt: null,
          createdAt: '',
          updatedAt: '',
          allocatedAmount: 0,
          remainingBalance: 100,
          allocationCount: 0,
        },
        {
          id: 'payment-2',
          agencyId: 'agency-1',
          receivedByUserId: null,
          receiptNumber: null,
          reference: 'PAY-2',
          amount: 100,
          currency: 'USD',
          method: 'BANK_TRANSFER',
          status: 'ALLOCATED',
          paymentCity: null,
          description: null,
          paidAt: null,
          createdAt: '',
          updatedAt: '',
          allocatedAmount: 100,
          remainingBalance: 0,
          allocationCount: 1,
        },
      ]),
    ).toEqual({
      PENDING: 1,
      ALLOCATED: 1,
    })
  })
})
