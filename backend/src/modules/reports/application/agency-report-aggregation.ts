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
  totalAmount: number | string | { toString(): string } | null
  agency: {
    id: string
    name: string
    code: string
  }
}

type PaymentGroupLike = {
  allocatedAmount: number | string | { toString(): string }
  notes: string | null
  group: {
    id: string
    code: string
    agencyId: string
    agency: {
      id: string
      name: string
      code: string
    }
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
    includeBranches: boolean
    scopeAgencyIds: string[]
    branches: Array<{
      id: string
      name: string
      code: string
      city: string | null
      country: string | null
    }>
  }
}

type GroupAggregate = {
  groupAmount: number
  statuses: PaymentStatus[]
}

type PaymentHistorySnapshot = {
  id: string
  reference: string
  sourcePaymentAmount: number
  currency: string
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  paymentDate: string
  paymentCity: string
  paidByAgencyId: string
  paidByAgencyName: string
  paidByAgencyCode: string
  receivedBy: string
  remarks: string
  totalAllocatedAmount: number
  allocatedToVisibleScope: number
  remainingSourceBalance: number
  remainingBalanceOwnerAgencyId: string
  remainingBalanceOwnerAgencyName: string
  remainingBalanceOwnerAgencyCode: string
  isOwnedByVisibleScope: boolean
  paymentGroups: Array<{
    groupId: string
    groupNumber: string
    agencyId: string
    agencyName: string
    agencyCode: string
    allocatedAmount: number
    notes: string | null
  }>
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
  const scopeAgencyIdSet = new Set(filters.scopeAgencyIds)
  const paymentSnapshots = payments
    .filter((payment) => matchesDateRange(payment, filters.dateFrom, filters.dateTo))
    .map((payment) => {
      const summary = getPaymentSummary(payment.amount.toString(), payment.paymentGroups, payment.status)
      const visiblePaymentGroups = payment.paymentGroups.filter((paymentGroup) => {
        return scopeAgencyIdSet.has(paymentGroup.group.agencyId)
      })
      const allocatedToVisibleScope = visiblePaymentGroups.reduce((total, paymentGroup) => {
        return total + Number(toAmount(paymentGroup.allocatedAmount).toFixed(2))
      }, 0)
      const isOwnedByVisibleScope = scopeAgencyIdSet.has(payment.agency.id)

      return {
        id: payment.id,
        reference: payment.reference,
        sourcePaymentAmount: Number(toAmount(payment.amount).toFixed(2)),
        currency: payment.currency,
        paymentMethod: payment.method,
        paymentStatus: summary.status,
        paymentDate: payment.paidAt?.toISOString() ?? payment.createdAt.toISOString(),
        paymentCity: payment.paymentCity ?? payment.agency.city ?? 'Unspecified',
        paidByAgencyId: payment.agency.id,
        paidByAgencyName: payment.agency.name,
        paidByAgencyCode: payment.agency.code,
        receivedBy: formatReceivedBy(payment.receivedBy),
        remarks: payment.description ?? '-',
        totalAllocatedAmount: Number(summary.allocatedAmount.toFixed(2)),
        allocatedToVisibleScope: Number(allocatedToVisibleScope.toFixed(2)),
        remainingSourceBalance: Number(summary.remainingBalance.toFixed(2)),
        remainingBalanceOwnerAgencyId: payment.agency.id,
        remainingBalanceOwnerAgencyName: payment.agency.name,
        remainingBalanceOwnerAgencyCode: payment.agency.code,
        isOwnedByVisibleScope,
        paymentGroups: visiblePaymentGroups.map((paymentGroup) => ({
          groupId: paymentGroup.group.id,
          groupNumber: paymentGroup.group.code,
          agencyId: paymentGroup.group.agency.id,
          agencyName: paymentGroup.group.agency.name,
          agencyCode: paymentGroup.group.agency.code,
          allocatedAmount: Number(toAmount(paymentGroup.allocatedAmount).toFixed(2)),
          notes: paymentGroup.notes ?? null,
        })),
      }
    })
    .filter((payment) => (filters.paymentStatus ? payment.paymentStatus === filters.paymentStatus : true))
    .filter((payment) => {
      if (payment.isOwnedByVisibleScope) {
        return true
      }

      return payment.allocatedToVisibleScope > 0
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
    .map((group) => {
      const aggregate = groupAggregates.get(group.id)
      const groupAmount = Number(toAmount(group.totalAmount ?? 0).toFixed(2))
      const allocatedAmount = Number((aggregate?.groupAmount ?? 0).toFixed(2))
      const pricePerPax =
        group.travelerCount > 0 ? Number((groupAmount / group.travelerCount).toFixed(2)) : 0

      return {
        groupId: group.id,
        groupNumber: group.code,
        agencyId: group.agency.id,
        agencyName: group.agency.name,
        agencyCode: group.agency.code,
        numberOfPax: group.travelerCount,
        pricePerPax,
        groupAmount,
        paymentStatus: deriveGroupPaymentStatus(
          allocatedAmount <= 0
            ? []
            : allocatedAmount >= groupAmount
              ? ['ALLOCATED']
              : aggregate?.statuses ?? ['PARTIALLY_ALLOCATED'],
        ),
      }
    })
    .sort((left, right) => left.groupNumber.localeCompare(right.groupNumber))

  const totalPassengers = groupDetails.reduce((total, group) => total + group.numberOfPax, 0)
  const totalGroupAmount = groupDetails.reduce((total, group) => total + group.groupAmount, 0)
  const totalAllocatedToGroups = groupAggregates.size
    ? Array.from(groupAggregates.values()).reduce((total, group) => total + group.groupAmount, 0)
    : 0
  const directPaymentsByAgency = paymentSnapshots.reduce((total, payment) => {
    return total + (payment.isOwnedByVisibleScope ? payment.sourcePaymentAmount : 0)
  }, 0)
  const parentPaymentsAllocatedToAgency = paymentSnapshots.reduce((total, payment) => {
    return total + (!payment.isOwnedByVisibleScope ? payment.allocatedToVisibleScope : 0)
  }, 0)
  const agencyOwnedAdvanceBalance = paymentSnapshots.reduce((total, payment) => {
    return total + (payment.isOwnedByVisibleScope ? payment.remainingSourceBalance : 0)
  }, 0)
  const outstandingBalance = Math.max(totalGroupAmount - totalAllocatedToGroups, 0)
  const netBalance = outstandingBalance - agencyOwnedAdvanceBalance

  return {
    filters: {
      agencyId: agency.id,
      dateFrom: filters.dateFrom?.toISOString() ?? null,
      dateTo: filters.dateTo?.toISOString() ?? null,
      groupNumber: filters.groupCode ?? null,
      paymentStatus: filters.paymentStatus ?? null,
      includeBranches: filters.includeBranches,
    },
    agency: {
      id: agency.id,
      agencyName: agency.name,
      country: agency.country ?? 'Unspecified',
      city: agency.city ?? 'Unspecified',
      agentNumber: agency.code,
      reportScope: filters.includeBranches ? 'CONSOLIDATED' : 'SINGLE',
      scopeAgencyIds: filters.scopeAgencyIds,
      branches: filters.branches.map((branch) => ({
        id: branch.id,
        agencyName: branch.name,
        agentNumber: branch.code,
        city: branch.city ?? 'Unspecified',
        country: branch.country ?? 'Unspecified',
      })),
    },
    businessSummary: {
      totalGroups: groupDetails.length,
      totalPassengers,
      pricePerPax: totalPassengers > 0 ? Number((totalGroupAmount / totalPassengers).toFixed(2)) : 0,
      totalAmount: Number(totalGroupAmount.toFixed(2)),
      totalPaymentsReceived: Number(directPaymentsByAgency.toFixed(2)),
      parentPaymentsAllocatedToAgency: Number(parentPaymentsAllocatedToAgency.toFixed(2)),
      totalAllocatedToGroups: Number(totalAllocatedToGroups.toFixed(2)),
      outstandingBalance: Number(outstandingBalance.toFixed(2)),
      agencyOwnedAdvanceBalance: Number(agencyOwnedAdvanceBalance.toFixed(2)),
      netBalance: Number(netBalance.toFixed(2)),
    },
    groupDetails,
    paymentHistory: paymentSnapshots,
    calculations: {
      totalGroupAmount: Number(totalGroupAmount.toFixed(2)),
      directPaymentsByAgency: Number(directPaymentsByAgency.toFixed(2)),
      parentPaymentsAllocatedToAgency: Number(parentPaymentsAllocatedToAgency.toFixed(2)),
      totalAllocatedToGroups: Number(totalAllocatedToGroups.toFixed(2)),
      outstandingBalance: Number(outstandingBalance.toFixed(2)),
      agencyOwnedAdvanceBalance: Number(agencyOwnedAdvanceBalance.toFixed(2)),
      netBalance: Number(netBalance.toFixed(2)),
    },
  }
}
