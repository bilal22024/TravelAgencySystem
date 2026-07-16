import { z } from 'zod'
import {
  isoDateSchema,
  moneySchema,
  nonNegativeIntegerSchema,
  optionalTrimmedString,
  requiredTrimmedString,
  uuidSchema,
} from '../../../common/validation/primitives.js'
import { pageSchema, pageSizeSchema, sortOrderSchema } from '../../../common/validation/list-query.js'

export const groupStatusSchema = z.enum([
  'PLANNED',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
])

export const groupPaymentStatusSchema = z.enum(['UNPAID', 'PARTIALLY_PAID', 'FULLY_PAID'])

const numericGroupNumberSchema = requiredTrimmedString(30).regex(/^\d+$/, {
  message: 'Group Number must contain numbers only.',
})

const groupBaseSchema = z.object({
  agencyId: uuidSchema,
  name: requiredTrimmedString(120),
  code: numericGroupNumberSchema,
  amountPerPax: moneySchema.optional(),
  description: optionalTrimmedString(5000),
  destination: requiredTrimmedString(120),
  departureDate: isoDateSchema,
  returnDate: isoDateSchema,
  status: groupStatusSchema.optional(),
  travelerCount: nonNegativeIntegerSchema.refine((value) => value > 0, {
    message: 'Passengers must be greater than zero.',
  }).optional(),
  notes: optionalTrimmedString(5000),
})

export const groupSchema = groupBaseSchema
  .refine((value) => value.returnDate >= value.departureDate, {
    message: 'Return date must be on or after departure date',
    path: ['returnDate'],
  })

export const groupIdParamsSchema = z.object({
  id: uuidSchema,
})

export const groupListQuerySchema = z.object({
  search: optionalTrimmedString(120),
  agencyId: uuidSchema.optional(),
  country: optionalTrimmedString(120),
  city: optionalTrimmedString(120),
  status: groupStatusSchema.optional(),
  paymentStatus: groupPaymentStatusSchema.optional(),
  destination: optionalTrimmedString(120),
  minPassengers: z.coerce.number().int().positive().optional(),
  maxPassengers: z.coerce.number().int().positive().optional(),
  minAmount: moneySchema.optional(),
  maxAmount: moneySchema.optional(),
  departureDateFrom: isoDateSchema.optional(),
  departureDateTo: isoDateSchema.optional(),
  createdDateFrom: isoDateSchema.optional(),
  createdDateTo: isoDateSchema.optional(),
  sortBy: z
    .enum([
      'code',
      'name',
      'agencyName',
      'country',
      'travelerCount',
      'amountPerPax',
      'totalAmount',
      'outstandingBalance',
      'createdAt',
      'departureDate',
      'returnDate',
      'status',
    ])
    .default('createdAt'),
  sortOrder: sortOrderSchema.default('asc'),
  page: pageSchema,
  pageSize: pageSizeSchema,
})
  .refine(
    (value) => !value.maxPassengers || !value.minPassengers || value.maxPassengers >= value.minPassengers,
    {
      message: 'Maximum passengers must be greater than or equal to minimum passengers.',
      path: ['maxPassengers'],
    },
  )
  .refine((value) => !value.maxAmount || !value.minAmount || value.maxAmount >= value.minAmount, {
    message: 'Maximum amount must be greater than or equal to minimum amount.',
    path: ['maxAmount'],
  })
  .refine(
    (value) =>
      !value.departureDateFrom ||
      !value.departureDateTo ||
      value.departureDateTo >= value.departureDateFrom,
    {
      message: 'Departure end date must be on or after departure start date.',
      path: ['departureDateTo'],
    },
  )
  .refine(
    (value) =>
      !value.createdDateFrom ||
      !value.createdDateTo ||
      value.createdDateTo >= value.createdDateFrom,
    {
      message: 'Created end date must be on or after created start date.',
      path: ['createdDateTo'],
    },
  )

export const createGroupSchema = groupSchema

export const bulkGroupEntryRowSchema = z.object({
  groupNumber: numericGroupNumberSchema,
  groupName: optionalTrimmedString(120),
  pax: z.coerce.number().int().gt(0),
  amountPerPax: moneySchema,
})

export const bulkCreateGroupsSchema = z
  .object({
    agencyId: uuidSchema,
    rows: z.array(bulkGroupEntryRowSchema).min(1).max(200),
  })
  .superRefine((value, context) => {
    const seenGroupNumbers = new Map<string, number>()

    value.rows.forEach((row, index) => {
      const normalizedGroupNumber = row.groupNumber.trim()
      const previousIndex = seenGroupNumbers.get(normalizedGroupNumber)

      if (previousIndex !== undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rows', index, 'groupNumber'],
          message: `Duplicate group number in this batch (also used on row ${previousIndex + 1})`,
        })
        return
      }

      seenGroupNumbers.set(normalizedGroupNumber, index)
    })
  })

const updateGroupBaseSchema = groupBaseSchema.omit({ agencyId: true }).partial()
type UpdateGroupInput = z.infer<typeof updateGroupBaseSchema>

export const updateGroupSchema = updateGroupBaseSchema
  .refine(
    (value: UpdateGroupInput) =>
      !value.departureDate || !value.returnDate || value.returnDate >= value.departureDate,
    {
      message: 'Return date must be on or after departure date',
      path: ['returnDate'],
    },
  )
  .refine(
    (value: UpdateGroupInput) =>
      value.travelerCount === undefined || value.travelerCount > 0,
    {
      message: 'Passengers must be greater than zero.',
      path: ['travelerCount'],
    },
  )
  .refine(
    (value: UpdateGroupInput) =>
      value.amountPerPax === undefined || value.amountPerPax > 0,
    {
      message: 'Amount Per Pax must be greater than zero.',
      path: ['amountPerPax'],
    },
  )

export type GroupInput = z.infer<typeof groupSchema>
export type GroupListQuery = z.infer<typeof groupListQuerySchema>
export type BulkCreateGroupsInput = z.infer<typeof bulkCreateGroupsSchema>
