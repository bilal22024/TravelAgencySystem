import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { apiRequest } from '@/lib/api-client'
import { queryKeys } from '@/lib/query-keys'
import { useAuthStore } from '@/features/auth/store/useAuthStore'
import type { AuthResponse, MeResponse, PublicUser } from '@/types/api'

type LoginPayload = {
  email: string
  password: string
}

export async function login(payload: LoginPayload) {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: payload,
  })
}

export async function getCurrentUser() {
  const response = await apiRequest<MeResponse>('/auth/me')
  return response.user
}

export function useCurrentUserQuery() {
  const token = useAuthStore((state) => state.token)

  return useQuery({
    queryKey: queryKeys.authUser,
    queryFn: getCurrentUser,
    enabled: Boolean(token),
    retry: false,
  })
}

export function useLoginMutation() {
  const queryClient = useQueryClient()
  const setSession = useAuthStore((state) => state.setSession)

  return useMutation({
    mutationFn: login,
    onSuccess: (response) => {
      setSession(response.token, response.user)
      queryClient.setQueryData(queryKeys.authUser, response.user)
    },
  })
}

export function resetAuthenticatedQueries(queryClient: QueryClient, user: PublicUser) {
  queryClient.setQueryData(queryKeys.authUser, user)
  void queryClient.invalidateQueries({
    predicate: (query) =>
      query.queryKey[0] !== queryKeys.authUser[0] && query.queryKey[0] !== 'public',
  })
}
