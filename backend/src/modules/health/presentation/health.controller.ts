import type { Request, Response } from 'express'
import { env } from '../../../config/env.js'
import { getHealthStatus } from '../application/get-health-status.js'

export function getHealthController(_request: Request, response: Response) {
  return response.status(200).json(getHealthStatus(env.NODE_ENV))
}
