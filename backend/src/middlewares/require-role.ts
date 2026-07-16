import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../common/errors/app-error.js'

export function requireRole(allowedRoles: string[]) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!request.authUser) {
      return next(new AppError('Authentication is required', 401))
    }

    if (!allowedRoles.includes(request.authUser.role)) {
      return next(new AppError('You do not have permission to perform this action', 403))
    }

    return next()
  }
}
