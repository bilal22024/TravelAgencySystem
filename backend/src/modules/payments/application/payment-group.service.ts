import { prisma } from '../../../lib/prisma.js'
import { AppError } from '../../../common/errors/app-error.js'
import type { AuthenticatedUser } from '../../../common/types/auth-user.js'
import type { Prisma } from '@prisma/client'
import { buildPaginatedResult, getPaginationParams } from '../../../common/http/pagination.js'
import {
  getDerivedPaymentStatus,
  isExceptionalPaymentStatus,
  sumAllocatedAmount,
} from './payment-calculations.js'
import type { PaymentGroupListQuery } from '../dto/payment-group.schema.js'

function isSuperAdmin(user: AuthenticatedUser) {
  return user.role === 'SUPER_ADMIN'
}

type CreatePaymentGroupInput = Prisma.PaymentGroupUncheckedCreateInput
type UpdatePaymentGroupInput = Prisma.PaymentGroupUncheckedUpdateInput

const paymentGroupInclude = {
  payment: true,
  group: true,
} satisfies Prisma.PaymentGroupInclude

async function ensureAgencyAccess(paymentId: string, groupId: string, authUser: AuthenticatedUser) {
  const payment = await prisma.payment.findUnique({
    where: {
      id: paymentId,
    },
    select: {
      agencyId: true,
      status: true,
    },
  })

  const group = await prisma.group.findUnique({
    where: {
      id: groupId,
    },
    select: {
      agencyId: true,
    },
  })

  if (!payment || !group) {
    throw new AppError('Related payment or group could not be found', 404)
  }

  if (payment.agencyId !== group.agencyId) {
    throw new AppError('Payment and group must belong to the same agency', 400)
  }

  if (!isSuperAdmin(authUser) && payment.agencyId !== authUser.agencyId) {
    throw new AppError('You can only manage allocations inside your own agency', 403)
  }

  if (isExceptionalPaymentStatus(payment.status)) {
    throw new AppError('Failed or refunded payments cannot receive allocations', 400)
  }
}

async function ensureAllocationDoesNotExceedPayment(
  paymentId: string,
  allocatedAmount: number,
  excludePaymentGroupId?: string,
) {
  const payment = await prisma.payment.findUnique({
    where: {
      id: paymentId,
    },
    include: {
      paymentGroups: true,
    },
  })

  if (!payment) {
    throw new AppError('Related payment could not be found', 404)
  }

  const existingAllocations = payment.paymentGroups.filter((paymentGroup) => {
    return paymentGroup.id !== excludePaymentGroupId
  })

  const nextAllocatedAmount = sumAllocatedAmount(existingAllocations) + allocatedAmount

  if (nextAllocatedAmount > Number(payment.amount)) {
    throw new AppError('Allocated amount cannot exceed the payment total', 400, {
      paymentAmount: Number(payment.amount),
      nextAllocatedAmount,
    })
  }
}

async function syncPaymentStatus(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: {
      id: paymentId,
    },
    include: {
      paymentGroups: true,
    },
  })

  if (!payment || isExceptionalPaymentStatus(payment.status)) {
    return
  }

  await prisma.payment.update({
    where: {
      id: paymentId,
    },
    data: {
      status: getDerivedPaymentStatus(
        Number(payment.amount),
        sumAllocatedAmount(payment.paymentGroups),
      ),
    },
  })
}

export async function listPaymentGroups(authUser: AuthenticatedUser, query: PaymentGroupListQuery) {
  const where: Prisma.PaymentGroupWhereInput = {
    ...(isSuperAdmin(authUser)
      ? {}
      : {
          payment: {
            agencyId: authUser.agencyId,
          },
        }),
    ...(query.paymentId ? { paymentId: query.paymentId } : {}),
    ...(query.groupId ? { groupId: query.groupId } : {}),
  }

  const { skip, take } = getPaginationParams(query.page, query.pageSize)

  const [total, paymentGroups] = await prisma.$transaction([
    prisma.paymentGroup.count({ where }),
    prisma.paymentGroup.findMany({
      where,
      include: paymentGroupInclude,
      orderBy: {
        [query.sortBy]: query.sortOrder,
      },
      skip,
      take,
    }),
  ])

  return buildPaginatedResult(paymentGroups, query.page, query.pageSize, total)
}

export async function getPaymentGroupById(id: string, authUser: AuthenticatedUser) {
  const paymentGroup = await prisma.paymentGroup.findUnique({
    where: {
      id,
    },
    include: paymentGroupInclude,
  })

  if (
    !paymentGroup ||
    (!isSuperAdmin(authUser) && paymentGroup.payment.agencyId !== authUser.agencyId)
  ) {
    throw new AppError('Payment allocation not found', 404)
  }

  return paymentGroup
}

export async function createPaymentGroup(
  data: CreatePaymentGroupInput,
  authUser: AuthenticatedUser,
) {
  await ensureAgencyAccess(data.paymentId, data.groupId, authUser)
  await ensureAllocationDoesNotExceedPayment(data.paymentId, Number(data.allocatedAmount))

  const paymentGroup = await prisma.paymentGroup.create({
    data,
    include: paymentGroupInclude,
  })

  await syncPaymentStatus(data.paymentId)

  return paymentGroup
}

export async function updatePaymentGroup(
  id: string,
  data: UpdatePaymentGroupInput,
  authUser: AuthenticatedUser,
) {
  const existingPaymentGroup = await prisma.paymentGroup.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      paymentId: true,
      groupId: true,
    },
  })

  if (!existingPaymentGroup) {
    throw new AppError('Payment allocation not found', 404)
  }

  const nextPaymentId = data.paymentId?.toString() ?? existingPaymentGroup.paymentId
  const nextGroupId = data.groupId?.toString() ?? existingPaymentGroup.groupId
  const nextAllocatedAmount =
    data.allocatedAmount !== undefined
      ? Number(data.allocatedAmount)
      : await getExistingAllocatedAmount(id)

  await ensureAgencyAccess(nextPaymentId, nextGroupId, authUser)
  await ensureAllocationDoesNotExceedPayment(nextPaymentId, nextAllocatedAmount, id)

  const paymentGroup = await prisma.paymentGroup.update({
    where: {
      id,
    },
    data,
    include: paymentGroupInclude,
  })

  await syncPaymentStatus(existingPaymentGroup.paymentId)

  if (nextPaymentId !== existingPaymentGroup.paymentId) {
    await syncPaymentStatus(nextPaymentId)
  }

  return paymentGroup
}

export async function deletePaymentGroup(id: string, authUser: AuthenticatedUser) {
  const existingPaymentGroup = await prisma.paymentGroup.findUnique({
    where: {
      id,
    },
    include: {
      payment: {
        select: {
          agencyId: true,
        },
      },
    },
  })

  if (
    !existingPaymentGroup ||
    (!isSuperAdmin(authUser) && existingPaymentGroup.payment.agencyId !== authUser.agencyId)
  ) {
    throw new AppError('Payment allocation not found', 404)
  }

  await prisma.paymentGroup.delete({
    where: {
      id,
    },
  })

  await syncPaymentStatus(existingPaymentGroup.paymentId)
}

async function getExistingAllocatedAmount(id: string) {
  const existingPaymentGroup = await prisma.paymentGroup.findUnique({
    where: {
      id,
    },
    select: {
      allocatedAmount: true,
    },
  })

  if (!existingPaymentGroup) {
    throw new AppError('Payment allocation not found', 404)
  }

  return Number(existingPaymentGroup.allocatedAmount)
}
