import type { PaymentStatus } from '@prisma/client'

type AllocationLike = {
  allocatedAmount: number | string | { toString(): string }
}

export type PaymentSummary = {
  allocatedAmount: number
  remainingBalance: number
  allocationCount: number
  status: PaymentStatus
}

const exceptionalStatuses = new Set<PaymentStatus>(['FAILED', 'REFUNDED'])

export function isExceptionalPaymentStatus(status: PaymentStatus) {
  return exceptionalStatuses.has(status)
}

export function sumAllocatedAmount(allocations: AllocationLike[]) {
  return allocations.reduce<number>((total, allocation) => {
    return total + Number(allocation.allocatedAmount)
  }, 0)
}

export function getDerivedPaymentStatus(amount: number, allocatedAmount: number): PaymentStatus {
  if (allocatedAmount <= 0) {
    return 'PENDING'
  }

  if (allocatedAmount < amount) {
    return 'PARTIALLY_ALLOCATED'
  }

  return 'ALLOCATED'
}

export function getPaymentSummary(
  amount: number | string,
  allocations: AllocationLike[],
  currentStatus?: PaymentStatus,
): PaymentSummary {
  const normalizedAmount = Number(amount)
  const allocatedAmount = sumAllocatedAmount(allocations)
  const remainingBalance = Number((normalizedAmount - allocatedAmount).toFixed(2))
  const status =
    currentStatus && isExceptionalPaymentStatus(currentStatus)
      ? currentStatus
      : getDerivedPaymentStatus(normalizedAmount, allocatedAmount)

  return {
    allocatedAmount: Number(allocatedAmount.toFixed(2)),
    remainingBalance,
    allocationCount: allocations.length,
    status,
  }
}
