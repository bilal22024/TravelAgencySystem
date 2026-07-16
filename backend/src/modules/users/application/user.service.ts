import { prisma } from '../../../lib/prisma.js'
import { AppError } from '../../../common/errors/app-error.js'
import { hashPassword } from '../../../lib/password.js'
import type { AuthenticatedUser } from '../../../common/types/auth-user.js'
import { publicUserSelect } from './user.select.js'
import type { Prisma } from '@prisma/client'

type CreateUserInput = {
  agencyId: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  password: string
  role: 'SUPER_ADMIN' | 'AGENCY_ADMIN' | 'AGENT' | 'ACCOUNTANT' | 'OPERATIONS'
  isActive?: boolean
}

type UpdateUserInput = Partial<Omit<CreateUserInput, 'agencyId'>> & {
  lastLoginAt?: Date
}

function isSuperAdmin(user: AuthenticatedUser) {
  return user.role === 'SUPER_ADMIN'
}

export async function listUsers(authUser: AuthenticatedUser) {
  const where: Prisma.UserWhereInput = isSuperAdmin(authUser)
    ? {}
    : {
        agencyId: authUser.agencyId,
      }

  return prisma.user.findMany({
    where,
    select: publicUserSelect,
    orderBy: {
      createdAt: 'desc',
    },
  })
}

export async function getUserById(id: string, authUser: AuthenticatedUser) {
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
    select: publicUserSelect,
  })

  if (!user || (!isSuperAdmin(authUser) && user.agencyId !== authUser.agencyId)) {
    throw new AppError('User not found', 404)
  }

  return user
}

export async function createUser(data: CreateUserInput, authUser: AuthenticatedUser) {
  if (!isSuperAdmin(authUser) && data.agencyId !== authUser.agencyId) {
    throw new AppError('You can only create users inside your own agency', 403)
  }

  if (!isSuperAdmin(authUser) && data.role === 'SUPER_ADMIN') {
    throw new AppError('Only a super administrator can assign the super administrator role', 403)
  }

  const passwordHash = await hashPassword(data.password)

  return prisma.user.create({
    data: {
      agencyId: data.agencyId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      passwordHash,
      role: data.role,
      isActive: data.isActive,
    },
    select: publicUserSelect,
  })
}

export async function updateUser(
  id: string,
  data: UpdateUserInput,
  authUser: AuthenticatedUser,
) {
  const existingUser = await prisma.user.findUnique({
    where: {
      id,
    },
  })

  if (!existingUser || (!isSuperAdmin(authUser) && existingUser.agencyId !== authUser.agencyId)) {
    throw new AppError('User not found', 404)
  }

  if (!isSuperAdmin(authUser) && data.role === 'SUPER_ADMIN') {
    throw new AppError('Only a super administrator can assign the super administrator role', 403)
  }

  const passwordHash = data.password ? await hashPassword(data.password) : undefined

  return prisma.user.update({
    where: {
      id,
    },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      role: data.role,
      isActive: data.isActive,
      lastLoginAt: data.lastLoginAt,
      passwordHash,
    },
    select: publicUserSelect,
  })
}

export async function deleteUser(id: string, authUser: AuthenticatedUser) {
  const existingUser = await prisma.user.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      agencyId: true,
    },
  })

  if (!existingUser || (!isSuperAdmin(authUser) && existingUser.agencyId !== authUser.agencyId)) {
    throw new AppError('User not found', 404)
  }

  await prisma.user.delete({
    where: {
      id,
    },
  })
}
