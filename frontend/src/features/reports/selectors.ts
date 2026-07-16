import type {
  Agency,
  GroupRecord,
  PaymentAllocation,
  PaymentRecord,
  PublicUser,
} from '@/types/api'

export function sumMoney(values: Array<number | string>) {
  return values.reduce<number>((total, value) => total + Number(value), 0)
}

export function getAgencyActivityBreakdown(agencies: Agency[], groups: GroupRecord[]) {
  return agencies.map((agency) => ({
    agency,
    groupCount: groups.filter((group) => group.agencyId === agency.id).length,
  }))
}

export function getGroupStatusBreakdown(groups: GroupRecord[]) {
  return groups.reduce<Record<string, number>>((accumulator, group) => {
    accumulator[group.status] = (accumulator[group.status] ?? 0) + 1
    return accumulator
  }, {})
}

export function getPaymentStatusBreakdown(payments: PaymentRecord[]) {
  return payments.reduce<Record<string, number>>((accumulator, payment) => {
    accumulator[payment.status] = (accumulator[payment.status] ?? 0) + 1
    return accumulator
  }, {})
}

export function getRoleBreakdown(users: PublicUser[]) {
  return users.reduce<Record<string, number>>((accumulator, user) => {
    accumulator[user.role] = (accumulator[user.role] ?? 0) + 1
    return accumulator
  }, {})
}

export function getAllocationCoverage(payments: PaymentRecord[], allocations: PaymentAllocation[]) {
  const allocatedTotal = sumMoney(allocations.map((allocation) => allocation.allocatedAmount))
  const paymentTotal = sumMoney(payments.map((payment) => payment.amount))

  return {
    allocatedTotal,
    paymentTotal,
    coverageRate: paymentTotal > 0 ? allocatedTotal / paymentTotal : 0,
  }
}
