declare namespace Express {
  interface Request {
    authUser?: {
      id: string
      agencyId: string
      role: string
      email: string
    }
  }
}
