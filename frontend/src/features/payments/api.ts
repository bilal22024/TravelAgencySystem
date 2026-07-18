import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getFrontendEnvironment } from '@/lib/env'
import { apiRequest, buildQueryString } from '@/lib/api-client'
import { queryKeys } from '@/lib/query-keys'
import { getStoredToken } from '@/lib/storage'
import type {
  EntityResponse,
  PaginatedCollectionResponse,
  PaymentAllocation,
  PaymentEntryContext,
  PaymentEntryResult,
  PaymentReceipt,
  PaymentRecord,
} from '@/types/api'

export type PaymentPayload = {
  agencyId: string
  receivedByUserId?: string
  reference: string
  amount: number
  currency: string
  method: PaymentRecord['method']
  status?: PaymentRecord['status']
  paymentCity?: string
  description?: string
  paidAt?: string
}

export type PaymentEntryPayload = {
  agencyId: string
  receivedByUserId?: string
  reference: string
  paymentDate: string
  paymentCity: string
  paymentMethod: PaymentRecord['method']
  remarks?: string
  currentPaymentAmount: number
  allocationMode: 'MANUAL' | 'AUTO_OLDEST'
  allocations: Array<{
    groupId: string
    allocatedAmount?: number
  }>
}

export type PaymentListParams = {
  page: number
  pageSize: number
  search?: string
  agencyId?: string
  status?: PaymentRecord['status']
  method?: PaymentRecord['method']
  receivedByUserId?: string
  minAmount?: number
  maxAmount?: number
  paidAtFrom?: string
  paidAtTo?: string
  sortBy?: 'createdAt' | 'paidAt' | 'amount' | 'reference' | 'status'
  sortOrder?: 'asc' | 'desc'
}

export type PaymentAllocationPayload = {
  paymentId: string
  groupId: string
  allocatedAmount: number
  notes?: string
}

function normalizePaymentPayload(payload: PaymentPayload | Omit<PaymentPayload, 'agencyId'>) {
  return {
    ...payload,
    receivedByUserId: payload.receivedByUserId?.trim() || undefined,
    reference: payload.reference.trim().toUpperCase(),
    currency: payload.currency.trim().toUpperCase(),
    paymentCity: payload.paymentCity?.trim() || undefined,
    description: payload.description?.trim() || undefined,
    paidAt: payload.paidAt?.trim() || undefined,
  }
}

export async function getPaymentEntryGroups(agencyId: string) {
  const response = await apiRequest<EntityResponse<PaymentEntryContext>>(
    `/payments/entry-groups${buildQueryString({
      agencyId,
    })}`,
  )

  return response.data
}

export async function listPayments(params: PaymentListParams) {
  return apiRequest<PaginatedCollectionResponse<PaymentRecord>>(
    `/payments${buildQueryString({
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      agencyId: params.agencyId,
      status: params.status,
      method: params.method,
      receivedByUserId: params.receivedByUserId,
      minAmount: params.minAmount,
      maxAmount: params.maxAmount,
      paidAtFrom: params.paidAtFrom,
      paidAtTo: params.paidAtTo,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    })}`,
  )
}

async function createPayment(payload: PaymentPayload) {
  const response = await apiRequest<EntityResponse<PaymentRecord>>('/payments', {
    method: 'POST',
    body: normalizePaymentPayload(payload),
  })

  return response.data
}

async function createPaymentEntry(payload: PaymentEntryPayload) {
  const response = await apiRequest<EntityResponse<PaymentEntryResult>>('/payments/entry', {
    method: 'POST',
    body: {
      agencyId: payload.agencyId,
      receivedByUserId: payload.receivedByUserId?.trim() || undefined,
      reference: payload.reference.trim().toUpperCase(),
      paymentDate: payload.paymentDate,
      paymentCity: payload.paymentCity.trim(),
      paymentMethod: payload.paymentMethod,
      remarks: payload.remarks?.trim() || undefined,
      currentPaymentAmount: payload.currentPaymentAmount,
      allocationMode: payload.allocationMode,
      allocations: payload.allocations,
      selectedGroups: payload.allocations.map((allocation) => ({
        groupId: allocation.groupId,
      })),
    },
  })

  return response.data
}

async function updatePayment(id: string, payload: Omit<PaymentPayload, 'agencyId'>) {
  const response = await apiRequest<EntityResponse<PaymentRecord>>(`/payments/${id}`, {
    method: 'PATCH',
    body: normalizePaymentPayload(payload),
  })

  return response.data
}

async function deletePayment(id: string) {
  await apiRequest<void>(`/payments/${id}`, {
    method: 'DELETE',
  })
}

