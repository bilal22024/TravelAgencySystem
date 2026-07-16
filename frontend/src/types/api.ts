export type UserRole =
  | 'SUPER_ADMIN'
  | 'AGENCY_ADMIN'
  | 'AGENT'
  | 'ACCOUNTANT'
  | 'OPERATIONS'

export type GroupStatus =
  | 'PLANNED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'

export type PaymentMethod =
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'ONLINE'
  | 'CHEQUE'
  | 'OTHER'

export type PaymentStatus =
  | 'PENDING'
  | 'PARTIALLY_ALLOCATED'
  | 'ALLOCATED'
  | 'FAILED'
  | 'REFUNDED'

export type PublicUser = {
  id: string
  agencyId: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  role: UserRole
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

export type Agency = {
  id: string
  name: string
  code: string
  contactEmail: string | null
  contactPhone: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  country: string | null
  postalCode: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type Group = {
  id: string
  agencyId: string
  name: string
  code: string
  amountPerPax: number | string | null
  totalAmount: number | string | null
  description: string | null
  destination: string
  departureDate: string
  returnDate: string
  status: GroupStatus
  travelerCount: number
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type GroupRecord = Group & {
  agency?: Agency | null
  paymentGroups?: PaymentGroup[]
  paidAmount?: number | string
  outstandingBalance?: number | string
  paymentStatus?: GroupPaymentStatus
  paymentStatusLabel?: string
  hasPayments?: boolean
}

export type GroupPaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'FULLY_PAID'

export type GroupPaymentHistoryItem = {
  id: string
  allocatedAmount: number | string
  notes: string | null
  createdAt: string
  updatedAt: string
  payment: {
    id: string
    reference: string
    receiptNumber: string | null
    amount: number | string
    currency: string
    method: PaymentMethod
    status: PaymentStatus
    paymentCity: string | null
    description: string | null
    paidAt: string | null
    createdAt: string
    receivedBy: {
      firstName: string
      lastName: string
      email: string
    } | null
  }
}

export type GroupDetail = GroupRecord & {
  paidAmount: number
  outstandingBalance: number
  paymentStatus: GroupPaymentStatus
  paymentStatusLabel: string
  hasPayments: boolean
  paymentHistory: GroupPaymentHistoryItem[]
}

export type Payment = {
  id: string
  agencyId: string
  receivedByUserId: string | null
  receiptNumber: string | null
  reference: string
  amount: number | string
  currency: string
  method: PaymentMethod
  status: PaymentStatus
  paymentCity: string | null
  description: string | null
  paidAt: string | null
  createdAt: string
  updatedAt: string
}

export type PaymentRecord = Payment & {
  agency?: Agency | null
  receivedBy?: PublicUser | null
  paymentGroups?: PaymentGroup[]
  allocatedAmount: number
  remainingBalance: number
  allocationCount: number
}

export type PaymentGroup = {
  id: string
  paymentId: string
  groupId: string
  allocatedAmount: number | string
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type PaymentAllocation = PaymentGroup & {
  payment?: Payment | null
  group?: Group | null
}

export type PaymentEntryGroupStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'FULLY_PAID'

export type PaymentEntryGroup = {
  groupId: string
  groupNumber: string
  groupName: string
  passengers: number
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  status: PaymentEntryGroupStatus
  statusLabel: string
}

export type PaymentEntryContext = {
  agency: {
    id: string
    agencyName: string
    agentNumber: string
    city: string
    country: string
  }
  groups: PaymentEntryGroup[]
}

export type PaymentReceipt = {
  paymentId: string
  receiptNumber: string
  referenceNumber: string
  paymentDate: string
  paymentCity: string
  paymentMethod: PaymentMethod
  receivedBy: string
  remarks: string
  currentPaymentAmount: number
  totalAllocatedAmount: number
  agency: {
    id: string
    agencyName: string
    agentNumber: string
    country: string
    city: string
  }
  groups: Array<{
    groupId: string
    groupNumber: string
    groupName: string
    passengers: number
    groupTotalAmount: number
    allocatedAmount: number
  }>
}

export type PaymentEntryResult = {
  payment: PaymentRecord
  receipt: PaymentReceipt
  summary: {
    selectedGroupsTotal: number
    alreadyPaid: number
    currentPayment: number
    remainingBalance: number
  }
}

export type ReportTotals = {
  totalRevenue: number
  outstandingBalance: number
  allocatedRevenue: number
  allocationCoverageRate: number
  paymentCount: number
  activeAgencyCount: number
}

export type MonthlyRevenuePoint = {
  month: string
  revenue: number
}

export type CountryRevenuePoint = {
  country: string
  revenue: number
  outstandingBalance: number
}

export type AgencyRevenuePoint = {
  agencyId: string
  agencyName: string
  agencyCode: string
  country: string
  revenue: number
  outstandingBalance: number
  paymentCount: number
}

export type OutstandingBalancePoint = {
  id: string
  reference: string
  currency: string
  status: PaymentStatus
  paidAt: string | null
  effectiveDate: string
  agencyId: string
  agencyName: string
  country: string
  amount: number
  allocatedAmount: number
  remainingBalance: number
}

export type ReportSummary = {
  filters: {
    year: number
    month: number | null
  }
  totals: ReportTotals
  monthlyRevenue: MonthlyRevenuePoint[]
  countryRevenue: CountryRevenuePoint[]
  agencyRevenue: AgencyRevenuePoint[]
  outstandingBalances: OutstandingBalancePoint[]
}

export type AgencyReportBusinessSummary = {
  totalGroups: number
  totalPassengers: number
  pricePerPax: number
  totalAmount: number
  totalAmountPaid: number
  remainingBalance: number
}

export type AgencyReportGroupDetail = {
  groupId: string
  groupNumber: string
  numberOfPax: number
  pricePerPax: number
  groupAmount: number
  paymentStatus: PaymentStatus
}

export type AgencyReportPaymentHistoryItem = {
  id: string
  reference: string
  amountPaid: number
  currency: string
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  paymentDate: string
  paymentCity: string
  receivedBy: string
  remarks: string
  allocatedAmount: number
  remainingBalance: number
  paymentGroups: Array<{
    groupId: string
    groupNumber: string
    allocatedAmount: number
    notes: string | null
  }>
}

export type AgencyReport = {
  filters: {
    agencyId: string
    dateFrom: string | null
    dateTo: string | null
    groupNumber: string | null
    paymentStatus: PaymentStatus | null
  }
  agency: {
    id: string
    agencyName: string
    country: string
    city: string
    agentNumber: string
  }
  businessSummary: AgencyReportBusinessSummary
  groupDetails: AgencyReportGroupDetail[]
  paymentHistory: AgencyReportPaymentHistoryItem[]
  calculations: {
    totalRevenue: number
    totalPaid: number
    outstandingBalance: number
  }
}

export type AgencyLedgerEntry = {
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

export type AgencyLedger = {
  filters: {
    agencyId: string
    dateFrom: string | null
    dateTo: string | null
  }
  agency: {
    id: string
    agencyName: string
    agentNumber: string
    city: string
    country: string
  }
  summary: {
    openingBalance: number
    totalDebits: number
    totalCredits: number
    outstandingBalance: number
  }
  entries: AgencyLedgerEntry[]
}

export type OutstandingBalancePaymentStatus = 'FULLY_PAID' | 'PARTIALLY_PAID' | 'UNPAID'

export type OutstandingBalanceReportRow = {
  agencyId: string
  agencyName: string
  country: string
  city: string
  agentNumber: string
  totalGroups: number
  totalPax: number
  totalAmount: number
  totalAmountPaid: number
  outstandingBalance: number
  paymentStatus: OutstandingBalancePaymentStatus
  paymentStatusLabel: string
  lastPaymentDate: string | null
}

export type OutstandingBalanceReport = {
  filters: {
    search: string | null
    dateFrom: string | null
    dateTo: string | null
    paymentStatus: OutstandingBalancePaymentStatus | null
    sortBy: 'outstandingBalance' | 'agencyName' | 'lastPaymentDate'
    sortOrder: 'asc' | 'desc'
  }
  summary: {
    totalOutstandingAmount: number
    totalFullyPaidAgencies: number
    totalPartiallyPaidAgencies: number
    totalUnpaidAgencies: number
  }
  rows: OutstandingBalanceReportRow[]
}

export type AuthResponse = {
  token: string
  user: PublicUser
}

export type MeResponse = {
  user: PublicUser
}

export type CollectionResponse<T> = {
  data: T[]
}

export type EntityResponse<T> = {
  data: T
}

export type PaginationMeta = {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export type PaginatedCollectionResponse<T> = {
  data: T[]
  meta: PaginationMeta
}
