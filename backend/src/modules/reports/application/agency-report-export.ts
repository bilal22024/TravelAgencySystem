import { Buffer } from 'node:buffer'
import type { AgencyReport } from './agency-report-aggregation.js'

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

export function buildAgencyReportCsv(report: AgencyReport) {
  const lines: string[] = []

  lines.push('Travel Agency Management System Agency Report')
  lines.push(`Agency,${escapeCsv(report.agency.agencyName)}`)
  lines.push(`Country,${escapeCsv(report.agency.country)}`)
  lines.push(`City,${escapeCsv(report.agency.city)}`)
  lines.push(`Agent Number,${escapeCsv(report.agency.agentNumber)}`)
  lines.push(`Date From,${formatNullableDate(report.filters.dateFrom)}`)
  lines.push(`Date To,${formatNullableDate(report.filters.dateTo)}`)
  lines.push(`Group Number,${report.filters.groupNumber ?? 'All'}`)
  lines.push(`Payment Status,${report.filters.paymentStatus ?? 'All'}`)
  lines.push('')
  lines.push('Business Summary')
  lines.push('Metric,Value')
  lines.push(`Total Groups,${report.businessSummary.totalGroups}`)
  lines.push(`Total Passengers,${report.businessSummary.totalPassengers}`)
  lines.push(`Price Per Pax,${formatCurrency(report.businessSummary.pricePerPax)}`)
  lines.push(`Total Amount,${formatCurrency(report.businessSummary.totalAmount)}`)
  lines.push(`Total Amount Paid,${formatCurrency(report.businessSummary.totalAmountPaid)}`)
  lines.push(`Remaining Balance,${formatCurrency(report.businessSummary.remainingBalance)}`)
  lines.push('')
  lines.push('Group Details')
  lines.push('Group Number,Number of Pax,Price Per Pax,Group Amount,Payment Status')
  report.groupDetails.forEach((group) => {
    lines.push(
      `${escapeCsv(group.groupNumber)},${group.numberOfPax},${formatCurrency(group.pricePerPax)},${formatCurrency(group.groupAmount)},${group.paymentStatus}`,
    )
  })
  lines.push('')
  lines.push('Payment History')
  lines.push('Payment Date,Amount Paid,Payment City,Received By,Payment Method,Remarks,Payment Status,Reference')
  report.paymentHistory.forEach((payment) => {
    lines.push(
      `${formatNullableDate(payment.paymentDate)},${formatCurrency(payment.amountPaid)},${escapeCsv(payment.paymentCity)},${escapeCsv(payment.receivedBy)},${payment.paymentMethod},${escapeCsv(payment.remarks)},${payment.paymentStatus},${escapeCsv(payment.reference)}`,
    )
  })

  return Buffer.from(lines.join('\n'), 'utf-8')
}

