import { prisma } from '../../../lib/prisma.js'
import { AppError } from '../../../common/errors/app-error.js'
import type { AuthenticatedUser } from '../../../common/types/auth-user.js'
import { Prisma } from '@prisma/client'
import { buildPaginatedResult, getPaginationParams } from '../../../common/http/pagination.js'
import type { BulkCreateGroupsInput, GroupListQuery } from '../dto/group.schema.js'

function isSuperAdmin(user: AuthenticatedUser) {
  return user.role === 'SUPER_ADMIN'
}

type CreateGroupInput = Prisma.GroupUncheckedCreateInput
type UpdateGroupInput = Prisma.GroupUncheckedUpdateInput

type DecimalInput =
  | Prisma.Decimal
  | Prisma.DecimalJsLike
  | Prisma.NullableDecimalFieldUpdateOperationsInput
  | number
  | string
  | null
  | undefined

type IntegerInput =
  | number
  | Prisma.IntFieldUpdateOperationsInput
  | null
  | undefined

type GroupFinancialStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'FULLY_PAID'

type GroupListRow = {
  id: string
  agencyId: string
  name: string
  code: string
  amountPerPax: Prisma.Decimal | number | string | null
  totalAmount: Prisma.Decimal | number | string | null
  description: string | null
  destination: string
  departureDate: Date
  returnDate: Date
  status: string
  travelerCount: number
  notes: string | null
  createdAt: Date
  updatedAt: Date
  agencyRecordId: string
  agencyName: string
  agencyCode: string
  agencyContactEmail: string | null
  agencyContactPhone: string | null
  agencyAddressLine1: string | null
  agencyAddressLine2: string | null
  agencyCity: string | null
  agencyState: string | null
  agencyCountry: string | null
  agencyPostalCode: string | null
  agencyIsActive: boolean
  agencyCreatedAt: Date
  agencyUpdatedAt: Date
  paidAmount: Prisma.Decimal | number | string
  outstandingBalance: Prisma.Decimal | number | string
  paymentStatus: GroupFinancialStatus
  paymentCount: number
}

type GroupCountRow = {
  total: number
}

function getDecimalValue(input: DecimalInput): Prisma.Decimal | undefined {
  if (input === null || input === undefined) {
    return undefined
  }

  if (typeof input === 'object' && 'set' in input) {
    return getDecimalValue(input.set as DecimalInput)
  }

  if (input instanceof Prisma.Decimal) {
    return input
  }

  return new Prisma.Decimal(input as Prisma.Decimal.Value)
}

function getIntegerValue(input: IntegerInput): number | undefined {
  if (input === null || input === undefined) {
    return undefined
  }

  if (typeof input === 'object' && 'set' in input) {
    return typeof input.set === 'number' ? input.set : undefined
  }

  return typeof input === 'number' ? input : undefined
}

function getComputedTotalAmount(travelerCount?: number | null, amountPerPax?: DecimalInput) {
  const normalizedAmountPerPax = getDecimalValue(amountPerPax)

  if (!travelerCount || !normalizedAmountPerPax) {
    return undefined
  }

  return new Prisma.Decimal(travelerCount).mul(normalizedAmountPerPax)
}

function normalizeGroupCode(value: string) {
  return value.trim()
}

function normalizeOptionalSearchValue(value?: string | null) {
  return value?.trim() || undefined
}

function getGroupFinancialStatus(totalAmount: number, paidAmount: number): GroupFinancialStatus {
  if (paidAmount <= 0) {
    return 'UNPAID'
  }

  if (totalAmount > 0 && paidAmount >= totalAmount) {
    return 'FULLY_PAID'
  }

  return 'PARTIALLY_PAID'
}

function getGroupFinancialStatusLabel(status: GroupFinancialStatus) {
  switch (status) {
    case 'UNPAID':
      return 'Unpaid'
    case 'PARTIALLY_PAID':
      return 'Partially Paid'
    case 'FULLY_PAID':
      return 'Fully Paid'
  }
}

