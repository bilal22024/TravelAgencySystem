import { useQuery } from '@tanstack/react-query'
import { apiRequest, buildQueryString } from '@/lib/api-client'
import { queryKeys } from '@/lib/query-keys'
import type {
  CollectionResponse,
  PaginatedCollectionResponse,
  PaymentAllocation,
  PublicUser,
} from '@/types/api'

export async function listUsers() {
  const response = await apiRequest<CollectionResponse<PublicUser>>('/users')
  return response.data
}

export async function listPaymentAllocations() {
  const response = await apiRequest<PaginatedCollectionResponse<PaymentAllocation>>(
    `/payment-groups${buildQueryString({
      page: 1,
      pageSize: 250,
    })}`,
  )
  return response.data
}

export function useUsersQuery() {
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: listUsers,
  })
}

export function usePaymentAllocationsQuery() {
  return useQuery({
    queryKey: queryKeys.paymentGroups,
    queryFn: listPaymentAllocations,
  })
}
