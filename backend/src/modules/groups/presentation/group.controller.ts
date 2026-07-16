import type { Request, Response } from 'express'
import { AppError } from '../../../common/errors/app-error.js'
import { asyncHandler } from '../../../common/http/async-handler.js'
import {
  bulkCreateGroupsSchema,
  createGroupSchema,
  groupIdParamsSchema,
  groupListQuerySchema,
  updateGroupSchema,
} from '../dto/group.schema.js'
import {
  bulkCreateGroups,
  createGroup,
  deleteGroup,
  getGroupById,
  listGroups,
  updateGroup,
} from '../application/group.service.js'

function requireAuthUser(request: Request) {
  if (!request.authUser) {
    throw new AppError('Authentication is required', 401)
  }

  return request.authUser
}

export const listGroupsController = asyncHandler(async (request: Request, response: Response) => {
  const query = groupListQuerySchema.parse(request.query)
  const groups = await listGroups(requireAuthUser(request), query)

  return response.status(200).json(groups)
})

export const getGroupController = asyncHandler(async (request: Request, response: Response) => {
  const { id } = groupIdParamsSchema.parse(request.params)
  const group = await getGroupById(id, requireAuthUser(request))

  return response.status(200).json({ data: group })
})

export const createGroupController = asyncHandler(async (request: Request, response: Response) => {
  const payload = createGroupSchema.parse(request.body)
  const group = await createGroup(payload, requireAuthUser(request))

  return response.status(201).json({ data: group })
})

export const bulkCreateGroupsController = asyncHandler(
  async (request: Request, response: Response) => {
    const payload = bulkCreateGroupsSchema.parse(request.body)
    const result = await bulkCreateGroups(payload, requireAuthUser(request))

    return response.status(201).json({ data: result })
  },
)

export const updateGroupController = asyncHandler(async (request: Request, response: Response) => {
  const { id } = groupIdParamsSchema.parse(request.params)
  const payload = updateGroupSchema.parse(request.body)
  const group = await updateGroup(id, payload, requireAuthUser(request))

  return response.status(200).json({ data: group })
})

export const deleteGroupController = asyncHandler(async (request: Request, response: Response) => {
  const { id } = groupIdParamsSchema.parse(request.params)
  await deleteGroup(id, requireAuthUser(request))

  return response.status(204).send()
})
