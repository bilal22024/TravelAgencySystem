type AgencyLike = {
  id: string
  name: string
  code: string
  city: string | null
  country: string | null
}

type PaymentGroupLike = {
  id: string
  allocatedAmount: number | string | { toString(): string }
  notes: string | null
  createdAt: Date
  group: {
    code: string
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
  paymentGroups: PaymentGroupLike[]
}

type AgencyLedgerInput = {
  agency: AgencyLike
  payments: PaymentLike[]
  filters: {
    dateFrom?: Date
    dateTo?: Date
  }
}

type LedgerEntryDraft = {
  id: string
  type: 'payment' | 'adjustment'
  date: Date
  description: string
  referenceNumber: string
  debit: number
  credit: number
}

type LedgerEntry = {
  id: string
  type: 'opening_balance' | 'payment' | 'adjustment' | 'outstanding_balance'
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
  return Number((entry.credit - entry.debit).toFixed(2))
}

function compareLedgerEntries(left: LedgerEntryDraft, right: LedgerEntryDraft) {
  const timeDifference = left.date.getTime() - right.date.getTime()

  if (timeDifference !== 0) {
    return timeDifference
  }

  const typeOrder = {
    payment: 0,
    adjustment: 1,
  } satisfies Record<LedgerEntryDraft['type'], number>

  return typeOrder[left.type] - typeOrder[right.type]
}

function buildLedgerEntryDrafts(payments: PaymentLike[]) {
  const entries: LedgerEntryDraft[] = []

  payments.forEach((payment) => {
    const paymentDate = payment.paidAt ?? payment.createdAt
    entries.push({
      id: `payment-${payment.id}`,
      type: 'payment',
      date: paymentDate,
      description: payment.description?.trim() || 'Payment received',
      referenceNumber: payment.reference,
      debit: 0,
      credit: Number(toAmount(payment.amount).toFixed(2)),
    })

    payment.paymentGroups.forEach((paymentGroup) => {
      entries.push({
        id: `adjustment-${paymentGroup.id}`,
        type: 'adjustment',
        date: paymentGroup.createdAt,
        description: paymentGroup.notes?.trim()
          ? `Adjustment - ${paymentGroup.group.code} (${paymentGroup.notes.trim()})`
          : `Adjustment - ${paymentGroup.group.code}`,
        referenceNumber: payment.reference,
        debit: Number(toAmount(paymentGroup.allocatedAmount).toFixed(2)),
        credit: 0,
      })
    })
  })

  return entries.sort(compareLedgerEntries)
}

export type AgencyLedger = ReturnType<typeof buildAgencyLedger>

export function buildAgencyLedger({ agency, payments, filters }: AgencyLedgerInput) {
  const ledgerDrafts = buildLedgerEntryDrafts(payments)

  const openingBalance = ledgerDrafts
    .filter((entry) => isBeforeDate(entry.date, filters.dateFrom))
    .reduce((total, entry) => total + getEntryBalance(entry), 0)

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
    description: 'Outstanding Balance',
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
      outstandingBalance: Number(runningBalance.toFixed(2)),
    },
    entries,
  }
}
