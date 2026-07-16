import type { Request, Response } from 'express'
import { AppError } from '../../../common/errors/app-error.js'
import { asyncHandler } from '../../../common/http/async-handler.js'
import { bootstrapSchema, loginSchema } from '../dto/auth.schema.js'
import { bootstrapSystem, getCurrentUser, login } from '../application/auth.service.js'

export const bootstrapController = asyncHandler(async (request: Request, response: Response) => {
  const payload = bootstrapSchema.parse(request.body)
  const result = await bootstrapSystem(payload)

  return response.status(201).json(result)
})

export const loginController = asyncHandler(async (request: Request, response: Response) => {
  const payload = loginSchema.parse(request.body)
  const result = await login(payload)

  return response.status(200).json(result)
})

export const meController = asyncHandler(async (request: Request, response: Response) => {
  if (!request.authUser) {
    throw new AppError('Authentication is required', 401)
  }

  const user = await getCurrentUser(request.authUser.id)

  return response.status(200).json({ user })
})
