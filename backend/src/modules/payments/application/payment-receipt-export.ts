import { Buffer } from 'node:buffer'
import type { PaymentReceipt } from './payment.service.js'

function formatCurrency(value: number) {
  return value.toFixed(2)
}

function formatDate(value: string) {
  return new Date(value).toISOString().slice(0, 10)
}

export async function buildPaymentReceiptPdf(receipt: PaymentReceipt) {
  const { default: PDFDocument } = await import('pdfkit')

  return await new Promise<Buffer>((resolve, reject) => {
    const document = new PDFDocument({
      margin: 40,
      size: 'A4',
    })
    const chunks: Buffer[] = []

    document.on('data', (chunk: Buffer) => chunks.push(chunk))
    document.on('end', () => resolve(Buffer.concat(chunks)))
    document.on('error', reject)

    document.fontSize(18).text('Travel Agency Management System Payment Receipt')
    document.moveDown(0.5)
    document.fontSize(10).text(`Receipt Number: ${receipt.receiptNumber}`)
    document.text(`Reference Number: ${receipt.referenceNumber}`)
    document.text(`Payment Date: ${formatDate(receipt.paymentDate)}`)
    document.text(`Payment City: ${receipt.paymentCity}`)
    document.text(`Payment Method: ${receipt.paymentMethod.replace(/_/g, ' ')}`)
    document.text(`Received By: ${receipt.receivedBy}`)
    document.moveDown()

    document.fontSize(12).text('Agency')
    document.fontSize(10).text(`Agency: ${receipt.agency.agencyName}`)
    document.text(`Agent Number: ${receipt.agency.agentNumber}`)
    document.text(`Country: ${receipt.agency.country}`)
    document.text(`City: ${receipt.agency.city}`)
    document.moveDown()

    document.fontSize(12).text('Selected Groups')
    receipt.groups.forEach((group) => {
      document
        .fontSize(9)
        .text(
          `${group.groupNumber} | ${group.groupName} | Pax ${group.passengers} | Group Total ${formatCurrency(group.groupTotalAmount)} | Allocated ${formatCurrency(group.allocatedAmount)}`,
        )
    })
    document.moveDown()

    document.fontSize(12).text('Payment Totals')
    document.fontSize(10).text(`Current Payment: ${formatCurrency(receipt.currentPaymentAmount)}`)
    document.text(`Allocated Amount: ${formatCurrency(receipt.totalAllocatedAmount)}`)
    document.text(`Remarks: ${receipt.remarks || '-'}`)

    document.end()
  })
}
