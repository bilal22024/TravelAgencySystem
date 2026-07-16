import type { Request, Response } from 'express'
import { AppError } from '../../../common/errors/app-error.js'
import { asyncHandler } from '../../../common/http/async-handler.js'
import {
  createUserSchema,
  updateUserSchema,
  userIdParamsSchema,
} from '../dto/user.schema.js'
import {
  createUser,
  deleteUser,
  getUserById,
  listUsers,
  updateUser,
} from '../application/user.service.js'

function requireAuthUser(request: Request) {
  if (!request.authUser) {
    throw new AppError('Authentication is required', 401)
  }

  return request.authUser
}

export const listUsersController = asyncHandler(async (request: Request, response: Response) => {
  const users = await listUsers(requireAuthUser(request))

  return response.status(200).json({ data: users })
})

export const getUserController = asyncHandler(async (request: Request, response: Response) => {
  const { id } = userIdParamsSchema.parse(request.params)
  const user = await getUserById(id, requireAuthUser(request))

  return response.status(200).json({ data: user })
})

export const createUserController = asyncHandler(async (request: Request, response: Response) => {
  const payload = createUserSchema.parse(request.body)
  const user = await createUser(payload, requireAuthUser(request))

  return response.status(201).json({ data: user })
})

export const updateUserController = asyncHandler(async (request: Request, response: Response) => {
  const { id } = userIdParamsSchema.parse(request.params)
  const payload = updateUserSchema.parse(request.body)
  const user = await updateUser(id, payload, requireAuthUser(request))

  return response.status(200).json({ data: user })
})

export const deleteUserController = asyncHandler(async (request: Request, response: Response) => {
  const { id } = userIdParamsSchema.parse(request.params)
  await deleteUser(id, requireAuthUser(request))

  return response.status(204).send()
})
