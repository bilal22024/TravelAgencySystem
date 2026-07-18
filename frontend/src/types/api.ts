export type UserRole =
  | 'SUPER_ADMIN'
  | 'AGENCY_ADMIN'
  | 'AGENT'
  | 'ACCOUNTANT'
  | 'OPERATIONS'

export type AgencyType = 'PARENT' | 'BRANCH'

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
  parentAgencyId: string | null
  name: string
  code: string
  agencyType: AgencyType
  category: string | null
  openingBalance: number
  primaryContactPerson: string | null
  contactEmail: string | null
  contactPhone: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  country: string | null
  postalCode: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type AgencyPhoneNumber = {
  id: string
  agencyId: string
  label: string | null
  phoneNumber: string
  isPrimary: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type AgencyEmailAddress = {
  id: string
  agencyId: string
  label: string | null
  email: string
  isPrimary: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type AgencyDocument = {
  id: string
  agencyId: string
  documentName: string
  documentType: string | null
  fileUrl: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type AgencyListItem = Agency & {
  parentAgency?: {
    id: string
    name: string
    code: string
    agencyType: AgencyType
  } | null
  branchCount: number
}

export type AgencyLookupItem = {
  id: string
  name: string
  code: string
  agencyType: AgencyType
  category: string | null
  city: string | null
  country: string | null
  isActive: boolean
  parentAgency?: {
    id: string
    name: string
    code: string
  } | null
}

export type AgencyFinancialSummary = {
  totalBranches: number
  totalGroups: number
  totalPax: number
  totalGroupAmount: number
  totalPaymentsReceived: number
  outstandingBalance: number
  advanceBalance: number
  netBalance: number
  scopeAgencyIds: string[]
  includeBranches: boolean
}

export type AgencyBranchSummary = {
  id: string
  name: string
  code: string
  agencyType: AgencyType
  category: string | null
  city: string | null
  country: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count: {
    groups: number
    payments: number
  }
}

export type AgencyDetail = Agency & {
  parentAgency?: {
    id: string
    name: string
    code: string
    agencyType: AgencyType
    category: string | null
  } | null
  branches: AgencyBranchSummary[]
  phoneNumbers: AgencyPhoneNumber[]
  emailAddresses: AgencyEmailAddress[]
  documents: AgencyDocument[]
  branchCount: number
  counts: {
    groups: number
    payments: number
    users: number
  }
  summary: AgencyFinancialSummary
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
  paidByAgencyId?: string
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
  paidByAgency?: Agency | null
  receivedBy?: PublicUser | null
  paymentGroups?: PaymentGroup[]
  allocatedAmount: number
  remainingBalance: number
  allocationCount: number
  advanceBalance: number
  allocatedAgencies?: Array<{
    id: string
    name: string
    code: string
  }>
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
  agencyId: string
  agencyName: string
  agencyCode: string
  passengers: number
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  status: PaymentEntryGroupStatus
  statusLabel: string
  createdAt: string
}

export type PaymentEntryContext = {
  agency: {
    id: string
    agencyName: string
    agentNumber: string
    city: string
    country: string
  }
  allowedAgencyIds: string[]
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
  advanceBalance: number
  agency: {
    id: string
    agencyName: string
    agentNumber: string
    country: string
    city: string
  }
  paidByAgency: {
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
    agencyId: string
    agencyName: string
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
    allocatedAmount: number
    currentPayment: number
    remainingBalance: number
    advanceBalanceCreated: number
  }
}

export type ReportTotals = {
  totalRevenue: number
  outstandingBalance: number
  advanceBalance: number
  netBalance: number
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
  advanceBalance: number
  netBalance: number
}

export type AgencyRevenuePoint = {
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
  advanceBalance: number
  netBalance: number
}

export type AgencyReportGroupDetail = {
  groupId: string
  groupNumber: string
  agencyId: string
  agencyName: string
  agencyCode: string
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
  paidByAgencyName: string
  paidByAgencyCode: string
  receivedBy: string
  remarks: string
  allocatedAmount: number
  remainingBalance: number
  advanceBalance: number
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

export type AgencyReport = {
  filters: {
    agencyId: string
    dateFrom: string | null
    dateTo: string | null
    groupNumber: string | null
    paymentStatus: PaymentStatus | null
    includeBranches: boolean
  }
  agency: {
    id: string
    agencyName: string
    country: string
    city: string
    agentNumber: string
    reportScope: 'SINGLE' | 'CONSOLIDATED'
    scopeAgencyIds: string[]
    branches: Array<{
      id: string
      agencyName: string
      agentNumber: string
      city: string
      country: string
    }>
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
  type: 'opening_balance' | 'group_charge' | 'payment' | 'payment_allocation' | 'adjustment' | 'outstanding_balance'
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
    includeBranches: boolean
  }
  agency: {
    id: string
    agencyName: string
    agentNumber: string
    city: string
    country: string
    reportScope: 'SINGLE' | 'CONSOLIDATED'
    scopeAgencyIds: string[]
    branches: Array<{
      id: string
      agencyName: string
      agentNumber: string
      city: string
      country: string
    }>
  }
  summary: {
    openingBalance: number
    totalDebits: number
    totalCredits: number
    outstandingBalance: number
    advanceBalance: number
    netBalance: number
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
  advanceBalance: number
  netBalance: number
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
