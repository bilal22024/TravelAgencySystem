import { randomUUID } from 'node:crypto'
import { prisma } from '../../../lib/prisma.js'
import { AppError } from '../../../common/errors/app-error.js'
import type { AuthenticatedUser } from '../../../common/types/auth-user.js'
import { Prisma, type PaymentStatus } from '@prisma/client'
import { buildPaginatedResult, getPaginationParams } from '../../../common/http/pagination.js'
import {
  getDerivedPaymentStatus,
  getPaymentSummary,
  isExceptionalPaymentStatus,
  sumAllocatedAmount,
} from './payment-calculations.js'
import type { PaymentEntryInput, PaymentListQuery } from '../dto/payment.schema.js'

function isSuperAdmin(user: AuthenticatedUser) {
  return user.role === 'SUPER_ADMIN'
}

type CreatePaymentInput = Prisma.PaymentUncheckedCreateInput
type UpdatePaymentInput = Prisma.PaymentUncheckedUpdateInput
type PaymentReferenceClient = Pick<typeof prisma, 'payment'>

const paymentInclude = {
  agency: true,
  receivedBy: true,
  paymentGroups: true,
} satisfies Prisma.PaymentInclude

type PaymentRecord = Prisma.PaymentGetPayload<{
  include: typeof paymentInclude
}>

const paymentReceiptInclude = {
  agency: true,
  receivedBy: true,
  paymentGroups: {
    include: {
      group: {
        select: {
          id: true,
          code: true,
          name: true,
          travelerCount: true,
          totalAmount: true,
        },
      },
    },
  },
} satisfies Prisma.PaymentInclude

type PaymentReceiptRecord = Prisma.PaymentGetPayload<{
  include: typeof paymentReceiptInclude
}>

function toCents(value: number | string | Prisma.Decimal) {
  return Math.round(Number(value) * 100)
}

function fromCents(value: number) {
  return Number((value / 100).toFixed(2))
}

function normalizeReference(reference: string) {
  return reference.trim().toUpperCase()
}

function normalizeOptionalString(value?: string | null) {
  return value?.trim() || undefined
}

function buildReceiptNumber(date: Date) {
  const dateToken = date.toISOString().slice(0, 10).replace(/-/g, '')
  const suffix = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()
  return `RCT-${dateToken}-${suffix}`
}

