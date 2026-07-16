import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest, buildQueryString } from '@/lib/api-client'
import { queryKeys } from '@/lib/query-keys'
import type {
  EntityResponse,
  GroupDetail,
  GroupPaymentStatus,
  GroupRecord,
  PaginatedCollectionResponse,
} from '@/types/api'

export type GroupPayload = {
  agencyId: string
  name: string
  code: string
  amountPerPax?: number
  totalAmount?: number
  description?: string
  destination: string
  departureDate: string
  returnDate: string
  status?: GroupRecord['status']
  travelerCount?: number
  notes?: string
}

export type GroupListParams = {
  page: number
  pageSize: number
  search?: string
  agencyId?: string
  country?: string
  city?: string
  status?: GroupRecord['status']
  paymentStatus?: GroupPaymentStatus
  destination?: string
  minPassengers?: number
  maxPassengers?: number
  minAmount?: number
  maxAmount?: number
  departureDateFrom?: string
  departureDateTo?: string
  createdDateFrom?: string
  createdDateTo?: string
  sortBy?:
    | 'code'
    | 'departureDate'
    | 'returnDate'
    | 'createdAt'
    | 'name'
    | 'agencyName'
    | 'country'
    | 'travelerCount'
    | 'amountPerPax'
    | 'totalAmount'
    | 'outstandingBalance'
    | 'status'
  sortOrder?: 'asc' | 'desc'
}

export type BulkGroupEntryPayload = {
  groupNumber: string
  groupName?: string
  pax: number
  amountPerPax: number
}

export type BulkCreateGroupsPayload = {
  agencyId: string
  rows: BulkGroupEntryPayload[]
}

export type BulkCreateGroupsResult = {
  count: number
  groups: GroupRecord[]
}

export type GroupUpdatePayload = Partial<Omit<GroupPayload, 'agencyId'>>

function normalizeGroupPayload(payload: Partial<GroupPayload> | Partial<Omit<GroupPayload, 'agencyId'>>) {
  return {
    ...payload,
    code: payload.code?.trim(),
    name: payload.name?.trim(),
    description: payload.description?.trim() || undefined,
    destination: payload.destination?.trim(),
    notes: payload.notes?.trim() || undefined,
    travelerCount: payload.travelerCount,
  }
}

export async function listGroups(params: GroupListParams) {
  return apiRequest<PaginatedCollectionResponse<GroupRecord>>(
    `/groups${buildQueryString({
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      agencyId: params.agencyId,
      country: params.country,
      city: params.city,
      status: params.status,
      paymentStatus: params.paymentStatus,
      destination: params.destination,
      minPassengers: params.minPassengers,
      maxPassengers: params.maxPassengers,
      minAmount: params.minAmount,
      maxAmount: params.maxAmount,
      departureDateFrom: params.departureDateFrom,
      departureDateTo: params.departureDateTo,
      createdDateFrom: params.createdDateFrom,
      createdDateTo: params.createdDateTo,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    })}`,
  )
}

export async function getGroupDetails(id: string) {
  const response = await apiRequest<EntityResponse<GroupDetail>>(`/groups/${id}`)
  return response.data
}

async function createGroup(payload: GroupPayload) {
  const response = await apiRequest<EntityResponse<GroupRecord>>('/groups', {
    method: 'POST',
    body: normalizeGroupPayload(payload),
  })

  return response.data
}

async function bulkCreateGroups(payload: BulkCreateGroupsPayload) {
  const response = await apiRequest<EntityResponse<BulkCreateGroupsResult>>('/groups/bulk', {
    method: 'POST',
    body: {
      agencyId: payload.agencyId,
      rows: payload.rows.map((row) => ({
        groupNumber: row.groupNumber.trim(),
        groupName: row.groupName?.trim() || undefined,
        pax: row.pax,
        amountPerPax: row.amountPerPax,
      })),
    },
  })

  return response.data
}

async function updateGroup(id: string, payload: GroupUpdatePayload) {
  const response = await apiRequest<EntityResponse<GroupRecord>>(`/groups/${id}`, {
    method: 'PATCH',
    body: normalizeGroupPayload(payload as Omit<GroupPayload, 'agencyId'>),
  })

  return response.data
}

async function deleteGroup(id: string) {
  await apiRequest<void>(`/groups/${id}`, {
    method: 'DELETE',
  })
}

export function useGroupsQuery(params: GroupListParams, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.groups, params],
    queryFn: () => listGroups(params),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useGroupDetailsQuery(id?: string, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.groupDetails, id],
    queryFn: () => getGroupDetails(id ?? ''),
    enabled: enabled && Boolean(id),
  })
}

function invalidateGroupRelatedQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.groups })
  void queryClient.invalidateQueries({ queryKey: queryKeys.groupDetails })
  void queryClient.invalidateQueries({ queryKey: queryKeys.reports })
  void queryClient.invalidateQueries({ queryKey: queryKeys.agencyReports })
  void queryClient.invalidateQueries({ queryKey: queryKeys.agencyLedgers })
  void queryClient.invalidateQueries({ queryKey: queryKeys.outstandingBalanceReports })
}

export function useCreateGroupMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createGroup,
    onSuccess: () => {
      invalidateGroupRelatedQueries(queryClient)
    },
  })
}

export function useBulkCreateGroupsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: bulkCreateGroups,
    onSuccess: () => {
      invalidateGroupRelatedQueries(queryClient)
    },
  })
}

export function useUpdateGroupMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: GroupUpdatePayload }) =>
      updateGroup(id, payload),
    onSuccess: () => {
      invalidateGroupRelatedQueries(queryClient)
    },
  })
}

export function useDeleteGroupMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteGroup,
    onSuccess: () => {
      invalidateGroupRelatedQueries(queryClient)
    },
  })
}
