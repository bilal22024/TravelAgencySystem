import { prisma } from '../../../lib/prisma.js'
import { AppError } from '../../../common/errors/app-error.js'
import type { AuthenticatedUser } from '../../../common/types/auth-user.js'
import type { Prisma } from '@prisma/client'
import { buildPaginatedResult, getPaginationParams } from '../../../common/http/pagination.js'
import type { AgencyListQuery } from '../dto/agency.schema.js'

function isSuperAdmin(user: AuthenticatedUser) {
  return user.role === 'SUPER_ADMIN'
}

export async function listAgencies(authUser: AuthenticatedUser, query: AgencyListQuery) {
  const where: Prisma.AgencyWhereInput = {
    ...(isSuperAdmin(authUser)
      ? {}
      : {
          id: authUser.agencyId,
        }),
    ...(typeof query.isActive === 'boolean' ? { isActive: query.isActive } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { code: { contains: query.search, mode: 'insensitive' } },
            { city: { contains: query.search, mode: 'insensitive' } },
            { country: { contains: query.search, mode: 'insensitive' } },
            { contactPhone: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  const { skip, take } = getPaginationParams(query.page, query.pageSize)

  const [total, agencies] = await prisma.$transaction([
    prisma.agency.count({ where }),
    prisma.agency.findMany({
      where,
      orderBy: {
        [query.sortBy]: query.sortOrder,
      },
      skip,
      take,
    }),
  ])

  return buildPaginatedResult(agencies, query.page, query.pageSize, total)
}

export async function getAgencyById(id: string, authUser: AuthenticatedUser) {
  const agency = await prisma.agency.findUnique({
    where: {
      id,
    },
  })

  if (!agency || (!isSuperAdmin(authUser) && agency.id !== authUser.agencyId)) {
    throw new AppError('Agency not found', 404)
  }

  return agency
}

export async function createAgency(data: Prisma.AgencyUncheckedCreateInput) {
  return prisma.agency.create({
    data,
  })
}

export async function updateAgency(id: string, data: Prisma.AgencyUncheckedUpdateInput) {
  return prisma.agency.update({
    where: {
      id,
    },
    data,
  })
}

export async function deleteAgency(id: string) {
  await prisma.agency.delete({
    where: {
      id,
    },
  })
}
