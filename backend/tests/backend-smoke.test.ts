import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app/create-app.js'

describe('backend smoke tests', () => {
  it('serves the OpenAPI document', async () => {
    const response = await request(createApp()).get('/api/openapi.json')

    expect(response.status).toBe(200)
    expect(response.body.info.title).toBe('Travel Agency Management System API')
  })

  it('validates the login payload before hitting the database', async () => {
    const response = await request(createApp()).post('/api/v1/auth/login').send({})

    expect(response.status).toBe(400)
    expect(response.body.message).toBe('Validation failed')
  })

  it('protects secured routes without a token', async () => {
    const response = await request(createApp()).get('/api/v1/users')

    expect(response.status).toBe(401)
    expect(response.body.message).toBe('Authentication token is required')
  })

  it('protects report exports without a token', async () => {
    const response = await request(createApp()).get('/api/v1/reports/export/csv')

    expect(response.status).toBe(401)
    expect(response.body.message).toBe('Authentication token is required')
  })
})
