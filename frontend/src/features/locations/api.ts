import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest, buildQueryString } from '@/lib/api-client'
import { queryKeys } from '@/lib/query-keys'
import type { CityLookupItem, CollectionResponse, CountryLookupItem, EntityResponse } from '@/types/api'

export type CountryLookupParams = {
  search?: string
  limit?: number
}

export type CityLookupParams = {
  countryId?: string
  search?: string
  limit?: number
}

export type CreateCityPayload = {
  countryId: string
  name: string
}

export async function listCountries(params: CountryLookupParams) {
  const response = await apiRequest<CollectionResponse<CountryLookupItem>>(
    `/locations/countries${buildQueryString({
      search: params.search,
      limit: params.limit,
    })}`,
  )

  return response.data
}

export async function listCities(params: CityLookupParams) {
  const response = await apiRequest<CollectionResponse<CityLookupItem>>(
    `/locations/cities${buildQueryString({
      countryId: params.countryId,
      search: params.search,
      limit: params.limit,
    })}`,
  )

  return response.data
}

export async function createCity(payload: CreateCityPayload) {
  const response = await apiRequest<EntityResponse<CityLookupItem>>('/locations/cities', {
    method: 'POST',
    body: {
      countryId: payload.countryId,
      name: payload.name.trim(),
    },
  })

  return response.data
}

export function useCountryLookupQuery(params: CountryLookupParams, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.locations, 'countries', params],
    queryFn: () => listCountries(params),
    enabled,
  })
}

export function useCityLookupQuery(params: CityLookupParams, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.locations, 'cities', params],
    queryFn: () => listCities(params),
    enabled,
  })
}

export function useCreateCityMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createCity,
    onSuccess: (createdCity) => {
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.locations, 'countries'] })
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.locations, 'cities'],
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey.includes('cities') &&
          query.queryKey.some((part) => {
            return typeof part === 'object' && part !== null && 'countryId' in part
              ? (part as { countryId?: string }).countryId === createdCity.countryId
              : false
          }),
      })
    },
  })
}
