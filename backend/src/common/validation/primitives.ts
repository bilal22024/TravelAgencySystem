import { z } from 'zod'

export const uuidSchema = z.string().uuid()

export const optionalTrimmedString = (maxLength: number) =>
  z.string().trim().min(1).max(maxLength).optional()

export const requiredTrimmedString = (maxLength: number) => z.string().trim().min(1).max(maxLength)

export const moneySchema = z.coerce.number().finite().positive()

export const nonNegativeIntegerSchema = z.coerce.number().int().min(0)

export const isoDateSchema = z.coerce.date()
