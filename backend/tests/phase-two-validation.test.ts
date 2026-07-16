import { describe, expect, it } from 'vitest'
import { agencySchema } from '../src/modules/agencies/dto/agency.schema.js'
import { groupSchema } from '../src/modules/groups/dto/group.schema.js'
import { paymentGroupSchema } from '../src/modules/payments/dto/payment-group.schema.js'
import { paymentSchema } from '../src/modules/payments/dto/payment.schema.js'
import { userSchema } from '../src/modules/users/dto/user.schema.js'

describe('Phase 2 validation schemas', () => {
  it('accepts a valid agency payload', () => {
    const result = agencySchema.safeParse({
      name: 'Skyline Travel',
      code: 'SKYLINE',
      contactEmail: 'contact@skyline.test',
      isActive: true,
    })

    expect(result.success).toBe(true)
  })

  it('rejects a group with an invalid date range', () => {
    const result = groupSchema.safeParse({
      agencyId: '0f27390b-1f5a-48b8-aa45-c1319624ad71',
      name: 'Summer Escape',
      code: 'SUMMER2026',
      destination: 'Bali',
      departureDate: '2026-08-20T00:00:00.000Z',
      returnDate: '2026-08-10T00:00:00.000Z',
    })

    expect(result.success).toBe(false)
  })

  it('accepts a valid payment payload', () => {
    const result = paymentSchema.safeParse({
      agencyId: '0f27390b-1f5a-48b8-aa45-c1319624ad71',
      receivedByUserId: '5f659299-0fe3-495d-88ef-b87cbe44eeb3',
      reference: 'PAYMENT_001',
      amount: 1250.5,
      currency: 'usd',
      method: 'BANK_TRANSFER',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.currency).toBe('USD')
    }
  })

  it('accepts a valid payment-group payload', () => {
    const result = paymentGroupSchema.safeParse({
      paymentId: '7d771845-df17-4f06-9e7e-4e14807b4378',
      groupId: '73dd1ffd-9c43-4653-bd23-84154ab43723',
      allocatedAmount: 500,
    })

    expect(result.success).toBe(true)
  })

  it('rejects a user with an invalid email', () => {
    const result = userSchema.safeParse({
      agencyId: '0f27390b-1f5a-48b8-aa45-c1319624ad71',
      firstName: 'Ava',
      lastName: 'Miles',
      email: 'not-an-email',
      passwordHash: 'very-secure-password-hash',
      role: 'AGENT',
    })

    expect(result.success).toBe(false)
  })
})
