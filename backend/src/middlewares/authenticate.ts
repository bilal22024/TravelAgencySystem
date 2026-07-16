import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../common/errors/app-error.js'
import { verifyAuthToken } from '../lib/jwt.js'

export function authenticate(request: Request, _response: Response, next: NextFunction) {
  const authorizationHeader = request.headers.authorization

  if (!authorizationHeader?.startsWith('Bearer ')) {
    return next(new AppError('Authentication token is required', 401))
  }

  const token = authorizationHeader.replace('Bearer ', '').trim()

  if (!token) {
    return next(new AppError('Authentication token is required', 401))
  }

  try {
    const payload = verifyAuthToken(token)

    request.authUser = {
      id: payload.sub,
      agencyId: payload.agencyId,
      role: payload.role,
      email: payload.email,
    }

    return next()
  } catch {
    return next(new AppError('Invalid or expired authentication token', 401))
  }
}
