import type { Request, Response } from 'express'
import { AppError } from '../../../common/errors/app-error.js'
import { asyncHandler } from '../../../common/http/async-handler.js'
import {
  createPaymentSchema,
  paymentEntryGroupQuerySchema,
  paymentEntrySchema,
  paymentIdParamsSchema,
  paymentListQuerySchema,
  updatePaymentSchema,
} from '../dto/payment.schema.js'
import {
  createPaymentEntry,
  createPayment,
  deletePayment,
  getPaymentById,
  getPaymentReceipt,
  listPaymentEntryGroups,
  listPayments,
  updatePayment,
} from '../application/payment.service.js'
import { buildPaymentReceiptPdf } from '../application/payment-receipt-export.js'

function requireAuthUser(request: Request) {
  if (!request.authUser) {
    throw new AppError('Authentication is required', 401)
  }

  return request.authUser
}

export const listPaymentsController = asyncHandler(async (request: Request, response: Response) => {
  const query = paymentListQuerySchema.parse(request.query)
  const payments = await listPayments(requireAuthUser(request), query)

  return response.status(200).json(payments)
})

export const getPaymentController = asyncHandler(async (request: Request, response: Response) => {
  const { id } = paymentIdParamsSchema.parse(request.params)
  const payment = await getPaymentById(id, requireAuthUser(request))

  return response.status(200).json({ data: payment })
})

export const createPaymentController = asyncHandler(
  async (request: Request, response: Response) => {
    const payload = createPaymentSchema.parse(request.body)
    const payment = await createPayment(payload, requireAuthUser(request))

    return response.status(201).json({ data: payment })
  },
)

export const listPaymentEntryGroupsController = asyncHandler(
  async (request: Request, response: Response) => {
    const { agencyId } = paymentEntryGroupQuerySchema.parse(request.query)
    const result = await listPaymentEntryGroups(agencyId, requireAuthUser(request))

    return response.status(200).json({ data: result })
  },
)

export const createPaymentEntryController = asyncHandler(
  async (request: Request, response: Response) => {
    const payload = paymentEntrySchema.parse(request.body)
    const result = await createPaymentEntry(payload, requireAuthUser(request))

    return response.status(201).json({ data: result })
  },
)

export const updatePaymentController = asyncHandler(
  async (request: Request, response: Response) => {
    const { id } = paymentIdParamsSchema.parse(request.params)
    const payload = updatePaymentSchema.parse(request.body)
    const payment = await updatePayment(id, payload, requireAuthUser(request))

    return response.status(200).json({ data: payment })
  },
)

export const deletePaymentController = asyncHandler(
  async (request: Request, response: Response) => {
    const { id } = paymentIdParamsSchema.parse(request.params)
    await deletePayment(id, requireAuthUser(request))

    return response.status(204).send()
  },
)

export const getPaymentReceiptController = asyncHandler(
  async (request: Request, response: Response) => {
    const { id } = paymentIdParamsSchema.parse(request.params)
    const receipt = await getPaymentReceipt(id, requireAuthUser(request))

    return response.status(200).json({ data: receipt })
  },
)

export const exportPaymentReceiptPdfController = asyncHandler(
  async (request: Request, response: Response) => {
    const { id } = paymentIdParamsSchema.parse(request.params)
    const receipt = await getPaymentReceipt(id, requireAuthUser(request))
    const body = await buildPaymentReceiptPdf(receipt)

    response.setHeader('Content-Type', 'application/pdf')
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="travel-agency-payment-receipt-${receipt.receiptNumber.toLowerCase()}.pdf"`,
    )

    return response.status(200).send(body)
  },
)