export async function getPaymentReceipt(id: string) {
  const response = await apiRequest<EntityResponse<PaymentReceipt>>(`/payments/${id}/receipt`)
  return response.data
}

export async function downloadPaymentReceiptPdf(id: string) {
  const environment = getFrontendEnvironment()
  const token = getStoredToken()
  const response = await fetch(`${environment.apiBaseUrl}/payments/${id}/receipt/pdf`, {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
  })

  if (!response.ok) {
    throw new Error('Payment receipt PDF could not be downloaded.')
  }

  const blob = await response.blob()
  const objectUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = `payment-receipt-${id}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(objectUrl)
}

async function createPaymentAllocation(payload: PaymentAllocationPayload) {
  const response = await apiRequest<EntityResponse<PaymentAllocation>>('/payment-groups', {
    method: 'POST',
    body: payload,
  })

  return response.data
}

async function deletePaymentAllocation(id: string) {
  await apiRequest<void>(`/payment-groups/${id}`, {
    method: 'DELETE',
  })
}

export function usePaymentsQuery(params: PaymentListParams) {
  return useQuery({
    queryKey: [...queryKeys.payments, params],
    queryFn: () => listPayments(params),
    placeholderData: keepPreviousData,
  })
}

export function usePaymentEntryGroupsQuery(agencyId?: string, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.paymentEntryGroups, agencyId],
    queryFn: () => getPaymentEntryGroups(agencyId ?? ''),
    enabled: enabled && Boolean(agencyId),
  })
}

export function useCreatePaymentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments })
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports })
      void queryClient.invalidateQueries({ queryKey: queryKeys.agencyReports })
      void queryClient.invalidateQueries({ queryKey: queryKeys.agencyLedgers })
      void queryClient.invalidateQueries({ queryKey: queryKeys.outstandingBalanceReports })
      void queryClient.invalidateQueries({ queryKey: queryKeys.paymentEntryGroups })
    },
  })
}

export function useCreatePaymentEntryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createPaymentEntry,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments })
      void queryClient.invalidateQueries({ queryKey: queryKeys.paymentGroups })
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports })
      void queryClient.invalidateQueries({ queryKey: queryKeys.agencyReports })
      void queryClient.invalidateQueries({ queryKey: queryKeys.agencyLedgers })
      void queryClient.invalidateQueries({ queryKey: queryKeys.outstandingBalanceReports })
      void queryClient.invalidateQueries({ queryKey: queryKeys.paymentEntryGroups })
    },
  })
}

export function useUpdatePaymentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Omit<PaymentPayload, 'agencyId'> }) =>
      updatePayment(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments })
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports })
      void queryClient.invalidateQueries({ queryKey: queryKeys.agencyReports })
      void queryClient.invalidateQueries({ queryKey: queryKeys.agencyLedgers })
      void queryClient.invalidateQueries({ queryKey: queryKeys.outstandingBalanceReports })
      void queryClient.invalidateQueries({ queryKey: queryKeys.paymentEntryGroups })
    },
  })
}

export function useDeletePaymentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deletePayment,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments })
      void queryClient.invalidateQueries({ queryKey: queryKeys.paymentGroups })
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports })
      void queryClient.invalidateQueries({ queryKey: queryKeys.agencyReports })
      void queryClient.invalidateQueries({ queryKey: queryKeys.agencyLedgers })
      void queryClient.invalidateQueries({ queryKey: queryKeys.outstandingBalanceReports })
      void queryClient.invalidateQueries({ queryKey: queryKeys.paymentEntryGroups })
    },
  })
}

export function useCreatePaymentAllocationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createPaymentAllocation,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments })
      void queryClient.invalidateQueries({ queryKey: queryKeys.paymentGroups })
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports })
      void queryClient.invalidateQueries({ queryKey: queryKeys.agencyReports })
      void queryClient.invalidateQueries({ queryKey: queryKeys.agencyLedgers })
      void queryClient.invalidateQueries({ queryKey: queryKeys.outstandingBalanceReports })
      void queryClient.invalidateQueries({ queryKey: queryKeys.paymentEntryGroups })
    },
  })
}

export function useDeletePaymentAllocationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deletePaymentAllocation,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments })
      void queryClient.invalidateQueries({ queryKey: queryKeys.paymentGroups })
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports })
      void queryClient.invalidateQueries({ queryKey: queryKeys.agencyReports })
      void queryClient.invalidateQueries({ queryKey: queryKeys.agencyLedgers })
      void queryClient.invalidateQueries({ queryKey: queryKeys.outstandingBalanceReports })
      void queryClient.invalidateQueries({ queryKey: queryKeys.paymentEntryGroups })
    },
  })
}
