import { describe, expect, it } from 'vitest'
import { buildQueryString } from '@/lib/api-client'

describe('buildQueryString', () => {
  it('serializes defined values and skips empty ones', () => {
    expect(
      buildQueryString({
        page: 2,
        pageSize: 10,
        search: 'dubai',
        status: '',
        active: true,
      }),
    ).toBe('?page=2&pageSize=10&search=dubai&active=true')
  })
})
