import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const TODAY = new Date('2026-07-13T09:00:00.000Z')
const TARGET_TOTAL_AGENCIES = 50
const TARGET_COUNTRIES = [
  'Pakistan',
  'India',
  'Bangladesh',
  'Afghanistan',
  'Indonesia',
  'Malaysia',
  'Turkiye',
  'Egypt',
  'Nigeria',
  'United Kingdom',
]

const marketBlueprints = [
  {
    country: 'Pakistan',
    cities: [
      { city: 'Karachi', state: 'Sindh', postalCode: '74000' },
      { city: 'Lahore', state: 'Punjab', postalCode: '54000' },
      { city: 'Islamabad', state: 'Islamabad Capital Territory', postalCode: '44000' },
      { city: 'Rawalpindi', state: 'Punjab', postalCode: '46000' },
      { city: 'Peshawar', state: 'Khyber Pakhtunkhwa', postalCode: '25000' },
    ],
  },
  {
    country: 'India',
    cities: [
      { city: 'Delhi', state: 'Delhi', postalCode: '110001' },
      { city: 'Mumbai', state: 'Maharashtra', postalCode: '400001' },
      { city: 'Hyderabad', state: 'Telangana', postalCode: '500001' },
      { city: 'Lucknow', state: 'Uttar Pradesh', postalCode: '226001' },
      { city: 'Srinagar', state: 'Jammu and Kashmir', postalCode: '190001' },
    ],
  },
  {
    country: 'Bangladesh',
    cities: [
      { city: 'Dhaka', state: 'Dhaka Division', postalCode: '1000' },
      { city: 'Chattogram', state: 'Chattogram Division', postalCode: '4000' },
      { city: 'Sylhet', state: 'Sylhet Division', postalCode: '3100' },
      { city: 'Khulna', state: 'Khulna Division', postalCode: '9000' },
      { city: 'Rajshahi', state: 'Rajshahi Division', postalCode: '6000' },
    ],
  },
  {
    country: 'Afghanistan',
    cities: [
      { city: 'Kabul', state: 'Kabul', postalCode: '1001' },
      { city: 'Herat', state: 'Herat', postalCode: '3001' },
      { city: 'Mazar-i-Sharif', state: 'Balkh', postalCode: '1701' },
      { city: 'Kandahar', state: 'Kandahar', postalCode: '3801' },
      { city: 'Jalalabad', state: 'Nangarhar', postalCode: '2601' },
    ],
  },
  {
    country: 'Indonesia',
    cities: [
      { city: 'Jakarta', state: 'Jakarta', postalCode: '10110' },
      { city: 'Bandung', state: 'West Java', postalCode: '40111' },
      { city: 'Surabaya', state: 'East Java', postalCode: '60111' },
      { city: 'Medan', state: 'North Sumatra', postalCode: '20111' },
      { city: 'Makassar', state: 'South Sulawesi', postalCode: '90111' },
    ],
  },
  {
    country: 'Malaysia',
    cities: [
      { city: 'Kuala Lumpur', state: 'Kuala Lumpur', postalCode: '50000' },
      { city: 'Johor Bahru', state: 'Johor', postalCode: '80000' },
      { city: 'George Town', state: 'Penang', postalCode: '10200' },
      { city: 'Kota Kinabalu', state: 'Sabah', postalCode: '88000' },
      { city: 'Shah Alam', state: 'Selangor', postalCode: '40000' },
    ],
  },
  {
    country: 'Turkiye',
    cities: [
      { city: 'Istanbul', state: 'Istanbul', postalCode: '34000' },
      { city: 'Ankara', state: 'Ankara', postalCode: '06000' },
      { city: 'Bursa', state: 'Bursa', postalCode: '16000' },
      { city: 'Antalya', state: 'Antalya', postalCode: '07000' },
      { city: 'Konya', state: 'Konya', postalCode: '42000' },
    ],
  },
  {
    country: 'Egypt',
    cities: [
      { city: 'Cairo', state: 'Cairo', postalCode: '11511' },
      { city: 'Alexandria', state: 'Alexandria', postalCode: '21500' },
      { city: 'Giza', state: 'Giza', postalCode: '12511' },
      { city: 'Luxor', state: 'Luxor', postalCode: '85951' },
      { city: 'Aswan', state: 'Aswan', postalCode: '81511' },
    ],
  },
  {
    country: 'Nigeria',
    cities: [
      { city: 'Lagos', state: 'Lagos', postalCode: '100001' },
      { city: 'Abuja', state: 'Federal Capital Territory', postalCode: '900001' },
      { city: 'Kano', state: 'Kano', postalCode: '700001' },
      { city: 'Port Harcourt', state: 'Rivers', postalCode: '500001' },
      { city: 'Kaduna', state: 'Kaduna', postalCode: '800001' },
    ],
  },
  {
    country: 'United Kingdom',
    cities: [
      { city: 'London', state: 'England', postalCode: 'EC1A 1AA' },
      { city: 'Birmingham', state: 'England', postalCode: 'B1 1AA' },
      { city: 'Manchester', state: 'England', postalCode: 'M1 1AE' },
      { city: 'Glasgow', state: 'Scotland', postalCode: 'G1 1XQ' },
      { city: 'Leicester', state: 'England', postalCode: 'LE1 1SH' },
    ],
  },
]

