import { z } from 'zod'
import {
  optionalTrimmedString,
  requiredTrimmedString,
  uuidSchema,
} from '../../../common/validation/primitives.js'
import {
  booleanFilterSchema,
  pageSchema,
  pageSizeSchema,
  sortOrderSchema,
} from '../../../common/validation/list-query.js'

export const agencySchema = z.object({
  name: requiredTrimmedString(120),
  code: requiredTrimmedString(24).regex(/^[A-Z0-9_-]+$/),
  contactEmail: z.string().trim().email().max(255).optional(),
  contactPhone: optionalTrimmedString(30),
  addressLine1: optionalTrimmedString(255),
  addressLine2: optionalTrimmedString(255),
  city: optionalTrimmedString(120),
  state: optionalTrimmedString(120),
  country: optionalTrimmedString(120),
  postalCode: optionalTrimmedString(20),
  isActive: z.boolean().optional(),
})

export const agencyIdParamsSchema = z.object({
  id: uuidSchema,
})

export const agencyListQuerySchema = z.object({
  search: optionalTrimmedString(120),
  isActive: booleanFilterSchema.optional(),
  sortBy: z.enum(['name', 'code', 'city', 'country', 'createdAt']).default('createdAt'),
  sortOrder: sortOrderSchema,
  page: pageSchema,
  pageSize: pageSizeSchema,
})

export const createAgencySchema = agencySchema
export const updateAgencySchema = agencySchema.partial()

export type AgencyInput = z.infer<typeof agencySchema>
export type AgencyListQuery = z.infer<typeof agencyListQuerySchema>
