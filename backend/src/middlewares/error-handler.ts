import type { NextFunction, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import { AppError } from '../common/errors/app-error.js'

export function errorHandler(
  error: Error,
  request: Request,
  response: Response,
  _next: NextFunction,
) {
  if (error instanceof AppError) {
    return response.status(error.statusCode).json({
      message: error.message,
      details: error.details,
    })
  }

  if (error instanceof ZodError) {
    return response.status(400).json({
      message: 'Validation failed',
      details: error.flatten(),
    })
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return response.status(409).json({
        message: 'A unique constraint would be violated by this request',
        details: error.meta,
      })
    }

    if (error.code === 'P2025') {
      return response.status(404).json({
        message: 'The requested record was not found',
      })
    }

    if (error.code === 'P2003') {
      return response.status(409).json({
        message: 'This record cannot be deleted because related records still depend on it',
        details: error.meta,
      })
    }
  }

  console.error(
    JSON.stringify({
      method: request.method,
      path: request.originalUrl,
      message: error.message,
      stack: error.stack,
    }),
  )

  return response.status(500).json({
    message: 'Internal server error',
  })
}
