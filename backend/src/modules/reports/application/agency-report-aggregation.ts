import type {
  PaymentMethod,
  PaymentStatus,
} from '@prisma/client'
import { getPaymentSummary } from '../../payments/application/payment-calculations.js'

type AgencyLike = {
  id: string
  name: string
  code: string
  city: string | null
  country: string | null
}

type GroupLike = {
  id: string
  code: string
  travelerCount: number
}

type PaymentGroupLike = {
  allocatedAmount: number | string | { toString(): string }
  notes: string | null
  group: {
    id: string
    code: string
  }
}

type PaymentLike = {
  id: string
  reference: string
  amount: number | string | { toString(): string }
  currency: string
  method: PaymentMethod
  status: PaymentStatus
  paymentCity: string | null
  description: string | null
  paidAt: Date | null
  createdAt: Date
  agency: AgencyLike
  receivedBy: {
    firstName: string
    lastName: string
    email: string
  } | null
  paymentGroups: PaymentGroupLike[]
}

type AgencyReportInput = {
  agency: AgencyLike
  groups: GroupLike[]
  payments: PaymentLike[]
  filters: {
    dateFrom?: Date
    dateTo?: Date
    groupCode?: string
    paymentStatus?: PaymentStatus
  }
}

type GroupAggregate = {
  groupAmount: number
  statuses: PaymentStatus[]
}

function toAmount(value: number | string | { toString(): string }) {
  return Number(value)
}

function getEffectiveDate(payment: PaymentLike) {
  return payment.paidAt ?? payment.createdAt
}

function matchesDateRange(payment: PaymentLike, dateFrom?: Date, dateTo?: Date) {
  const effectiveDate = getEffectiveDate(payment)

  if (dateFrom && effectiveDate < dateFrom) {
    return false
  }

  if (dateTo && effectiveDate > dateTo) {
    return false
  }

  return true
}

function formatReceivedBy(
  user: {
    firstName: string
    lastName: string
    email: string
  } | null,
) {
  if (!user) {
    return 'Unassigned'
  }

  const fullName = `${user.firstName} ${user.lastName}`.trim()
  return fullName || user.email
}

function deriveGroupPaymentStatus(statuses: PaymentStatus[]) {
  if (statuses.length === 0) {
    return 'PENDING' as PaymentStatus
  }

  if (statuses.every((status) => status === 'ALLOCATED')) {
    return 'ALLOCATED' as PaymentStatus
  }

  if (statuses.every((status) => status === 'FAILED')) {
    return 'FAILED' as PaymentStatus
  }

  if (statuses.every((status) => status === 'REFUNDED')) {
    return 'REFUNDED' as PaymentStatus
  }

  return 'PARTIALLY_ALLOCATED' as PaymentStatus
}

export type AgencyReport = ReturnType<typeof buildAgencyReport>

export function buildAgencyReport({ agency, groups, payments, filters }: AgencyReportInput) {
  const hasPaymentFilters = Boolean(filters.dateFrom || filters.dateTo || filters.paymentStatus)

  const paymentSnapshots = payments
    .filter((payment) => matchesDateRange(payment, filters.dateFrom, filters.dateTo))
    .map((payment) => {
      const summary = getPaymentSummary(
        payment.amount.toString(),
        payment.paymentGroups,
        payment.status,
      )

      return {
        id: payment.id,
        reference: payment.reference,
        amountPaid: Number(toAmount(payment.amount).toFixed(2)),
        currency: payment.currency,
        paymentMethod: payment.method,
        paymentStatus: summary.status,
        paymentDate: payment.paidAt?.toISOString() ?? payment.createdAt.toISOString(),
        paymentCity: payment.paymentCity ?? payment.agency.city ?? 'Unspecified',
        receivedBy: formatReceivedBy(payment.receivedBy),
        remarks: payment.description ?? '-',
        allocatedAmount: summary.allocatedAmount,
        remainingBalance: summary.remainingBalance,
        paymentGroups: payment.paymentGroups.map((paymentGroup) => ({
          groupId: paymentGroup.group.id,
          groupNumber: paymentGroup.group.code,
          allocatedAmount: Number(toAmount(paymentGroup.allocatedAmount).toFixed(2)),
          notes: paymentGroup.notes ?? null,
        })),
      }
    })
    .sort((left, right) => {
      return new Date(right.paymentDate).getTime() - new Date(left.paymentDate).getTime()
    })

  const groupAggregates = new Map<string, GroupAggregate>()

  paymentSnapshots.forEach((payment) => {
    payment.paymentGroups.forEach((paymentGroup) => {
      const bucket = groupAggregates.get(paymentGroup.groupId) ?? {
        groupAmount: 0,
        statuses: [],
      }

      bucket.groupAmount += paymentGroup.allocatedAmount
      bucket.statuses.push(payment.paymentStatus)
      groupAggregates.set(paymentGroup.groupId, bucket)
    })
  })

  const groupDetails = groups
    .filter((group) => {
      if (!hasPaymentFilters) {
        return true
      }

      return groupAggregates.has(group.id)
    })
    .map((group) => {
      const aggregate = groupAggregates.get(group.id)
      const groupAmount = Number((aggregate?.groupAmount ?? 0).toFixed(2))
      const pricePerPax =
        group.travelerCount > 0 ? Number((groupAmount / group.travelerCount).toFixed(2)) : 0

      return {
        groupId: group.id,
        groupNumber: group.code,
        numberOfPax: group.travelerCount,
        pricePerPax,
        groupAmount,
        paymentStatus: deriveGroupPaymentStatus(aggregate?.statuses ?? []),
      }
    })
    .sort((left, right) => left.groupNumber.localeCompare(right.groupNumber))

  const totalPassengers = groupDetails.reduce((total, group) => total + group.numberOfPax, 0)
  const totalAllocatedRevenue = groupDetails.reduce((total, group) => total + group.groupAmount, 0)
  const totalRevenue = paymentSnapshots.reduce((total, payment) => total + payment.amountPaid, 0)
  const outstandingBalance = paymentSnapshots.reduce(
    (total, payment) => total + payment.remainingBalance,
    0,
  )

  return {
    filters: {
      agencyId: agency.id,
      dateFrom: filters.dateFrom?.toISOString() ?? null,
      dateTo: filters.dateTo?.toISOString() ?? null,
      groupNumber: filters.groupCode ?? null,
      paymentStatus: filters.paymentStatus ?? null,
    },
    agency: {
      id: agency.id,
      agencyName: agency.name,
      country: agency.country ?? 'Unspecified',
      city: agency.city ?? 'Unspecified',
      agentNumber: agency.code,
    },
    businessSummary: {
      totalGroups: groupDetails.length,
      totalPassengers,
      pricePerPax:
        totalPassengers > 0 ? Number((totalAllocatedRevenue / totalPassengers).toFixed(2)) : 0,
      totalAmount: Number(totalAllocatedRevenue.toFixed(2)),
      totalAmountPaid: Number(totalRevenue.toFixed(2)),
      remainingBalance: Number(outstandingBalance.toFixed(2)),
    },
    groupDetails,
    paymentHistory: paymentSnapshots,
    calculations: {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalPaid: Number(totalAllocatedRevenue.toFixed(2)),
      outstandingBalance: Number(outstandingBalance.toFixed(2)),
    },
  }
}
