import { z } from 'zod'

export const pageSchema = z.coerce.number().int().min(1).default(1)

export const pageSizeSchema = z.coerce.number().int().min(1).max(500).default(10)

export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc')

export const booleanFilterSchema = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .transform((value) => value === true || value === 'true')