const legacyDemoCodes = new Set([
  'TAHQ',
  'BDTR',
  'CWTR',
  'NCTR',
  'AGTR',
  'BHTR',
  'ACTR',
  'SRTR',
  'HLTR',
  'AFTR',
  'AVTR',
  'MLJR',
  'ISTR',
  'LPTR',
  'SSTR',
  'ECTR',
  'BSTR',
  'DPTR',
  'GSTR',
  'MGTR',
  'PLTR',
  'SCTR',
  'PWTR',
  'CBTR',
  'SLTR',
  'MLTR',
  'HBTR',
  'DRTR',
  'LRTR',
  'CTTR',
])

const agencyNamePrefixes = [
  'Summit',
  'Sterling',
  'Horizon',
  'Meridian',
  'BlueWave',
  'Prime',
  'Crescent',
  'Vista',
  'Gateway',
  'Beacon',
]

const agencyNameSuffixes = [
  'Travel Services',
  'Global Tours',
  'Holiday Network',
  'Air Connect',
  'Journeys',
]

const destinationCatalog = [
  'Makkah',
  'Madinah',
  'Istanbul',
  'Doha',
  'Jeddah',
  'Dubai',
  'Bangkok',
  'Muscat',
  'Tbilisi',
  'Kuala Lumpur',
]

const groupThemes = [
  'Family',
  'Corporate',
  'Premium',
  'Seasonal',
  'Leisure',
  'Student',
  'Executive',
]

const paymentMethods = [
  'CASH',
  'BANK_TRANSFER',
  'CREDIT_CARD',
  'DEBIT_CARD',
  'ONLINE',
  'OTHER',
]

function createRandom(seed) {
  let value = seed >>> 0

  return () => {
    value += 0x6d2b79f5
    let result = Math.imul(value ^ (value >>> 15), 1 | value)
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result)
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

const random = createRandom(2026071301)

function pick(values) {
  return values[Math.floor(random() * values.length)]
}

function randomInt(min, max) {
  return Math.floor(random() * (max - min + 1)) + min
}

function addDays(date, days) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function makeTimestamp(date, hourOffset = 0) {
  const next = new Date(date)
  next.setUTCHours((9 + hourOffset) % 24, randomInt(0, 59), randomInt(0, 59), 0)
  return next
}

function toCents(amount) {
  return Math.round(Number(amount) * 100)
}

function fromCents(cents) {
  return (cents / 100).toFixed(2)
}

function splitAmount(totalAmount, parts) {
  const totalCents = toCents(totalAmount)

  if (parts <= 1) {
    return [fromCents(totalCents)]
  }

  const weights = Array.from({ length: parts }, () => random() + 0.2)
  const totalWeight = weights.reduce((sum, value) => sum + value, 0)
  const allocations = []
  let remaining = totalCents

  for (let index = 0; index < parts; index += 1) {
    if (index === parts - 1) {
      allocations.push(fromCents(remaining))
      break
    }

    const proposed = Math.max(1, Math.floor((totalCents * weights[index]) / totalWeight))
    const maxAllowed = remaining - (parts - index - 1)
    const cents = Math.min(proposed, maxAllowed)
    allocations.push(fromCents(cents))
    remaining -= cents
  }

  return allocations
}

function slugToken(value) {
  return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 3) || 'AGY'
}

