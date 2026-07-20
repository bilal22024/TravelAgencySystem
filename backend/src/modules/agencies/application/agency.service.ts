import { prisma } from '../../../lib/prisma.js'
import { AppError } from '../../../common/errors/app-error.js'
import type { AuthenticatedUser } from '../../../common/types/auth-user.js'
import type { Prisma } from '@prisma/client'
import { buildPaginatedResult, getPaginationParams } from '../../../common/http/pagination.js'
import type {
  AgencyInput,
  AgencyListQuery,
  AgencyLookupQuery,
  AgencySummaryQuery,
  UpdateAgencyInput,
} from '../dto/agency.schema.js'

function isSuperAdmin(user: AuthenticatedUser) {
  return user.role === 'SUPER_ADMIN'
}

const agencyListInclude = {
  parentAgency: {
    select: {
      id: true,
      name: true,
      code: true,
      agencyType: true,
    },
  },
  countryRecord: {
    select: {
      id: true,
      name: true,
    },
  },
  cityRecord: {
    select: {
      id: true,
      name: true,
      countryId: true,
    },
  },
  _count: {
    select: {
      branches: true,
    },
  },
} satisfies Prisma.AgencyInclude

const agencyDetailInclude = {
  parentAgency: {
    select: {
      id: true,
      name: true,
      code: true,
      agencyType: true,
      category: true,
    },
  },
  countryRecord: {
    select: {
      id: true,
      name: true,
    },
  },
  cityRecord: {
    select: {
      id: true,
      name: true,
      countryId: true,
    },
  },
  branches: {
    orderBy: {
      name: 'asc',
    },
    select: {
      id: true,
      name: true,
      code: true,
      agencyType: true,
      category: true,
      city: true,
      country: true,
      countryRecord: {
        select: {
          id: true,
          name: true,
        },
      },
      cityRecord: {
        select: {
          id: true,
          name: true,
          countryId: true,
        },
      },
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          groups: true,
          payments: true,
        },
      },
    },
  },
  phoneNumbers: {
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  },
  emailAddresses: {
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  },
  documents: {
    orderBy: [{ createdAt: 'desc' }],
  },
  _count: {
    select: {
      branches: true,
      groups: true,
      payments: true,
      users: true,
    },
  },
} satisfies Prisma.AgencyInclude

type AgencyListRecord = Prisma.AgencyGetPayload<{
  include: typeof agencyListInclude
}>

type AgencyDetailRecord = Prisma.AgencyGetPayload<{
  include: typeof agencyDetailInclude
}>

function roundAmount(value: number | Prisma.Decimal | null | undefined) {
  return Number((Number(value ?? 0) || 0).toFixed(2))
}

function normalizeTextValue(value: string | null | undefined) {
  return value?.trim() || null
}

function serializeLocationReference(record: { id: string; name: string } | null | undefined) {
  return record
    ? {
        id: record.id,
        name: record.name,
      }
    : null
}

type AgencyLocationInput = {
  countryId?: string | null
  cityId?: string | null
  country?: string | null
  city?: string | null
}

function normalizePhoneNumbers(phoneNumbers: AgencyInput['phoneNumbers']) {
  return phoneNumbers.map((phoneNumber, index) => ({
    label: phoneNumber.label?.trim() || undefined,
    phoneNumber: phoneNumber.phoneNumber.trim(),
    isPrimary: phoneNumber.isPrimary ?? index === 0,
    sortOrder: phoneNumber.sortOrder ?? index,
  }))
}

function normalizeEmailAddresses(emailAddresses: AgencyInput['emailAddresses']) {
  return emailAddresses.map((emailAddress, index) => ({
    label: emailAddress.label?.trim() || undefined,
    email: emailAddress.email.trim().toLowerCase(),
    isPrimary: emailAddress.isPrimary ?? index === 0,
    sortOrder: emailAddress.sortOrder ?? index,
  }))
}

function normalizeDocuments(documents: AgencyInput['documents']) {
  return documents.map((document) => ({
    documentName: document.documentName.trim(),
    documentType: document.documentType?.trim() || undefined,
    fileUrl: document.fileUrl?.trim() || undefined,
    notes: document.notes?.trim() || undefined,
  }))
}