function getNumericAmount(value: Prisma.Decimal | number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0
  }

  return Number(value)
}

function toDayRange(dateFrom?: Date, dateTo?: Date) {
  const normalizedDateFrom = dateFrom
    ? new Date(
        dateFrom.getFullYear(),
        dateFrom.getMonth(),
        dateFrom.getDate(),
        0,
        0,
        0,
        0,
      )
    : undefined
  const normalizedDateTo = dateTo
    ? new Date(
        dateTo.getFullYear(),
        dateTo.getMonth(),
        dateTo.getDate(),
        23,
        59,
        59,
        999,
      )
    : undefined

  return {
    dateFrom: normalizedDateFrom,
    dateTo: normalizedDateTo,
  }
}

function serializeGroupListRow(row: GroupListRow) {
  return {
    id: row.id,
    agencyId: row.agencyId,
    name: row.name,
    code: row.code,
    amountPerPax: row.amountPerPax,
    totalAmount: row.totalAmount,
    description: row.description,
    destination: row.destination,
    departureDate: row.departureDate,
    returnDate: row.returnDate,
    status: row.status,
    travelerCount: row.travelerCount,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    agency: {
      id: row.agencyRecordId,
      name: row.agencyName,
      code: row.agencyCode,
      contactEmail: row.agencyContactEmail,
      contactPhone: row.agencyContactPhone,
      addressLine1: row.agencyAddressLine1,
      addressLine2: row.agencyAddressLine2,
      city: row.agencyCity,
      state: row.agencyState,
      country: row.agencyCountry,
      postalCode: row.agencyPostalCode,
      isActive: row.agencyIsActive,
      createdAt: row.agencyCreatedAt,
      updatedAt: row.agencyUpdatedAt,
    },
    paidAmount: row.paidAmount,
    outstandingBalance: row.outstandingBalance,
    paymentStatus: row.paymentStatus,
    paymentStatusLabel: getGroupFinancialStatusLabel(row.paymentStatus),
    hasPayments: row.paymentCount > 0,
  }
}

function getGroupListOrderBy(query: GroupListQuery) {
  const direction = query.sortOrder === 'asc' ? Prisma.raw('ASC') : Prisma.raw('DESC')

  switch (query.sortBy) {
    case 'code':
      return Prisma.sql`g."code" ${direction}, g."createdAt" DESC`
    case 'name':
      return Prisma.sql`g."name" ${direction}, g."createdAt" DESC`
    case 'agencyName':
      return Prisma.sql`a."name" ${direction}, g."createdAt" DESC`
    case 'country':
      return Prisma.sql`COALESCE(a."country", '') ${direction}, a."name" ASC`
    case 'travelerCount':
      return Prisma.sql`g."travelerCount" ${direction}, g."createdAt" DESC`
    case 'amountPerPax':
      return Prisma.sql`COALESCE(g."amountPerPax", CAST(0 AS numeric)) ${direction}, g."createdAt" DESC`
    case 'totalAmount':
      return Prisma.sql`COALESCE(g."totalAmount", CAST(0 AS numeric)) ${direction}, g."createdAt" DESC`
    case 'outstandingBalance':
      return Prisma.sql`GREATEST(COALESCE(g."totalAmount", CAST(0 AS numeric)) - COALESCE(financials."paidAmount", CAST(0 AS numeric)), CAST(0 AS numeric)) ${direction}, g."createdAt" DESC`
    case 'departureDate':
      return Prisma.sql`g."departureDate" ${direction}, g."createdAt" DESC`
    case 'returnDate':
      return Prisma.sql`g."returnDate" ${direction}, g."createdAt" DESC`
    case 'status':
      return Prisma.sql`g."status" ${direction}, g."createdAt" DESC`
    case 'createdAt':
    default:
      return Prisma.sql`g."createdAt" ${direction}`
  }
}