function buildLegacyAlphaAgencyCode(country, city, agencyIndex) {
  const countryToken = slugToken(country).slice(0, 2)
  const cityToken = slugToken(city)
  return `${countryToken}${cityToken}${String(agencyIndex + 1).padStart(3, '0')}`
}

function getManagedAgencyCodes() {
  const codes = new Set(legacyDemoCodes)
  let legacySequence = 0

  marketBlueprints.forEach((market) => {
    market.cities.forEach((cityRecord) => {
      codes.add(buildLegacyAlphaAgencyCode(market.country, cityRecord.city, legacySequence))
      legacySequence += 1
    })
  })

  for (let index = 0; index < TARGET_TOTAL_AGENCIES; index += 1) {
    codes.add(String(3001 + index))
  }

  return codes
}

function buildAgencyName(city, agencyIndex) {
  const prefix = agencyNamePrefixes[agencyIndex % agencyNamePrefixes.length]
  const suffix = agencyNameSuffixes[agencyIndex % agencyNameSuffixes.length]
  return `${prefix} ${city} ${suffix}`
}

function buildAddress(city) {
  return `${randomInt(12, 280)} ${pick(['Main Boulevard', 'Commercial Avenue', 'Station Road', 'Airport Road', 'Business Street'])}, ${city}`
}

function createAgencyCandidates(existingAgencies, countNeeded) {
  const usedCodes = new Set(existingAgencies.map((agency) => agency.code))
  const usedNames = new Set(existingAgencies.map((agency) => agency.name.toLowerCase()))
  const candidates = []
  let codeSequence = 3001
  let agencySequence = 0

  for (const market of marketBlueprints) {
    for (const cityRecord of market.cities) {
      if (candidates.length >= countNeeded) {
        break
      }

      while (usedCodes.has(String(codeSequence))) {
        codeSequence += 1
      }

      const agencyName = buildAgencyName(cityRecord.city, agencySequence)
      const agentNumber = String(codeSequence)
      agencySequence += 1
      codeSequence += 1

      if (usedNames.has(agencyName.toLowerCase())) {
        continue
      }

      usedNames.add(agencyName.toLowerCase())
      usedCodes.add(agentNumber)

      const createdAt = makeTimestamp(addDays(TODAY, -randomInt(180, 320)), agencySequence)

      candidates.push({
        id: randomUUID(),
        name: agencyName,
        code: agentNumber,
        contactEmail: `ops${agentNumber}@${cityRecord.city.toLowerCase().replace(/[^a-z0-9]/g, '')}.travel`,
        contactPhone: `+${randomInt(20, 99)}-${randomInt(100, 999)}-${randomInt(1000000, 9999999)}`,
        addressLine1: buildAddress(cityRecord.city),
        addressLine2: pick([null, 'Suite 201', 'Floor 3', 'Office 12']),
        city: cityRecord.city,
        state: cityRecord.state,
        country: market.country,
        postalCode: cityRecord.postalCode,
        isActive: true,
        createdAt,
        updatedAt: makeTimestamp(addDays(createdAt, randomInt(7, 60)), agencySequence + 1),
      })
    }
  }

  return candidates
}

function buildGroupStatus(departureDate, returnDate) {
  if (TODAY < addDays(departureDate, -14)) {
    return 'PLANNED'
  }

  if (TODAY < departureDate) {
    return 'CONFIRMED'
  }

  if (TODAY <= returnDate) {
    return 'IN_PROGRESS'
  }

  return 'COMPLETED'
}