export async function buildAgencyReportExcel(report: AgencyReport) {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()

  const summarySheet = workbook.addWorksheet('Agency Summary')
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 28 },
    { header: 'Value', key: 'value', width: 28 },
  ]
  summarySheet.addRows([
    { metric: 'Agency Name', value: report.agency.agencyName },
    { metric: 'Country', value: report.agency.country },
    { metric: 'City', value: report.agency.city },
    { metric: 'Agent Number', value: report.agency.agentNumber },
    { metric: 'Total Groups', value: report.businessSummary.totalGroups },
    { metric: 'Total Passengers', value: report.businessSummary.totalPassengers },
    { metric: 'Price Per Pax', value: report.businessSummary.pricePerPax },
    { metric: 'Total Amount', value: report.businessSummary.totalAmount },
    { metric: 'Total Amount Paid', value: report.businessSummary.totalAmountPaid },
    { metric: 'Remaining Balance', value: report.businessSummary.remainingBalance },
    { metric: 'Total Revenue', value: report.calculations.totalRevenue },
    { metric: 'Total Paid', value: report.calculations.totalPaid },
    { metric: 'Outstanding Balance', value: report.calculations.outstandingBalance },
  ])

  addWorksheetFromRows(workbook, 'Group Details', report.groupDetails)
  addWorksheetFromRows(workbook, 'Payment History', report.paymentHistory)

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function buildAgencyReportPdf(report: AgencyReport) {
  const { default: PDFDocument } = await import('pdfkit')

  return await new Promise<Buffer>((resolve, reject) => {
    const document = new PDFDocument({ margin: 40 })
    const chunks: Buffer[] = []

    document.on('data', (chunk: Buffer) => chunks.push(chunk))
    document.on('end', () => resolve(Buffer.concat(chunks)))
    document.on('error', reject)

    document.fontSize(18).text('Travel Agency Management System Agency Report')
    document.moveDown(0.5)
    document.fontSize(10).text(`Agency: ${report.agency.agencyName}`)
    document.fontSize(10).text(`Country: ${report.agency.country}`)
    document.fontSize(10).text(`City: ${report.agency.city}`)
    document.fontSize(10).text(`Agent Number: ${report.agency.agentNumber}`)
    document.moveDown()

    document.fontSize(14).text('Business Summary')
    writePdfKeyValue(document, 'Total Groups', String(report.businessSummary.totalGroups))
    writePdfKeyValue(document, 'Total Passengers', String(report.businessSummary.totalPassengers))
    writePdfKeyValue(document, 'Price Per Pax', formatCurrency(report.businessSummary.pricePerPax))
    writePdfKeyValue(document, 'Total Amount', formatCurrency(report.businessSummary.totalAmount))
    writePdfKeyValue(
      document,
      'Total Amount Paid',
      formatCurrency(report.businessSummary.totalAmountPaid),
    )
    writePdfKeyValue(
      document,
      'Remaining Balance',
      formatCurrency(report.businessSummary.remainingBalance),
    )
    document.moveDown()

    writePdfSection(document, 'Group Details', report.groupDetails, [
      'groupNumber',
      'numberOfPax',
      'pricePerPax',
      'groupAmount',
      'paymentStatus',
    ])
    writePdfSection(document, 'Payment History', report.paymentHistory, [
      'paymentDate',
      'amountPaid',
      'paymentCity',
      'receivedBy',
      'paymentMethod',
    ])

    document.end()
  })
}

function addWorksheetFromRows<T extends Record<string, unknown>>(
  workbook: { addWorksheet: (name: string) => { columns: unknown[]; addRows: (rows: T[]) => void } },
  name: string,
  rows: T[],
) {
  const sheet = workbook.addWorksheet(name)
  const firstRow = rows[0]

  if (!firstRow) {
    sheet.columns = [{ header: 'Empty', key: 'empty', width: 12 }]
    sheet.addRows([{ empty: 'No data' } as unknown as T])
    return
  }

  sheet.columns = Object.keys(firstRow).map((key) => ({
    header: toHeaderLabel(key),
    key,
    width: 22,
  }))
  sheet.addRows(rows)
}

function writePdfKeyValue(
  document: { fontSize: (size: number) => { text: (value: string) => void } },
  label: string,
  value: string,
) {
  document.fontSize(10).text(`${label}: ${value}`)
}

function writePdfSection<T extends Record<string, unknown>>(
  document: {
    fontSize: (size: number) => { text: (value: string) => void }
    moveDown: (value?: number) => void
  },
  title: string,
  rows: T[],
  fields: Array<keyof T>,
) {
  document.fontSize(12).text(title)
  rows.slice(0, 10).forEach((row) => {
    const line = fields
      .map((field) => `${toHeaderLabel(String(field))}: ${String(row[field] ?? '')}`)
      .join(' | ')

    document.fontSize(9).text(line)
  })
  document.moveDown()
}

function toHeaderLabel(value: string) {
  return value.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase()).trim()
}
