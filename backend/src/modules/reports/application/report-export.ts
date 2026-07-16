import { Buffer } from 'node:buffer'
import type { ReportSummary } from './report-aggregation.js'

function formatCurrency(value: number) {
  return value.toFixed(2)
}

function formatNullableDate(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : 'Not set'
}

export function buildReportCsv(summary: ReportSummary) {
  const lines: string[] = []

  lines.push('Travel Agency Management System Report')
  lines.push(`Year,${summary.filters.year}`)
  lines.push(`Month,${summary.filters.month ?? 'All'}`)
  lines.push('')
  lines.push('Totals')
  lines.push('Metric,Value')
  lines.push(`Total Revenue,${formatCurrency(summary.totals.totalRevenue)}`)
  lines.push(`Outstanding Balance,${formatCurrency(summary.totals.outstandingBalance)}`)
  lines.push(`Allocated Revenue,${formatCurrency(summary.totals.allocatedRevenue)}`)
  lines.push(`Allocation Coverage Rate,${summary.totals.allocationCoverageRate}`)
  lines.push(`Payment Count,${summary.totals.paymentCount}`)
  lines.push(`Active Agency Count,${summary.totals.activeAgencyCount}`)
  lines.push('')
  lines.push('Monthly Revenue')
  lines.push('Month,Revenue')
  summary.monthlyRevenue.forEach((row) => {
    lines.push(`${row.month},${formatCurrency(row.revenue)}`)
  })
  lines.push('')
  lines.push('Country Revenue')
  lines.push('Country,Revenue,Outstanding Balance')
  summary.countryRevenue.forEach((row) => {
    lines.push(`${escapeCsv(row.country)},${formatCurrency(row.revenue)},${formatCurrency(row.outstandingBalance)}`)
  })
  lines.push('')
  lines.push('Agency Revenue')
  lines.push('Agency Name,Agency Code,Country,Revenue,Outstanding Balance,Payment Count')
  summary.agencyRevenue.forEach((row) => {
    lines.push(
      `${escapeCsv(row.agencyName)},${escapeCsv(row.agencyCode)},${escapeCsv(row.country)},${formatCurrency(row.revenue)},${formatCurrency(row.outstandingBalance)},${row.paymentCount}`,
    )
  })
  lines.push('')
  lines.push('Outstanding Balances')
  lines.push('Reference,Agency,Country,Amount,Remaining Balance,Status,Paid At')
  summary.outstandingBalances.forEach((row) => {
    lines.push(
      `${escapeCsv(row.reference)},${escapeCsv(row.agencyName)},${escapeCsv(row.country)},${formatCurrency(row.amount)},${formatCurrency(row.remainingBalance)},${row.status},${formatNullableDate(row.paidAt)}`,
    )
  })

  return Buffer.from(lines.join('\n'), 'utf-8')
}

export async function buildReportExcel(summary: ReportSummary) {
  const { default: ExcelJS } = await import('exceljs')
  const { Workbook } = ExcelJS
  const workbook = new Workbook()

  const totalsSheet = workbook.addWorksheet('Summary')
  totalsSheet.columns = [
    { header: 'Metric', key: 'metric', width: 28 },
    { header: 'Value', key: 'value', width: 20 },
  ]
  totalsSheet.addRows([
    { metric: 'Year', value: summary.filters.year },
    { metric: 'Month', value: summary.filters.month ?? 'All' },
    { metric: 'Total Revenue', value: summary.totals.totalRevenue },
    { metric: 'Outstanding Balance', value: summary.totals.outstandingBalance },
    { metric: 'Allocated Revenue', value: summary.totals.allocatedRevenue },
    { metric: 'Allocation Coverage Rate', value: summary.totals.allocationCoverageRate },
    { metric: 'Payment Count', value: summary.totals.paymentCount },
    { metric: 'Active Agency Count', value: summary.totals.activeAgencyCount },
  ])

  addWorksheetFromRows(workbook, 'Monthly Revenue', summary.monthlyRevenue)
  addWorksheetFromRows(workbook, 'Country Revenue', summary.countryRevenue)
  addWorksheetFromRows(workbook, 'Agency Revenue', summary.agencyRevenue)
  addWorksheetFromRows(workbook, 'Outstanding Balances', summary.outstandingBalances)

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function buildReportPdf(summary: ReportSummary) {
  const { default: PDFDocument } = await import('pdfkit')

  return await new Promise<Buffer>((resolve, reject) => {
    const document = new PDFDocument({ margin: 40 })
    const chunks: Buffer[] = []

    document.on('data', (chunk: Buffer) => chunks.push(chunk))
    document.on('end', () => resolve(Buffer.concat(chunks)))
    document.on('error', reject)

    document.fontSize(18).text('Travel Agency Management System Report')
    document.moveDown(0.5)
    document.fontSize(10).text(`Year: ${summary.filters.year}`)
    document.fontSize(10).text(`Month: ${summary.filters.month ?? 'All'}`)
    document.moveDown()

    document.fontSize(14).text('Totals')
    writePdfKeyValue(document, 'Total Revenue', formatCurrency(summary.totals.totalRevenue))
    writePdfKeyValue(document, 'Outstanding Balance', formatCurrency(summary.totals.outstandingBalance))
    writePdfKeyValue(document, 'Allocated Revenue', formatCurrency(summary.totals.allocatedRevenue))
    writePdfKeyValue(
      document,
      'Allocation Coverage Rate',
      `${Math.round(summary.totals.allocationCoverageRate * 100)}%`,
    )
    writePdfKeyValue(document, 'Payment Count', String(summary.totals.paymentCount))
    writePdfKeyValue(document, 'Active Agency Count', String(summary.totals.activeAgencyCount))
    document.moveDown()

    writePdfSection(document, 'Monthly Revenue', summary.monthlyRevenue, ['month', 'revenue'])
    writePdfSection(document, 'Country Revenue', summary.countryRevenue, [
      'country',
      'revenue',
      'outstandingBalance',
    ])
    writePdfSection(document, 'Agency Revenue', summary.agencyRevenue, [
      'agencyName',
      'agencyCode',
      'country',
      'revenue',
      'outstandingBalance',
    ])
    writePdfSection(document, 'Outstanding Balances', summary.outstandingBalances, [
      'reference',
      'agencyName',
      'remainingBalance',
      'status',
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
  rows.slice(0, 8).forEach((row) => {
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

function escapeCsv(value: string) {
  if (value.includes(',') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`
  }

  return value
}
