import { Router } from 'express'
import { authenticate } from '../../../middlewares/authenticate.js'
import {
  exportAgencyLedgerPdfController,
  exportAgencyReportController,
  exportOutstandingBalanceReportController,
  exportReportController,
  getAgencyLedgerController,
  getAgencyReportController,
  getOutstandingBalanceReportController,
  getReportSummaryController,
} from './report.controller.js'

export const reportRouter = Router()

reportRouter.use(authenticate)

reportRouter.get('/summary', getReportSummaryController)
reportRouter.get('/export/:format', exportReportController)
reportRouter.get('/agency', getAgencyReportController)
reportRouter.get('/agency/export/:format', exportAgencyReportController)
reportRouter.get('/agency-ledger', getAgencyLedgerController)
reportRouter.get('/agency-ledger/export/pdf', exportAgencyLedgerPdfController)
reportRouter.get('/outstanding-balances', getOutstandingBalanceReportController)
reportRouter.get('/outstanding-balances/export/:format', exportOutstandingBalanceReportController)
