import { z } from 'zod'
import {
  isoDateSchema,
  optionalTrimmedString,
  uuidSchema,
} from '../../../common/validation/primitives.js'

export const reportQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).default(new Date().getFullYear()),
  month: z.coerce.number().int().min(1).max(12).optional(),
  search: optionalTrimmedString(120),
})

export const reportExportParamsSchema = z.object({
  format: z.enum(['csv', 'excel', 'pdf']),
})

export type ReportQuery = z.infer<typeof reportQuerySchema>

export const agencyReportQuerySchema = z
  .object({
    agencyId: uuidSchema.optional(),
    dateFrom: isoDateSchema.optional(),
    dateTo: isoDateSchema.optional(),
    groupNumber: optionalTrimmedString(30),
    paymentStatus: z
      .enum(['PENDING', 'PARTIALLY_ALLOCATED', 'ALLOCATED', 'FAILED', 'REFUNDED'])
      .optional(),
  })
  .refine(
    (value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo,
    {
      message: 'The start date must be on or before the end date',
      path: ['dateTo'],
    },
  )

export type AgencyReportQuery = z.infer<typeof agencyReportQuerySchema>

export const agencyLedgerQuerySchema = z
  .object({
    agencyId: uuidSchema.optional(),
    dateFrom: isoDateSchema.optional(),
    dateTo: isoDateSchema.optional(),
  })
  .refine(
    (value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo,
    {
      message: 'The start date must be on or before the end date',
      path: ['dateTo'],
    },
  )

export type AgencyLedgerQuery = z.infer<typeof agencyLedgerQuerySchema>

export const outstandingBalanceReportQuerySchema = z
  .object({
    search: optionalTrimmedString(120),
    dateFrom: isoDateSchema.optional(),
    dateTo: isoDateSchema.optional(),
    paymentStatus: z.enum(['FULLY_PAID', 'PARTIALLY_PAID', 'UNPAID']).optional(),
    sortBy: z
      .enum(['outstandingBalance', 'agencyName', 'lastPaymentDate'])
      .default('outstandingBalance'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .refine(
    (value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo,
    {
      message: 'The start date must be on or before the end date',
      path: ['dateTo'],
    },
  )

export type OutstandingBalanceReportQuery = z.infer<typeof outstandingBalanceReportQuerySchema>