function createGroupsForAgencies(agencies) {
  const groups = []
  let nextGroupNumber = 1001

  agencies.forEach((agency, agencyIndex) => {
    const groupCount = randomInt(5, 20)

    for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
      const pax = randomInt(10, 50)
      const amountPerPax = fromCents(randomInt(800, 2000))
      const totalAmount = fromCents(toCents(amountPerPax) * pax)
      const departureDate = addDays(TODAY, -randomInt(0, 170))
      const returnDate = addDays(departureDate, randomInt(4, 10))
      const destination = destinationCatalog[(agencyIndex + groupIndex) % destinationCatalog.length]
      const code = String(nextGroupNumber)
      const createdAt = makeTimestamp(addDays(departureDate, -randomInt(10, 35)), groupIndex)
      const themedName =
        random() > 0.35
          ? `${destination} ${groupThemes[(agencyIndex + groupIndex) % groupThemes.length]} Group`
          : code

      nextGroupNumber += 1

      groups.push({
        id: randomUUID(),
        agencyId: agency.id,
        name: themedName,
        code,
        amountPerPax,
        totalAmount,
        description: `${pick(groupThemes)} package arranged for ${destination}.`,
        destination,
        departureDate,
        returnDate,
        status: buildGroupStatus(departureDate, returnDate),
        travelerCount: pax,
        notes: pick([
          'Rooming list confirmed.',
          'Visa documentation cleared.',
          'Flight block secured.',
          'Finance review completed.',
          'Passenger manifest approved.',
        ]),
        createdAt,
        updatedAt: makeTimestamp(addDays(createdAt, randomInt(1, 20)), groupIndex + 1),
      })
    }
  })

  return groups
}

function getSettlementProfile(agencyIndex, totalAgencies) {
  const fullyPaidCount = Math.round(totalAgencies * 0.3)
  const partiallyPaidCount = Math.round(totalAgencies * 0.5)

  if (agencyIndex < fullyPaidCount) {
    return 'FULLY_PAID'
  }

  if (agencyIndex < fullyPaidCount + partiallyPaidCount) {
    return 'PARTIALLY_PAID'
  }

  return 'UNPAID'
}

function createPaymentsForAgency(agency, agencyUsers, agencyGroups, agencyIndex, totalAgencies) {
  const payments = []
  const paymentGroups = []
  const settlementProfile = getSettlementProfile(agencyIndex, totalAgencies)
  let paymentSequence = 1

  if (settlementProfile === 'FULLY_PAID') {
    agencyGroups.forEach((group, groupIndex) => {
      const allocations = splitAmount(group.totalAmount, randomInt(1, 3))

      allocations.forEach((allocatedAmount, allocationIndex) => {
        const paymentId = randomUUID()
        const paidAt = makeTimestamp(addDays(TODAY, -randomInt(0, 179)), allocationIndex)

        payments.push({
          id: paymentId,
          agencyId: agency.id,
          receivedByUserId: pick(agencyUsers)?.id ?? null,
          reference: `PMT-${agency.code}-${String(paymentSequence).padStart(4, '0')}`,
          amount: allocatedAmount,
          currency: 'USD',
          method: paymentMethods[(agencyIndex + allocationIndex) % paymentMethods.length],
          status: 'ALLOCATED',
          description: `Settlement received in ${agency.city ?? 'the agency city'} for group ${group.code}.`,
          paidAt,
          createdAt: makeTimestamp(addDays(paidAt, -randomInt(0, 3)), allocationIndex + 1),
          updatedAt: makeTimestamp(addDays(paidAt, 1), allocationIndex + 2),
        })

        paymentGroups.push({
          id: randomUUID(),
          paymentId,
          groupId: group.id,
          allocatedAmount,
          notes: 'Fully allocated against confirmed group balance.',
          createdAt: makeTimestamp(paidAt, allocationIndex + 1),
          updatedAt: makeTimestamp(addDays(paidAt, 1), allocationIndex + 2),
        })

        paymentSequence += 1
      })
    })
  } else if (settlementProfile === 'PARTIALLY_PAID') {
    agencyGroups.forEach((group, groupIndex) => {
      const totalCents = toCents(group.totalAmount)
      const allocatedCents = Math.max(
        1,
        Math.floor(totalCents * (0.45 + random() * 0.3)),
      )
      const paymentId = randomUUID()
      const paidAt = makeTimestamp(addDays(TODAY, -randomInt(0, 179)), groupIndex)

      payments.push({
        id: paymentId,
        agencyId: agency.id,
        receivedByUserId: pick(agencyUsers)?.id ?? null,
        reference: `PMT-${agency.code}-${String(paymentSequence).padStart(4, '0')}`,
        amount: fromCents(totalCents),
        currency: 'USD',
        method: paymentMethods[(agencyIndex + groupIndex) % paymentMethods.length],
        status: 'PARTIALLY_ALLOCATED',
        description: `Partially settled file for group ${group.code}; balance still open.`,
        paidAt,
        createdAt: makeTimestamp(addDays(paidAt, -randomInt(0, 2)), groupIndex + 1),
        updatedAt: makeTimestamp(addDays(paidAt, 1), groupIndex + 2),
      })

      paymentGroups.push({
        id: randomUUID(),
        paymentId,
        groupId: group.id,
        allocatedAmount: fromCents(allocatedCents),
        notes: 'Partially allocated while outstanding balance remains.',
        createdAt: makeTimestamp(paidAt, groupIndex + 1),
        updatedAt: makeTimestamp(addDays(paidAt, 1), groupIndex + 2),
      })

      paymentSequence += 1
    })
  } else {
    agencyGroups.forEach((group, groupIndex) => {
      const totalCents = toCents(group.totalAmount)
      const pendingCents = Math.max(1, Math.floor(totalCents * (0.55 + random() * 0.35)))
      const createdAt = makeTimestamp(addDays(TODAY, -randomInt(0, 179)), groupIndex)

      payments.push({
        id: randomUUID(),
        agencyId: agency.id,
        receivedByUserId: pick(agencyUsers)?.id ?? null,
        reference: `PMT-${agency.code}-${String(paymentSequence).padStart(4, '0')}`,
        amount: fromCents(pendingCents),
        currency: 'USD',
        method: paymentMethods[(agencyIndex + groupIndex) % paymentMethods.length],
        status: 'PENDING',
        description: `Pending collection logged for group ${group.code}.`,
        paidAt: null,
        createdAt,
        updatedAt: makeTimestamp(addDays(createdAt, 1), groupIndex + 1),
      })

      paymentSequence += 1
    })
  }

  return {
    payments,
    paymentGroups,
    settlementProfile,
  }
}

