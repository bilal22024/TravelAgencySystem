import { z } from 'zod'
import { optionalTrimmedString, requiredTrimmedString, uuidSchema } from '../../../common/validation/primitives.js'

export const locationLookupQuerySchema = z.object({
  search: optionalTrimmedString(120),
  limit: z.coerce.number().int().min(1).max(250).default(100),
})

export const cityLookupQuerySchema = z.object({
  countryId: uuidSchema.optional(),
  search: optionalTrimmedString(120),
  limit: z.coerce.number().int().min(1).max(250).default(100),
})

export const createCitySchema = z.object({
  countryId: uuidSchema,
  name: requiredTrimmedString(120),
})

export type LocationLookupQuery = z.infer<typeof locationLookupQuerySchema>
export type CityLookupQuery = z.infer<typeof cityLookupQuerySchema>
export type CreateCityInput = z.infer<typeof createCitySchema>
