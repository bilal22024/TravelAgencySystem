const fs = require('node:fs')
const path = require('node:path')
const { PrismaClient } = require('@prisma/client')

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL
  }

  const envPath = path.join(__dirname, '..', 'backend', '.env')

  if (!fs.existsSync(envPath)) {
    throw new Error('DATABASE_URL is not set and backend/.env could not be found.')
  }

  const envContents = fs.readFileSync(envPath, 'utf8')
  const databaseLine = envContents
    .split(/\r?\n/)
    .find((line) => line.trim().startsWith('DATABASE_URL='))

  if (!databaseLine) {
    throw new Error('DATABASE_URL could not be found in backend/.env.')
  }

  const rawValue = databaseLine.slice('DATABASE_URL='.length).trim()
  return rawValue.replace(/^"(.*)"$/, '$1')
}

async function main() {
  process.env.DATABASE_URL = loadDatabaseUrl()

  const prisma = new PrismaClient()
  const holdingAgencyCode = 'SYSHOLD'

  try {
    const result = await prisma.$transaction(async (tx) => {
      let holdingAgency = await tx.agency.findUnique({
        where: {
          code: holdingAgencyCode,
        },
      })

      if (!holdingAgency) {
        holdingAgency = await tx.agency.create({
          data: {
            name: 'System Holding Agency',
            code: holdingAgencyCode,
            contactEmail: 'system@travelagency.local',
            contactPhone: '+00-000-0000000',
            addressLine1: 'System Holding Address',
            city: 'Riyadh',
            state: 'Riyadh',
            country: 'Saudi Arabia',
            postalCode: '11564',
            isActive: true,
          },
        })
      }

      const before = {
        agencies: await tx.agency.count(),
        groups: await tx.group.count(),
        payments: await tx.payment.count(),
        paymentGroups: await tx.paymentGroup.count(),
        users: await tx.user.count(),
      }

      await tx.user.updateMany({
        where: {
          agencyId: {
            not: holdingAgency.id,
          },
        },
        data: {
          agencyId: holdingAgency.id,
        },
      })

      await tx.paymentGroup.deleteMany()
      await tx.payment.deleteMany()
      await tx.group.deleteMany()
      await tx.agency.deleteMany({
        where: {
          id: {
            not: holdingAgency.id,
          },
        },
      })

      const after = {
        agencies: await tx.agency.count(),
        groups: await tx.group.count(),
        payments: await tx.payment.count(),
        paymentGroups: await tx.paymentGroup.count(),
        users: await tx.user.count(),
      }

      return {
        holdingAgency: {
          id: holdingAgency.id,
          code: holdingAgency.code,
          name: holdingAgency.name,
        },
        before,
        after,
      }
    })

    console.log(JSON.stringify(result, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
