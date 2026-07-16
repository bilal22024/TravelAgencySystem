import { z } from 'zod'
import {
  moneySchema,
  optionalTrimmedString,
  uuidSchema,
} from '../../../common/validation/primitives.js'
import { pageSchema, pageSizeSchema, sortOrderSchema } from '../../../common/validation/list-query.js'

export const paymentGroupSchema = z.object({
  paymentId: uuidSchema,
  groupId: uuidSchema,
  allocatedAmount: moneySchema,
  notes: optionalTrimmedString(5000),
})

export const paymentGroupIdParamsSchema = z.object({
  id: uuidSchema,
})

export const paymentGroupListQuerySchema = z.object({
  paymentId: uuidSchema.optional(),
  groupId: uuidSchema.optional(),
  sortBy: z.enum(['createdAt', 'allocatedAmount']).default('createdAt'),
  sortOrder: sortOrderSchema,
  page: pageSchema.default(1),
  pageSize: pageSizeSchema.default(25),
})

export const createPaymentGroupSchema = paymentGroupSchema
export const updatePaymentGroupSchema = paymentGroupSchema.partial()

export type PaymentGroupInput = z.infer<typeof paymentGroupSchema>
export type PaymentGroupListQuery = z.infer<typeof paymentGroupListQuerySchema>
