import { z } from 'zod'
import {
  isoDateSchema,
  moneySchema,
  optionalTrimmedString,
  requiredTrimmedString,
  uuidSchema,
} from '../../../common/validation/primitives.js'
import { pageSchema, pageSizeSchema, sortOrderSchema } from '../../../common/validation/list-query.js'

export const paymentMethodSchema = z.enum([
  'CASH',
  'BANK_TRANSFER',
  'CREDIT_CARD',
  'DEBIT_CARD',
  'ONLINE',
  'CHEQUE',
  'OTHER',
])

export const paymentStatusSchema = z.enum([
  'PENDING',
  'PARTIALLY_ALLOCATED',
  'ALLOCATED',
  'FAILED',
  'REFUNDED',
])

export const paymentSchema = z.object({
  agencyId: uuidSchema,
  receivedByUserId: uuidSchema.optional(),
  reference: requiredTrimmedString(40).regex(/^[A-Z0-9_-]+$/),
  amount: moneySchema,
  currency: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase()),
  method: paymentMethodSchema,
  status: paymentStatusSchema.optional(),
  paymentCity: optionalTrimmedString(120),
  description: optionalTrimmedString(5000),
  paidAt: isoDateSchema.optional(),
})

export const paymentEntryGroupSelectionSchema = z.object({
  groupId: uuidSchema,
})

export const paymentAllocationModeSchema = z.enum(['MANUAL', 'AUTO_OLDEST'])

export const paymentEntryAllocationSchema = z.object({
  groupId: uuidSchema,
  allocatedAmount: moneySchema.optional(),
})

export const paymentEntrySchema = z
  .object({
    agencyId: uuidSchema,
    receivedByUserId: uuidSchema.optional(),
    reference: requiredTrimmedString(40).regex(/^[A-Z0-9_-]+$/),
    paymentDate: isoDateSchema,
    paymentCity: requiredTrimmedString(120),
    paymentMethod: paymentMethodSchema,
    remarks: optionalTrimmedString(5000),
    currentPaymentAmount: moneySchema,
    allocationMode: paymentAllocationModeSchema.default('MANUAL'),
    allocations: z.array(paymentEntryAllocationSchema).min(1).max(100),
    selectedGroups: z.array(paymentEntryGroupSelectionSchema).max(100).optional(),
  })
  .superRefine((value, context) => {
    const selectedIds = value.allocations.map((allocation) => allocation.groupId)

    if (new Set(selectedIds).size !== selectedIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['allocations'],
        message: 'A group can only be selected once per payment.',
      })
    }

    if (value.allocationMode === 'MANUAL') {
      value.allocations.forEach((allocation, index) => {
        if (allocation.allocatedAmount === undefined) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['allocations', index, 'allocatedAmount'],
            message: 'Allocated amount is required for manual allocation.',
          })
        }
      })
    }
  })

export const paymentIdParamsSchema = z.object({
  id: uuidSchema,
})

export const paymentListQuerySchema = z.object({
  search: optionalTrimmedString(120),
  agencyId: uuidSchema.optional(),
  status: paymentStatusSchema.optional(),
  method: paymentMethodSchema.optional(),
  receivedByUserId: uuidSchema.optional(),
  minAmount: z.coerce.number().finite().positive().optional(),
  maxAmount: z.coerce.number().finite().positive().optional(),
  paidAtFrom: isoDateSchema.optional(),
  paidAtTo: isoDateSchema.optional(),
  sortBy: z.enum(['createdAt', 'paidAt', 'amount', 'reference', 'status']).default('createdAt'),
  sortOrder: sortOrderSchema,
  page: pageSchema,
  pageSize: pageSizeSchema,
})

export const paymentEntryGroupQuerySchema = z.object({
  agencyId: uuidSchema,
})

export const createPaymentSchema = paymentSchema
export const updatePaymentSchema = paymentSchema.partial()

export type PaymentInput = z.infer<typeof paymentSchema>
export type PaymentListQuery = z.infer<typeof paymentListQuerySchema>
export type PaymentEntryInput = z.infer<typeof paymentEntrySchema>
