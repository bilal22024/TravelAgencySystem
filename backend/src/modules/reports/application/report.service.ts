import { prisma } from '../../../lib/prisma.js'
import { AppError } from '../../../common/errors/app-error.js'
import type { AuthenticatedUser } from '../../../common/types/auth-user.js'
import type { Prisma } from '@prisma/client'
import type {
  AgencyLedgerQuery,
  AgencyReportQuery,
  OutstandingBalanceReportQuery,
  ReportQuery,
} from '../dto/report.schema.js'
import { buildAgencyLedger } from './agency-ledger-aggregation.js'
import { buildAgencyLedgerPdf } from './agency-ledger-export.js'
import { buildAgencyReport } from './agency-report-aggregation.js'
import {
  buildAgencyReportCsv,
  buildAgencyReportExcel,
  buildAgencyReportPdf,
} from './agency-report-export.js'
import { buildOutstandingBalanceReport } from './outstanding-balance-report-aggregation.js'
import {
  buildOutstandingBalanceReportCsv,
  buildOutstandingBalanceReportExcel,
  buildOutstandingBalanceReportPdf,
} from './outstanding-balance-report-export.js'
import { buildReportSummary } from './report-aggregation.js'
import { buildReportCsv, buildReportExcel, buildReportPdf } from './report-export.js'

