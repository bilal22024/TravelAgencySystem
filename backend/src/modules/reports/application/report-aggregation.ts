import type { PaymentStatus } from '@prisma/client'
import { getPaymentSummary } from '../../payments/application/payment-calculations.js'

type AgencyLike = {
  id: string
  name: string
  code: string
  country: string | null
  isActive: boolean
}

type PaymentGroupLike = {
  allocatedAmount: number | string | { toString(): string }
  group: {
    id: string
    agencyId: string
    code: string
  }
}

type PaymentLike = {
  id: string
  reference: string
  amount: number | string | { toString(): string }
  currency: string
  status: PaymentStatus
  paidAt: Date | null
  createdAt: Date
  agencyId: string
  agency: AgencyLike
  paymentGroups: PaymentGroupLike[]
}

type GroupLike = {
  id: string
  agencyId: string
  totalAmount: number | string | { toString(): string } | null
}

type ReportInput = {
  payments: PaymentLike[]
  agencies: AgencyLike[]
  groups: GroupLike[]
  year: number
  month?: number
}

export type ReportSummary = ReturnType<typeof buildReportSummary>

const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' })

function toAmount(value: number | string | { toString(): string }) {
  return Number(value)
}

function getEffectiveDate(payment: PaymentLike) {
  return payment.paidAt ?? payment.createdAt
}

