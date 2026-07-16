import type { Request, Response } from 'express'
import { AppError } from '../../../common/errors/app-error.js'
import { asyncHandler } from '../../../common/http/async-handler.js'
import {
  agencyIdParamsSchema,
  agencyListQuerySchema,
  createAgencySchema,
  updateAgencySchema,
} from '../dto/agency.schema.js'
import {
  createAgency,
  deleteAgency,
  getAgencyById,
  listAgencies,
  updateAgency,
} from '../application/agency.service.js'

function requireAuthUser(request: Request) {
  if (!request.authUser) {
    throw new AppError('Authentication is required', 401)
  }

  return request.authUser
}

export const listAgenciesController = asyncHandler(async (request: Request, response: Response) => {
  const query = agencyListQuerySchema.parse(request.query)
  const agencies = await listAgencies(requireAuthUser(request), query)

  return response.status(200).json(agencies)
})

export const getAgencyController = asyncHandler(async (request: Request, response: Response) => {
  const { id } = agencyIdParamsSchema.parse(request.params)
  const agency = await getAgencyById(id, requireAuthUser(request))

  return response.status(200).json({ data: agency })
})

export const createAgencyController = asyncHandler(async (request: Request, response: Response) => {
  const payload = createAgencySchema.parse(request.body)
  const agency = await createAgency(payload)

  return response.status(201).json({ data: agency })
})

export const updateAgencyController = asyncHandler(async (request: Request, response: Response) => {
  const { id } = agencyIdParamsSchema.parse(request.params)
  const payload = updateAgencySchema.parse(request.body)
  const agency = await updateAgency(id, payload)

  return response.status(200).json({ data: agency })
})

export const deleteAgencyController = asyncHandler(async (request: Request, response: Response) => {
  const { id } = agencyIdParamsSchema.parse(request.params)
  await deleteAgency(id)

  return response.status(204).send()
})
