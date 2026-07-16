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

function getAgencyScopeWhere(authUser: AuthenticatedUser): Prisma.AgencyWhereInput {
  if (isSuperAdmin(authUser)) {
    return {}
  }

  return {
    id: authUser.agencyId,
  }
}

function getPaymentScopeWhere(authUser: AuthenticatedUser): Prisma.PaymentWhereInput {
  if (isSuperAdmin(authUser)) {
    return {}
  }

  return {
    agencyId: authUser.agencyId,
  }
}

function getScopedAgencyId(authUser: AuthenticatedUser, requestedAgencyId?: string) {
  if (!isSuperAdmin(authUser)) {
    return authUser.agencyId
  }

  if (!requestedAgencyId) {
    throw new AppError('Please select an agency before loading the agency report', 400)
  }

  return requestedAgencyId
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
  const agencyWhere: Prisma.AgencyWhereInput = {
    ...getAgencyScopeWhere(authUser),
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
    ...getPaymentScopeWhere(authUser),
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

  const [agencies, payments] = await prisma.$transaction([
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
  const agencyId = getScopedAgencyId(authUser, query.agencyId)
  const { dateFrom, dateTo } = toDayRange(query.dateFrom, query.dateTo)

  const [agency, groups, payments] = await prisma.$transaction([
    prisma.agency.findFirst({
      where: {
        id: agencyId,
        ...getAgencyScopeWhere(authUser),
      },
      select: {
        id: true,
        name: true,
        code: true,
        city: true,
        country: true,
      },
    }),
    prisma.group.findMany({
      where: {
        agencyId,
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
      },
      orderBy: {
        code: 'asc',
      },
    }),
    prisma.payment.findMany({
      where: {
        agencyId,
        ...(query.paymentStatus ? { status: query.paymentStatus } : {}),
        ...(query.groupNumber
          ? {
              paymentGroups: {
                some: {
                  group: {
                    code: { contains: query.groupNumber, mode: 'insensitive' },
                  },
                },
              },
            }
          : {}),
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

  if (!agency) {
    throw new AppError('Agency not found', 404)
  }

  return buildAgencyReport({
    agency,
    groups,
    payments,
    filters: {
      dateFrom,
      dateTo,
      groupCode: query.groupNumber,
      paymentStatus: query.paymentStatus,
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
        fileName: buildAgencyReportFileName(report.agency.agentNumber, 'csv'),
        contentType: 'text/csv; charset=utf-8',
        body: buildAgencyReportCsv(report),
      }
    case 'excel':
      return {
        fileName: buildAgencyReportFileName(report.agency.agentNumber, 'xlsx'),
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        body: await buildAgencyReportExcel(report),
      }
    case 'pdf':
      return {
        fileName: buildAgencyReportFileName(report.agency.agentNumber, 'pdf'),
        contentType: 'application/pdf',
        body: await buildAgencyReportPdf(report),
      }
  }
}

export async function getAgencyLedger(authUser: AuthenticatedUser, query: AgencyLedgerQuery) {
  const agencyId = getScopedAgencyId(authUser, query.agencyId)
  const { dateFrom, dateTo } = toDayRange(query.dateFrom, query.dateTo)

  const [agency, payments] = await prisma.$transaction([
    prisma.agency.findFirst({
      where: {
        id: agencyId,
        ...getAgencyScopeWhere(authUser),
      },
      select: {
        id: true,
        name: true,
        code: true,
        city: true,
        country: true,
      },
    }),
    prisma.payment.findMany({
      where: {
        agencyId,
      },
      select: {
        id: true,
        reference: true,
        amount: true,
        currency: true,
        description: true,
        paidAt: true,
        createdAt: true,
        paymentGroups: {
          select: {
            id: true,
            allocatedAmount: true,
            notes: true,
            createdAt: true,
            group: {
              select: {
                code: true,
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

  if (!agency) {
    throw new AppError('Agency not found', 404)
  }

  return buildAgencyLedger({
    agency,
    payments,
    filters: {
      dateFrom,
      dateTo,
    },
  })
}

export async function exportAgencyLedgerPdf(
  authUser: AuthenticatedUser,
  query: AgencyLedgerQuery,
) {
  const ledger = await getAgencyLedger(authUser, query)

  return {
    fileName: buildAgencyLedgerFileName(ledger.agency.agentNumber),
    contentType: 'application/pdf',
    body: await buildAgencyLedgerPdf(ledger),
  }
}

export async function getOutstandingBalanceReport(
  authUser: AuthenticatedUser,
  query: OutstandingBalanceReportQuery,
) {
  const { dateFrom, dateTo } = toDayRange(query.dateFrom, query.dateTo)
  const agencyWhere: Prisma.AgencyWhereInput = {
    ...getAgencyScopeWhere(authUser),
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
      },
    }),
    prisma.payment.findMany({
      where: {
        agencyId: {
          in: agencyIds,
        },
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
  extension: 'csv' | 'xlsx' | 'pdf',
) {
  return `travel-agency-agency-report-${agencyCode.toLowerCase()}.${extension}`
}

function buildAgencyLedgerFileName(agencyCode: string) {
  return `travel-agency-agency-ledger-${agencyCode.toLowerCase()}.pdf`
}