async function ensureUniqueReference(
  reference: string,
  excludePaymentId?: string,
  transaction: PaymentReferenceClient = prisma,
) {
  const existingPayment = await transaction.payment.findFirst({
    where: {
      reference,
      ...(excludePaymentId
        ? {
            id: {
              not: excludePaymentId,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  })

  if (existingPayment) {
    throw new AppError(`Reference Number ${reference} already exists.`, 409)
  }
}

function getGroupSettlementStatus(totalAmount: number, paidAmount: number) {
  if (paidAmount <= 0) {
    return 'UNPAID' as const
  }

  if (paidAmount >= totalAmount) {
    return 'FULLY_PAID' as const
  }

  return 'PARTIALLY_PAID' as const
}

function getGroupSettlementLabel(status: 'UNPAID' | 'PARTIALLY_PAID' | 'FULLY_PAID') {
  switch (status) {
    case 'FULLY_PAID':
      return 'Fully Paid'
    case 'PARTIALLY_PAID':
      return 'Partially Paid'
    default:
      return 'Unpaid'
  }
}

function serializePayment(payment: PaymentRecord) {
  const summary = getPaymentSummary(payment.amount.toString(), payment.paymentGroups, payment.status)

  return {
    ...payment,
    allocatedAmount: summary.allocatedAmount,
    remainingBalance: summary.remainingBalance,
    allocationCount: summary.allocationCount,
    status: summary.status,
  }
}

function serializeReceipt(payment: PaymentReceiptRecord) {
  const totalAllocatedAmount = payment.paymentGroups.reduce((total, paymentGroup) => {
    return total + Number(paymentGroup.allocatedAmount)
  }, 0)

  return {
    paymentId: payment.id,
    receiptNumber: payment.receiptNumber ?? '',
    referenceNumber: payment.reference,
    paymentDate: payment.paidAt?.toISOString() ?? payment.createdAt.toISOString(),
    paymentCity: payment.paymentCity ?? payment.agency.city ?? 'Unspecified',
    paymentMethod: payment.method,
    receivedBy:
      payment.receivedBy
        ? `${payment.receivedBy.firstName} ${payment.receivedBy.lastName}`.trim() ||
          payment.receivedBy.email
        : 'Unassigned',
    remarks: payment.description ?? '',
    currentPaymentAmount: Number(payment.amount),
    totalAllocatedAmount: Number(totalAllocatedAmount.toFixed(2)),
    agency: {
      id: payment.agency.id,
      agencyName: payment.agency.name,
      agentNumber: payment.agency.code,
      country: payment.agency.country ?? 'Unspecified',
      city: payment.agency.city ?? 'Unspecified',
    },
    groups: payment.paymentGroups.map((paymentGroup) => ({
      groupId: paymentGroup.group.id,
      groupNumber: paymentGroup.group.code,
      groupName: paymentGroup.group.name,
      passengers: paymentGroup.group.travelerCount,
      groupTotalAmount: Number(paymentGroup.group.totalAmount ?? 0),
      allocatedAmount: Number(paymentGroup.allocatedAmount),
    })),
  }
}

export type PaymentReceipt = ReturnType<typeof serializeReceipt>

export async function listPayments(authUser: AuthenticatedUser, query: PaymentListQuery) {
  const where: Prisma.PaymentWhereInput = {
    ...(isSuperAdmin(authUser)
      ? {}
      : {
          agencyId: authUser.agencyId,
        }),
    ...(isSuperAdmin(authUser) && query.agencyId ? { agencyId: query.agencyId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.method ? { method: query.method } : {}),
    ...(query.receivedByUserId ? { receivedByUserId: query.receivedByUserId } : {}),
    ...(query.search
      ? {
          OR: [
            { reference: { contains: query.search, mode: 'insensitive' } },
            { receiptNumber: { contains: query.search, mode: 'insensitive' } },
            { paymentCity: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
            { agency: { name: { contains: query.search, mode: 'insensitive' } } },
            { agency: { city: { contains: query.search, mode: 'insensitive' } } },
            { paymentGroups: { some: { group: { code: { contains: query.search, mode: 'insensitive' } } } } },
            { receivedBy: { firstName: { contains: query.search, mode: 'insensitive' } } },
            { receivedBy: { lastName: { contains: query.search, mode: 'insensitive' } } },
            { receivedBy: { email: { contains: query.search, mode: 'insensitive' } } },
          ],
        }
      : {}),
    ...((query.minAmount || query.maxAmount) && {
      amount: {
        ...(query.minAmount ? { gte: query.minAmount } : {}),
        ...(query.maxAmount ? { lte: query.maxAmount } : {}),
      },
    }),
    ...((query.paidAtFrom || query.paidAtTo) && {
      paidAt: {
        ...(query.paidAtFrom ? { gte: query.paidAtFrom } : {}),
        ...(query.paidAtTo ? { lte: query.paidAtTo } : {}),
      },
    }),
  }

  const { skip, take } = getPaginationParams(query.page, query.pageSize)

  const [total, payments] = await prisma.$transaction([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      include: paymentInclude,
      orderBy: {
        [query.sortBy]: query.sortOrder,
      },
      skip,
      take,
    }),
  ])

  return buildPaginatedResult(
    payments.map(serializePayment),
    query.page,
    query.pageSize,
    total,
  )
}

export async function getPaymentById(id: string, authUser: AuthenticatedUser) {
  const payment = await prisma.payment.findUnique({
    where: {
      id,
    },
    include: paymentInclude,
  })

  if (!payment || (!isSuperAdmin(authUser) && payment.agencyId !== authUser.agencyId)) {
    throw new AppError('Payment not found', 404)
  }

  return serializePayment(payment)
}

export async function createPayment(data: CreatePaymentInput, authUser: AuthenticatedUser) {
  if (!isSuperAdmin(authUser) && data.agencyId !== authUser.agencyId) {
    throw new AppError('You can only create payments inside your own agency', 403)
  }

  const normalizedReference = normalizeReference(String(data.reference))
  await ensureUniqueReference(normalizedReference)

  const initialStatus =
    data.status && isExceptionalPaymentStatus(data.status)
      ? data.status
      : getDerivedPaymentStatus(Number(data.amount), 0)

  const payment = await prisma.payment.create({
    data: {
      ...data,
      reference: normalizedReference,
      paymentCity: normalizeOptionalString(data.paymentCity?.toString()),
      description: normalizeOptionalString(data.description?.toString()),
    },
    include: paymentInclude,
  })

  if (payment.status !== initialStatus) {
    const updatedPayment = await prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: initialStatus,
      },
      include: paymentInclude,
    })

    return serializePayment(updatedPayment)
  }

  return serializePayment(payment)
}

export async function updatePayment(
  id: string,
  data: UpdatePaymentInput,
  authUser: AuthenticatedUser,
) {
  const existingPayment = await prisma.payment.findUnique({
    where: {
      id,
    },
    include: paymentInclude,
  })

  if (
    !existingPayment ||
    (!isSuperAdmin(authUser) && existingPayment.agencyId !== authUser.agencyId)
  ) {
    throw new AppError('Payment not found', 404)
  }

  const normalizedReference =
    typeof data.reference === 'string' ? normalizeReference(data.reference) : undefined

  if (normalizedReference) {
    await ensureUniqueReference(normalizedReference, id)
  }

  const nextAmount = data.amount ? Number(data.amount) : Number(existingPayment.amount)
  const allocatedAmount = sumAllocatedAmount(existingPayment.paymentGroups)

  if (nextAmount < allocatedAmount) {
    throw new AppError('Payment amount cannot be lower than the allocated total', 400, {
      allocatedAmount,
    })
  }

  const requestedStatus = typeof data.status === 'string' ? data.status : undefined

  if (
    requestedStatus &&
    isExceptionalPaymentStatus(requestedStatus) &&
    existingPayment.paymentGroups.length > 0
  ) {
    throw new AppError('Allocated payments cannot be marked as failed or refunded', 400)
  }

  const nextStatus =
    requestedStatus && isExceptionalPaymentStatus(requestedStatus)
      ? requestedStatus
      : getDerivedPaymentStatus(nextAmount, allocatedAmount)

  const payment = await prisma.payment.update({
    where: {
      id,
    },
    data: {
      ...data,
      ...(normalizedReference ? { reference: normalizedReference } : {}),
      ...(typeof data.paymentCity === 'string'
        ? { paymentCity: normalizeOptionalString(data.paymentCity) }
        : {}),
      ...(typeof data.description === 'string'
        ? { description: normalizeOptionalString(data.description) }
        : {}),
      status: nextStatus,
    },
    include: paymentInclude,
  })

  return serializePayment(payment)
}

export async function listPaymentEntryGroups(agencyId: string, authUser: AuthenticatedUser) {
  if (!isSuperAdmin(authUser) && agencyId !== authUser.agencyId) {
    throw new AppError('You can only create payments inside your own agency', 403)
  }

  const agency = await prisma.agency.findUnique({
    where: {
      id: agencyId,
    },
    select: {
      id: true,
      name: true,
      code: true,
      city: true,
      country: true,
    },
  })

  if (!agency) {
    throw new AppError('Agency not found', 404)
  }

  const groups = await prisma.group.findMany({
    where: {
      agencyId,
    },
    select: {
      id: true,
      code: true,
      name: true,
      travelerCount: true,
      totalAmount: true,
      paymentGroups: {
        select: {
          allocatedAmount: true,
        },
      },
    },
    orderBy: {
      code: 'asc',
    },
  })

  const rows = groups
    .map((group) => {
      const totalAmount = Number(group.totalAmount ?? 0)
      const paidAmount = Number(sumAllocatedAmount(group.paymentGroups).toFixed(2))
      const remainingAmount = Number((totalAmount - paidAmount).toFixed(2))
      const settlementStatus = getGroupSettlementStatus(totalAmount, paidAmount)

      return {
        groupId: group.id,
        groupNumber: group.code,
        groupName: group.name,
        passengers: group.travelerCount,
        totalAmount,
        paidAmount,
        remainingAmount,
        status: settlementStatus,
        statusLabel: getGroupSettlementLabel(settlementStatus),
      }
    })
    .filter((group) => group.remainingAmount > 0)

  return {
    agency: {
      id: agency.id,
      agencyName: agency.name,
      agentNumber: agency.code,
      city: agency.city ?? 'Unspecified',
      country: agency.country ?? 'Unspecified',
    },
    groups: rows,
  }
}

export async function createPaymentEntry(data: PaymentEntryInput, authUser: AuthenticatedUser) {
  if (!isSuperAdmin(authUser) && data.agencyId !== authUser.agencyId) {
    throw new AppError('You can only create payments inside your own agency', 403)
  }

  const normalizedReference = normalizeReference(data.reference)
  const paymentDate = new Date(data.paymentDate)
  const paymentCity = data.paymentCity.trim()
  const remarks = normalizeOptionalString(data.remarks)
  const selectedGroupIds = data.selectedGroups.map((group) => group.groupId)

  if (new Set(selectedGroupIds).size !== selectedGroupIds.length) {
    throw new AppError('A group can only be selected once per payment.', 400)
  }

  return prisma.$transaction(async (transaction) => {
    await ensureUniqueReference(normalizedReference, undefined, transaction)

    const agency = await transaction.agency.findUnique({
      where: {
        id: data.agencyId,
      },
      select: {
        id: true,
        name: true,
        code: true,
        city: true,
        country: true,
      },
    })

    if (!agency) {
      throw new AppError('Agency not found', 404)
    }

    const groups = await transaction.group.findMany({
      where: {
        agencyId: data.agencyId,
        id: {
          in: selectedGroupIds,
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
        travelerCount: true,
        totalAmount: true,
        paymentGroups: {
          select: {
            allocatedAmount: true,
          },
        },
      },
    })

    if (groups.length !== selectedGroupIds.length) {
      throw new AppError('One or more selected groups could not be found for this agency.', 404)
    }

    const groupsById = new Map(groups.map((group) => [group.id, group]))
    const orderedGroups = selectedGroupIds.map((groupId) => groupsById.get(groupId)).filter(Boolean)

    const groupRows = orderedGroups.map((group) => {
      const totalAmount = Number(group!.totalAmount ?? 0)
      const paidAmount = Number(sumAllocatedAmount(group!.paymentGroups).toFixed(2))
      const remainingAmount = Number((totalAmount - paidAmount).toFixed(2))

      if (remainingAmount <= 0) {
        throw new AppError(`Group ${group!.code} is already fully paid.`, 400)
      }

      return {
        groupId: group!.id,
        groupNumber: group!.code,
        groupName: group!.name,
        passengers: group!.travelerCount,
        totalAmount,
        paidAmount,
        remainingAmount,
      }
    })

    const selectedGroupsTotal = Number(
      groupRows.reduce((total, group) => total + group.totalAmount, 0).toFixed(2),
    )
    const alreadyPaid = Number(
      groupRows.reduce((total, group) => total + group.paidAmount, 0).toFixed(2),
    )
    const remainingBeforePayment = Number(
      groupRows.reduce((total, group) => total + group.remainingAmount, 0).toFixed(2),
    )

    if (Number(data.currentPaymentAmount) > remainingBeforePayment) {
      throw new AppError('Payment amount cannot exceed the remaining balance.', 400, {
        remainingBalance: remainingBeforePayment,
      })
    }

    const receiptNumber = buildReceiptNumber(paymentDate)
    const payment = await transaction.payment.create({
      data: {
        agencyId: data.agencyId,
        receivedByUserId: data.receivedByUserId || undefined,
        receiptNumber,
        reference: normalizedReference,
        amount: new Prisma.Decimal(data.currentPaymentAmount),
        currency: 'USD',
        method: data.paymentMethod,
        status: 'PENDING',
        paymentCity,
        description: remarks,
        paidAt: paymentDate,
      },
      include: paymentReceiptInclude,
    })

    let remainingPaymentCents = toCents(data.currentPaymentAmount)
    const allocations: Prisma.PaymentGroupCreateManyInput[] = groupRows.flatMap((group) => {
      if (remainingPaymentCents <= 0) {
        return []
      }

      const allocatedCents = Math.min(remainingPaymentCents, toCents(group.remainingAmount))
      remainingPaymentCents -= allocatedCents

      return [
        {
          id: randomUUID(),
          paymentId: payment.id,
          groupId: group.groupId,
          allocatedAmount: new Prisma.Decimal(fromCents(allocatedCents)),
          notes: 'Auto allocation from professional payment entry.',
        },
      ]
    })

    if (allocations.length === 0) {
      throw new AppError('Current payment amount must be greater than zero.', 400)
    }

    await transaction.paymentGroup.createMany({
      data: allocations,
    })

    const finalizedPayment = await transaction.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: getDerivedPaymentStatus(
          Number(payment.amount),
          Number(payment.amount),
        ) as PaymentStatus,
      },
      include: paymentReceiptInclude,
    })

    return {
      payment: serializePayment(finalizedPayment),
      receipt: serializeReceipt(finalizedPayment),
      summary: {
        selectedGroupsTotal,
        alreadyPaid,
        currentPayment: Number(data.currentPaymentAmount.toFixed(2)),
        remainingBalance: Number(
          (remainingBeforePayment - Number(data.currentPaymentAmount)).toFixed(2),
        ),
      },
    }
  })
}

export async function getPaymentReceipt(id: string, authUser: AuthenticatedUser) {
  const payment = await prisma.payment.findUnique({
    where: {
      id,
    },
    include: paymentReceiptInclude,
  })

  if (!payment || (!isSuperAdmin(authUser) && payment.agencyId !== authUser.agencyId)) {
    throw new AppError('Payment not found', 404)
  }

  return serializeReceipt(payment)
}

export async function deletePayment(id: string, authUser: AuthenticatedUser) {
  const existingPayment = await prisma.payment.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      agencyId: true,
    },
  })

  if (
    !existingPayment ||
    (!isSuperAdmin(authUser) && existingPayment.agencyId !== authUser.agencyId)
  ) {
    throw new AppError('Payment not found', 404)
  }

  await prisma.payment.delete({
    where: {
      id,
    },
  })
}