function buildGroupListWhere(authUser: AuthenticatedUser, query: GroupListQuery) {
  const conditions: Prisma.Sql[] = []
  const normalizedSearch = normalizeOptionalSearchValue(query.search)
  const normalizedCountry = normalizeOptionalSearchValue(query.country)
  const normalizedCity = normalizeOptionalSearchValue(query.city)
  const normalizedDestination = normalizeOptionalSearchValue(query.destination)
  const { dateFrom: departureDateFrom, dateTo: departureDateTo } = toDayRange(
    query.departureDateFrom,
    query.departureDateTo,
  )
  const { dateFrom: createdDateFrom, dateTo: createdDateTo } = toDayRange(
    query.createdDateFrom,
    query.createdDateTo,
  )

  if (!isSuperAdmin(authUser)) {
    conditions.push(Prisma.sql`g."agencyId" = CAST(${authUser.agencyId} AS uuid)`)
  } else if (query.agencyId) {
    conditions.push(Prisma.sql`g."agencyId" = CAST(${query.agencyId} AS uuid)`)
  }

  if (query.status) {
    conditions.push(Prisma.sql`g."status" = ${query.status}`)
  }

  if (normalizedCountry) {
    conditions.push(Prisma.sql`a."country" = ${normalizedCountry}`)
  }

  if (normalizedCity) {
    conditions.push(Prisma.sql`a."city" = ${normalizedCity}`)
  }

  if (normalizedDestination) {
    conditions.push(Prisma.sql`g."destination" ILIKE ${`%${normalizedDestination}%`}`)
  }

  if (normalizedSearch) {
    const searchTerm = `%${normalizedSearch}%`
    conditions.push(
      Prisma.sql`(
        g."code" ILIKE ${searchTerm}
        OR g."name" ILIKE ${searchTerm}
        OR a."name" ILIKE ${searchTerm}
        OR COALESCE(a."country", '') ILIKE ${searchTerm}
        OR COALESCE(a."city", '') ILIKE ${searchTerm}
      )`,
    )
  }

  if (query.minPassengers !== undefined) {
    conditions.push(Prisma.sql`g."travelerCount" >= ${query.minPassengers}`)
  }

  if (query.maxPassengers !== undefined) {
    conditions.push(Prisma.sql`g."travelerCount" <= ${query.maxPassengers}`)
  }

  if (query.minAmount !== undefined) {
    conditions.push(
      Prisma.sql`COALESCE(g."totalAmount", CAST(0 AS numeric)) >= ${query.minAmount}`,
    )
  }

  if (query.maxAmount !== undefined) {
    conditions.push(
      Prisma.sql`COALESCE(g."totalAmount", CAST(0 AS numeric)) <= ${query.maxAmount}`,
    )
  }

  if (departureDateFrom) {
    conditions.push(Prisma.sql`g."departureDate" >= ${departureDateFrom}`)
  }

  if (departureDateTo) {
    conditions.push(Prisma.sql`g."departureDate" <= ${departureDateTo}`)
  }

  if (createdDateFrom) {
    conditions.push(Prisma.sql`g."createdAt" >= ${createdDateFrom}`)
  }

  if (createdDateTo) {
    conditions.push(Prisma.sql`g."createdAt" <= ${createdDateTo}`)
  }

  if (query.paymentStatus === 'UNPAID') {
    conditions.push(
      Prisma.sql`COALESCE(financials."paidAmount", CAST(0 AS numeric)) <= CAST(0 AS numeric)`,
    )
  }

  if (query.paymentStatus === 'PARTIALLY_PAID') {
    conditions.push(
      Prisma.sql`COALESCE(financials."paidAmount", CAST(0 AS numeric)) > CAST(0 AS numeric) AND COALESCE(financials."paidAmount", CAST(0 AS numeric)) < COALESCE(g."totalAmount", CAST(0 AS numeric))`,
    )
  }

  if (query.paymentStatus === 'FULLY_PAID') {
    conditions.push(
      Prisma.sql`COALESCE(g."totalAmount", CAST(0 AS numeric)) > CAST(0 AS numeric) AND COALESCE(financials."paidAmount", CAST(0 AS numeric)) >= COALESCE(g."totalAmount", CAST(0 AS numeric))`,
    )
  }

  if (conditions.length === 0) {
    return Prisma.empty
  }

  return Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
}

