import type { Prisma } from '@prisma/client'
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
    totalAmount?: number | string | { toString(): string } | null
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
    group?: {
      agencyId: string
    }
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
        totalAmount: stat._sum?.totalAmount ?? 0,
      },
    ]),
  )
  const paymentMap = new Map<string, PaymentLike[]>()
  const allocatedAmountByAgency = new Map<string, number>()
  const advanceBalanceByAgency = new Map<string, number>()

  payments.forEach((payment) => {
    const touchedAgencyIds = new Set<string>([payment.agencyId])

    payment.paymentGroups.forEach((paymentGroup) => {
      const receivingAgencyId = paymentGroup.group?.agencyId

      if (!receivingAgencyId) {
        return
      }

      touchedAgencyIds.add(receivingAgencyId)
      allocatedAmountByAgency.set(
        receivingAgencyId,
        (allocatedAmountByAgency.get(receivingAgencyId) ?? 0) + toAmount(paymentGroup.allocatedAmount),
      )
    })

    const allocatedAmount = payment.paymentGroups.reduce(
      (total, paymentGroup) => total + toAmount(paymentGroup.allocatedAmount),
      0,
    )
    advanceBalanceByAgency.set(
      payment.agencyId,
      (advanceBalanceByAgency.get(payment.agencyId) ?? 0) + Math.max(toAmount(payment.amount) - allocatedAmount, 0),
    )

    touchedAgencyIds.forEach((agencyId) => {
      const bucket = paymentMap.get(agencyId) ?? []
      bucket.push(payment)
      paymentMap.set(agencyId, bucket)
    })
  })

  const rows = agencies
    .map((agency) => {
      const agencyPayments = paymentMap.get(agency.id) ?? []
      const groupSummary = groupStatsMap.get(agency.id) ?? {
        totalGroups: 0,
        totalPax: 0,
        totalAmount: 0,
      }
      const totalAmount = Number(toAmount(groupSummary.totalAmount ?? 0).toFixed(2))
      const allocatedAmount = Number((allocatedAmountByAgency.get(agency.id) ?? 0).toFixed(2))
      const advanceBalance = Number((advanceBalanceByAgency.get(agency.id) ?? 0).toFixed(2))
      const outstandingBalance = Number(Math.max(totalAmount - allocatedAmount, 0).toFixed(2))
      const netBalance = Number((outstandingBalance - advanceBalance).toFixed(2))
      const totalAmountPaid = Number((allocatedAmount + advanceBalance).toFixed(2))

      const lastPaymentDate = agencyPayments.reduce<Date | null>((latestDate, payment) => {
        const effectiveDate = getEffectiveDate(payment)
        return latestDate && latestDate.getTime() > effectiveDate.getTime() ? latestDate : effectiveDate
      }, null)

      const paymentStatus = getOutstandingStatus(
        totalAmount,
        allocatedAmount,
        outstandingBalance,
      )

      return {
        agencyId: agency.id,
        agencyName: agency.name,
        country: agency.country ?? 'Unspecified',
        city: agency.city ?? 'Unspecified',
        agentNumber: agency.code,
        totalGroups: groupSummary.totalGroups,
        totalPax: groupSummary.totalPax,
        totalAmount,
        totalAmountPaid,
        outstandingBalance,
        advanceBalance,
        netBalance,
        paymentStatus,
        paymentStatusLabel: getStatusLabel(paymentStatus),
        lastPaymentDate: lastPaymentDate?.toISOString() ?? null,
      }
    })
    .filter((row) => {
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
