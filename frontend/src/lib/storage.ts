import type { PublicUser } from '@/types/api'

const AUTH_TOKEN_KEY = 'travel-agency.auth-token'
const AUTH_USER_KEY = 'travel-agency.auth-user'

export function getStoredToken() {
  return window.localStorage.getItem(AUTH_TOKEN_KEY)
}

export function getStoredUser() {
  const rawUser = window.localStorage.getItem(AUTH_USER_KEY)

  if (!rawUser) {
    return null
  }

  try {
    return JSON.parse(rawUser) as PublicUser
  } catch {
    window.localStorage.removeItem(AUTH_USER_KEY)
    return null
  }
}

export function storeSession(token: string, user: PublicUser) {
  window.localStorage.setItem(AUTH_TOKEN_KEY, token)
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
}

export function clearStoredSession() {
  window.localStorage.removeItem(AUTH_TOKEN_KEY)
  window.localStorage.removeItem(AUTH_USER_KEY)
}