function serializeAgencyListRecord(agency: AgencyListRecord) {
  return {
    id: agency.id,
    parentAgencyId: agency.parentAgencyId,
    name: agency.name,
    code: agency.code,
    agencyType: agency.agencyType,
    category: agency.category,
    openingBalance: roundAmount(agency.openingBalance),
    primaryContactPerson: agency.primaryContactPerson,
    contactEmail: agency.contactEmail,
    contactPhone: agency.contactPhone,
    addressLine1: agency.addressLine1,
    addressLine2: agency.addressLine2,
    city: agency.city,
    cityRef: serializeLocationReference(agency.cityRecord),
    state: agency.state,
    country: agency.country,
    countryRef: serializeLocationReference(agency.countryRecord),
    postalCode: agency.postalCode,
    notes: agency.notes,
    isActive: agency.isActive,
    createdAt: agency.createdAt,
    updatedAt: agency.updatedAt,
    parentAgency: agency.parentAgency,
    branchCount: agency._count.branches,
  }
}

function serializeAgencyDetailRecord(
  agency: AgencyDetailRecord,
  summary: {
    totalBranches: number
    totalGroups: number
    totalPax: number
    totalGroupAmount: number
    totalPaymentsReceived: number
    outstandingBalance: number
    scopeAgencyIds: string[]
    includeBranches: boolean
  },
) {
  return {
    id: agency.id,
    parentAgencyId: agency.parentAgencyId,
    name: agency.name,
    code: agency.code,
    agencyType: agency.agencyType,
    category: agency.category,
    openingBalance: roundAmount(agency.openingBalance),
    primaryContactPerson: agency.primaryContactPerson,
    contactEmail: agency.contactEmail,
    contactPhone: agency.contactPhone,
    addressLine1: agency.addressLine1,
    addressLine2: agency.addressLine2,
    city: agency.city,
    cityRef: serializeLocationReference(agency.cityRecord),
    state: agency.state,
    country: agency.country,
    countryRef: serializeLocationReference(agency.countryRecord),
    postalCode: agency.postalCode,
    notes: agency.notes,
    isActive: agency.isActive,
    createdAt: agency.createdAt,
    updatedAt: agency.updatedAt,
    parentAgency: agency.parentAgency,
    branches: agency.branches.map((branch) => ({
      ...branch,
      cityRef: serializeLocationReference(branch.cityRecord),
      countryRef: serializeLocationReference(branch.countryRecord),
    })),
    phoneNumbers: agency.phoneNumbers,
    emailAddresses: agency.emailAddresses,
    documents: agency.documents,
    branchCount: agency._count.branches,
    counts: {
      groups: agency._count.groups,
      payments: agency._count.payments,
      users: agency._count.users,
    },
    summary,
  }
}

async function getAccessibleAgencyIds(authUser: AuthenticatedUser) {
  if (isSuperAdmin(authUser)) {
    return null
  }

  const agency = await prisma.agency.findUnique({
    where: {
      id: authUser.agencyId,
    },
    select: {
      id: true,
      agencyType: true,
      branches: {
        select: {
          id: true,
        },
      },
    },
  })

  if (!agency) {
    return [authUser.agencyId]
  }

  if (agency.agencyType === 'PARENT') {
    return [agency.id, ...agency.branches.map((branch) => branch.id)]
  }

  return [agency.id]
}

async function ensureParentAgency(parentAgencyId: string | undefined, agencyIdToExclude?: string) {
  if (!parentAgencyId) {
    return null
  }

  const parentAgency = await prisma.agency.findUnique({
    where: {
      id: parentAgencyId,
    },
    select: {
      id: true,
      agencyType: true,
    },
  })

  if (!parentAgency) {
    throw new AppError('Selected parent agency could not be found.', 404)
  }

  if (parentAgency.agencyType !== 'PARENT') {
    throw new AppError('Only parent agencies can receive branch assignments.', 400)
  }

  if (agencyIdToExclude && parentAgency.id === agencyIdToExclude) {
    throw new AppError('An agency cannot be its own parent.', 400)
  }

  return parentAgency
}