async function main() {
  const managedAgencyCodes = getManagedAgencyCodes()

  const [existingUsers, existingAgencies] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
      },
      orderBy: [{ role: 'asc' }, { email: 'asc' }],
    }),
    prisma.agency.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        city: true,
        country: true,
      },
      orderBy: { name: 'asc' },
    }),
  ])

  const managedDemoAgencies = existingAgencies.filter((agency) => managedAgencyCodes.has(agency.code))
  const preservedAgencies = existingAgencies.filter((agency) => !managedAgencyCodes.has(agency.code))

  let temporaryHoldingAgency = null
  let holdingAgencyId = preservedAgencies[0]?.id ?? null

  if (!holdingAgencyId && managedDemoAgencies.length > 0) {
    temporaryHoldingAgency = {
      id: randomUUID(),
      name: 'System Holding Agency',
      code: '999999',
      contactEmail: 'holding@travelagency.local',
      contactPhone: '+00-000-0000000',
      addressLine1: '1 System Holding Road',
      addressLine2: null,
      city: 'Riyadh',
      state: 'Riyadh',
      country: 'Saudi Arabia',
      postalCode: '11564',
      isActive: true,
      createdAt: TODAY,
      updatedAt: TODAY,
    }

    await prisma.agency.create({
      data: temporaryHoldingAgency,
    })

    holdingAgencyId = temporaryHoldingAgency.id
  }

  await prisma.$transaction([
    prisma.paymentGroup.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.group.deleteMany(),
  ])

  if (managedDemoAgencies.length > 0) {
    await prisma.user.updateMany({
      where: {
        agencyId: {
          in: managedDemoAgencies.map((agency) => agency.id),
        },
      },
      data: {
        agencyId: holdingAgencyId,
      },
    })

    await prisma.agency.deleteMany({
      where: {
        id: {
          in: managedDemoAgencies.map((agency) => agency.id),
        },
      },
    })
  }

  const agenciesNeeded = Math.max(TARGET_TOTAL_AGENCIES - preservedAgencies.length, 0)
  const newAgencies = createAgencyCandidates(preservedAgencies, agenciesNeeded)

  if (newAgencies.length > 0) {
    await prisma.agency.createMany({
      data: newAgencies,
    })
  }

  const seededAgencies = await prisma.agency.findMany({
    where: {
      OR: [
        ...(preservedAgencies.length > 0
          ? [{ id: { in: preservedAgencies.map((agency) => agency.id) } }]
          : []),
        ...(newAgencies.length > 0
          ? [{ id: { in: newAgencies.map((agency) => agency.id) } }]
          : []),
      ],
    },
    orderBy: [{ country: 'asc' }, { city: 'asc' }, { code: 'asc' }],
  })

  await Promise.all(
    existingUsers.map((user, index) => {
      const assignedAgency =
        user.role === 'SUPER_ADMIN'
          ? seededAgencies[0]
          : seededAgencies[index % seededAgencies.length]

      return prisma.user.update({
        where: { id: user.id },
        data: { agencyId: assignedAgency.id },
      })
    }),
  )

  if (temporaryHoldingAgency) {
    await prisma.agency.delete({
      where: {
        id: temporaryHoldingAgency.id,
      },
    })
  }

  const groups = createGroupsForAgencies(seededAgencies)
  await prisma.group.createMany({
    data: groups,
  })

  const currentUsers = await prisma.user.findMany({
    select: {
      id: true,
      agencyId: true,
      email: true,
      role: true,
    },
    orderBy: { email: 'asc' },
  })

  const usersByAgency = new Map()
  currentUsers.forEach((user) => {
    const bucket = usersByAgency.get(user.agencyId) ?? []
    bucket.push(user)
    usersByAgency.set(user.agencyId, bucket)
  })

  const groupsByAgency = new Map()
  groups.forEach((group) => {
    const bucket = groupsByAgency.get(group.agencyId) ?? []
    bucket.push(group)
    groupsByAgency.set(group.agencyId, bucket)
  })

  const payments = []
  const paymentGroups = []
  const settlementSummary = {
    fullyPaidAgencies: 0,
    partiallyPaidAgencies: 0,
    unpaidAgencies: 0,
  }

  seededAgencies.forEach((agency, agencyIndex) => {
    const agencyUsers = usersByAgency.get(agency.id) ?? []
    const agencyGroups = groupsByAgency.get(agency.id) ?? []
    const result = createPaymentsForAgency(
      agency,
      agencyUsers,
      agencyGroups,
      agencyIndex,
      seededAgencies.length,
    )

    payments.push(...result.payments)
    paymentGroups.push(...result.paymentGroups)

    if (result.settlementProfile === 'FULLY_PAID') {
      settlementSummary.fullyPaidAgencies += 1
    } else if (result.settlementProfile === 'PARTIALLY_PAID') {
      settlementSummary.partiallyPaidAgencies += 1
    } else {
      settlementSummary.unpaidAgencies += 1
    }
  })

  await prisma.payment.createMany({
    data: payments,
  })

  if (paymentGroups.length > 0) {
    await prisma.paymentGroup.createMany({
      data: paymentGroups,
    })
  }

  const [agencyCount, groupCount, paymentCount, paymentGroupCount, userCount, finalAgencies] =
    await Promise.all([
      prisma.agency.count(),
      prisma.group.count(),
      prisma.payment.count(),
      prisma.paymentGroup.count(),
      prisma.user.count(),
      prisma.agency.findMany({
        select: {
          country: true,
          city: true,
        },
      }),
    ])

  const counts = {
    countries: new Set(finalAgencies.map((agency) => agency.country ?? 'Unspecified')).size,
    cities: new Set(
      finalAgencies.map(
        (agency) => `${agency.country ?? 'Unspecified'}::${agency.city ?? 'Unspecified'}`,
      ),
    ).size,
    agencies: agencyCount,
    groups: groupCount,
    payments: paymentCount,
    paymentGroups: paymentGroupCount,
    users: userCount,
  }

  console.log(
    JSON.stringify(
      {
        seeded: counts,
        preservedAgencies: preservedAgencies.map((agency) => ({
          name: agency.name,
          code: agency.code,
        })),
        settlementSummary,
      },
      null,
      2,
    ),
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
