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

type ReportInput = {
  payments: PaymentLike[]
  agencies: AgencyLike[]
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

export function buildReportSummary({ payments, agencies, year, month }: ReportInput) {
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

  const countryRevenueMap = new Map<string, { revenue: number; outstandingBalance: number }>()
  const agencyRevenueMap = new Map<
    string,
    {
      agencyId: string
      agencyName: string
      agencyCode: string
      country: string
      revenue: number
      outstandingBalance: number
      paymentCount: number
    }
  >()

  paymentSnapshots.forEach((payment) => {
    const countryBucket = countryRevenueMap.get(payment.country) ?? {
      revenue: 0,
      outstandingBalance: 0,
    }
    countryBucket.revenue += payment.amount
    countryBucket.outstandingBalance += payment.remainingBalance
    countryRevenueMap.set(payment.country, countryBucket)

    const agency = agencies.find((item) => item.id === payment.agencyId)
    const agencyBucket = agencyRevenueMap.get(payment.agencyId) ?? {
      agencyId: payment.agencyId,
      agencyName: payment.agencyName,
      agencyCode: agency?.code ?? 'N/A',
      country: payment.country,
      revenue: 0,
      outstandingBalance: 0,
      paymentCount: 0,
    }

    agencyBucket.revenue += payment.amount
    agencyBucket.outstandingBalance += payment.remainingBalance
    agencyBucket.paymentCount += 1
    agencyRevenueMap.set(payment.agencyId, agencyBucket)
  })

  const totalRevenue = paymentSnapshots.reduce((total, payment) => total + payment.amount, 0)
  const totalOutstandingBalance = paymentSnapshots.reduce(
    (total, payment) => total + payment.remainingBalance,
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
    }))
    .sort((left, right) => right.revenue - left.revenue)

  const agencyRevenue = Array.from(agencyRevenueMap.values())
    .map((item) => ({
      ...item,
      revenue: Number(item.revenue.toFixed(2)),
      outstandingBalance: Number(item.outstandingBalance.toFixed(2)),
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
