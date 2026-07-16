import type { Request, Response } from 'express'
import { AppError } from '../../../common/errors/app-error.js'
import { asyncHandler } from '../../../common/http/async-handler.js'
import {
  createPaymentGroupSchema,
  paymentGroupIdParamsSchema,
  paymentGroupListQuerySchema,
  updatePaymentGroupSchema,
} from '../dto/payment-group.schema.js'
import {
  createPaymentGroup,
  deletePaymentGroup,
  getPaymentGroupById,
  listPaymentGroups,
  updatePaymentGroup,
} from '../application/payment-group.service.js'

function requireAuthUser(request: Request) {
  if (!request.authUser) {
    throw new AppError('Authentication is required', 401)
  }

  return request.authUser
}

export const listPaymentGroupsController = asyncHandler(
  async (request: Request, response: Response) => {
    const query = paymentGroupListQuerySchema.parse(request.query)
    const paymentGroups = await listPaymentGroups(requireAuthUser(request), query)

    return response.status(200).json(paymentGroups)
  },
)

export const getPaymentGroupController = asyncHandler(
  async (request: Request, response: Response) => {
    const { id } = paymentGroupIdParamsSchema.parse(request.params)
    const paymentGroup = await getPaymentGroupById(id, requireAuthUser(request))

    return response.status(200).json({ data: paymentGroup })
  },
)

export const createPaymentGroupController = asyncHandler(
  async (request: Request, response: Response) => {
    const payload = createPaymentGroupSchema.parse(request.body)
    const paymentGroup = await createPaymentGroup(payload, requireAuthUser(request))

    return response.status(201).json({ data: paymentGroup })
  },
)

export const updatePaymentGroupController = asyncHandler(
  async (request: Request, response: Response) => {
    const { id } = paymentGroupIdParamsSchema.parse(request.params)
    const payload = updatePaymentGroupSchema.parse(request.body)
    const paymentGroup = await updatePaymentGroup(id, payload, requireAuthUser(request))

    return response.status(200).json({ data: paymentGroup })
  },
)

export const deletePaymentGroupController = asyncHandler(
  async (request: Request, response: Response) => {
    const { id } = paymentGroupIdParamsSchema.parse(request.params)
    await deletePaymentGroup(id, requireAuthUser(request))

    return response.status(204).send()
  },
)
