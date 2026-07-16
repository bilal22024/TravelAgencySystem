import { Router } from 'express'
import { authenticate } from '../../../middlewares/authenticate.js'
import {
  createPaymentGroupController,
  deletePaymentGroupController,
  getPaymentGroupController,
  listPaymentGroupsController,
  updatePaymentGroupController,
} from './payment-group.controller.js'

export const paymentGroupRouter = Router()

paymentGroupRouter.use(authenticate)

paymentGroupRouter.get('/', listPaymentGroupsController)
paymentGroupRouter.get('/:id', getPaymentGroupController)
paymentGroupRouter.post('/', createPaymentGroupController)
paymentGroupRouter.patch('/:id', updatePaymentGroupController)
paymentGroupRouter.delete('/:id', deletePaymentGroupController)