function isSuperAdmin(user: AuthenticatedUser) {
  return user.role === 'SUPER_ADMIN'
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

function getAgencyScopeWhere(accessibleAgencyIds: string[] | null): Prisma.AgencyWhereInput {
  return accessibleAgencyIds
    ? {
        id: {
          in: accessibleAgencyIds,
        },
      }
    : {}
}

function getPaymentScopeWhere(accessibleAgencyIds: string[] | null): Prisma.PaymentWhereInput {
  return accessibleAgencyIds
    ? {
        agencyId: {
          in: accessibleAgencyIds,
        },
      }
    : {}
}

function getScopedAgencyId(
  authUser: AuthenticatedUser,
  accessibleAgencyIds: string[] | null,
  requestedAgencyId?: string,
) {
  if (isSuperAdmin(authUser)) {
    if (!requestedAgencyId) {
      throw new AppError('Please select an agency before loading the agency report', 400)
    }

    return requestedAgencyId
  }

  if (!requestedAgencyId) {
    return authUser.agencyId
  }

  if (accessibleAgencyIds && !accessibleAgencyIds.includes(requestedAgencyId)) {
    throw new AppError('Agency not found', 404)
  }

  return requestedAgencyId
}

async function getScopedReportAgency(
  authUser: AuthenticatedUser,
  accessibleAgencyIds: string[] | null,
  requestedAgencyId: string | undefined,
  requestedIncludeBranches: boolean | undefined,
  requestedFamilyAgencyId?: string,
) {
  const agencyId = getScopedAgencyId(authUser, accessibleAgencyIds, requestedAgencyId)
  const agency = await prisma.agency.findFirst({
    where: {
      id: agencyId,
      ...getAgencyScopeWhere(accessibleAgencyIds),
    },
    select: {
      id: true,
      name: true,
      code: true,
      city: true,
      country: true,
      openingBalance: true,
      agencyType: true,
      parentAgency: {
        select: {
          id: true,
          name: true,
          code: true,
          city: true,
          country: true,
          agencyType: true,
        },
      },
      branches: {
        select: {
          id: true,
          name: true,
          code: true,
          city: true,
          country: true,
          agencyType: true,
        },
        orderBy: {
          name: 'asc',
        },
      },
    },
  })

  if (!agency) {
    throw new AppError('Agency not found', 404)
  }

  const includeBranches = requestedIncludeBranches === true && agency.agencyType === 'PARENT'
  const scopeAgencyIds = includeBranches
    ? [agency.id, ...agency.branches.map((branch) => branch.id)]
    : [agency.id]
  const familyAgencyId =
    includeBranches && requestedFamilyAgencyId && scopeAgencyIds.includes(requestedFamilyAgencyId)
      ? requestedFamilyAgencyId
      : undefined

  if (requestedFamilyAgencyId && includeBranches && !familyAgencyId) {
    throw new AppError('Family agency filter is not part of the selected parent scope', 400)
  }

  const visibleAgencyIds = familyAgencyId ? [familyAgencyId] : scopeAgencyIds
  const visibleAgency =
    familyAgencyId === agency.id
      ? {
          id: agency.id,
          name: agency.name,
          code: agency.code,
          city: agency.city,
          country: agency.country,
          agencyType: agency.agencyType,
        }
      : agency.branches.find((branch) => branch.id === familyAgencyId)

  return {
    agency,
    includeBranches,
    scopeAgencyIds,
    visibleAgencyIds,
    visibleAgency,
  }
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

function getEffectiveDateWhere(dateFrom?: Date, dateTo?: Date): Prisma.PaymentWhereInput {
  if (!dateFrom && !dateTo) {
    return {}
  }

  const paidAtFilter = {
    not: null,
    ...(dateFrom ? { gte: dateFrom } : {}),
    ...(dateTo ? { lte: dateTo } : {}),
  }
  const createdAtFilter = {
    ...(dateFrom ? { gte: dateFrom } : {}),
    ...(dateTo ? { lte: dateTo } : {}),
  }

  return {
    OR: [
      { paidAt: paidAtFilter },
      {
        paidAt: null,
        createdAt: createdAtFilter,
      },
    ],
  }
}

export async function getReportSummary(authUser: AuthenticatedUser, query: ReportQuery) {
  const accessibleAgencyIds = await getAccessibleAgencyIds(authUser)
  const agencyWhere: Prisma.AgencyWhereInput = {
    ...getAgencyScopeWhere(accessibleAgencyIds),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { country: { contains: query.search, mode: 'insensitive' } },
            { city: { contains: query.search, mode: 'insensitive' } },
            {
              payments: {
                some: {
                  paymentGroups: {
                    some: {
                      group: {
                        code: { contains: query.search, mode: 'insensitive' },
                      },
                    },
                  },
                },
              },
            },
          ],
        }
      : {}),
  }

  const paymentWhere: Prisma.PaymentWhereInput = {
    ...getPaymentScopeWhere(accessibleAgencyIds),
    ...(query.search
      ? {
          OR: [
            { agency: { name: { contains: query.search, mode: 'insensitive' } } },
            { agency: { country: { contains: query.search, mode: 'insensitive' } } },
            { agency: { city: { contains: query.search, mode: 'insensitive' } } },
            {
              paymentGroups: {
                some: {
                  group: {
                    code: { contains: query.search, mode: 'insensitive' },
                  },
                },
              },
            },
          ],
        }
      : {}),
  }

  const groupWhere: Prisma.GroupWhereInput = {
    ...(accessibleAgencyIds
      ? {
          agencyId: {
            in: accessibleAgencyIds,
          },
        }
      : {}),
    ...(query.search
      ? {
          OR: [
            { code: { contains: query.search, mode: 'insensitive' } },
            { name: { contains: query.search, mode: 'insensitive' } },
            { agency: { name: { contains: query.search, mode: 'insensitive' } } },
            { agency: { country: { contains: query.search, mode: 'insensitive' } } },
            { agency: { city: { contains: query.search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  }

  const [agencies, groups, payments] = await prisma.$transaction([
    prisma.agency.findMany({
      where: agencyWhere,
      select: {
        id: true,
        name: true,
        code: true,
        city: true,
        country: true,
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.group.findMany({
      where: groupWhere,
      select: {
        id: true,
        agencyId: true,
        totalAmount: true,
      },
    }),
    prisma.payment.findMany({
      where: paymentWhere,
      select: {
        id: true,
        agencyId: true,
        reference: true,
        amount: true,
        currency: true,
        method: true,
        status: true,
        paymentCity: true,
        description: true,
        paidAt: true,
        createdAt: true,
        agency: {
          select: {
            id: true,
            name: true,
            code: true,
            city: true,
            country: true,
            isActive: true,
          },
        },
        paymentGroups: {
          select: {
            allocatedAmount: true,
            group: {
              select: {
                id: true,
                agencyId: true,
                code: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
  ])

  return buildReportSummary({
    agencies,
    groups,
    payments,
    year: query.year,
    month: query.month,
  })
}

export async function exportReport(
  format: 'csv' | 'excel' | 'pdf',
  authUser: AuthenticatedUser,
  query: ReportQuery,
) {
  const summary = await getReportSummary(authUser, query)

  switch (format) {
    case 'csv':
      return {
        fileName: buildReportFileName('csv', query),
        contentType: 'text/csv; charset=utf-8',
        body: buildReportCsv(summary),
      }
    case 'excel':
      return {
        fileName: buildReportFileName('xlsx', query),
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        body: await buildReportExcel(summary),
      }
    case 'pdf':
      return {
        fileName: buildReportFileName('pdf', query),
        contentType: 'application/pdf',
        body: await buildReportPdf(summary),
      }
  }
}

export async function getAgencyReport(authUser: AuthenticatedUser, query: AgencyReportQuery) {
  const accessibleAgencyIds = await getAccessibleAgencyIds(authUser)
  const scopedAgency = await getScopedReportAgency(
    authUser,
    accessibleAgencyIds,
    query.agencyId,
    query.includeBranches,
    query.familyAgencyId,
  )
  const { dateFrom, dateTo } = toDayRange(query.dateFrom, query.dateTo)

  const [groups, payments] = await prisma.$transaction([
    prisma.group.findMany({
      where: {
        agencyId: {
          in: scopedAgency.visibleAgencyIds,
        },
        ...(query.groupNumber
          ? {
              code: { contains: query.groupNumber, mode: 'insensitive' },
            }
          : {}),
      },
      select: {
        id: true,
        code: true,
        travelerCount: true,
        totalAmount: true,
        agency: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        code: 'asc',
      },
    }),
    prisma.payment.findMany({
      where: {
        OR: [
          {
            agencyId: {
              in: scopedAgency.visibleAgencyIds,
            },
          },
          {
            paymentGroups: {
              some: {
                group: {
                  agencyId: {
                    in: scopedAgency.visibleAgencyIds,
                  },
                  ...(query.groupNumber
                    ? {
                        code: {
                          contains: query.groupNumber,
                          mode: 'insensitive',
                        },
                      }
                    : {}),
                },
              },
            },
          },
        ],
        ...(query.paymentStatus ? { status: query.paymentStatus } : {}),
      },
      include: {
        agency: {
          select: {
            id: true,
            name: true,
            code: true,
            city: true,
            country: true,
          },
        },
        receivedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        paymentGroups: {
          select: {
            allocatedAmount: true,
            notes: true,
            group: {
              select: {
                id: true,
                code: true,
                agencyId: true,
                agency: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        {
          paidAt: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    }),
  ])

  return buildAgencyReport({
    agency: scopedAgency.agency,
    groups,
    payments,
    filters: {
      dateFrom,
      dateTo,
      groupCode: query.groupNumber,
      paymentStatus: query.paymentStatus,
      includeBranches: scopedAgency.includeBranches,
      scopeAgencyIds: scopedAgency.scopeAgencyIds,
      visibleAgencyIds: scopedAgency.visibleAgencyIds,
      visibleAgency: scopedAgency.visibleAgency,
      branches: scopedAgency.agency.branches,
    },
  })
}

export async function exportAgencyReport(
  format: 'csv' | 'excel' | 'pdf',
  authUser: AuthenticatedUser,
  query: AgencyReportQuery,
) {
  const report = await getAgencyReport(authUser, query)

  switch (format) {
    case 'csv':
      return {
        fileName: buildAgencyReportFileName(
          report.agency.agentNumber,
          query.includeBranches === true,
          'csv',
        ),
        contentType: 'text/csv; charset=utf-8',
        body: buildAgencyReportCsv(report),
      }
    case 'excel':
      return {
        fileName: buildAgencyReportFileName(
          report.agency.agentNumber,
          query.includeBranches === true,
          'xlsx',
        ),
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        body: await buildAgencyReportExcel(report),
      }
    case 'pdf':
      return {
        fileName: buildAgencyReportFileName(
          report.agency.agentNumber,
          query.includeBranches === true,
          'pdf',
        ),
        contentType: 'application/pdf',
        body: await buildAgencyReportPdf(report),
      }
  }
}

export async function getAgencyLedger(authUser: AuthenticatedUser, query: AgencyLedgerQuery) {
  const accessibleAgencyIds = await getAccessibleAgencyIds(authUser)
  const scopedAgency = await getScopedReportAgency(
    authUser,
    accessibleAgencyIds,
    query.agencyId,
    query.includeBranches,
  )
  const { dateFrom, dateTo } = toDayRange(query.dateFrom, query.dateTo)

  const [groups, payments] = await prisma.$transaction([
    prisma.group.findMany({
      where: {
        agencyId: {
          in: scopedAgency.scopeAgencyIds,
        },
      },
      select: {
        id: true,
        code: true,
        totalAmount: true,
        createdAt: true,
        agency: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    }),
    prisma.payment.findMany({
      where: {
        OR: [
          {
            agencyId: {
              in: scopedAgency.scopeAgencyIds,
            },
          },
          {
            paymentGroups: {
              some: {
                group: {
                  agencyId: {
                    in: scopedAgency.scopeAgencyIds,
                  },
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        agencyId: true,
        reference: true,
        amount: true,
        currency: true,
        description: true,
        paidAt: true,
        createdAt: true,
        agency: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        paymentGroups: {
          select: {
            id: true,
            allocatedAmount: true,
            notes: true,
            createdAt: true,
            group: {
              select: {
                id: true,
                agencyId: true,
                code: true,
                agency: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        {
          paidAt: 'asc',
        },
        {
          createdAt: 'asc',
        },
      ],
    }),
  ])

  return buildAgencyLedger({
    agency: scopedAgency.agency,
    groups,
    payments,
    filters: {
      dateFrom,
      dateTo,
      includeBranches: scopedAgency.includeBranches,
      scopeAgencyIds: scopedAgency.scopeAgencyIds,
      branches: scopedAgency.agency.branches,
    },
  })
}

export async function exportAgencyLedgerPdf(
  authUser: AuthenticatedUser,
  query: AgencyLedgerQuery,
) {
  const ledger = await getAgencyLedger(authUser, query)

  return {
    fileName: buildAgencyLedgerFileName(
      ledger.agency.agentNumber,
      query.includeBranches === true,
    ),
    contentType: 'application/pdf',
    body: await buildAgencyLedgerPdf(ledger),
  }
}

export async function getOutstandingBalanceReport(
  authUser: AuthenticatedUser,
  query: OutstandingBalanceReportQuery,
) {
  const accessibleAgencyIds = await getAccessibleAgencyIds(authUser)
  const { dateFrom, dateTo } = toDayRange(query.dateFrom, query.dateTo)
  const agencyWhere: Prisma.AgencyWhereInput = {
    ...getAgencyScopeWhere(accessibleAgencyIds),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { code: { contains: query.search, mode: 'insensitive' } },
            { country: { contains: query.search, mode: 'insensitive' } },
            { city: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  const agencies = await prisma.agency.findMany({
    where: agencyWhere,
    select: {
      id: true,
      name: true,
      code: true,
      city: true,
      country: true,
    },
    orderBy: {
      name: 'asc',
    },
  })

  if (agencies.length === 0) {
    return buildOutstandingBalanceReport({
      agencies: [],
      groupStats: [],
      payments: [],
      filters: {
        search: query.search,
        dateFrom,
        dateTo,
        paymentStatus: query.paymentStatus,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      },
    })
  }

  const agencyIds = agencies.map((agency) => agency.id)

  const [groupStats, payments] = await prisma.$transaction([
    prisma.group.groupBy({
      by: ['agencyId'],
      where: {
        agencyId: {
          in: agencyIds,
        },
      },
      orderBy: {
        agencyId: 'asc',
      },
      _count: {
        _all: true,
      },
      _sum: {
        travelerCount: true,
        totalAmount: true,
      },
    }),
    prisma.payment.findMany({
      where: {
        OR: [
          {
            agencyId: {
              in: agencyIds,
            },
          },
          {
            paymentGroups: {
              some: {
                group: {
                  agencyId: {
                    in: agencyIds,
                  },
                },
              },
            },
          },
        ],
        ...getEffectiveDateWhere(dateFrom, dateTo),
      },
      select: {
        id: true,
        agencyId: true,
        amount: true,
        currency: true,
        status: true,
        paidAt: true,
        createdAt: true,
        paymentGroups: {
          select: {
            allocatedAmount: true,
            group: {
              select: {
                agencyId: true,
              },
            },
          },
        },
      },
      orderBy: [
        {
          paidAt: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    }),
  ])

  return buildOutstandingBalanceReport({
    agencies,
    groupStats,
    payments,
    filters: {
      search: query.search,
      dateFrom,
      dateTo,
      paymentStatus: query.paymentStatus,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    },
  })
}

export async function exportOutstandingBalanceReport(
  format: 'csv' | 'excel' | 'pdf',
  authUser: AuthenticatedUser,
  query: OutstandingBalanceReportQuery,
) {
  const report = await getOutstandingBalanceReport(authUser, query)

  switch (format) {
    case 'csv':
      return {
        fileName: 'travel-agency-outstanding-balance-report.csv',
        contentType: 'text/csv; charset=utf-8',
        body: buildOutstandingBalanceReportCsv(report),
      }
    case 'excel':
      return {
        fileName: 'travel-agency-outstanding-balance-report.xlsx',
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        body: await buildOutstandingBalanceReportExcel(report),
      }
    case 'pdf':
      return {
        fileName: 'travel-agency-outstanding-balance-report.pdf',
        contentType: 'application/pdf',
        body: await buildOutstandingBalanceReportPdf(report),
      }
  }
}

function buildReportFileName(extension: 'csv' | 'xlsx' | 'pdf', query: ReportQuery) {
  const monthToken = query.month ? `-${String(query.month).padStart(2, '0')}` : ''
  return `travel-agency-report-${query.year}${monthToken}.${extension}`
}

function buildAgencyReportFileName(
  agencyCode: string,
  includeBranches: boolean,
  extension: 'csv' | 'xlsx' | 'pdf',
) {
  const scopeSuffix = includeBranches ? '-consolidated' : ''
  return `travel-agency-agency-report-${agencyCode.toLowerCase()}${scopeSuffix}.${extension}`
}

function buildAgencyLedgerFileName(agencyCode: string, includeBranches: boolean) {
  const scopeSuffix = includeBranches ? '-consolidated' : ''
  return `travel-agency-agency-ledger-${agencyCode.toLowerCase()}${scopeSuffix}.pdf`
}
