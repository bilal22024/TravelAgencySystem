import { describe, expect, it } from 'vitest'
import { agencyListQuerySchema } from '../src/modules/agencies/dto/agency.schema.js'
import {
  bulkCreateGroupsSchema,
  groupListQuerySchema,
} from '../src/modules/groups/dto/group.schema.js'
import { paymentListQuerySchema } from '../src/modules/payments/dto/payment.schema.js'

describe('phase five list query schemas', () => {
  it('applies defaults for agency listing', () => {
    const query = agencyListQuerySchema.parse({})

    expect(query).toMatchObject({
      page: 1,
      pageSize: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    })
  })

  it('parses group filters and date ranges', () => {
    const query = groupListQuerySchema.parse({
      status: 'CONFIRMED',
      paymentStatus: 'PARTIALLY_PAID',
      country: 'Pakistan',
      city: 'Lahore',
      minPassengers: '10',
      maxPassengers: '50',
      minAmount: '500',
      maxAmount: '5000',
      page: '2',
      departureDateFrom: '2026-07-01',
      createdDateFrom: '2026-07-02',
      sortBy: 'outstandingBalance',
      sortOrder: 'desc',
    })

    expect(query.page).toBe(2)
    expect(query.status).toBe('CONFIRMED')
    expect(query.paymentStatus).toBe('PARTIALLY_PAID')
    expect(query.country).toBe('Pakistan')
    expect(query.city).toBe('Lahore')
    expect(query.minPassengers).toBe(10)
    expect(query.maxPassengers).toBe(50)
    expect(query.minAmount).toBe(500)
    expect(query.maxAmount).toBe(5000)
    expect(query.departureDateFrom).toBeInstanceOf(Date)
    expect(query.createdDateFrom).toBeInstanceOf(Date)
    expect(query.sortBy).toBe('outstandingBalance')
    expect(query.sortOrder).toBe('desc')
  })

  it('rejects invalid group amount and passenger ranges', () => {
    expect(() =>
      groupListQuerySchema.parse({
        minPassengers: 20,
        maxPassengers: 10,
      }),
    ).toThrow(/Maximum passengers/i)

    expect(() =>
      groupListQuerySchema.parse({
        minAmount: 4000,
        maxAmount: 1000,
      }),
    ).toThrow(/Maximum amount/i)
  })

  it('rejects unsupported payment sort fields', () => {
    expect(() =>
      paymentListQuerySchema.parse({
        sortBy: 'destination',
      }),
    ).toThrow()
  })

  it('rejects duplicate group numbers in a bulk entry batch', () => {
    expect(() =>
      bulkCreateGroupsSchema.parse({
        agencyId: '3ec0a5b4-e5b7-4d67-bc4d-7ef66895cde5',
        rows: [
          {
            groupNumber: '1001',
            groupName: 'Alpha',
            pax: 10,
            amountPerPax: 125,
          },
          {
            groupNumber: '1001',
            groupName: 'Beta',
            pax: 8,
            amountPerPax: 200,
          },
        ],
      }),
    ).toThrow(/Duplicate group number/i)
  })

  it('rejects bulk rows with non-positive pax or amount per pax', () => {
    expect(() =>
      bulkCreateGroupsSchema.parse({
        agencyId: '3ec0a5b4-e5b7-4d67-bc4d-7ef66895cde5',
        rows: [
          {
            groupNumber: '1002',
            pax: 0,
            amountPerPax: 100,
          },
        ],
      }),
    ).toThrow()

    expect(() =>
      bulkCreateGroupsSchema.parse({
        agencyId: '3ec0a5b4-e5b7-4d67-bc4d-7ef66895cde5',
        rows: [
          {
            groupNumber: '1003',
            pax: 12,
            amountPerPax: 0,
          },
        ],
      }),
    ).toThrow()
  })

  it('rejects non-numeric group numbers with a clear validation message', () => {
    expect(() =>
      bulkCreateGroupsSchema.parse({
        agencyId: '3ec0a5b4-e5b7-4d67-bc4d-7ef66895cde5',
        rows: [
          {
            groupNumber: 'GRP-1004',
            pax: 12,
            amountPerPax: 10,
          },
        ],
      }),
    ).toThrow(/Group Number must contain numbers only\./)
  })
})