export function buildReportSummary({ payments, agencies, groups, year, month }: ReportInput) {
  const scopedPayments = payments.filter((payment) => {
    const effectiveDate = getEffectiveDate(payment)

    if (effectiveDate.getFullYear() !== year) {
      return false
    }

    if (month && effectiveDate.getMonth() + 1 !== month) {
      return false
    }

    return true
  })

  const paymentSnapshots = scopedPayments.map((payment) => {
    const summary = getPaymentSummary(payment.amount.toString(), payment.paymentGroups, payment.status)
    const effectiveDate = getEffectiveDate(payment)

    return {
      id: payment.id,
      reference: payment.reference,
      currency: payment.currency,
      status: summary.status,
      paidAt: payment.paidAt?.toISOString() ?? null,
      effectiveDate: effectiveDate.toISOString(),
      agencyId: payment.agencyId,
      agencyName: payment.agency.name,
      country: payment.agency.country ?? 'Unspecified',
      amount: Number(toAmount(payment.amount).toFixed(2)),
      allocatedAmount: summary.allocatedAmount,
      remainingBalance: summary.remainingBalance,
    }
  })

  const monthlyRevenue = Array.from({ length: 12 }, (_, index) => {
    const revenue = paymentSnapshots
      .filter((payment) => {
        return new Date(payment.effectiveDate).getMonth() === index
      })
      .reduce((total, payment) => total + payment.amount, 0)

    return {
      month: monthFormatter.format(new Date(year, index, 1)),
      revenue: Number(revenue.toFixed(2)),
    }
  })

  const countryRevenueMap = new Map<
    string,
    { revenue: number; outstandingBalance: number; advanceBalance: number; netBalance: number }
  >()
  const agencyRevenueMap = new Map<
    string,
    {
      agencyId: string
      agencyName: string
      agencyCode: string
      country: string
      revenue: number
      outstandingBalance: number
      advanceBalance: number
      netBalance: number
      paymentCount: number
    }
  >()
  const totalAmountByAgency = new Map<string, number>()
  const allocatedAmountByAgency = new Map<string, number>()
  const advanceBalanceByAgency = new Map<string, number>()

  groups.forEach((group) => {
    totalAmountByAgency.set(
      group.agencyId,
      (totalAmountByAgency.get(group.agencyId) ?? 0) + toAmount(group.totalAmount ?? 0),
    )
  })

  payments.forEach((payment) => {
    const allocatedAmount = payment.paymentGroups.reduce((total, paymentGroup) => {
      return total + toAmount(paymentGroup.allocatedAmount)
    }, 0)

    advanceBalanceByAgency.set(
      payment.agencyId,
      (advanceBalanceByAgency.get(payment.agencyId) ?? 0) + Math.max(toAmount(payment.amount) - allocatedAmount, 0),
    )

    payment.paymentGroups.forEach((paymentGroup) => {
      const agencyId = paymentGroup.group.agencyId
      allocatedAmountByAgency.set(
        agencyId,
        (allocatedAmountByAgency.get(agencyId) ?? 0) + toAmount(paymentGroup.allocatedAmount),
      )
    })
  })

  paymentSnapshots.forEach((payment) => {
    const countryBucket = countryRevenueMap.get(payment.country) ?? {
      revenue: 0,
      outstandingBalance: 0,
      advanceBalance: 0,
      netBalance: 0,
    }
    countryBucket.revenue += payment.amount
    countryRevenueMap.set(payment.country, countryBucket)

    const agency = agencies.find((item) => item.id === payment.agencyId)
    const agencyBucket = agencyRevenueMap.get(payment.agencyId) ?? {
      agencyId: payment.agencyId,
      agencyName: payment.agencyName,
      agencyCode: agency?.code ?? 'N/A',
      country: payment.country,
      revenue: 0,
      outstandingBalance: 0,
      advanceBalance: 0,
      netBalance: 0,
      paymentCount: 0,
    }

    agencyBucket.revenue += payment.amount
    agencyBucket.paymentCount += 1
    agencyRevenueMap.set(payment.agencyId, agencyBucket)
  })

  agencyRevenueMap.forEach((bucket, agencyId) => {
    const totalAmount = totalAmountByAgency.get(agencyId) ?? 0
    const allocatedAmount = allocatedAmountByAgency.get(agencyId) ?? 0
    const advanceBalance = advanceBalanceByAgency.get(agencyId) ?? 0
    bucket.outstandingBalance = Math.max(totalAmount - allocatedAmount, 0)
    bucket.advanceBalance = advanceBalance
    bucket.netBalance = bucket.outstandingBalance - advanceBalance

    const countryBucket = countryRevenueMap.get(bucket.country)
    if (countryBucket) {
      countryBucket.outstandingBalance += bucket.outstandingBalance
      countryBucket.advanceBalance += bucket.advanceBalance
      countryBucket.netBalance += bucket.netBalance
    }
  })

  const totalRevenue = paymentSnapshots.reduce((total, payment) => total + payment.amount, 0)
  const totalOutstandingBalance = Array.from(agencyRevenueMap.values()).reduce(
    (total, agency) => total + agency.outstandingBalance,
    0,
  )
  const totalAdvanceBalance = Array.from(agencyRevenueMap.values()).reduce(
    (total, agency) => total + agency.advanceBalance,
    0,
  )
  const totalAllocated = paymentSnapshots.reduce(
    (total, payment) => total + payment.allocatedAmount,
    0,
  )

  const countryRevenue = Array.from(countryRevenueMap.entries())
    .map(([country, values]) => ({
      country,
      revenue: Number(values.revenue.toFixed(2)),
      outstandingBalance: Number(values.outstandingBalance.toFixed(2)),
      advanceBalance: Number(values.advanceBalance.toFixed(2)),
      netBalance: Number(values.netBalance.toFixed(2)),
    }))
    .sort((left, right) => right.revenue - left.revenue)

  const agencyRevenue = Array.from(agencyRevenueMap.values())
    .map((item) => ({
      ...item,
      revenue: Number(item.revenue.toFixed(2)),
      outstandingBalance: Number(item.outstandingBalance.toFixed(2)),
      advanceBalance: Number(item.advanceBalance.toFixed(2)),
      netBalance: Number(item.netBalance.toFixed(2)),
    }))
    .sort((left, right) => right.revenue - left.revenue)

  const outstandingBalances = paymentSnapshots
    .filter((payment) => payment.remainingBalance > 0)
    .sort((left, right) => right.remainingBalance - left.remainingBalance)

  return {
    filters: {
      year,
      month: month ?? null,
    },
    totals: {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      outstandingBalance: Number(totalOutstandingBalance.toFixed(2)),
      advanceBalance: Number(totalAdvanceBalance.toFixed(2)),
      netBalance: Number((totalOutstandingBalance - totalAdvanceBalance).toFixed(2)),
      allocatedRevenue: Number(totalAllocated.toFixed(2)),
      allocationCoverageRate: totalRevenue > 0 ? Number((totalAllocated / totalRevenue).toFixed(4)) : 0,
      paymentCount: paymentSnapshots.length,
      activeAgencyCount: agencies.filter((agency) => agency.isActive).length,
    },
    monthlyRevenue,
    countryRevenue,
    agencyRevenue,
    outstandingBalances,
  }
}
