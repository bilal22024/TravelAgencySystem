import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { buildAgencyReport } from '../src/modules/reports/application/agency-report-aggregation.js'
import {
  buildAgencyReportCsv,
  buildAgencyReportExcel,
  buildAgencyReportPdf,
} from '../src/modules/reports/application/agency-report-export.js'

function getMetricValue(
  sheet: ExcelJS.Worksheet | undefined,
  metric: string,
) {
  if (!sheet) {
    return undefined
  }

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    if (sheet.getCell(`A${rowNumber}`).value === metric) {
      return sheet.getCell(`B${rowNumber}`).value
    }
  }

  return undefined
}

describe('agency report exports', () => {
  it('keeps corrected ownership totals aligned across api payload, csv, excel, and pdf export builders', async () => {
    const report = buildAgencyReport({
      agency: {
        id: 'branch-1',
        name: 'Arab Quraishi Travel',
        code: 'AQT',
        city: 'Makkah',
        country: 'Saudi Arabia',
        parentAgency: {
          id: 'parent-1',
          name: 'Almuhajir Travel',
          code: 'ALM',
          city: 'Riyadh',
          country: 'Saudi Arabia',
          agencyType: 'PARENT',
        },
      },
      groups: [
        {
          id: 'group-1',
          code: 'AQT-2506-01',
          travelerCount: 31,
          totalAmount: 465,
          agency: {
            id: 'branch-1',
            name: 'Arab Quraishi Travel',
            code: 'AQT',
          },
        },
      ],
      payments: [
        {
          id: 'payment-parent',
          reference: 'PAY-PARENT',
          amount: 1000,
          currency: 'USD',
          method: 'BANK_TRANSFER',
          status: 'PARTIALLY_ALLOCATED',
          paymentCity: 'Riyadh',
          description: 'Parent payment',
          paidAt: new Date('2026-06-10T00:00:00.000Z'),
          createdAt: new Date('2026-06-09T00:00:00.000Z'),
          agency: {
            id: 'parent-1',
            name: 'Almuhajir Travel',
            code: 'ALM',
            city: 'Riyadh',
            country: 'Saudi Arabia',
          },
          receivedBy: null,
          paymentGroups: [
            {
              allocatedAmount: 300,
              notes: 'Parent allocation',
              group: {
                id: 'group-1',
                code: 'AQT-2506-01',
                agencyId: 'branch-1',
                agency: {
                  id: 'branch-1',
                  name: 'Arab Quraishi Travel',
                  code: 'AQT',
                },
              },
            },
          ],
        },
        {
          id: 'payment-branch',
          reference: 'PAY-BRANCH',
          amount: 700,
          currency: 'USD',
          method: 'ONLINE',
          status: 'PARTIALLY_ALLOCATED',
          paymentCity: 'Makkah',
          description: 'Branch payment',
          paidAt: new Date('2026-06-11T00:00:00.000Z'),
          createdAt: new Date('2026-06-10T00:00:00.000Z'),
          agency: {
            id: 'branch-1',
            name: 'Arab Quraishi Travel',
            code: 'AQT',
            city: 'Makkah',
            country: 'Saudi Arabia',
          },
          receivedBy: null,
          paymentGroups: [
            {
              allocatedAmount: 500,
              notes: 'Branch allocation',
              group: {
                id: 'group-1',
                code: 'AQT-2506-01',
                agencyId: 'branch-1',
                agency: {
                  id: 'branch-1',
                  name: 'Arab Quraishi Travel',
                  code: 'AQT',
                },
              },
            },
          ],
        },
      ],
      filters: {
        includeBranches: false,
        scopeAgencyIds: ['branch-1'],
        visibleAgencyIds: ['branch-1'],
        branches: [],
      },
    })

    const csv = buildAgencyReportCsv(report).toString('utf8')
    const excelBuffer = await buildAgencyReportExcel(report)
    const pdfBuffer = await buildAgencyReportPdf(report)
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(excelBuffer)
    const summarySheet = workbook.getWorksheet('Agency Summary')

    expect(report.businessSummary.totalPaymentsReceived).toBe(700)
    expect(report.businessSummary.parentPaymentsAllocatedToAgency).toBe(300)
    expect(report.businessSummary.totalAllocatedToGroups).toBe(800)
    expect(report.businessSummary.agencyOwnedAdvanceBalance).toBe(200)
    expect(report.businessSummary.netBalance).toBe(-200)

    expect(csv).toContain('Direct Payments by Branch,700.00')
    expect(csv).toContain('Parent Payments Allocated to Branch,300.00')
    expect(csv).toContain('Total Allocated to Branch Groups,800.00')
    expect(csv).toContain('Branch-Owned Advance Balance,200.00')
    expect(csv).toContain('Net Balance,-200.00')

    expect(getMetricValue(summarySheet, 'Direct Payments by Branch')).toBe(700)
    expect(getMetricValue(summarySheet, 'Parent Payments Allocated to Branch')).toBe(300)
    expect(getMetricValue(summarySheet, 'Outstanding Balance')).toBe(0)
    expect(getMetricValue(summarySheet, 'Branch-Owned Advance Balance')).toBe(200)
    expect(getMetricValue(summarySheet, 'Net Balance')).toBe(-200)

    expect(pdfBuffer.byteLength).toBeGreaterThan(0)
  })
})
