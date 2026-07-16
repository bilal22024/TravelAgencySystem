import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppError } from '../src/common/errors/app-error.js'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    payment: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    group: {
      findUnique: vi.fn(),
    },
    paymentGroup: {
      create: vi.fn(),
    },
  },
}))

vi.mock('../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}))

import { createPaymentGroup } from '../src/modules/payments/application/payment-group.service.js'
import { updatePayment } from '../src/modules/payments/application/payment.service.js'

describe('payment business logic services', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects payment updates that would undercut existing allocations', async () => {
    prismaMock.payment.findUnique.mockResolvedValue({
      id: 'payment-1',
      agencyId: 'agency-1',
      amount: 100,
      status: 'PENDING',
      paymentGroups: [{ allocatedAmount: 80 }],
      agency: null,
      receivedBy: null,
    })

    await expect(
      updatePayment(
        'payment-1',
        { amount: 50 },
        { id: 'user-1', agencyId: 'agency-1', role: 'AGENCY_ADMIN', email: 'ops@test.com' },
      ),
    ).rejects.toMatchObject({
      message: 'Payment amount cannot be lower than the allocated total',
      statusCode: 400,
    } satisfies Partial<AppError>)
  })

  it('syncs payment status after a successful allocation', async () => {
    prismaMock.payment.findUnique
      .mockResolvedValueOnce({
        agencyId: 'agency-1',
        status: 'PENDING',
      })
      .mockResolvedValueOnce({
        id: 'payment-1',
        amount: 100,
        paymentGroups: [{ id: 'alloc-1', allocatedAmount: 40 }],
      })
      .mockResolvedValueOnce({
        id: 'payment-1',
        amount: 100,
        status: 'PENDING',
        paymentGroups: [
          { id: 'alloc-1', allocatedAmount: 40 },
          { id: 'alloc-2', allocatedAmount: 60 },
        ],
      })

    prismaMock.group.findUnique.mockResolvedValue({
      agencyId: 'agency-1',
    })

    prismaMock.paymentGroup.create.mockResolvedValue({
      id: 'alloc-2',
      paymentId: 'payment-1',
      groupId: 'group-1',
      allocatedAmount: 60,
      payment: null,
      group: null,
    })

    prismaMock.payment.update.mockResolvedValue({
      id: 'payment-1',
      status: 'ALLOCATED',
    })

    await createPaymentGroup(
      {
        paymentId: 'payment-1',
        groupId: 'group-1',
        allocatedAmount: 60,
      },
      { id: 'user-1', agencyId: 'agency-1', role: 'AGENCY_ADMIN', email: 'ops@test.com' },
    )

    expect(prismaMock.payment.update).toHaveBeenCalledWith({
      where: {
        id: 'payment-1',
      },
      data: {
        status: 'ALLOCATED',
      },
    })
  })
})
