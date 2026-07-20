import { z } from 'zod'
import {
  isoDateSchema,
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

const agencyPhoneSchema = z.object({
  id: uuidSchema.optional(),
  label: optionalTrimmedString(60),
  phoneNumber: requiredTrimmedString(30),
  isPrimary: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
})

const agencyEmailSchema = z.object({
  id: uuidSchema.optional(),
  label: optionalTrimmedString(60),
  email: z.string().trim().email().max(255),
  isPrimary: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
})

const agencyDocumentSchema = z.object({
  id: uuidSchema.optional(),
  documentName: requiredTrimmedString(120),
  documentType: optionalTrimmedString(60),
  fileUrl: z.string().trim().url().max(500).optional(),
  notes: optionalTrimmedString(1000),
})

const agencyBaseSchema = z.object({
  name: requiredTrimmedString(120),
  code: requiredTrimmedString(24).regex(/^[A-Z0-9_-]+$/),
  agencyType: z.enum(['PARENT', 'BRANCH']).default('PARENT'),
  parentAgencyId: uuidSchema.optional(),
  category: optionalTrimmedString(120),
  openingBalance: z.coerce.number().min(0).max(999999999).default(0),
  primaryContactPerson: optionalTrimmedString(120),
  contactEmail: z.string().trim().email().max(255).optional(),
  contactPhone: optionalTrimmedString(30),
  addressLine1: optionalTrimmedString(255),
  addressLine2: optionalTrimmedString(255),
  countryId: uuidSchema.optional(),
  cityId: uuidSchema.optional(),
  city: optionalTrimmedString(120),
  state: optionalTrimmedString(120),
  country: optionalTrimmedString(120),
  postalCode: optionalTrimmedString(20),
  notes: optionalTrimmedString(2000),
  isActive: z.boolean().optional(),
  phoneNumbers: z.array(agencyPhoneSchema).max(10).default([]),
  emailAddresses: z.array(agencyEmailSchema).max(10).default([]),
  documents: z.array(agencyDocumentSchema).max(10).default([]),
})

const nullableOptionalString = (maxLength: number) => optionalTrimmedString(maxLength).nullable()
const nullableEmailSchema = z.string().trim().email().max(255).optional().nullable()
const updateAgencyBaseSchema = agencyBaseSchema
  .extend({
    parentAgencyId: uuidSchema.nullable().optional(),
    category: nullableOptionalString(120),
    primaryContactPerson: nullableOptionalString(120),
    contactEmail: nullableEmailSchema,
    contactPhone: nullableOptionalString(30),
    addressLine1: nullableOptionalString(255),
    addressLine2: nullableOptionalString(255),
    countryId: uuidSchema.nullable().optional(),
    cityId: uuidSchema.nullable().optional(),
    city: nullableOptionalString(120),
    state: nullableOptionalString(120),
    country: nullableOptionalString(120),
    postalCode: nullableOptionalString(20),
    notes: nullableOptionalString(2000),
  })
  .partial()

export const agencyIdParamsSchema = z.object({
  id: uuidSchema,
})

export const agencyListQuerySchema = z.object({
  search: optionalTrimmedString(120),
  isActive: booleanFilterSchema.optional(),
  agencyType: z.enum(['PARENT', 'BRANCH']).optional(),
  parentAgencyId: uuidSchema.optional(),
  category: optionalTrimmedString(120),
  sortBy: z
    .enum(['name', 'code', 'city', 'country', 'agencyType', 'category', 'createdAt', 'updatedAt'])
    .default('createdAt'),
  sortOrder: sortOrderSchema,
  page: pageSchema,
  pageSize: pageSizeSchema,
})

export const agencyLookupQuerySchema = z.object({
  search: optionalTrimmedString(120),
  agencyType: z.enum(['PARENT', 'BRANCH']).optional(),
  isActive: booleanFilterSchema.optional(),
  excludeAgencyId: uuidSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const agencySummaryQuerySchema = z.object({
  includeBranches: z.coerce.boolean().optional().default(false),
  asOfDate: isoDateSchema.optional(),
})

export const createAgencySchema = agencyBaseSchema.superRefine((value, context) => {
  if (value.agencyType === 'BRANCH' && !value.parentAgencyId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['parentAgencyId'],
      message: 'A branch agency must be linked to a parent agency.',
    })
  }

  if (value.agencyType === 'PARENT' && value.parentAgencyId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['parentAgencyId'],
      message: 'A parent agency cannot be linked under another agency.',
    })
  }

  if (value.cityId && !value.countryId && !value.country) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['countryId'],
      message: 'Select a country before selecting a city.',
    })
  }
})

export const updateAgencySchema = updateAgencyBaseSchema.superRefine((value, context) => {
  if (value.agencyType === 'BRANCH' && value.parentAgencyId === undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['parentAgencyId'],
      message: 'A branch agency update must include a parent agency.',
    })
  }

  if (value.agencyType === 'PARENT' && value.parentAgencyId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['parentAgencyId'],
      message: 'A parent agency cannot be linked under another agency.',
    })
  }

  if (value.cityId && value.countryId === undefined && value.country === undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['countryId'],
      message: 'Select a country before selecting a city.',
    })
  }
})

export const agencySchema = createAgencySchema

export type AgencyInput = z.infer<typeof agencyBaseSchema>
export type UpdateAgencyInput = z.infer<typeof updateAgencySchema>
export type AgencyListQuery = z.infer<typeof agencyListQuerySchema>
export type AgencyLookupQuery = z.infer<typeof agencyLookupQuerySchema>
export type AgencySummaryQuery = z.infer<typeof agencySummaryQuerySchema>
