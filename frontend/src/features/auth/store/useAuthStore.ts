import { create } from 'zustand'
import type { PublicUser } from '@/types/api'
import {
  clearStoredSession,
  getStoredToken,
  getStoredUser,
  storeSession,
} from '@/lib/storage'

type AuthState = {
  token: string | null
  user: PublicUser | null
  setSession: (token: string, user: PublicUser) => void
  updateUser: (user: PublicUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: getStoredToken(),
  user: getStoredUser(),
  setSession: (token, user) => {
    storeSession(token, user)
    set({ token, user })
  },
  updateUser: (user) => {
    const token = getStoredToken()

    if (token) {
      storeSession(token, user)
    }

    set({ user })
  },
  logout: () => {
    clearStoredSession()
    set({ token: null, user: null })
  },
}))