async function resolveAgencyLocationInput(data: AgencyLocationInput) {
  let countryRecord: { id: string; name: string } | null = null
  let cityRecord: { id: string; name: string; countryId: string } | null = null

  if (data.countryId) {
    countryRecord = await prisma.country.findUnique({
      where: {
        id: data.countryId,
      },
      select: {
        id: true,
        name: true,
      },
    })

    if (!countryRecord) {
      throw new AppError('Selected country could not be found.', 404)
    }
  } else if (data.country) {
    countryRecord = await prisma.country.findFirst({
      where: {
        name: {
          equals: data.country.trim(),
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        name: true,
      },
    })
  }

  if (data.cityId) {
    cityRecord = await prisma.city.findUnique({
      where: {
        id: data.cityId,
      },
      select: {
        id: true,
        name: true,
        countryId: true,
      },
    })

    if (!cityRecord) {
      throw new AppError('Selected city could not be found.', 404)
    }

    if (countryRecord && cityRecord.countryId !== countryRecord.id) {
      throw new AppError('Selected city does not belong to the selected country.', 400)
    }

    if (!countryRecord) {
      countryRecord = await prisma.country.findUnique({
        where: {
          id: cityRecord.countryId,
        },
        select: {
          id: true,
          name: true,
        },
      })
    }
  } else if (data.city && countryRecord) {
    cityRecord = await prisma.city.findFirst({
      where: {
        countryId: countryRecord.id,
        name: {
          equals: data.city.trim(),
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        name: true,
        countryId: true,
      },
    })
  }

  return {
    countryId: countryRecord?.id ?? (data.countryId === null ? null : undefined),
    cityId:
      data.cityId === null
        ? null
        : data.countryId === null
          ? null
          : cityRecord?.id ?? undefined,
    countryName: countryRecord?.name ?? normalizeTextValue(data.country),
    cityName:
      data.countryId === null
        ? null
        : cityRecord?.name ?? normalizeTextValue(data.city),
  }
}

function serializeAgencyLookupRecord(
  agency: {
    id: string
    name: string
    code: string
    agencyType: AgencyInput['agencyType']
    category: string | null
    city: string | null
    country: string | null
    isActive: boolean
    parentAgency: {
      id: string
      name: string
      code: string
    } | null
    cityRecord?: { id: string; name: string } | null
    countryRecord?: { id: string; name: string } | null
  },
) {
  return {
    id: agency.id,
    name: agency.name,
    code: agency.code,
    agencyType: agency.agencyType,
    category: agency.category,
    city: agency.city,
    cityRef: serializeLocationReference(agency.cityRecord),
    country: agency.country,
    countryRef: serializeLocationReference(agency.countryRecord),
    isActive: agency.isActive,
    parentAgency: agency.parentAgency,
  }
}

async function buildAgencySummary(agencyIds: string[], includeBranches: boolean) {
  const [groupAggregate, groups, payments] = await Promise.all([
    prisma.group.aggregate({
      where: {
        agencyId: {
          in: agencyIds,
        },
      },
      _count: {
        id: true,
      },
      _sum: {
        travelerCount: true,
        totalAmount: true,
      },
    }),
    prisma.group.findMany({
      where: {
        agencyId: {
          in: agencyIds,
        },
      },
      select: {
        id: true,
        agencyId: true,
        totalAmount: true,
        paymentGroups: {
          select: {
            allocatedAmount: true,
            payment: {
              select: {
                agencyId: true,
              },
            },
          },
        },
      },
    }),
    prisma.payment.findMany({
      where: {
        agencyId: {
          in: agencyIds,
        },
      },
      select: {
        id: true,
        agencyId: true,
        amount: true,
        paymentGroups: {
          select: {
            allocatedAmount: true,
          },
        },
      },
    }),
  ])

  const totalGroups = groupAggregate._count.id
  const totalPax = Number(groupAggregate._sum.travelerCount ?? 0)
  const totalGroupAmount = roundAmount(groupAggregate._sum.totalAmount)
  const totalAllocatedToScope = roundAmount(
    groups.reduce((total, group) => {
      return (
        total +
        group.paymentGroups.reduce((groupTotal, paymentGroup) => {
          return groupTotal + Number(paymentGroup.allocatedAmount)
        }, 0)
      )
    }, 0),
  )
  const advanceBalance = roundAmount(
    payments.reduce((total, payment) => {
      const allocatedAmount = payment.paymentGroups.reduce((paymentTotal, paymentGroup) => {
        return paymentTotal + Number(paymentGroup.allocatedAmount)
      }, 0)

      return total + Math.max(Number(payment.amount) - allocatedAmount, 0)
    }, 0),
  )
  const totalPaymentsReceived = roundAmount(
    payments.reduce((total, payment) => total + Number(payment.amount), 0),
  )
  const outstandingBalance = roundAmount(Math.max(totalGroupAmount - totalAllocatedToScope, 0))
  const netBalance = roundAmount(outstandingBalance - advanceBalance)

  return {
    totalBranches: Math.max(agencyIds.length - 1, 0),
    totalGroups,
    totalPax,
    totalGroupAmount,
    totalPaymentsReceived,
    outstandingBalance,
    advanceBalance,
    netBalance,
    scopeAgencyIds: agencyIds,
    includeBranches,
  }
}

function buildAgencyWhereInput(
  accessibleAgencyIds: string[] | null,
  query: AgencyListQuery | AgencyLookupQuery,
): Prisma.AgencyWhereInput {
  return {
    ...(accessibleAgencyIds ? { id: { in: accessibleAgencyIds } } : {}),
    ...(typeof query.isActive === 'boolean' ? { isActive: query.isActive } : {}),
    ...('agencyType' in query && query.agencyType ? { agencyType: query.agencyType } : {}),
    ...('parentAgencyId' in query && query.parentAgencyId
      ? { parentAgencyId: query.parentAgencyId }
      : {}),
    ...('category' in query && query.category
      ? { category: { contains: query.category, mode: 'insensitive' } }
      : {}),
    ...('excludeAgencyId' in query && query.excludeAgencyId
      ? {
          id: {
            ...(accessibleAgencyIds ? { in: accessibleAgencyIds } : {}),
            not: query.excludeAgencyId,
          },
        }
      : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { code: { contains: query.search, mode: 'insensitive' } },
            { category: { contains: query.search, mode: 'insensitive' } },
            { primaryContactPerson: { contains: query.search, mode: 'insensitive' } },
            { city: { contains: query.search, mode: 'insensitive' } },
            { cityRecord: { is: { name: { contains: query.search, mode: 'insensitive' } } } },
            { country: { contains: query.search, mode: 'insensitive' } },
            { countryRecord: { is: { name: { contains: query.search, mode: 'insensitive' } } } },
            { contactPhone: { contains: query.search, mode: 'insensitive' } },
            { contactEmail: { contains: query.search, mode: 'insensitive' } },
            { phoneNumbers: { some: { phoneNumber: { contains: query.search, mode: 'insensitive' } } } },
            { emailAddresses: { some: { email: { contains: query.search, mode: 'insensitive' } } } },
            { parentAgency: { name: { contains: query.search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  }
}

export async function listAgencies(authUser: AuthenticatedUser, query: AgencyListQuery) {
  const accessibleAgencyIds = await getAccessibleAgencyIds(authUser)
  const where = buildAgencyWhereInput(accessibleAgencyIds, query)
  const { skip, take } = getPaginationParams(query.page, query.pageSize)

  const [total, agencies] = await prisma.$transaction([
    prisma.agency.count({ where }),
    prisma.agency.findMany({
      where,
      include: agencyListInclude,
      orderBy: {
        [query.sortBy]: query.sortOrder,
      },
      skip,
      take,
    }),
  ])

  return buildPaginatedResult(
    agencies.map(serializeAgencyListRecord),
    query.page,
    query.pageSize,
    total,
  )
}

export async function lookupAgencies(authUser: AuthenticatedUser, query: AgencyLookupQuery) {
  const accessibleAgencyIds = await getAccessibleAgencyIds(authUser)
  const where = buildAgencyWhereInput(accessibleAgencyIds, query)
  const agencies = await prisma.agency.findMany({
    where,
    orderBy: [{ name: 'asc' }],
    take: query.limit,
    select: {
      id: true,
      name: true,
      code: true,
      agencyType: true,
      category: true,
      city: true,
      cityRecord: {
        select: {
          id: true,
          name: true,
        },
      },
      country: true,
      countryRecord: {
        select: {
          id: true,
          name: true,
        },
      },
      isActive: true,
      parentAgency: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  })

  return agencies.map(serializeAgencyLookupRecord)
}

export async function getAgencyById(
  id: string,
  authUser: AuthenticatedUser,
  summaryQuery?: AgencySummaryQuery,
) {
  const accessibleAgencyIds = await getAccessibleAgencyIds(authUser)
  const agency = await prisma.agency.findUnique({
    where: {
      id,
    },
    include: agencyDetailInclude,
  })

  if (!agency || (accessibleAgencyIds && !accessibleAgencyIds.includes(agency.id))) {
    throw new AppError('Agency not found', 404)
  }

  const includeBranches =
    summaryQuery?.includeBranches === true && agency.agencyType === 'PARENT'
  const summaryAgencyIds = includeBranches
    ? [agency.id, ...agency.branches.map((branch) => branch.id)]
    : [agency.id]
  const summary = await buildAgencySummary(summaryAgencyIds, includeBranches)

  return serializeAgencyDetailRecord(agency, summary)
}

export async function createAgency(data: AgencyInput) {
  if (data.agencyType === 'BRANCH') {
    await ensureParentAgency(data.parentAgencyId)
  }

  const location = await resolveAgencyLocationInput(data)
  const phoneNumbers = normalizePhoneNumbers(data.phoneNumbers)
  const emailAddresses = normalizeEmailAddresses(data.emailAddresses)
  const documents = normalizeDocuments(data.documents)
  const primaryPhone = phoneNumbers.find((phoneNumber) => phoneNumber.isPrimary)?.phoneNumber
  const primaryEmail = emailAddresses.find((emailAddress) => emailAddress.isPrimary)?.email

  const createdAgency = await prisma.agency.create({
    data: {
      parentAgencyId: data.agencyType === 'BRANCH' ? data.parentAgencyId : undefined,
      name: data.name,
      code: data.code,
      agencyType: data.agencyType,
      category: data.category,
      openingBalance: data.openingBalance,
      primaryContactPerson: data.primaryContactPerson,
      contactEmail: primaryEmail ?? (data.contactEmail?.trim() || undefined),
      contactPhone: primaryPhone ?? (data.contactPhone?.trim() || undefined),
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2,
      city: location.cityName,
      cityId: location.cityId,
      state: data.state,
      country: location.countryName,
      countryId: location.countryId,
      postalCode: data.postalCode,
      notes: data.notes,
      isActive: data.isActive ?? true,
      phoneNumbers: {
        create: phoneNumbers,
      },
      emailAddresses: {
        create: emailAddresses,
      },
      documents: {
        create: documents,
      },
    },
    include: agencyDetailInclude,
  })

  const summary = await buildAgencySummary([createdAgency.id], false)
  return serializeAgencyDetailRecord(createdAgency, summary)
}

export async function updateAgency(id: string, data: UpdateAgencyInput) {
  const existingAgency = await prisma.agency.findUnique({
    where: {
      id,
    },
    include: {
      phoneNumbers: true,
      emailAddresses: true,
      documents: true,
    },
  })

  if (!existingAgency) {
    throw new AppError('Agency not found', 404)
  }

  const nextAgencyType = data.agencyType ?? existingAgency.agencyType
  const nextParentAgencyId =
    data.parentAgencyId !== undefined ? data.parentAgencyId : existingAgency.parentAgencyId

  if (nextAgencyType === 'BRANCH') {
    await ensureParentAgency(nextParentAgencyId ?? undefined, id)
  }

  if (nextAgencyType === 'PARENT' && nextParentAgencyId) {
    throw new AppError('A parent agency cannot be linked under another agency.', 400)
  }

  const location = await resolveAgencyLocationInput({
    countryId: data.countryId,
    cityId: data.cityId,
    country: data.country,
    city: data.city,
  })
  const phoneNumbers = data.phoneNumbers
    ? normalizePhoneNumbers(data.phoneNumbers)
    : existingAgency.phoneNumbers.map((phoneNumber) => ({
        label: phoneNumber.label ?? undefined,
        phoneNumber: phoneNumber.phoneNumber,
        isPrimary: phoneNumber.isPrimary,
        sortOrder: phoneNumber.sortOrder,
      }))
  const emailAddresses = data.emailAddresses
    ? normalizeEmailAddresses(data.emailAddresses)
    : existingAgency.emailAddresses.map((emailAddress) => ({
        label: emailAddress.label ?? undefined,
        email: emailAddress.email,
        isPrimary: emailAddress.isPrimary,
        sortOrder: emailAddress.sortOrder,
      }))
  const documents = data.documents
    ? normalizeDocuments(data.documents)
    : existingAgency.documents.map((document) => ({
        documentName: document.documentName,
        documentType: document.documentType ?? undefined,
        fileUrl: document.fileUrl ?? undefined,
        notes: document.notes ?? undefined,
      }))
  const primaryPhone = phoneNumbers.find((phoneNumber) => phoneNumber.isPrimary)?.phoneNumber
  const primaryEmail = emailAddresses.find((emailAddress) => emailAddress.isPrimary)?.email

  return prisma.$transaction(async (tx) => {
    await tx.agency.update({
      where: {
        id,
      },
      data: {
        parentAgencyId: nextAgencyType === 'BRANCH' ? nextParentAgencyId : null,
        name: data.name,
        code: data.code,
        agencyType: nextAgencyType,
        category: data.category,
        openingBalance: data.openingBalance,
        primaryContactPerson: data.primaryContactPerson,
        contactEmail:
          primaryEmail ?? (data.contactEmail !== undefined ? data.contactEmail?.trim() || null : undefined),
        contactPhone:
          primaryPhone ?? (data.contactPhone !== undefined ? data.contactPhone?.trim() || null : undefined),
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city !== undefined || data.cityId !== undefined || data.countryId !== undefined ? location.cityName : undefined,
        cityId: data.cityId !== undefined || data.countryId !== undefined ? location.cityId : undefined,
        state: data.state,
        country:
          data.country !== undefined || data.countryId !== undefined || data.cityId !== undefined
            ? location.countryName
            : undefined,
        countryId:
          data.countryId !== undefined || data.cityId !== undefined ? location.countryId : undefined,
        postalCode: data.postalCode,
        notes: data.notes,
        isActive: data.isActive,
      },
    })

    if (data.phoneNumbers) {
      await tx.agencyPhone.deleteMany({
        where: {
          agencyId: id,
        },
      })

      if (phoneNumbers.length > 0) {
        await tx.agencyPhone.createMany({
          data: phoneNumbers.map((phoneNumber) => ({
            agencyId: id,
            ...phoneNumber,
          })),
        })
      }
    }

    if (data.emailAddresses) {
      await tx.agencyEmail.deleteMany({
        where: {
          agencyId: id,
        },
      })

      if (emailAddresses.length > 0) {
        await tx.agencyEmail.createMany({
          data: emailAddresses.map((emailAddress) => ({
            agencyId: id,
            ...emailAddress,
          })),
        })
      }
    }

    if (data.documents) {
      await tx.agencyDocument.deleteMany({
        where: {
          agencyId: id,
        },
      })

      if (documents.length > 0) {
        await tx.agencyDocument.createMany({
          data: documents.map((document) => ({
            agencyId: id,
            ...document,
          })),
        })
      }
    }

    const updatedAgency = await tx.agency.findUnique({
      where: {
        id,
      },
      include: agencyDetailInclude,
    })

    if (!updatedAgency) {
      throw new AppError('Agency not found after update', 404)
    }

    const summary = await buildAgencySummary([id], false)
    return serializeAgencyDetailRecord(updatedAgency, summary)
  })
}

export async function deleteAgency(id: string) {
  const agency = await prisma.agency.findUnique({
    where: {
      id,
    },
    include: {
      _count: {
        select: {
          branches: true,
          groups: true,
          payments: true,
          users: true,
        },
      },
    },
  })

  if (!agency) {
    throw new AppError('Agency not found', 404)
  }

  if (agency._count.branches > 0) {
    throw new AppError('A parent agency with branches cannot be deleted.', 400)
  }

  if (agency._count.groups > 0 || agency._count.payments > 0 || agency._count.users > 0) {
    throw new AppError(
      'An agency with users, groups, or payments cannot be deleted. Mark it inactive instead.',
      400,
    )
  }

  await prisma.agency.delete({
    where: {
      id,
    },
  })
}