function getGroupListBaseSql(authUser: AuthenticatedUser, query: GroupListQuery) {
  const whereSql = buildGroupListWhere(authUser, query)

  return Prisma.sql`
    FROM "Group" g
    INNER JOIN "Agency" a
      ON a."id" = g."agencyId"
    LEFT JOIN (
      SELECT
        pg."groupId",
        SUM(pg."allocatedAmount") AS "paidAmount",
        COUNT(*)::int AS "paymentCount"
      FROM "PaymentGroup" pg
      GROUP BY pg."groupId"
    ) financials
      ON financials."groupId" = g."id"
    ${whereSql}
  `
}

function getAgencyDefaultDestination(agency: { city: string | null; country: string | null; name: string }) {
  return [agency.city, agency.country].filter(Boolean).join(', ') || agency.name
}

function getDefaultGroupDates() {
  const today = new Date()

  return {
    departureDate: today,
    returnDate: today,
  }
}

export async function listGroups(authUser: AuthenticatedUser, query: GroupListQuery) {
  const { skip, take } = getPaginationParams(query.page, query.pageSize)
  const baseSql = getGroupListBaseSql(authUser, query)
  const orderBySql = getGroupListOrderBy(query)

  const [countRows, groups] = await prisma.$transaction([
    prisma.$queryRaw<GroupCountRow[]>(Prisma.sql`
      SELECT COUNT(*)::int AS "total"
      ${baseSql}
    `),
    prisma.$queryRaw<GroupListRow[]>(Prisma.sql`
      SELECT
        g."id",
        g."agencyId",
        g."name",
        g."code",
        g."amountPerPax",
        g."totalAmount",
        g."description",
        g."destination",
        g."departureDate",
        g."returnDate",
        g."status",
        g."travelerCount",
        g."notes",
        g."createdAt",
        g."updatedAt",
        a."id" AS "agencyRecordId",
        a."name" AS "agencyName",
        a."code" AS "agencyCode",
        a."contactEmail" AS "agencyContactEmail",
        a."contactPhone" AS "agencyContactPhone",
        a."addressLine1" AS "agencyAddressLine1",
        a."addressLine2" AS "agencyAddressLine2",
        a."city" AS "agencyCity",
        a."state" AS "agencyState",
        a."country" AS "agencyCountry",
        a."postalCode" AS "agencyPostalCode",
        a."isActive" AS "agencyIsActive",
        a."createdAt" AS "agencyCreatedAt",
        a."updatedAt" AS "agencyUpdatedAt",
        COALESCE(financials."paidAmount", CAST(0 AS numeric)) AS "paidAmount",
        GREATEST(
          COALESCE(g."totalAmount", CAST(0 AS numeric)) - COALESCE(financials."paidAmount", CAST(0 AS numeric)),
          CAST(0 AS numeric)
        ) AS "outstandingBalance",
        CASE
          WHEN COALESCE(financials."paidAmount", CAST(0 AS numeric)) <= CAST(0 AS numeric) THEN 'UNPAID'
          WHEN COALESCE(g."totalAmount", CAST(0 AS numeric)) > CAST(0 AS numeric)
            AND COALESCE(financials."paidAmount", CAST(0 AS numeric)) >= COALESCE(g."totalAmount", CAST(0 AS numeric)) THEN 'FULLY_PAID'
          ELSE 'PARTIALLY_PAID'
        END AS "paymentStatus",
        COALESCE(financials."paymentCount", 0) AS "paymentCount"
      ${baseSql}
      ORDER BY ${orderBySql}
      LIMIT ${take}
      OFFSET ${skip}
    `),
  ])

  const total = countRows[0]?.total ?? 0
  return buildPaginatedResult(groups.map(serializeGroupListRow), query.page, query.pageSize, total)
}

