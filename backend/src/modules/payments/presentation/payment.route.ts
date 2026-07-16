import { Router } from 'express'
import { authenticate } from '../../../middlewares/authenticate.js'
import {
  createPaymentEntryController,
  createPaymentController,
  deletePaymentController,
  exportPaymentReceiptPdfController,
  getPaymentController,
  getPaymentReceiptController,
  listPaymentEntryGroupsController,
  listPaymentsController,
  updatePaymentController,
} from './payment.controller.js'

export const paymentRouter = Router()

paymentRouter.use(authenticate)

paymentRouter.get('/', listPaymentsController)
paymentRouter.get('/entry-groups', listPaymentEntryGroupsController)
paymentRouter.post('/entry', createPaymentEntryController)
paymentRouter.get('/:id/receipt', getPaymentReceiptController)
paymentRouter.get('/:id/receipt/pdf', exportPaymentReceiptPdfController)
paymentRouter.get('/:id', getPaymentController)
paymentRouter.post('/', createPaymentController)
paymentRouter.patch('/:id', updatePaymentController)
paymentRouter.delete('/:id', deletePaymentController)
