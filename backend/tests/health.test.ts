import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app/create-app.js'

describe('GET /api/v1/health', () => {
  it('returns the service health payload', async () => {
    const response = await request(createApp()).get('/api/v1/health')

    expect(response.status).toBe(200)
    expect(response.body.status).toBe('ok')
    expect(response.body.service).toBe('travel-agency-api')
  })
})
