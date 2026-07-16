import { describe, expect, it } from 'vitest'
import {
  getDerivedPaymentStatus,
  getPaymentSummary,
  isExceptionalPaymentStatus,
  sumAllocatedAmount,
} from '../src/modules/payments/application/payment-calculations.js'

describe('payment calculations', () => {
  it('sums allocated amounts and derives partial allocation status', () => {
    const summary = getPaymentSummary(
      100,
      [{ allocatedAmount: 20 }, { allocatedAmount: '15.5' }],
      'PENDING',
    )

    expect(sumAllocatedAmount([{ allocatedAmount: 20 }, { allocatedAmount: '15.5' }])).toBe(35.5)
    expect(summary.allocatedAmount).toBe(35.5)
    expect(summary.remainingBalance).toBe(64.5)
    expect(summary.status).toBe('PARTIALLY_ALLOCATED')
  })

  it('preserves exceptional statuses', () => {
    expect(isExceptionalPaymentStatus('FAILED')).toBe(true)
    expect(isExceptionalPaymentStatus('REFUNDED')).toBe(true)
    expect(getPaymentSummary(100, [{ allocatedAmount: 100 }], 'FAILED').status).toBe('FAILED')
  })

  it('derives standard allocation statuses from totals', () => {
    expect(getDerivedPaymentStatus(100, 0)).toBe('PENDING')
    expect(getDerivedPaymentStatus(100, 40)).toBe('PARTIALLY_ALLOCATED')
    expect(getDerivedPaymentStatus(100, 100)).toBe('ALLOCATED')
  })
})
