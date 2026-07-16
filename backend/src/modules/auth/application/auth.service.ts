import { prisma } from '../../../lib/prisma.js'
import { AppError } from '../../../common/errors/app-error.js'
import { comparePassword, hashPassword } from '../../../lib/password.js'
import { signAuthToken } from '../../../lib/jwt.js'
import { publicUserSelect } from '../../users/application/user.select.js'
import type { UserRole } from '@prisma/client'

type BootstrapInput = {
  agency: {
    name: string
    code: string
    contactEmail?: string
    contactPhone?: string
    addressLine1?: string
    addressLine2?: string
    city?: string
    state?: string
    country?: string
    postalCode?: string
    isActive?: boolean
  }
  adminUser: {
    firstName: string
    lastName: string
    email: string
    phone?: string
    password: string
    role: UserRole
  }
}

type LoginInput = {
  email: string
  password: string
}

function buildAuthResponse(user: {
  id: string
  agencyId: string
  email: string
  role: string
}) {
  return {
    token: signAuthToken({
      sub: user.id,
      agencyId: user.agencyId,
      email: user.email,
      role: user.role,
    }),
  }
}

export async function bootstrapSystem(input: BootstrapInput) {
  const existingUsers = await prisma.user.count()

  if (existingUsers > 0) {
    throw new AppError('Bootstrap is only available before the first user is created', 409)
  }

  const passwordHash = await hashPassword(input.adminUser.password)

  const createdUser = await prisma.$transaction(async (transaction) => {
    const agency = await transaction.agency.create({
      data: input.agency,
    })

    return transaction.user.create({
      data: {
        agencyId: agency.id,
        firstName: input.adminUser.firstName,
        lastName: input.adminUser.lastName,
        email: input.adminUser.email,
        phone: input.adminUser.phone,
        passwordHash,
        role: input.adminUser.role,
      },
      select: publicUserSelect,
    })
  })

  return {
    user: createdUser,
    ...buildAuthResponse(createdUser),
  }
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  })

  if (!user) {
    throw new AppError('Invalid email or password', 401)
  }

  if (!user.isActive) {
    throw new AppError('Your account is inactive', 403)
  }

  const isPasswordValid = await comparePassword(input.password, user.passwordHash)

  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401)
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      lastLoginAt: new Date(),
    },
    select: publicUserSelect,
  })

  return {
    user: updatedUser,
    ...buildAuthResponse(updatedUser),
  }
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: publicUserSelect,
  })

  if (!user) {
    throw new AppError('Authenticated user could not be found', 404)
  }

  return user
}
