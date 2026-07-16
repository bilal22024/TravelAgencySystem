import jwt, { type SignOptions } from 'jsonwebtoken'
import { env } from '../config/env.js'

type AuthTokenPayload = {
  sub: string
  agencyId: string
  role: string
  email: string
}

export function signAuthToken(payload: AuthTokenPayload) {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  }

  return jwt.sign(payload, env.JWT_SECRET, {
    ...options,
  })
}

export function verifyAuthToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload
}
