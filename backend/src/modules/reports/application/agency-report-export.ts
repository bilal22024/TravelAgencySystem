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

function getScopeAwareSummaryRows(report: AgencyReport) {
  const visibleHierarchyType =
    report.agency.visibleAgencyFilter?.hierarchyType ?? report.agency.hierarchyType
  const isConsolidatedAll =
    report.agency.reportScope === 'CONSOLIDATED' && report.agency.visibleAgencyFilter === null

  if (isConsolidatedAll) {
    return [
      ['Total Groups', report.businessSummary.totalGroups],
      ['Total Passengers', report.businessSummary.totalPassengers],
      ['Price Per Pax', report.businessSummary.pricePerPax],
      ['Total Amount', report.businessSummary.totalAmount],
      ['Total Family Payments Received', report.businessSummary.totalPaymentsReceived],
      ['Parent-Owned Payments', report.businessSummary.parentOwnedPayments],
      ['Branch-Owned Payments', report.businessSummary.branchOwnedPayments],
      ['Total Allocated Across Family', report.businessSummary.totalAllocatedToGroups],
      ['Total Outstanding Across Family', report.businessSummary.outstandingBalance],
      ['Total Family Advance', report.businessSummary.agencyOwnedAdvanceBalance],
      ['Net Family Balance', report.businessSummary.netBalance],
    ] as const
  }

  if (visibleHierarchyType === 'BRANCH') {
    return [
      ['Total Groups', report.businessSummary.totalGroups],
      ['Total Passengers', report.businessSummary.totalPassengers],
      ['Price Per Pax', report.businessSummary.pricePerPax],
      ['Total Amount', report.businessSummary.totalAmount],
      ['Direct Payments by Branch', report.businessSummary.totalPaymentsReceived],
      ['Parent Payments Allocated to Branch', report.businessSummary.parentPaymentsAllocatedToAgency],
      ['Total Allocated to Branch Groups', report.businessSummary.totalAllocatedToGroups],
      ['Outstanding Balance', report.businessSummary.outstandingBalance],
      ['Branch-Owned Advance Balance', report.businessSummary.agencyOwnedAdvanceBalance],
      ['Net Balance', report.businessSummary.netBalance],
    ] as const
  }

  if (visibleHierarchyType === 'PARENT') {
    return [
      ['Total Groups', report.businessSummary.totalGroups],
      ['Total Passengers', report.businessSummary.totalPassengers],
      ['Price Per Pax', report.businessSummary.pricePerPax],
      ['Total Amount', report.businessSummary.totalAmount],
      ['Direct Payments by Parent', report.businessSummary.totalPaymentsReceived],
      ['Payments Allocated to Parent Groups', report.businessSummary.parentPaymentsAllocatedToAgency],
      ['Total Allocated to Parent Groups', report.businessSummary.totalAllocatedToGroups],
      ['Outstanding Balance', report.businessSummary.outstandingBalance],
      ['Parent-Owned Advance Balance', report.businessSummary.agencyOwnedAdvanceBalance],
      ['Net Balance', report.businessSummary.netBalance],
    ] as const
  }

  return [
    ['Total Groups', report.businessSummary.totalGroups],
    ['Total Passengers', report.businessSummary.totalPassengers],
    ['Price Per Pax', report.businessSummary.pricePerPax],
    ['Total Amount', report.businessSummary.totalAmount],
    ['Direct Payments by Agency', report.businessSummary.totalPaymentsReceived],
    ['Payments Allocated to Agency Groups', report.businessSummary.parentPaymentsAllocatedToAgency],
    ['Total Allocated to Agency Groups', report.businessSummary.totalAllocatedToGroups],
    ['Outstanding Balance', report.businessSummary.outstandingBalance],
    ['Agency-Owned Advance Balance', report.businessSummary.agencyOwnedAdvanceBalance],
    ['Net Balance', report.businessSummary.netBalance],
  ] as const
}

function getReportTitle(report: AgencyReport) {
  if (report.agency.reportScope === 'CONSOLIDATED') {
    if (report.agency.visibleAgencyFilter) {
      return `${report.agency.agencyName} - Parent and Branches Consolidated Report (Filtered to ${report.agency.visibleAgencyFilter.agencyName})`
    }

    return `${report.agency.agencyName} - Parent and Branches Consolidated Report`
  }

  if (report.agency.hierarchyType === 'BRANCH') {
    return `${report.agency.agencyName} - Single Branch Report`
  }

  if (report.agency.hierarchyType === 'PARENT') {
    return `${report.agency.agencyName} - Parent Only Report`
  }

  return `${report.agency.agencyName} - Single Agency Report`
}

