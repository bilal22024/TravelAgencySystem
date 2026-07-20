import { AppError } from '../../../common/errors/app-error.js'
import { prisma } from '../../../lib/prisma.js'
import type {
  CityLookupQuery,
  CreateCityInput,
  LocationLookupQuery,
} from '../dto/location.schema.js'

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

export async function listCountries(query: LocationLookupQuery) {
  return prisma.country.findMany({
    where: query.search
      ? {
          name: {
            contains: query.search,
            mode: 'insensitive',
          },
        }
      : undefined,
    orderBy: [{ name: 'asc' }],
    take: query.limit,
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          cities: true,
        },
      },
    },
  })
}

export async function listCities(query: CityLookupQuery) {
  return prisma.city.findMany({
    where: {
      ...(query.countryId ? { countryId: query.countryId } : {}),
      ...(query.search
        ? {
            name: {
              contains: query.search,
              mode: 'insensitive',
            },
          }
        : {}),
    },
    orderBy: [{ name: 'asc' }],
    take: query.limit,
    select: {
      id: true,
      name: true,
      countryId: true,
      country: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })
}

export async function createCity(data: CreateCityInput) {
  const country = await prisma.country.findUnique({
    where: {
      id: data.countryId,
    },
    select: {
      id: true,
      name: true,
    },
  })

  if (!country) {
    throw new AppError('Selected country could not be found.', 404)
  }

  const normalizedName = normalizeName(data.name)
  const existingCity = await prisma.city.findFirst({
    where: {
      countryId: data.countryId,
      name: {
        equals: normalizedName,
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
    },
  })

  if (existingCity) {
    throw new AppError('This city already exists for the selected country.', 409)
  }

  return prisma.city.create({
    data: {
      countryId: data.countryId,
      name: normalizedName,
    },
    select: {
      id: true,
      name: true,
      countryId: true,
      country: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })
}
