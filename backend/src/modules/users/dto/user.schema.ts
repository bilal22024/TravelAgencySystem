import { z } from 'zod'
import {
  optionalTrimmedString,
  requiredTrimmedString,
  uuidSchema,
} from '../../../common/validation/primitives.js'

export const userRoleSchema = z.enum([
  'SUPER_ADMIN',
  'AGENCY_ADMIN',
  'AGENT',
  'ACCOUNTANT',
  'OPERATIONS',
])

export const userSchema = z.object({
  agencyId: uuidSchema,
  firstName: requiredTrimmedString(80),
  lastName: requiredTrimmedString(80),
  email: z.string().trim().email().max(255),
  phone: optionalTrimmedString(30),
  passwordHash: requiredTrimmedString(255),
  role: userRoleSchema,
  isActive: z.boolean().optional(),
  lastLoginAt: z.coerce.date().optional(),
})

const passwordSchema = requiredTrimmedString(72).min(8)

export const userIdParamsSchema = z.object({
  id: uuidSchema,
})

export const createUserSchema = userSchema
  .omit({ passwordHash: true, lastLoginAt: true })
  .extend({
    password: passwordSchema,
  })

export const updateUserSchema = userSchema
  .omit({ agencyId: true, passwordHash: true, lastLoginAt: true })
  .partial()
  .extend({
    password: passwordSchema.optional(),
  })

export type UserInput = z.infer<typeof userSchema>
