import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiRequest, buildQueryString } from '@/lib/api-client'
import { getFrontendEnvironment } from '@/lib/env'
import { getStoredToken } from '@/lib/storage'
import { queryKeys } from '@/lib/query-keys'
import type {
  AgencyLedger,
  AgencyReport,
  EntityResponse,
  OutstandingBalanceReport,
  ReportSummary,
} from '@/types/api'

const environment = getFrontendEnvironment()

export type ReportQueryParams = {
  year: number
  month?: number
  search?: string
}

export type AgencyReportQueryParams = {
  agencyId?: string
  dateFrom?: string
  dateTo?: string
  groupNumber?: string
  paymentStatus?: 'PENDING' | 'PARTIALLY_ALLOCATED' | 'ALLOCATED' | 'FAILED' | 'REFUNDED'
}

export type AgencyLedgerQueryParams = {
  agencyId?: string
  dateFrom?: string
  dateTo?: string
}

export type OutstandingBalanceReportQueryParams = {
  search?: string
  dateFrom?: string
  dateTo?: string
  paymentStatus?: 'FULLY_PAID' | 'PARTIALLY_PAID' | 'UNPAID'
  sortBy?: 'outstandingBalance' | 'agencyName' | 'lastPaymentDate'
  sortOrder?: 'asc' | 'desc'
}

export async function getReportSummary(params: ReportQueryParams) {
  const response = await apiRequest<EntityResponse<ReportSummary>>(
    `/reports/summary${buildQueryString({
      year: params.year,
      month: params.month,
      search: params.search,
    })}`,
  )

  return response.data
}

export function useReportSummaryQuery(params: ReportQueryParams) {
  return useQuery({
    queryKey: [...queryKeys.reports, params],
    queryFn: () => getReportSummary(params),
    placeholderData: keepPreviousData,
  })
}

export async function getAgencyReport(params: AgencyReportQueryParams) {
  const response = await apiRequest<EntityResponse<AgencyReport>>(
    `/reports/agency${buildQueryString({
      agencyId: params.agencyId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      groupNumber: params.groupNumber,
      paymentStatus: params.paymentStatus,
    })}`,
  )

  return response.data
}

export function useAgencyReportQuery(params: AgencyReportQueryParams, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.agencyReports, params],
    queryFn: () => getAgencyReport(params),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export async function getAgencyLedger(params: AgencyLedgerQueryParams) {
  const response = await apiRequest<EntityResponse<AgencyLedger>>(
    `/reports/agency-ledger${buildQueryString({
      agencyId: params.agencyId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    })}`,
  )

  return response.data
}

export function useAgencyLedgerQuery(params: AgencyLedgerQueryParams, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.agencyLedgers, params],
    queryFn: () => getAgencyLedger(params),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export async function getOutstandingBalanceReport(params: OutstandingBalanceReportQueryParams) {
  const response = await apiRequest<EntityResponse<OutstandingBalanceReport>>(
    `/reports/outstanding-balances${buildQueryString({
      search: params.search,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      paymentStatus: params.paymentStatus,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    })}`,
  )

  return response.data
}

export function useOutstandingBalanceReportQuery(params: OutstandingBalanceReportQueryParams) {
  return useQuery({
    queryKey: [...queryKeys.outstandingBalanceReports, params],
    queryFn: () => getOutstandingBalanceReport(params),
    placeholderData: keepPreviousData,
  })
}

export async function downloadReportExport(
  format: 'csv' | 'excel' | 'pdf',
  params: ReportQueryParams,
) {
  const token = getStoredToken()

  const response = await fetch(
    `${environment.apiBaseUrl}/reports/export/${format}${buildQueryString({
      year: params.year,
      month: params.month,
      search: params.search,
    })}`,
    {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    },
  )

  if (!response.ok) {
    throw new Error('The report export could not be generated.')
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const downloadLink = document.createElement('a')
  const extension = format === 'excel' ? 'xlsx' : format

  downloadLink.href = objectUrl
  downloadLink.download = `travel-agency-report-${params.year}${params.month ? `-${String(params.month).padStart(2, '0')}` : ''}.${extension}`
  document.body.append(downloadLink)
  downloadLink.click()
  downloadLink.remove()
  URL.revokeObjectURL(objectUrl)
}

export async function downloadAgencyReportExport(
  format: 'csv' | 'excel' | 'pdf',
  params: AgencyReportQueryParams & { agencyCode?: string },
) {
  const token = getStoredToken()

  const response = await fetch(
    `${environment.apiBaseUrl}/reports/agency/export/${format}${buildQueryString({
      agencyId: params.agencyId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      groupNumber: params.groupNumber,
      paymentStatus: params.paymentStatus,
    })}`,
    {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    },
  )

  if (!response.ok) {
    throw new Error('The agency report export could not be generated.')
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const downloadLink = document.createElement('a')
  const extension = format === 'excel' ? 'xlsx' : format
  const fileAgencyCode = params.agencyCode?.toLowerCase() ?? 'agency'

  downloadLink.href = objectUrl
  downloadLink.download = `travel-agency-agency-report-${fileAgencyCode}.${extension}`
  document.body.append(downloadLink)
  downloadLink.click()
  downloadLink.remove()
  URL.revokeObjectURL(objectUrl)
}

export async function downloadAgencyLedgerPdf(
  params: AgencyLedgerQueryParams & { agencyCode?: string },
) {
  const token = getStoredToken()

  const response = await fetch(
    `${environment.apiBaseUrl}/reports/agency-ledger/export/pdf${buildQueryString({
      agencyId: params.agencyId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    })}`,
    {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    },
  )

  if (!response.ok) {
    throw new Error('The agency ledger PDF could not be generated.')
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const downloadLink = document.createElement('a')
  const fileAgencyCode = params.agencyCode?.toLowerCase() ?? 'agency'

  downloadLink.href = objectUrl
  downloadLink.download = `travel-agency-agency-ledger-${fileAgencyCode}.pdf`
  document.body.append(downloadLink)
  downloadLink.click()
  downloadLink.remove()
  URL.revokeObjectURL(objectUrl)
}

export async function downloadOutstandingBalanceReportExport(
  format: 'csv' | 'excel' | 'pdf',
  params: OutstandingBalanceReportQueryParams,
) {
  const token = getStoredToken()

  const response = await fetch(
    `${environment.apiBaseUrl}/reports/outstanding-balances/export/${format}${buildQueryString({
      search: params.search,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      paymentStatus: params.paymentStatus,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    })}`,
    {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    },
  )

  if (!response.ok) {
    throw new Error('The outstanding balance report export could not be generated.')
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const downloadLink = document.createElement('a')
  const extension = format === 'excel' ? 'xlsx' : format

  downloadLink.href = objectUrl
  downloadLink.download = `travel-agency-outstanding-balance-report.${extension}`
  document.body.append(downloadLink)
  downloadLink.click()
  downloadLink.remove()
  URL.revokeObjectURL(objectUrl)
}
