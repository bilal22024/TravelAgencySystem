type AgencyLike = {
  id: string
  name: string
  code: string
  city: string | null
  country: string | null
  openingBalance: number | string | { toString(): string }
}

type GroupLike = {
  id: string
  code: string
  totalAmount: number | string | { toString(): string } | null
  createdAt: Date
}

type PaymentGroupLike = {
  id: string
  allocatedAmount: number | string | { toString(): string }
  notes: string | null
  createdAt: Date
  group: {
    id: string
    agencyId: string
    code: string
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
  description: string | null
  paidAt: Date | null
  createdAt: Date
  agencyId: string
  agency: {
    id: string
    name: string
    code: string
  }
  paymentGroups: PaymentGroupLike[]
}

type AgencyLedgerInput = {
  agency: AgencyLike
  groups: GroupLike[]
  payments: PaymentLike[]
  filters: {
    dateFrom?: Date
    dateTo?: Date
  }
}

type LedgerEntryDraft = {
  id: string
  type: 'group_charge' | 'payment' | 'payment_allocation' | 'adjustment'
  date: Date
  description: string
  referenceNumber: string
  debit: number
  credit: number
}

type LedgerEntry = {
  id: string
  type:
    | 'opening_balance'
    | 'group_charge'
    | 'payment'
    | 'payment_allocation'
    | 'adjustment'
    | 'outstanding_balance'
  date: string | null
  description: string
  referenceNumber: string
  debit: number
  credit: number
  balance: number
  runningBalance: number
}

function toAmount(value: number | string | { toString(): string }) {
  return Number(value)
}

function isBeforeDate(date: Date, dateFrom?: Date) {
  return Boolean(dateFrom && date < dateFrom)
}

function isAfterDate(date: Date, dateTo?: Date) {
  return Boolean(dateTo && date > dateTo)
}

function matchesDateRange(date: Date, dateFrom?: Date, dateTo?: Date) {
  if (isBeforeDate(date, dateFrom)) {
    return false
  }

  if (isAfterDate(date, dateTo)) {
    return false
  }

  return true
}

function getEntryBalance(entry: Pick<LedgerEntryDraft, 'credit' | 'debit'>) {
  return Number((entry.debit - entry.credit).toFixed(2))
}

function compareLedgerEntries(left: LedgerEntryDraft, right: LedgerEntryDraft) {
  const timeDifference = left.date.getTime() - right.date.getTime()

  if (timeDifference !== 0) {
    return timeDifference
  }

  const typeOrder = {
    group_charge: 0,
    payment: 1,
    payment_allocation: 2,
    adjustment: 3,
  } satisfies Record<LedgerEntryDraft['type'], number>

  return typeOrder[left.type] - typeOrder[right.type]
}

function buildLedgerEntryDrafts(agency: AgencyLike, groups: GroupLike[], payments: PaymentLike[]) {
  const entries: LedgerEntryDraft[] = []

  groups.forEach((group) => {
    entries.push({
      id: `group-charge-${group.id}`,
      type: 'group_charge',
      date: group.createdAt,
      description: `Group Charge - ${group.code}`,
      referenceNumber: group.code,
      debit: Number(toAmount(group.totalAmount ?? 0).toFixed(2)),
      credit: 0,
    })
  })

  payments.forEach((payment) => {
    const paymentDate = payment.paidAt ?? payment.createdAt
    const isOwnPayment = payment.agencyId === agency.id

    if (isOwnPayment) {
      entries.push({
        id: `payment-${payment.id}`,
        type: 'payment',
        date: paymentDate,
        description: payment.description?.trim() || 'Payment received',
        referenceNumber: payment.reference,
        debit: 0,
        credit: Number(toAmount(payment.amount).toFixed(2)),
      })
    }

    payment.paymentGroups.forEach((paymentGroup) => {
      const isIncomingAllocation = payment.agencyId !== agency.id
      const belongsToCurrentAgency = paymentGroup.group.agencyId === agency.id

      if (isOwnPayment && belongsToCurrentAgency) {
        return
      }

      if (!isOwnPayment && !belongsToCurrentAgency) {
        return
      }

      entries.push({
        id: `adjustment-${paymentGroup.id}`,
        type: isIncomingAllocation ? 'payment_allocation' : 'adjustment',
        date: paymentGroup.createdAt,
        description: isIncomingAllocation
          ? paymentGroup.notes?.trim()
            ? `Payment Allocation - ${payment.agency.code} to ${paymentGroup.group.code} (${paymentGroup.notes.trim()})`
            : `Payment Allocation - ${payment.agency.code} to ${paymentGroup.group.code}`
          : paymentGroup.notes?.trim()
            ? `Advance Balance Used - ${paymentGroup.group.agency.code} / ${paymentGroup.group.code} (${paymentGroup.notes.trim()})`
            : `Advance Balance Used - ${paymentGroup.group.agency.code} / ${paymentGroup.group.code}`,
        referenceNumber: payment.reference,
        debit: isIncomingAllocation ? 0 : Number(toAmount(paymentGroup.allocatedAmount).toFixed(2)),
        credit: isIncomingAllocation ? Number(toAmount(paymentGroup.allocatedAmount).toFixed(2)) : 0,
      })
    })
  })

  return entries.sort(compareLedgerEntries)
}

export type AgencyLedger = ReturnType<typeof buildAgencyLedger>

export function buildAgencyLedger({ agency, groups, payments, filters }: AgencyLedgerInput) {
  const ledgerDrafts = buildLedgerEntryDrafts(agency, groups, payments)

  const openingBalance = Number(
    (
      toAmount(agency.openingBalance) +
      ledgerDrafts
    .filter((entry) => isBeforeDate(entry.date, filters.dateFrom))
    .reduce((total, entry) => total + getEntryBalance(entry), 0)
    ).toFixed(2),
  )

  const filteredDrafts = ledgerDrafts.filter((entry) =>
    matchesDateRange(entry.date, filters.dateFrom, filters.dateTo),
  )

  let runningBalance = Number(openingBalance.toFixed(2))
  const entries: LedgerEntry[] = [
    {
      id: 'opening-balance',
      type: 'opening_balance' as const,
      date: filters.dateFrom?.toISOString() ?? null,
      description: 'Opening Balance',
      referenceNumber: '-',
      debit: 0,
      credit: 0,
      balance: Number(openingBalance.toFixed(2)),
      runningBalance: Number(openingBalance.toFixed(2)),
    },
  ]

  filteredDrafts.forEach((entry) => {
    const balance = getEntryBalance(entry)
    runningBalance = Number((runningBalance + balance).toFixed(2))

    entries.push({
      id: entry.id,
      type: entry.type,
      date: entry.date.toISOString(),
      description: entry.description,
      referenceNumber: entry.referenceNumber,
      debit: entry.debit,
      credit: entry.credit,
      balance,
      runningBalance,
    })
  })

  entries.push({
    id: 'outstanding-balance',
    type: 'outstanding_balance' as const,
    date: filters.dateTo?.toISOString() ?? null,
    description: 'Closing Net Balance',
    referenceNumber: '-',
    debit: 0,
    credit: 0,
    balance: Number(runningBalance.toFixed(2)),
    runningBalance: Number(runningBalance.toFixed(2)),
  })

  const totalDebits = filteredDrafts.reduce((total, entry) => total + entry.debit, 0)
  const totalCredits = filteredDrafts.reduce((total, entry) => total + entry.credit, 0)

  return {
    filters: {
      agencyId: agency.id,
      dateFrom: filters.dateFrom?.toISOString() ?? null,
      dateTo: filters.dateTo?.toISOString() ?? null,
    },
    agency: {
      id: agency.id,
      agencyName: agency.name,
      agentNumber: agency.code,
      city: agency.city ?? 'Unspecified',
      country: agency.country ?? 'Unspecified',
    },
    summary: {
      openingBalance: Number(openingBalance.toFixed(2)),
      totalDebits: Number(totalDebits.toFixed(2)),
      totalCredits: Number(totalCredits.toFixed(2)),
      outstandingBalance: Number(Math.max(runningBalance, 0).toFixed(2)),
      advanceBalance: Number(Math.max(-runningBalance, 0).toFixed(2)),
      netBalance: Number(runningBalance.toFixed(2)),
    },
    entries,
  }
}
