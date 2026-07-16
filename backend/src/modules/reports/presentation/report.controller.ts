import type { Request, Response } from 'express'
import { asyncHandler } from '../../../common/http/async-handler.js'
import { AppError } from '../../../common/errors/app-error.js'
import {
  exportAgencyLedgerPdf,
  exportAgencyReport,
  exportOutstandingBalanceReport,
  exportReport,
  getAgencyLedger,
  getAgencyReport,
  getOutstandingBalanceReport,
  getReportSummary,
} from '../application/report.service.js'
import {
  agencyLedgerQuerySchema,
  agencyReportQuerySchema,
  outstandingBalanceReportQuerySchema,
  reportExportParamsSchema,
  reportQuerySchema,
} from '../dto/report.schema.js'

function requireAuthUser(request: Request) {
  if (!request.authUser) {
    throw new AppError('Authentication is required', 401)
  }

  return request.authUser
}

export const getReportSummaryController = asyncHandler(
  async (request: Request, response: Response) => {
    const query = reportQuerySchema.parse(request.query)
    const summary = await getReportSummary(requireAuthUser(request), query)

    return response.status(200).json({ data: summary })
  },
)

export const exportReportController = asyncHandler(async (request: Request, response: Response) => {
  const query = reportQuerySchema.parse(request.query)
  const params = reportExportParamsSchema.parse(request.params)
  const exportFile = await exportReport(params.format, requireAuthUser(request), query)

  response.setHeader('Content-Type', exportFile.contentType)
  response.setHeader('Content-Disposition', `attachment; filename="${exportFile.fileName}"`)

  return response.status(200).send(exportFile.body)
})

export const getAgencyReportController = asyncHandler(
  async (request: Request, response: Response) => {
    const query = agencyReportQuerySchema.parse(request.query)
    const report = await getAgencyReport(requireAuthUser(request), query)

    return response.status(200).json({ data: report })
  },
)

export const exportAgencyReportController = asyncHandler(
  async (request: Request, response: Response) => {
    const query = agencyReportQuerySchema.parse(request.query)
    const params = reportExportParamsSchema.parse(request.params)
    const exportFile = await exportAgencyReport(params.format, requireAuthUser(request), query)

    response.setHeader('Content-Type', exportFile.contentType)
    response.setHeader('Content-Disposition', `attachment; filename="${exportFile.fileName}"`)

    return response.status(200).send(exportFile.body)
  },
)

export const getAgencyLedgerController = asyncHandler(
  async (request: Request, response: Response) => {
    const query = agencyLedgerQuerySchema.parse(request.query)
    const ledger = await getAgencyLedger(requireAuthUser(request), query)

    return response.status(200).json({ data: ledger })
  },
)

export const exportAgencyLedgerPdfController = asyncHandler(
  async (request: Request, response: Response) => {
    const query = agencyLedgerQuerySchema.parse(request.query)
    const exportFile = await exportAgencyLedgerPdf(requireAuthUser(request), query)

    response.setHeader('Content-Type', exportFile.contentType)
    response.setHeader('Content-Disposition', `attachment; filename="${exportFile.fileName}"`)

    return response.status(200).send(exportFile.body)
  },
)

export const getOutstandingBalanceReportController = asyncHandler(
  async (request: Request, response: Response) => {
    const query = outstandingBalanceReportQuerySchema.parse(request.query)
    const report = await getOutstandingBalanceReport(requireAuthUser(request), query)

    return response.status(200).json({ data: report })
  },
)

export const exportOutstandingBalanceReportController = asyncHandler(
  async (request: Request, response: Response) => {
    const query = outstandingBalanceReportQuerySchema.parse(request.query)
    const params = reportExportParamsSchema.parse(request.params)
    const exportFile = await exportOutstandingBalanceReport(
      params.format,
      requireAuthUser(request),
      query,
    )

    response.setHeader('Content-Type', exportFile.contentType)
    response.setHeader('Content-Disposition', `attachment; filename="${exportFile.fileName}"`)

    return response.status(200).send(exportFile.body)
  },
)