export async function getGroupById(id: string, authUser: AuthenticatedUser) {
  const group = await prisma.group.findUnique({
    where: {
      id,
    },
    include: {
      agency: true,
      paymentGroups: {
        include: {
          payment: {
            include: {
              receivedBy: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  })

  if (!group || (!isSuperAdmin(authUser) && group.agencyId !== authUser.agencyId)) {
    throw new AppError('Group not found', 404)
  }

  const paidAmount = group.paymentGroups.reduce((total, paymentGroup) => {
    return total + Number(paymentGroup.allocatedAmount)
  }, 0)
  const totalAmount = getNumericAmount(group.totalAmount)
  const outstandingBalance = Math.max(totalAmount - paidAmount, 0)
  const paymentStatus = getGroupFinancialStatus(totalAmount, paidAmount)

  return {
    ...group,
    paidAmount,
    outstandingBalance,
    paymentStatus,
    paymentStatusLabel: getGroupFinancialStatusLabel(paymentStatus),
    hasPayments: group.paymentGroups.length > 0,
    paymentHistory: group.paymentGroups.map((paymentGroup) => ({
      id: paymentGroup.id,
      allocatedAmount: paymentGroup.allocatedAmount,
      notes: paymentGroup.notes,
      createdAt: paymentGroup.createdAt,
      updatedAt: paymentGroup.updatedAt,
      payment: {
        id: paymentGroup.payment.id,
        reference: paymentGroup.payment.reference,
        receiptNumber: paymentGroup.payment.receiptNumber,
        amount: paymentGroup.payment.amount,
        currency: paymentGroup.payment.currency,
        method: paymentGroup.payment.method,
        status: paymentGroup.payment.status,
        paymentCity: paymentGroup.payment.paymentCity,
        description: paymentGroup.payment.description,
        paidAt: paymentGroup.payment.paidAt,
        createdAt: paymentGroup.payment.createdAt,
        receivedBy: paymentGroup.payment.receivedBy
          ? {
              firstName: paymentGroup.payment.receivedBy.firstName,
              lastName: paymentGroup.payment.receivedBy.lastName,
              email: paymentGroup.payment.receivedBy.email,
            }
          : null,
      },
    })),
  }
}

export async function createGroup(data: CreateGroupInput, authUser: AuthenticatedUser) {
  if (!isSuperAdmin(authUser) && data.agencyId !== authUser.agencyId) {
    throw new AppError('You can only create groups inside your own agency', 403)
  }

  const normalizedCode = normalizeGroupCode(data.code)
  const duplicateGroup = await prisma.group.findFirst({
    where: {
      code: normalizedCode,
    },
    select: {
      id: true,
    },
  })

  if (duplicateGroup) {
    throw new AppError(`Group Number ${normalizedCode} already exists.`, 409)
  }

  const travelerCount = getIntegerValue(data.travelerCount)
  const amountPerPax = getDecimalValue(data.amountPerPax)
  const totalAmount =
    getDecimalValue(data.totalAmount) ?? getComputedTotalAmount(travelerCount, amountPerPax)

  const payload = {
    ...data,
    code: normalizedCode,
    amountPerPax,
    totalAmount,
  }

  return prisma.group.create({
    data: payload,
    include: {
      agency: true,
      paymentGroups: true,
    },
  })
}

export async function updateGroup(
  id: string,
  data: UpdateGroupInput,
  authUser: AuthenticatedUser,
) {
  const existingGroup = await prisma.group.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      agencyId: true,
    },
  })

  if (
    !existingGroup ||
    (!isSuperAdmin(authUser) && existingGroup.agencyId !== authUser.agencyId)
  ) {
    throw new AppError('Group not found', 404)
  }

  const currentGroup = await prisma.group.findUnique({
    where: {
      id,
    },
    select: {
      travelerCount: true,
      amountPerPax: true,
    },
  })

  const normalizedCode = typeof data.code === 'string' ? normalizeGroupCode(data.code) : undefined

  if (normalizedCode && normalizedCode !== undefined) {
    const duplicateGroup = await prisma.group.findFirst({
      where: {
        code: normalizedCode,
      },
      select: {
        id: true,
      },
    })

    if (duplicateGroup && duplicateGroup.id !== id) {
      throw new AppError(`Group Number ${normalizedCode} already exists.`, 409)
    }
  }

  const nextTravelerCount = getIntegerValue(data.travelerCount) ?? currentGroup?.travelerCount
  const nextAmountPerPax =
    getDecimalValue(data.amountPerPax) ?? currentGroup?.amountPerPax ?? undefined
  const totalAmount =
    getDecimalValue(data.totalAmount) ??
    getComputedTotalAmount(nextTravelerCount, nextAmountPerPax)
  const payload = {
    ...data,
    code: normalizedCode ?? data.code,
    amountPerPax: getDecimalValue(data.amountPerPax) ?? data.amountPerPax,
    travelerCount: getIntegerValue(data.travelerCount) ?? data.travelerCount,
    totalAmount,
  }

  return prisma.group.update({
    where: {
      id,
    },
    data: payload,
    include: {
      agency: true,
      paymentGroups: true,
    },
  })
}

export async function deleteGroup(id: string, authUser: AuthenticatedUser) {
  const existingGroup = await prisma.group.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      agencyId: true,
      _count: {
        select: {
          paymentGroups: true,
        },
      },
    },
  })

  if (
    !existingGroup ||
    (!isSuperAdmin(authUser) && existingGroup.agencyId !== authUser.agencyId)
  ) {
    throw new AppError('Group not found', 404)
  }

  if (existingGroup._count.paymentGroups > 0) {
    throw new AppError('This group has payment records and cannot be deleted.', 409)
  }

  await prisma.group.delete({
    where: {
      id,
    },
  })
}