export function buildAgencyReportCsv(report: AgencyReport) {
  const lines: string[] = []
  const summaryRows = getScopeAwareSummaryRows(report)

  lines.push(`Travel Agency Management System ${escapeCsv(getReportTitle(report))}`)
  lines.push(`Agency,${escapeCsv(report.agency.agencyName)}`)
  lines.push(`Agency Type,${report.agency.hierarchyType}`)
  lines.push(`Country,${escapeCsv(report.agency.country)}`)
  lines.push(`City,${escapeCsv(report.agency.city)}`)
  lines.push(`Agent Number,${escapeCsv(report.agency.agentNumber)}`)
  lines.push(`Report Scope,${escapeCsv(report.agency.scopeLabel)}`)
  lines.push(`Parent Agency,${escapeCsv(report.agency.parentAgency?.agencyName ?? 'Not applicable')}`)
  lines.push(
    `Agency Within Family,${escapeCsv(report.agency.visibleAgencyFilter?.agencyName ?? 'All connected agencies')}`,
  )
  lines.push(`Date From,${formatNullableDate(report.filters.dateFrom)}`)
  lines.push(`Date To,${formatNullableDate(report.filters.dateTo)}`)
  lines.push(`Group Number,${report.filters.groupNumber ?? 'All'}`)
  lines.push(`Payment Status,${report.filters.paymentStatus ?? 'All'}`)
  lines.push('')
  lines.push('Business Summary')
  lines.push('Metric,Value')
  summaryRows.forEach(([label, value]) => {
    lines.push(`${label},${typeof value === 'number' ? formatCurrency(value) : value}`)
  })
  lines.push('')
  lines.push('Group Details')
  lines.push('Group Number,Agency Name,Agency Code,Number of Pax,Price Per Pax,Group Amount,Payment Status')
  report.groupDetails.forEach((group) => {
    lines.push(
      `${escapeCsv(group.groupNumber)},${escapeCsv(group.agencyName)},${escapeCsv(group.agencyCode)},${group.numberOfPax},${formatCurrency(group.pricePerPax)},${formatCurrency(group.groupAmount)},${group.paymentStatus}`,
    )
  })
  lines.push('')
  lines.push('Payment History')
  lines.push(
    'Payment Date,Source Payment Amount,Paid By,Allocated To Visible Scope,Total Allocated,Remaining Source Balance,Remaining Balance Owner,Payment City,Received By,Payment Method,Remarks,Payment Status,Reference',
  )
  report.paymentHistory.forEach((payment) => {
    lines.push(
      `${formatNullableDate(payment.paymentDate)},${formatCurrency(payment.sourcePaymentAmount)},${escapeCsv(payment.paidByAgencyCode)},${formatCurrency(payment.allocatedToVisibleScope)},${formatCurrency(payment.totalAllocatedAmount)},${formatCurrency(payment.remainingSourceBalance)},${escapeCsv(payment.remainingSourceBalance > 0 ? payment.remainingBalanceOwnerAgencyCode : 'No remaining balance')},${escapeCsv(payment.paymentCity)},${escapeCsv(payment.receivedBy)},${payment.paymentMethod},${escapeCsv(payment.remarks)},${payment.paymentStatus},${escapeCsv(payment.reference)}`,
    )
  })

  return Buffer.from(lines.join('\n'), 'utf-8')
}

export async function buildAgencyReportExcel(report: AgencyReport) {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const summaryRows = getScopeAwareSummaryRows(report)

  const summarySheet = workbook.addWorksheet('Agency Summary')
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 28 },
    { header: 'Value', key: 'value', width: 28 },
  ]
  summarySheet.addRows([
    { metric: 'Report Title', value: getReportTitle(report) },
    { metric: 'Agency Name', value: report.agency.agencyName },
    { metric: 'Agency Type', value: report.agency.hierarchyType },
    { metric: 'Country', value: report.agency.country },
    { metric: 'City', value: report.agency.city },
    { metric: 'Agent Number', value: report.agency.agentNumber },
    {
      metric: 'Report Scope',
      value: report.agency.scopeLabel,
    },
    {
      metric: 'Parent Agency',
      value: report.agency.parentAgency?.agencyName ?? 'Not applicable',
    },
    {
      metric: 'Agency Within Family',
      value: report.agency.visibleAgencyFilter?.agencyName ?? 'All connected agencies',
    },
    ...summaryRows.map(([metric, value]) => ({ metric, value })),
  ])

  addWorksheetFromRows(workbook, 'Group Details', report.groupDetails)
  addWorksheetFromRows(workbook, 'Payment History', report.paymentHistory)

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function buildAgencyReportPdf(report: AgencyReport) {
  const { default: PDFDocument } = await import('pdfkit')
  const summaryRows = getScopeAwareSummaryRows(report)

  return await new Promise<Buffer>((resolve, reject) => {
    const document = new PDFDocument({ margin: 40 })
    const chunks: Buffer[] = []

    document.on('data', (chunk: Buffer) => chunks.push(chunk))
    document.on('end', () => resolve(Buffer.concat(chunks)))
    document.on('error', reject)

    document.fontSize(18).text(`Travel Agency Management System ${getReportTitle(report)}`)
    document.moveDown(0.5)
    document.fontSize(10).text(`Agency: ${report.agency.agencyName}`)
    document.fontSize(10).text(`Agency Type: ${report.agency.hierarchyType}`)
    document.fontSize(10).text(`Country: ${report.agency.country}`)
    document.fontSize(10).text(`City: ${report.agency.city}`)
    document.fontSize(10).text(`Agent Number: ${report.agency.agentNumber}`)
    document.fontSize(10).text(`Report Scope: ${report.agency.scopeLabel}`)
    document.fontSize(10).text(`Parent Agency: ${report.agency.parentAgency?.agencyName ?? 'Not applicable'}`)
    document
      .fontSize(10)
      .text(`Agency Within Family: ${report.agency.visibleAgencyFilter?.agencyName ?? 'All connected agencies'}`)
    document.moveDown()

    document.fontSize(14).text('Business Summary')
    summaryRows.forEach(([label, value]) => {
      writePdfKeyValue(document, label, typeof value === 'number' ? formatCurrency(value) : String(value))
    })
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
      'sourcePaymentAmount',
      'paidByAgencyCode',
      'allocatedToVisibleScope',
      'remainingSourceBalance',
      'remainingBalanceOwnerAgencyCode',
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
