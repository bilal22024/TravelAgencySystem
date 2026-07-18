import { Buffer } from 'node:buffer'
import type { OutstandingBalanceReport } from './outstanding-balance-report-aggregation.js'

function formatCurrency(value: number) {
  return value.toFixed(2)
}

function formatNullableDate(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : 'Not set'
}

function escapeCsv(value: string) {
  if (value.includes(',') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`
  }

  return value
}

export function buildOutstandingBalanceReportCsv(report: OutstandingBalanceReport) {
  const lines: string[] = []

  lines.push('Travel Agency Management System Outstanding Balance Report')
  lines.push(`Search,${report.filters.search ?? 'All'}`)
  lines.push(`Date From,${formatNullableDate(report.filters.dateFrom)}`)
  lines.push(`Date To,${formatNullableDate(report.filters.dateTo)}`)
  lines.push(`Payment Status,${report.filters.paymentStatus ?? 'All'}`)
  lines.push(`Sort By,${report.filters.sortBy}`)
  lines.push(`Sort Order,${report.filters.sortOrder}`)
  lines.push('')
  lines.push('Summary')
  lines.push('Metric,Value')
  lines.push(`Total Outstanding Amount,${formatCurrency(report.summary.totalOutstandingAmount)}`)
  lines.push(`Total Fully Paid Agencies,${report.summary.totalFullyPaidAgencies}`)
  lines.push(`Total Partially Paid Agencies,${report.summary.totalPartiallyPaidAgencies}`)
  lines.push(`Total Unpaid Agencies,${report.summary.totalUnpaidAgencies}`)
  lines.push('')
  lines.push('Rows')
  lines.push(
    'Agency Name,Country,City,Agent Number,Total Groups,Total Pax,Total Amount,Total Allocated To Groups,Outstanding Balance,Agency-Owned Advance Balance,Net Balance,Payment Status,Last Payment Date',
  )

  report.rows.forEach((row) => {
    lines.push(
      [
        escapeCsv(row.agencyName),
        escapeCsv(row.country),
        escapeCsv(row.city),
        escapeCsv(row.agentNumber),
        row.totalGroups,
        row.totalPax,
        formatCurrency(row.totalAmount),
        formatCurrency(row.totalAmountPaid),
        formatCurrency(row.outstandingBalance),
        formatCurrency(row.advanceBalance),
        formatCurrency(row.netBalance),
        escapeCsv(row.paymentStatusLabel),
        formatNullableDate(row.lastPaymentDate),
      ].join(','),
    )
  })

  return Buffer.from(lines.join('\n'), 'utf-8')
}

export async function buildOutstandingBalanceReportExcel(report: OutstandingBalanceReport) {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()

  const summarySheet = workbook.addWorksheet('Summary')
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 32 },
    { header: 'Value', key: 'value', width: 20 },
  ]
  summarySheet.addRows([
    { metric: 'Total Outstanding Amount', value: report.summary.totalOutstandingAmount },
    { metric: 'Total Fully Paid Agencies', value: report.summary.totalFullyPaidAgencies },
    { metric: 'Total Partially Paid Agencies', value: report.summary.totalPartiallyPaidAgencies },
    { metric: 'Total Unpaid Agencies', value: report.summary.totalUnpaidAgencies },
  ])

  const rowsSheet = workbook.addWorksheet('Outstanding Balances')
  rowsSheet.columns = [
    { header: 'Agency Name', key: 'agencyName', width: 28 },
    { header: 'Country', key: 'country', width: 18 },
    { header: 'City', key: 'city', width: 18 },
    { header: 'Agent Number', key: 'agentNumber', width: 16 },
    { header: 'Total Groups', key: 'totalGroups', width: 14 },
    { header: 'Total Pax', key: 'totalPax', width: 12 },
    { header: 'Total Amount', key: 'totalAmount', width: 16 },
    { header: 'Total Allocated To Groups', key: 'totalAmountPaid', width: 22 },
    { header: 'Outstanding Balance', key: 'outstandingBalance', width: 18 },
    { header: 'Agency-Owned Advance Balance', key: 'advanceBalance', width: 24 },
    { header: 'Net Balance', key: 'netBalance', width: 18 },
    { header: 'Payment Status', key: 'paymentStatusLabel', width: 18 },
    { header: 'Last Payment Date', key: 'lastPaymentDate', width: 18 },
  ]
  rowsSheet.addRows(report.rows)

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function buildOutstandingBalanceReportPdf(report: OutstandingBalanceReport) {
  const { default: PDFDocument } = await import('pdfkit')

  return await new Promise<Buffer>((resolve, reject) => {
    const document = new PDFDocument({ margin: 36 })
    const chunks: Buffer[] = []

    document.on('data', (chunk: Buffer) => chunks.push(chunk))
    document.on('end', () => resolve(Buffer.concat(chunks)))
    document.on('error', reject)

    document.fontSize(18).text('Travel Agency Management System Outstanding Balance Report')
    document.moveDown(0.5)
    document.fontSize(10).text(`Search: ${report.filters.search ?? 'All'}`)
    document.text(`Date From: ${formatNullableDate(report.filters.dateFrom)}`)
    document.text(`Date To: ${formatNullableDate(report.filters.dateTo)}`)
    document.text(`Payment Status: ${report.filters.paymentStatus ?? 'All'}`)
    document.moveDown()

    document.fontSize(12).text('Summary')
    document.fontSize(10).text(
      `Total Outstanding Amount: ${formatCurrency(report.summary.totalOutstandingAmount)}`,
    )
    document.text(`Total Fully Paid Agencies: ${report.summary.totalFullyPaidAgencies}`)
    document.text(
      `Total Partially Paid Agencies: ${report.summary.totalPartiallyPaidAgencies}`,
    )
    document.text(`Total Unpaid Agencies: ${report.summary.totalUnpaidAgencies}`)
    document.moveDown()

    document.fontSize(12).text('Agencies')
    report.rows.slice(0, 14).forEach((row) => {
      document
        .fontSize(9)
        .text(
          [
            row.agencyName,
            row.agentNumber,
            row.paymentStatusLabel,
            `Allocated ${formatCurrency(row.totalAmountPaid)}`,
            `Outstanding ${formatCurrency(row.outstandingBalance)}`,
            `Advance ${formatCurrency(row.advanceBalance)}`,
            `Net ${formatCurrency(row.netBalance)}`,
            `Last payment ${formatNullableDate(row.lastPaymentDate)}`,
          ].join(' | '),
        )
    })

    document.end()
  })
}