export async function bulkCreateGroups(data: BulkCreateGroupsInput, authUser: AuthenticatedUser) {
  if (!isSuperAdmin(authUser) && data.agencyId !== authUser.agencyId) {
    throw new AppError('You can only create groups inside your own agency', 403)
  }

  const normalizedRows = data.rows.map((row, index) => ({
    ...row,
    index,
    groupNumber: normalizeGroupCode(row.groupNumber),
    groupName: row.groupName?.trim() || undefined,
  }))

  const createdGroups = await prisma.$transaction(async (transaction) => {
    const agency = await transaction.agency.findUnique({
      where: {
        id: data.agencyId,
      },
      select: {
        id: true,
        name: true,
        city: true,
        country: true,
      },
    })

    if (!agency) {
      throw new AppError('Agency not found', 404)
    }

    const existingGroups = await transaction.group.findMany({
      where: {
        code: {
          in: normalizedRows.map((row) => row.groupNumber),
        },
      },
      select: {
        code: true,
      },
    })

    if (existingGroups.length > 0) {
      throw new AppError(
        `Duplicate group numbers already exist: ${existingGroups
          .map((group) => group.code)
          .join(', ')}`,
        409,
      )
    }

    const { departureDate, returnDate } = getDefaultGroupDates()
    const destination = getAgencyDefaultDestination(agency)
    const createRows = normalizedRows.map((row) => ({
      agencyId: data.agencyId,
      name: row.groupName ?? row.groupNumber,
      code: row.groupNumber,
      amountPerPax: new Prisma.Decimal(row.amountPerPax),
      totalAmount: getComputedTotalAmount(row.pax, row.amountPerPax),
      description: undefined,
      destination,
      departureDate,
      returnDate,
      status: 'PLANNED' as const,
      travelerCount: row.pax,
      notes: undefined,
    }))

    await transaction.group.createMany({
      data: createRows,
    })

    return transaction.group.findMany({
      where: {
        code: {
          in: normalizedRows.map((row) => row.groupNumber),
        },
      },
      include: {
        agency: true,
        paymentGroups: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  })

  return {
    count: createdGroups.length,
    groups: createdGroups,
  }
}
