import type { Prisma } from '@prisma/client'
import { getPaymentSummary } from '../../payments/application/payment-calculations.js'

type AgencyLike = {
  id: string
  name: string
  code: string
  city: string | null
  country: string | null
}

type GroupStatsLike = {
  agencyId: string
  _count?:
    | {
        _all?: number
      }
    | true
  _sum?: {
    travelerCount?: number | null
  }
}

type PaymentLike = {
  id: string
  agencyId: string
  amount: Prisma.Decimal | number | string | { toString(): string }
  currency: string
  status: 'PENDING' | 'PARTIALLY_ALLOCATED' | 'ALLOCATED' | 'FAILED' | 'REFUNDED'
  paidAt: Date | null
  createdAt: Date
  paymentGroups: Array<{
    allocatedAmount: Prisma.Decimal | number | string | { toString(): string }
  }>
}

type OutstandingBalanceStatus = 'FULLY_PAID' | 'PARTIALLY_PAID' | 'UNPAID'

type OutstandingBalanceReportInput = {
  agencies: AgencyLike[]
  groupStats: GroupStatsLike[]
  payments: PaymentLike[]
  filters: {
    search?: string
    dateFrom?: Date
    dateTo?: Date
    paymentStatus?: OutstandingBalanceStatus
    sortBy: 'outstandingBalance' | 'agencyName' | 'lastPaymentDate'
    sortOrder: 'asc' | 'desc'
  }
}

function toAmount(value: Prisma.Decimal | number | string | { toString(): string }) {
  return Number(value)
}

function getEffectiveDate(payment: PaymentLike) {
  return payment.paidAt ?? payment.createdAt
}

function getOutstandingStatus(totalAmount: number, totalAmountPaid: number, outstandingBalance: number) {
  if (outstandingBalance <= 0) {
    return 'FULLY_PAID' as const
  }

  if (totalAmount <= 0 || totalAmountPaid <= 0) {
    return 'UNPAID' as const
  }

  return 'PARTIALLY_PAID' as const
}

function getStatusLabel(status: OutstandingBalanceStatus) {
  switch (status) {
    case 'FULLY_PAID':
      return 'Fully Paid'
    case 'PARTIALLY_PAID':
      return 'Partially Paid'
    case 'UNPAID':
      return 'Unpaid'
  }
}

function compareValues(
  left: string | number | null,
  right: string | number | null,
  sortOrder: 'asc' | 'desc',
) {
  const direction = sortOrder === 'asc' ? 1 : -1

  if (left === right) {
    return 0
  }

  if (left === null) {
    return 1
  }

  if (right === null) {
    return -1
  }

  if (typeof left === 'number' && typeof right === 'number') {
    return (left - right) * direction
  }

  return String(left).localeCompare(String(right)) * direction
}

export type OutstandingBalanceReport = ReturnType<typeof buildOutstandingBalanceReport>

export function buildOutstandingBalanceReport({
  agencies,
  groupStats,
  payments,
  filters,
}: OutstandingBalanceReportInput) {
  const groupStatsMap = new Map(
    groupStats.map((stat) => [
      stat.agencyId,
      {
        totalGroups: stat._count && typeof stat._count !== 'boolean' ? stat._count._all ?? 0 : 0,
        totalPax: stat._sum?.travelerCount ?? 0,
      },
    ]),
  )
  const paymentMap = new Map<string, PaymentLike[]>()

  payments.forEach((payment) => {
    const bucket = paymentMap.get(payment.agencyId) ?? []
    bucket.push(payment)
    paymentMap.set(payment.agencyId, bucket)
  })

  const rows = agencies
    .map((agency) => {
      const agencyPayments = paymentMap.get(agency.id) ?? []
      const groupSummary = groupStatsMap.get(agency.id) ?? {
        totalGroups: 0,
        totalPax: 0,
      }

      const totals = agencyPayments.reduce(
        (bucket, payment) => {
          const paymentSummary = getPaymentSummary(
            payment.amount.toString(),
            payment.paymentGroups,
            payment.status,
          )

          bucket.totalAmountPaid += Number(toAmount(payment.amount).toFixed(2))
          bucket.totalAmount += paymentSummary.allocatedAmount
          bucket.outstandingBalance += paymentSummary.remainingBalance
          bucket.lastPaymentDate = bucket.lastPaymentDate
            ? new Date(
                Math.max(bucket.lastPaymentDate.getTime(), getEffectiveDate(payment).getTime()),
              )
            : getEffectiveDate(payment)

          return bucket
        },
        {
          totalAmount: 0,
          totalAmountPaid: 0,
          outstandingBalance: 0,
          lastPaymentDate: null as Date | null,
        },
      )

      const paymentStatus = getOutstandingStatus(
        Number(totals.totalAmount.toFixed(2)),
        Number(totals.totalAmountPaid.toFixed(2)),
        Number(totals.outstandingBalance.toFixed(2)),
      )

      return {
        agencyId: agency.id,
        agencyName: agency.name,
        country: agency.country ?? 'Unspecified',
        city: agency.city ?? 'Unspecified',
        agentNumber: agency.code,
        totalGroups: groupSummary.totalGroups,
        totalPax: groupSummary.totalPax,
        totalAmount: Number(totals.totalAmount.toFixed(2)),
        totalAmountPaid: Number(totals.totalAmountPaid.toFixed(2)),
        outstandingBalance: Number(totals.outstandingBalance.toFixed(2)),
        paymentStatus,
        paymentStatusLabel: getStatusLabel(paymentStatus),
        lastPaymentDate: totals.lastPaymentDate?.toISOString() ?? null,
      }
    })
    .filter((row) => {
      if (!paymentMap.has(row.agencyId)) {
        return false
      }

      if (filters.paymentStatus && row.paymentStatus !== filters.paymentStatus) {
        return false
      }

      return true
    })
    .sort((left, right) => {
      switch (filters.sortBy) {
        case 'agencyName':
          return compareValues(left.agencyName, right.agencyName, filters.sortOrder)
        case 'lastPaymentDate':
          return compareValues(left.lastPaymentDate, right.lastPaymentDate, filters.sortOrder)
        case 'outstandingBalance':
        default:
          return compareValues(
            left.outstandingBalance,
            right.outstandingBalance,
            filters.sortOrder,
          )
      }
    })

  const summary = rows.reduce(
    (bucket, row) => {
      bucket.totalOutstandingAmount += row.outstandingBalance

      switch (row.paymentStatus) {
        case 'FULLY_PAID':
          bucket.totalFullyPaidAgencies += 1
          break
        case 'PARTIALLY_PAID':
          bucket.totalPartiallyPaidAgencies += 1
          break
        case 'UNPAID':
          bucket.totalUnpaidAgencies += 1
          break
      }

      return bucket
    },
    {
      totalOutstandingAmount: 0,
      totalFullyPaidAgencies: 0,
      totalPartiallyPaidAgencies: 0,
      totalUnpaidAgencies: 0,
    },
  )

  return {
    filters: {
      search: filters.search ?? null,
      dateFrom: filters.dateFrom?.toISOString() ?? null,
      dateTo: filters.dateTo?.toISOString() ?? null,
      paymentStatus: filters.paymentStatus ?? null,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    },
    summary: {
      totalOutstandingAmount: Number(summary.totalOutstandingAmount.toFixed(2)),
      totalFullyPaidAgencies: summary.totalFullyPaidAgencies,
      totalPartiallyPaidAgencies: summary.totalPartiallyPaidAgencies,
      totalUnpaidAgencies: summary.totalUnpaidAgencies,
    },
    rows,
  }
}
