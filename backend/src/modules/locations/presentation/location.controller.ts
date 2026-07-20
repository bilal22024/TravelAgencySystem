import type { Request, Response } from 'express'
import { asyncHandler } from '../../../common/http/async-handler.js'
import {
  cityLookupQuerySchema,
  createCitySchema,
  locationLookupQuerySchema,
} from '../dto/location.schema.js'
import { createCity, listCities, listCountries } from '../application/location.service.js'

export const listCountriesController = asyncHandler(async (request: Request, response: Response) => {
  const query = locationLookupQuerySchema.parse(request.query)
  const countries = await listCountries(query)

  return response.status(200).json({ data: countries })
})

export const listCitiesController = asyncHandler(async (request: Request, response: Response) => {
  const query = cityLookupQuerySchema.parse(request.query)
  const cities = await listCities(query)

  return response.status(200).json({ data: cities })
})

export const createCityController = asyncHandler(async (request: Request, response: Response) => {
  const payload = createCitySchema.parse(request.body)
  const city = await createCity(payload)

  return response.status(201).json({ data: city })
})
