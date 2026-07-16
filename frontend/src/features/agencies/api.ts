import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest, buildQueryString } from '@/lib/api-client'
import { queryKeys } from '@/lib/query-keys'
import type { Agency, EntityResponse, PaginatedCollectionResponse } from '@/types/api'

export type AgencyPayload = {
  name: string
  code: string
  contactEmail?: string
  contactPhone?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  isActive?: boolean
}

export type AgencyListParams = {
  page: number
  pageSize: number
  search?: string
  isActive?: 'true' | 'false'
  sortBy?: 'name' | 'code' | 'city' | 'country' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

function normalizeAgencyPayload(payload: AgencyPayload) {
  return {
    ...payload,
    code: payload.code.trim().toUpperCase(),
    contactEmail: payload.contactEmail?.trim() || undefined,
    contactPhone: payload.contactPhone?.trim() || undefined,
    addressLine1: payload.addressLine1?.trim() || undefined,
    addressLine2: payload.addressLine2?.trim() || undefined,
    city: payload.city?.trim() || undefined,
    state: payload.state?.trim() || undefined,
    country: payload.country?.trim() || undefined,
    postalCode: payload.postalCode?.trim() || undefined,
  }
}

export async function listAgencies(params: AgencyListParams) {
  return apiRequest<PaginatedCollectionResponse<Agency>>(
    `/agencies${buildQueryString({
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      isActive: params.isActive,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    })}`,
  )
}

async function createAgency(payload: AgencyPayload) {
  const response = await apiRequest<EntityResponse<Agency>>('/agencies', {
    method: 'POST',
    body: normalizeAgencyPayload(payload),
  })

  return response.data
}

async function updateAgency(id: string, payload: AgencyPayload) {
  const response = await apiRequest<EntityResponse<Agency>>(`/agencies/${id}`, {
    method: 'PATCH',
    body: normalizeAgencyPayload(payload),
  })

  return response.data
}

async function deleteAgency(id: string) {
  await apiRequest<void>(`/agencies/${id}`, {
    method: 'DELETE',
  })
}

export function useAgenciesQuery(params: AgencyListParams) {
  return useQuery({
    queryKey: [...queryKeys.agencies, params],
    queryFn: () => listAgencies(params),
    placeholderData: keepPreviousData,
  })
}

export function useCreateAgencyMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createAgency,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.agencies })
    },
  })
}

export function useUpdateAgencyMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AgencyPayload }) =>
      updateAgency(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.agencies })
    },
  })
}

export function useDeleteAgencyMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteAgency,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.agencies })
    },
  })
}
