import { Buffer } from 'node:buffer'
import type { AgencyLedger } from './agency-ledger-aggregation.js'

function formatCurrency(value: number) {
  return value.toFixed(2)
}

function formatDate(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : '-'
}

export async function buildAgencyLedgerPdf(ledger: AgencyLedger) {
  const { default: PDFDocument } = await import('pdfkit')

  return await new Promise<Buffer>((resolve, reject) => {
    const document = new PDFDocument({
      margin: 36,
      size: 'A4',
      bufferPages: true,
    })
    const chunks: Buffer[] = []

    document.on('data', (chunk: Buffer) => chunks.push(chunk))
    document.on('end', () => resolve(Buffer.concat(chunks)))
    document.on('error', reject)

    document.fontSize(18).text('Travel Agency Management System Agency Ledger')
    document.moveDown(0.5)
    document.fontSize(10).text(`Agency: ${ledger.agency.agencyName}`)
    document.text(`Agent Number: ${ledger.agency.agentNumber}`)
    document.text(`Country: ${ledger.agency.country}`)
    document.text(`City: ${ledger.agency.city}`)
    document.text(`Date From: ${formatDate(ledger.filters.dateFrom)}`)
    document.text(`Date To: ${formatDate(ledger.filters.dateTo)}`)
    document.moveDown()

    document.fontSize(12).text('Ledger Summary')
    document.fontSize(10).text(`Opening Balance: ${formatCurrency(ledger.summary.openingBalance)}`)
    document.text(`Total Debits: ${formatCurrency(ledger.summary.totalDebits)}`)
    document.text(`Total Credits: ${formatCurrency(ledger.summary.totalCredits)}`)
    document.text(`Outstanding Balance: ${formatCurrency(ledger.summary.outstandingBalance)}`)
    document.moveDown()

    document.fontSize(12).text('Transactions')
    document.moveDown(0.5)
    document.fontSize(9).text(
      'Date | Description | Reference | Debit | Credit | Balance | Running Balance',
    )
    document.moveDown(0.3)

    ledger.entries.forEach((entry) => {
      const line = [
        formatDate(entry.date),
        entry.description,
        entry.referenceNumber,
        formatCurrency(entry.debit),
        formatCurrency(entry.credit),
        formatCurrency(entry.balance),
        formatCurrency(entry.runningBalance),
      ].join(' | ')

      document.fontSize(8).text(line)
    })

    document.end()
  })
}
