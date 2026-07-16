import { z } from 'zod'
import {
  optionalTrimmedString,
  requiredTrimmedString,
} from '../../../common/validation/primitives.js'
import { createAgencySchema } from '../../agencies/dto/agency.schema.js'
import { userRoleSchema } from '../../users/dto/user.schema.js'

const passwordSchema = requiredTrimmedString(72).min(8)

export const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: passwordSchema,
})

export const bootstrapSchema = z.object({
  agency: createAgencySchema,
  adminUser: z.object({
    firstName: requiredTrimmedString(80),
    lastName: requiredTrimmedString(80),
    email: z.string().trim().email().max(255),
    phone: optionalTrimmedString(30),
    password: passwordSchema,
    role: userRoleSchema.default('SUPER_ADMIN'),
  }),
})
