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

async function getAccessiblePaymentAgencyIds(authUser: AuthenticatedUser) {
  if (isSuperAdmin(authUser)) {
    return null
  }

  if (typeof prisma.agency?.findUnique !== 'function') {
    return [authUser.agencyId]
  }

  const agency = await prisma.agency.findUnique({
    where: {
      id: authUser.agencyId,
    },
    select: {
      id: true,
      agencyType: true,
      branches: {
        select: {
          id: true,
        },
      },
    },
  })

  if (!agency) {
    return [authUser.agencyId]
  }

  if (agency.agencyType === 'PARENT') {
    return [agency.id, ...agency.branches.map((branch) => branch.id)]
  }

  return [agency.id]
}

type CreatePaymentGroupInput = Prisma.PaymentGroupUncheckedCreateInput
type UpdatePaymentGroupInput = Prisma.PaymentGroupUncheckedUpdateInput

const paymentGroupInclude = {
  payment: true,
  group: true,
} satisfies Prisma.PaymentGroupInclude

async function ensureAgencyAccess(paymentId: string, groupId: string, authUser: AuthenticatedUser) {
  const accessibleAgencyIds = await getAccessiblePaymentAgencyIds(authUser)
  const payment = await prisma.payment.findUnique({
    where: {
      id: paymentId,
    },
    select: {
      id: true,
      agencyId: true,
      status: true,
      agency: {
        select: {
          agencyType: true,
        },
      },
    },
  })

  const group = await prisma.group.findUnique({
    where: {
      id: groupId,
    },
    select: {
      id: true,
      agencyId: true,
      agency: {
        select: {
          parentAgencyId: true,
        },
      },
      paymentGroups: {
        select: {
          id: true,
          allocatedAmount: true,
        },
      },
      totalAmount: true,
    },
  })

  if (!payment || !group) {
    throw new AppError('Related payment or group could not be found', 404)
  }

  const isSameAgency = payment.agencyId === group.agencyId
  const isParentCoveringBranch =
    payment.agency?.agencyType === 'PARENT' && group.agency?.parentAgencyId === payment.agencyId

  if (!isSameAgency && !isParentCoveringBranch) {
    throw new AppError('A payment can only be allocated to its own agency or a connected branch.', 400)
  }

  if (accessibleAgencyIds && !accessibleAgencyIds.includes(payment.agencyId)) {
    throw new AppError('You can only manage allocations inside your own agency', 403)
  }

  if (isExceptionalPaymentStatus(payment.status)) {
    throw new AppError('Failed or refunded payments cannot receive allocations', 400)
  }

  return {
    payment,
    group,
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

async function ensureAllocationDoesNotExceedGroupOutstanding(
  groupId: string,
  allocatedAmount: number,
  excludePaymentGroupId?: string,
) {
  const group = await prisma.group.findUnique({
    where: {
      id: groupId,
    },
    select: {
      totalAmount: true,
      paymentGroups: {
        select: {
          id: true,
          allocatedAmount: true,
        },
      },
    },
  })

  if (!group) {
    throw new AppError('Related group could not be found', 404)
  }

  const existingAllocations = (group.paymentGroups ?? []).filter((paymentGroup) => {
    return paymentGroup.id !== excludePaymentGroupId
  })
  const nextAllocatedAmount = sumAllocatedAmount(existingAllocations) + allocatedAmount
  const totalAmount = Number(group.totalAmount ?? 0)

  if (nextAllocatedAmount > totalAmount) {
    throw new AppError('Allocated amount cannot exceed the group outstanding balance', 400, {
      groupTotalAmount: totalAmount,
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
  const accessibleAgencyIds = await getAccessiblePaymentAgencyIds(authUser)
  const where: Prisma.PaymentGroupWhereInput = {
    ...(accessibleAgencyIds
      ? {
          payment: {
            agencyId: {
              in: accessibleAgencyIds,
            },
          },
        }
      : {}),
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
  const accessibleAgencyIds = await getAccessiblePaymentAgencyIds(authUser)
  const paymentGroup = await prisma.paymentGroup.findUnique({
    where: {
      id,
    },
    include: paymentGroupInclude,
  })

  if (
    !paymentGroup ||
    (accessibleAgencyIds && !accessibleAgencyIds.includes(paymentGroup.payment.agencyId))
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
  await ensureAllocationDoesNotExceedGroupOutstanding(data.groupId, Number(data.allocatedAmount))

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
  await ensureAllocationDoesNotExceedGroupOutstanding(nextGroupId, nextAllocatedAmount, id)

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
  const accessibleAgencyIds = await getAccessiblePaymentAgencyIds(authUser)
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
    (accessibleAgencyIds && !accessibleAgencyIds.includes(existingPaymentGroup.payment.agencyId))
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
