import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AgencyForm } from '@/features/agencies/components/AgencyForm'
import { useAgencyLookupQuery } from '@/features/agencies/api'
import {
  useCityLookupQuery,
  useCountryLookupQuery,
  useCreateCityMutation,
} from '@/features/locations/api'

vi.mock('@/features/agencies/api', () => ({
  useAgencyLookupQuery: vi.fn(),
}))

vi.mock('@/features/locations/api', () => ({
  useCountryLookupQuery: vi.fn(),
  useCityLookupQuery: vi.fn(),
  useCreateCityMutation: vi.fn(),
}))

describe('AgencyForm', () => {
  beforeEach(() => {
    vi.mocked(useAgencyLookupQuery).mockReturnValue({
      data: [],
    } as never)

    vi.mocked(useCountryLookupQuery).mockReturnValue({
      data: [
        { id: 'country-sa', name: 'Saudi Arabia', _count: { cities: 2 } },
        { id: 'country-eg', name: 'Egypt', _count: { cities: 1 } },
      ],
      isPending: false,
    } as never)

    vi.mocked(useCityLookupQuery).mockImplementation(({ countryId }) => {
      const cities =
        countryId === 'country-sa'
          ? [
              {
                  id: 'city-riyadh',
                  name: 'Riyadh',
                  countryId: 'country-sa',
                  country: { id: 'country-sa', name: 'Saudi Arabia' },
                },
                {
                  id: 'city-jeddah',
                  name: 'Jeddah',
                  countryId: 'country-sa',
                  country: { id: 'country-sa', name: 'Saudi Arabia' },
                },
            ]
          : countryId === 'country-eg'
            ? [
                {
                  id: 'city-cairo',
                  name: 'Cairo',
                  countryId: 'country-eg',
                  country: { id: 'country-eg', name: 'Egypt' },
                },
              ]
            : []

      return {
        data: cities,
        isPending: false,
      } as never
    })

    vi.mocked(useCreateCityMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    } as never)
  })

  it('clears the create form after a successful submission', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined)

    render(<AgencyForm onSubmit={handleSubmit} />)

    fireEvent.change(screen.getByLabelText(/agency name/i), {
      target: { value: 'Almuhajir Travel' },
    })
    fireEvent.change(screen.getByLabelText(/agency code/i), {
      target: { value: 'alm-001' },
    })

    fireEvent.click(screen.getByRole('button', { name: /create agency/i }))

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledTimes(1)
    })

    await waitFor(() => {
      expect(screen.getByLabelText(/agency name/i)).toHaveValue('')
      expect(screen.getByLabelText(/agency code/i)).toHaveValue('')
    })
  })

  it('clears the selected city when the country changes', async () => {
    render(<AgencyForm onSubmit={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /country/i }))
    fireEvent.click(screen.getByRole('button', { name: /saudi arabia 2 cities/i }))

    fireEvent.click(screen.getByRole('button', { name: /city/i }))
    fireEvent.click(screen.getByRole('button', { name: /riyadh saudi arabia/i }))

    expect(screen.getByRole('button', { name: /city/i })).toHaveTextContent('Riyadh')

    fireEvent.click(screen.getByRole('button', { name: /country/i }))
    fireEvent.click(screen.getByRole('button', { name: /egypt 1 city/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /city/i })).toHaveTextContent('Select city')
    })
  })
})
