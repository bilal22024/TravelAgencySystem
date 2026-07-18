import fs from 'node:fs'
import path from 'node:path'

type AuthenticatedUser = {
  id: string
  agencyId: string
  role: string
  email: string
}

type SeedAgency = {
  key: string
  code: string
  name: string
  agencyType: 'PARENT' | 'BRANCH'
  parentKey?: string
  category: string
  primaryContactPerson: string
  contactEmail: string
  contactPhone: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  country: string
  postalCode: string
  notes: string
  createdAt: string
  phoneNumbers: Array<{
    label: string
    phoneNumber: string
    isPrimary: boolean
    sortOrder: number
  }>
  emailAddresses: Array<{
    label: string
    email: string
    isPrimary: boolean
    sortOrder: number
  }>
  documents: Array<{
    documentName: string
    documentType: string
    fileUrl?: string
    notes?: string
  }>
}

type SeedGroup = {
  code: string
  agencyKey: string
  name: string
  travelerCount: number
  amountPerPax: number
  destination: string
  departureDate: string
  returnDate: string
  createdAt: string
  description: string
  notes: string
}

type SeedPayment = {
  key: string
  agencyKey: string
  receiptNumber: string
  reference: string
  amount: number
  method: 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'ONLINE' | 'CHEQUE' | 'OTHER'
  paymentCity: string
  description: string
  paidAt: string
  createdAt: string
  allocations: Array<{
    groupCode: string
    allocatedAmount: number
    createdAt: string
    notes: string
  }>
}

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

  return databaseLine.slice('DATABASE_URL='.length).trim().replace(/^"(.*)"$/, '$1')
}

function asDate(value: string) {
  return new Date(value)
}

function roundAmount(value: number) {
  return Number(value.toFixed(2))
}

function assertCondition(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

function assertAmount(actual: number, expected: number, label: string) {
  const normalizedActual = roundAmount(actual)
  const normalizedExpected = roundAmount(expected)

  if (normalizedActual !== normalizedExpected) {
    throw new Error(`${label} mismatch. Expected ${normalizedExpected}, received ${normalizedActual}.`)
  }
}

function getDerivedPaymentStatus(amount: number, allocatedAmount: number) {
  if (allocatedAmount <= 0) {
    return 'PENDING' as const
  }

  if (allocatedAmount < amount) {
    return 'PARTIALLY_ALLOCATED' as const
  }

  return 'ALLOCATED' as const
}

const agencies: SeedAgency[] = [
  {
    key: 'alm',
    code: 'ALM',
    name: 'Almuhajir Travel',
    agencyType: 'PARENT',
    category: 'Parent Umrah Operations',
    primaryContactPerson: 'Bilal Ahmed',
    contactEmail: 'almuhajirtravel@gmail.com',
    contactPhone: '+966-55-210-4401',
    addressLine1: 'King Fahd Road, Al Malaz',
    addressLine2: 'Office 12, 2nd Floor',
    city: 'Riyadh',
    state: 'Riyadh',
    country: 'Saudi Arabia',
    postalCode: '12831',
    notes:
      'Main parent agency managing premium and family Umrah departures with direct coverage for connected branches.',
    createdAt: '2026-04-10T09:00:00.000Z',
    phoneNumbers: [
      {
        label: 'Main desk',
        phoneNumber: '+966-55-210-4401',
        isPrimary: true,
        sortOrder: 0,
      },
      {
        label: 'Finance desk',
        phoneNumber: '+966-55-210-4402',
        isPrimary: false,
        sortOrder: 1,
      },
    ],
    emailAddresses: [
      {
        label: 'Main',
        email: 'almuhajirtravel@gmail.com',
        isPrimary: true,
        sortOrder: 0,
      },
      {
        label: 'Accounts',
        email: 'accounts.almuhajir@gmail.com',
        isPrimary: false,
        sortOrder: 1,
      },
    ],
    documents: [
      {
        documentName: 'Umrah License 2026',
        documentType: 'License',
        fileUrl: 'https://demo.travelagency.local/documents/alm-license-2026.pdf',
        notes: 'Used for demo agency profile review.',
      },
    ],
  },
  {
    key: 'ikh',
    code: 'IKH',
    name: 'Ikhlas Travel',
    agencyType: 'BRANCH',
    parentKey: 'alm',
    category: 'Branch Retail Sales',
    primaryContactPerson: 'Usman Khalid',
    contactEmail: 'ikhlastravel@gmail.com',
    contactPhone: '+966-54-771-1804',
    addressLine1: 'Prince Mohammed Bin Abdulaziz Road',
    addressLine2: 'Suite 5B',
    city: 'Jeddah',
    state: 'Makkah',
    country: 'Saudi Arabia',
    postalCode: '23436',
    notes: 'Branch focused on retail family bookings and weekend Umrah departures.',
    createdAt: '2026-04-12T10:30:00.000Z',
    phoneNumbers: [
      {
        label: 'Branch desk',
        phoneNumber: '+966-54-771-1804',
        isPrimary: true,
        sortOrder: 0,
      },
    ],
    emailAddresses: [
      {
        label: 'Main',
        email: 'ikhlastravel@gmail.com',
        isPrimary: true,
        sortOrder: 0,
      },
    ],
    documents: [
      {
        documentName: 'Branch Trade Registration',
        documentType: 'Registration',
        fileUrl: 'https://demo.travelagency.local/documents/ikh-registration.pdf',
        notes: 'Branch paperwork uploaded for agency detail testing.',
      },
    ],
  },
  {
    key: 'aqt',
    code: 'AQT',
    name: 'Arab Quraishi Travel',
    agencyType: 'BRANCH',
    parentKey: 'alm',
    category: 'Branch Community Sales',
    primaryContactPerson: 'Saad Quraishi',
    contactEmail: 'arabquraishi@gmail.com',
    contactPhone: '+966-56-884-1022',
    addressLine1: 'Ibrahim Al Khalil Street',
    addressLine2: 'Office 8',
    city: 'Makkah',
    state: 'Makkah',
    country: 'Saudi Arabia',
    postalCode: '24231',
    notes: 'Branch serving community and saver-package departures.',
    createdAt: '2026-04-13T08:45:00.000Z',
    phoneNumbers: [
      {
        label: 'Branch desk',
        phoneNumber: '+966-56-884-1022',
        isPrimary: true,
        sortOrder: 0,
      },
    ],
    emailAddresses: [
      {
        label: 'Main',
        email: 'arabquraishi@gmail.com',
        isPrimary: true,
        sortOrder: 0,
      },
    ],
    documents: [
      {
        documentName: 'Branch Authorization Letter',
        documentType: 'Authorization',
        fileUrl: 'https://demo.travelagency.local/documents/aqt-authorization.pdf',
        notes: 'Supports document grid testing for branch agencies.',
      },
    ],
  },
  {
    key: 'ans',
    code: 'ANS',
    name: 'Alansar Travel',
    agencyType: 'PARENT',
    category: 'Parent Regional Operations',
    primaryContactPerson: 'Noman Farooq',
    contactEmail: 'alansartravel@gmail.com',
    contactPhone: '+966-53-660-7780',
    addressLine1: 'King Saud Road',
    addressLine2: 'Office 3A',
    city: 'Dammam',
    state: 'Eastern Province',
    country: 'Saudi Arabia',
    postalCode: '32242',
    notes: 'Parent agency handling regular-value Umrah groups and shared support for its branch.',
    createdAt: '2026-04-14T09:15:00.000Z',
    phoneNumbers: [
      {
        label: 'Main desk',
        phoneNumber: '+966-53-660-7780',
        isPrimary: true,
        sortOrder: 0,
      },
      {
        label: 'Operations',
        phoneNumber: '+966-53-660-7781',
        isPrimary: false,
        sortOrder: 1,
      },
    ],
    emailAddresses: [
      {
        label: 'Main',
        email: 'alansartravel@gmail.com',
        isPrimary: true,
        sortOrder: 0,
      },
    ],
    documents: [
      {
        documentName: 'Parent Agency VAT Certificate',
        documentType: 'Tax',
        fileUrl: 'https://demo.travelagency.local/documents/ans-vat-certificate.pdf',
        notes: 'Used as supporting demo documentation.',
      },
    ],
  },
  {
    key: 'mut',
    code: 'MUT',
    name: 'Mutamer Travel',
    agencyType: 'BRANCH',
    parentKey: 'ans',
    category: 'Branch Package Sales',
    primaryContactPerson: 'Hamza Saifi',
    contactEmail: 'mutamertravel@gmail.com',
    contactPhone: '+966-58-334-6615',
    addressLine1: 'Abu Bakr Al Siddiq Road',
    addressLine2: 'Counter 2',
    city: 'Madinah',
    state: 'Madinah',
    country: 'Saudi Arabia',
    postalCode: '42311',
    notes: 'Branch agency focused on package collections and installment-based group sales.',
    createdAt: '2026-04-15T11:00:00.000Z',
    phoneNumbers: [
      {
        label: 'Branch desk',
        phoneNumber: '+966-58-334-6615',
        isPrimary: true,
        sortOrder: 0,
      },
    ],
    emailAddresses: [
      {
        label: 'Main',
        email: 'mutamertravel@gmail.com',
        isPrimary: true,
        sortOrder: 0,
      },
    ],
    documents: [
      {
        documentName: 'Branch Municipal Permit',
        documentType: 'Permit',
        fileUrl: 'https://demo.travelagency.local/documents/mut-permit.pdf',
        notes: 'Supports realistic branch profile data.',
      },
    ],
  },
]

const groups: SeedGroup[] = [
  {
    code: 'ALM-2505-01',
    agencyKey: 'alm',
    name: 'Almuhajir May Family Umrah',
    travelerCount: 18,
    amountPerPax: 15,
    destination: 'Makkah & Madinah',
    departureDate: '2026-05-08T06:00:00.000Z',
    returnDate: '2026-05-18T18:00:00.000Z',
    createdAt: '2026-05-01T09:15:00.000Z',
    description: 'Family-focused May departure booked from the parent office.',
    notes: 'Closed before departure with a single parent payment.',
  },
  {
    code: 'ALM-2505-02',
    agencyKey: 'alm',
    name: 'Almuhajir Mid-May Couples Umrah',
    travelerCount: 27,
    amountPerPax: 15,
    destination: 'Makkah & Madinah',
    departureDate: '2026-05-15T07:30:00.000Z',
    returnDate: '2026-05-24T19:30:00.000Z',
    createdAt: '2026-05-03T10:00:00.000Z',
    description: 'Couples and small families booked through the parent branch.',
    notes: 'Settled in full from the first parent collection.',
  },
  {
    code: 'ALM-2506-01',
    agencyKey: 'alm',
    name: 'Almuhajir June School Break Umrah',
    travelerCount: 34,
    amountPerPax: 15,
    destination: 'Makkah & Madinah',
    departureDate: '2026-06-10T06:45:00.000Z',
    returnDate: '2026-06-19T18:20:00.000Z',
    createdAt: '2026-06-01T08:30:00.000Z',
    description: 'June school-break departure with staggered collections.',
    notes: 'Funded using earlier parent advance plus a June top-up.',
  },
  {
    code: 'ALM-2506-02',
    agencyKey: 'alm',
    name: 'Almuhajir Late June Executive Umrah',
    travelerCount: 21,
    amountPerPax: 15,
    destination: 'Makkah & Madinah',
    departureDate: '2026-06-20T08:15:00.000Z',
    returnDate: '2026-06-28T17:15:00.000Z',
    createdAt: '2026-06-08T11:00:00.000Z',
    description: 'Small executive group with late-June departure.',
    notes: 'Settled from a consolidated parent payment shortly before departure.',
  },
  {
    code: 'IKH-2505-01',
    agencyKey: 'ikh',
    name: 'Ikhlas Early May Umrah Caravan',
    travelerCount: 42,
    amountPerPax: 15,
    destination: 'Makkah & Madinah',
    departureDate: '2026-05-12T06:10:00.000Z',
    returnDate: '2026-05-21T19:00:00.000Z',
    createdAt: '2026-05-02T09:40:00.000Z',
    description: 'Large retail departure sold by Ikhlas Travel.',
    notes: 'Covered partly by branch collections and partly by the parent.',
  },
  {
    code: 'IKH-2505-02',
    agencyKey: 'ikh',
    name: 'Ikhlas End-May Weekend Umrah',
    travelerCount: 29,
    amountPerPax: 15,
    destination: 'Makkah & Madinah',
    departureDate: '2026-05-26T07:00:00.000Z',
    returnDate: '2026-06-04T17:45:00.000Z',
    createdAt: '2026-05-18T12:15:00.000Z',
    description: 'Weekend-focused group with installment collections.',
    notes: 'Included later use of an earlier parent advance.',
  },
  {
    code: 'IKH-2506-01',
    agencyKey: 'ikh',
    name: 'Ikhlas Mid-June Family Umrah',
    travelerCount: 37,
    amountPerPax: 15,
    destination: 'Makkah & Madinah',
    departureDate: '2026-06-15T06:30:00.000Z',
    returnDate: '2026-06-24T18:10:00.000Z',
    createdAt: '2026-05-28T13:20:00.000Z',
    description: 'Mid-June family batch supported by parent and branch funds.',
    notes: 'Finished through two June settlements.',
  },
  {
    code: 'AQT-2505-01',
    agencyKey: 'aqt',
    name: 'Arab Quraishi Shawwal Umrah',
    travelerCount: 26,
    amountPerPax: 15,
    destination: 'Makkah & Madinah',
    departureDate: '2026-05-18T05:50:00.000Z',
    returnDate: '2026-05-27T18:25:00.000Z',
    createdAt: '2026-05-06T10:10:00.000Z',
    description: 'Community-focused Shawwal departure.',
    notes: 'Late balance was cleared by a parent support payment in June.',
  },
  {
    code: 'AQT-2506-01',
    agencyKey: 'aqt',
    name: 'Arab Quraishi June Saver Umrah',
    travelerCount: 31,
    amountPerPax: 15,
    destination: 'Makkah & Madinah',
    departureDate: '2026-06-17T07:10:00.000Z',
    returnDate: '2026-06-26T18:40:00.000Z',
    createdAt: '2026-06-05T09:25:00.000Z',
    description: 'Saver package promoted by Arab Quraishi Travel.',
    notes: 'Settled through split parent and branch funding.',
  },
  {
    code: 'AQT-2506-02',
    agencyKey: 'aqt',
    name: 'Arab Quraishi Month-End Umrah',
    travelerCount: 35,
    amountPerPax: 15,
    destination: 'Makkah & Madinah',
    departureDate: '2026-06-25T06:20:00.000Z',
    returnDate: '2026-06-30T18:30:00.000Z',
    createdAt: '2026-06-12T11:30:00.000Z',
    description: 'Month-end departure sold with staggered collection dates.',
    notes: 'Finished with a late-June consolidated settlement.',
  },
  {
    code: 'ANS-2505-01',
    agencyKey: 'ans',
    name: 'Alansar Mid-May Umrah',
    travelerCount: 12,
    amountPerPax: 10,
    destination: 'Makkah & Madinah',
    departureDate: '2026-05-10T06:20:00.000Z',
    returnDate: '2026-05-17T17:40:00.000Z',
    createdAt: '2026-05-02T08:45:00.000Z',
    description: 'Parent office May departure supported by early collections.',
    notes: 'Fully paid in the first parent payment.',
  },
  {
    code: 'ANS-2505-02',
    agencyKey: 'ans',
    name: 'Alansar Late-May Couples Umrah',
    travelerCount: 19,
    amountPerPax: 10,
    destination: 'Makkah & Madinah',
    departureDate: '2026-05-20T06:35:00.000Z',
    returnDate: '2026-05-27T18:05:00.000Z',
    createdAt: '2026-05-08T09:15:00.000Z',
    description: 'Late-May couples departure from the parent agency.',
    notes: 'Settled by two installments across May and June.',
  },
  {
    code: 'ANS-2506-01',
    agencyKey: 'ans',
    name: 'Alansar Early June Value Umrah',
    travelerCount: 14,
    amountPerPax: 10,
    destination: 'Makkah & Madinah',
    departureDate: '2026-06-08T06:10:00.000Z',
    returnDate: '2026-06-15T17:50:00.000Z',
    createdAt: '2026-06-01T10:05:00.000Z',
    description: 'Small June value package from Alansar Travel.',
    notes: 'Paid in one June settlement.',
  },
  {
    code: 'ANS-2506-02',
    agencyKey: 'ans',
    name: 'Alansar Mid-June Group Umrah',
    travelerCount: 31,
    amountPerPax: 10,
    destination: 'Makkah & Madinah',
    departureDate: '2026-06-18T07:00:00.000Z',
    returnDate: '2026-06-25T18:20:00.000Z',
    createdAt: '2026-06-06T11:10:00.000Z',
    description: 'Larger mid-June group booked with late collections.',
    notes: 'Still has a small outstanding amount at the end of June.',
  },
  {
    code: 'ANS-2506-03',
    agencyKey: 'ans',
    name: 'Alansar Late-June Retail Umrah',
    travelerCount: 17,
    amountPerPax: 10,
    destination: 'Makkah & Madinah',
    departureDate: '2026-06-24T06:40:00.000Z',
    returnDate: '2026-06-30T17:30:00.000Z',
    createdAt: '2026-06-12T12:20:00.000Z',
    description: 'Late-June retail booking from the parent office.',
    notes: 'Partially paid before departure and still outstanding after June.',
  },
  {
    code: 'MUT-2505-01',
    agencyKey: 'mut',
    name: 'Mutamer Family Umrah 1',
    travelerCount: 16,
    amountPerPax: 10,
    destination: 'Makkah & Madinah',
    departureDate: '2026-05-14T06:50:00.000Z',
    returnDate: '2026-05-21T18:10:00.000Z',
    createdAt: '2026-05-04T09:30:00.000Z',
    description: 'Branch family package sold through Mutamer Travel.',
    notes: 'Covered through branch and parent support.',
  },
  {
    code: 'MUT-2505-02',
    agencyKey: 'mut',
    name: 'Mutamer Late-May Umrah',
    travelerCount: 22,
    amountPerPax: 10,
    destination: 'Makkah & Madinah',
    departureDate: '2026-05-22T07:00:00.000Z',
    returnDate: '2026-05-29T18:15:00.000Z',
    createdAt: '2026-05-10T10:00:00.000Z',
    description: 'Late-May branch departure with split collections.',
    notes: 'Remains partially outstanding after June.',
  },
  {
    code: 'MUT-2506-01',
    agencyKey: 'mut',
    name: 'Mutamer Early June Saver Umrah',
    travelerCount: 27,
    amountPerPax: 10,
    destination: 'Makkah & Madinah',
    departureDate: '2026-06-12T06:25:00.000Z',
    returnDate: '2026-06-19T17:55:00.000Z',
    createdAt: '2026-06-02T09:50:00.000Z',
    description: 'Branch saver package with two installments.',
    notes: 'Fully settled by June 14.',
  },
  {
    code: 'MUT-2506-02',
    agencyKey: 'mut',
    name: 'Mutamer Mid-June Retail Umrah',
    travelerCount: 18,
    amountPerPax: 10,
    destination: 'Makkah & Madinah',
    departureDate: '2026-06-21T07:15:00.000Z',
    returnDate: '2026-06-28T18:05:00.000Z',
    createdAt: '2026-06-09T10:40:00.000Z',
    description: 'Retail package sold with only a small part collected in June.',
    notes: 'Carries forward an outstanding balance.',
  },
  {
    code: 'MUT-2506-03',
    agencyKey: 'mut',
    name: 'Mutamer Month-End Umrah',
    travelerCount: 24,
    amountPerPax: 10,
    destination: 'Makkah & Madinah',
    departureDate: '2026-06-26T06:55:00.000Z',
    returnDate: '2026-06-30T17:20:00.000Z',
    createdAt: '2026-06-14T11:50:00.000Z',
    description: 'Month-end Mutamer departure with no payment completed by June end.',
    notes: 'Left intentionally outstanding for reporting and ledger tests.',
  },
]

const payments: SeedPayment[] = [
  {
    key: 'alm-01',
    agencyKey: 'alm',
    receiptNumber: 'RCT-20260504-ALM01',
    reference: 'ALM-BT-250504-01',
    amount: 1500,
    method: 'BANK_TRANSFER',
    paymentCity: 'Riyadh',
    description: 'May mixed settlement for early departures',
    paidAt: '2026-05-04T10:15:00.000Z',
    createdAt: '2026-05-04T10:15:00.000Z',
    allocations: [
      {
        groupCode: 'ALM-2505-01',
        allocatedAmount: 270,
        createdAt: '2026-05-04T10:20:00.000Z',
        notes: 'Parent settled first May family batch',
      },
      {
        groupCode: 'ALM-2505-02',
        allocatedAmount: 405,
        createdAt: '2026-05-04T10:21:00.000Z',
        notes: 'Parent cleared second May departure',
      },
      {
        groupCode: 'IKH-2505-02',
        allocatedAmount: 350,
        createdAt: '2026-05-28T11:00:00.000Z',
        notes: 'Advance used later for Ikhlas end-May group',
      },
      {
        groupCode: 'ALM-2506-01',
        allocatedAmount: 200,
        createdAt: '2026-06-06T09:30:00.000Z',
        notes: 'Advance carried into June school-break group',
      },
    ],
  },
  {
    key: 'ikh-01',
    agencyKey: 'ikh',
    receiptNumber: 'RCT-20260518-IKH01',
    reference: 'IKH-CS-250518-01',
    amount: 500,
    method: 'CASH',
    paymentCity: 'Jeddah',
    description: 'Ikhlas first installment for May departures',
    paidAt: '2026-05-18T15:00:00.000Z',
    createdAt: '2026-05-18T15:00:00.000Z',
    allocations: [
      {
        groupCode: 'IKH-2505-01',
        allocatedAmount: 430,
        createdAt: '2026-05-18T15:05:00.000Z',
        notes: 'Branch cash collection for large May caravan',
      },
      {
        groupCode: 'IKH-2505-02',
        allocatedAmount: 70,
        createdAt: '2026-05-18T15:06:00.000Z',
        notes: 'Small upfront amount for weekend departure',
      },
    ],
  },
  {
    key: 'aqt-01',
    agencyKey: 'aqt',
    receiptNumber: 'RCT-20260522-AQT01',
    reference: 'AQT-ON-250522-01',
    amount: 300,
    method: 'ONLINE',
    paymentCity: 'Makkah',
    description: 'Arab Quraishi initial collection',
    paidAt: '2026-05-22T13:45:00.000Z',
    createdAt: '2026-05-22T13:45:00.000Z',
    allocations: [
      {
        groupCode: 'AQT-2505-01',
        allocatedAmount: 300,
        createdAt: '2026-05-22T13:50:00.000Z',
        notes: 'Initial online collection for Shawwal group',
      },
    ],
  },
  {
    key: 'ans-01',
    agencyKey: 'ans',
    receiptNumber: 'RCT-20260505-ANS01',
    reference: 'ANS-BT-250505-01',
    amount: 300,
    method: 'BANK_TRANSFER',
    paymentCity: 'Dammam',
    description: 'Parent support for May departures',
    paidAt: '2026-05-05T09:25:00.000Z',
    createdAt: '2026-05-05T09:25:00.000Z',
    allocations: [
      {
        groupCode: 'ANS-2505-01',
        allocatedAmount: 120,
        createdAt: '2026-05-05T09:30:00.000Z',
        notes: 'Parent covered first May departure',
      },
      {
        groupCode: 'MUT-2505-01',
        allocatedAmount: 100,
        createdAt: '2026-05-05T09:31:00.000Z',
        notes: 'Parent support for Mutamer family group',
      },
      {
        groupCode: 'ANS-2505-02',
        allocatedAmount: 80,
        createdAt: '2026-05-05T09:32:00.000Z',
        notes: 'Initial partial payment for late-May couples group',
      },
    ],
  },
  {
    key: 'mut-01',
    agencyKey: 'mut',
    receiptNumber: 'RCT-20260520-MUT01',
    reference: 'MUT-CS-250520-01',
    amount: 250,
    method: 'CASH',
    paymentCity: 'Madinah',
    description: 'Mutamer installment collection',
    paidAt: '2026-05-20T16:10:00.000Z',
    createdAt: '2026-05-20T16:10:00.000Z',
    allocations: [
      {
        groupCode: 'MUT-2505-01',
        allocatedAmount: 60,
        createdAt: '2026-05-20T16:15:00.000Z',
        notes: 'Branch topped up family group before departure',
      },
      {
        groupCode: 'MUT-2505-02',
        allocatedAmount: 100,
        createdAt: '2026-05-20T16:16:00.000Z',
        notes: 'Initial branch collection for late-May group',
      },
      {
        groupCode: 'MUT-2506-01',
        allocatedAmount: 90,
        createdAt: '2026-06-02T09:00:00.000Z',
        notes: 'Advance used for June saver departure',
      },
    ],
  },
  {
    key: 'alm-02',
    agencyKey: 'alm',
    receiptNumber: 'RCT-20260605-ALM02',
    reference: 'ALM-CH-250605-01',
    amount: 1800,
    method: 'CHEQUE',
    paymentCity: 'Riyadh',
    description: 'Consolidated settlement before June departures',
    paidAt: '2026-06-05T12:00:00.000Z',
    createdAt: '2026-06-05T12:00:00.000Z',
    allocations: [
      {
        groupCode: 'IKH-2505-01',
        allocatedAmount: 200,
        createdAt: '2026-06-05T12:05:00.000Z',
        notes: 'Parent closed Ikhlas early-May caravan after late collection',
      },
      {
        groupCode: 'IKH-2506-01',
        allocatedAmount: 300,
        createdAt: '2026-06-05T12:06:00.000Z',
        notes: 'Parent funded June Ikhlas family batch',
      },
      {
        groupCode: 'AQT-2505-01',
        allocatedAmount: 90,
        createdAt: '2026-06-05T12:07:00.000Z',
        notes: 'Parent cleared delayed Arab Quraishi balance',
      },
      {
        groupCode: 'AQT-2506-01',
        allocatedAmount: 185,
        createdAt: '2026-06-12T10:10:00.000Z',
        notes: 'Advance from parent moved to June saver group',
      },
      {
        groupCode: 'ALM-2506-02',
        allocatedAmount: 315,
        createdAt: '2026-06-20T10:30:00.000Z',
        notes: 'Parent closed late-June executive departure',
      },
    ],
  },
  {
    key: 'ans-02',
    agencyKey: 'ans',
    receiptNumber: 'RCT-20260602-ANS02',
    reference: 'ANS-ON-250602-01',
    amount: 450,
    method: 'ONLINE',
    paymentCity: 'Dammam',
    description: 'June operational settlement',
    paidAt: '2026-06-02T11:45:00.000Z',
    createdAt: '2026-06-02T11:45:00.000Z',
    allocations: [
      {
        groupCode: 'ANS-2505-02',
        allocatedAmount: 110,
        createdAt: '2026-06-02T11:50:00.000Z',
        notes: 'Second installment for late-May couples group',
      },
      {
        groupCode: 'ANS-2506-01',
        allocatedAmount: 140,
        createdAt: '2026-06-02T11:51:00.000Z',
        notes: 'Full payment for early June value package',
      },
      {
        groupCode: 'ANS-2506-02',
        allocatedAmount: 100,
        createdAt: '2026-06-02T11:52:00.000Z',
        notes: 'Initial June payment for mid-month group',
      },
      {
        groupCode: 'MUT-2505-02',
        allocatedAmount: 100,
        createdAt: '2026-06-02T11:53:00.000Z',
        notes: 'Parent support for Mutamer late-May group',
      },
    ],
  },
  {
    key: 'aqt-02',
    agencyKey: 'aqt',
    receiptNumber: 'RCT-20260612-AQT02',
    reference: 'AQT-BT-250612-01',
    amount: 700,
    method: 'BANK_TRANSFER',
    paymentCity: 'Makkah',
    description: 'Arab Quraishi second installment and reserve',
    paidAt: '2026-06-12T10:00:00.000Z',
    createdAt: '2026-06-12T10:00:00.000Z',
    allocations: [
      {
        groupCode: 'AQT-2506-01',
        allocatedAmount: 280,
        createdAt: '2026-06-12T10:05:00.000Z',
        notes: 'Branch completed June saver package',
      },
      {
        groupCode: 'AQT-2506-02',
        allocatedAmount: 220,
        createdAt: '2026-06-12T10:06:00.000Z',
        notes: 'Branch started month-end departure collection',
      },
    ],
  },
  {
    key: 'mut-02',
    agencyKey: 'mut',
    receiptNumber: 'RCT-20260614-MUT02',
    reference: 'MUT-CS-250614-01',
    amount: 200,
    method: 'CASH',
    paymentCity: 'Madinah',
    description: 'Mutamer second installment',
    paidAt: '2026-06-14T17:20:00.000Z',
    createdAt: '2026-06-14T17:20:00.000Z',
    allocations: [
      {
        groupCode: 'MUT-2506-01',
        allocatedAmount: 180,
        createdAt: '2026-06-14T17:25:00.000Z',
        notes: 'Branch completed saver Umrah package',
      },
      {
        groupCode: 'MUT-2506-02',
        allocatedAmount: 20,
        createdAt: '2026-06-14T17:26:00.000Z',
        notes: 'Small partial payment for mid-June retail group',
      },
    ],
  },
  {
    key: 'alm-03',
    agencyKey: 'alm',
    receiptNumber: 'RCT-20260618-ALM03',
    reference: 'ALM-BT-250618-01',
    amount: 2500,
    method: 'BANK_TRANSFER',
    paymentCity: 'Riyadh',
    description: 'June month-end consolidated top-up',
    paidAt: '2026-06-18T14:30:00.000Z',
    createdAt: '2026-06-18T14:30:00.000Z',
    allocations: [
      {
        groupCode: 'ALM-2506-01',
        allocatedAmount: 310,
        createdAt: '2026-06-18T14:35:00.000Z',
        notes: 'Parent closed June school-break departure',
      },
      {
        groupCode: 'IKH-2506-01',
        allocatedAmount: 255,
        createdAt: '2026-06-18T14:36:00.000Z',
        notes: 'Parent finished Ikhlas mid-June family batch',
      },
      {
        groupCode: 'AQT-2506-02',
        allocatedAmount: 305,
        createdAt: '2026-06-18T14:37:00.000Z',
        notes: 'Parent closed Arab Quraishi month-end group',
      },
      {
        groupCode: 'IKH-2505-02',
        allocatedAmount: 15,
        createdAt: '2026-06-18T14:38:00.000Z',
        notes: 'Small parent top-up cleared Ikhlas weekend departure',
      },
    ],
  },
  {
    key: 'ans-03',
    agencyKey: 'ans',
    receiptNumber: 'RCT-20260625-ANS03',
    reference: 'ANS-DC-250625-01',
    amount: 300,
    method: 'DEBIT_CARD',
    paymentCity: 'Dammam',
    description: 'Late June parent settlement',
    paidAt: '2026-06-25T10:30:00.000Z',
    createdAt: '2026-06-25T10:30:00.000Z',
    allocations: [
      {
        groupCode: 'ANS-2506-02',
        allocatedAmount: 210,
        createdAt: '2026-06-25T10:35:00.000Z',
        notes: 'Parent improved June mid-month group position',
      },
      {
        groupCode: 'ANS-2506-03',
        allocatedAmount: 90,
        createdAt: '2026-06-25T10:36:00.000Z',
        notes: 'Partial late-June retail payment before departure',
      },
    ],
  },
  {
    key: 'ikh-02',
    agencyKey: 'ikh',
    receiptNumber: 'RCT-20260628-IKH02',
    reference: 'IKH-ON-250628-01',
    amount: 200,
    method: 'ONLINE',
    paymentCity: 'Jeddah',
    description: 'Ikhlas advance kept for next cycle',
    paidAt: '2026-06-28T16:40:00.000Z',
    createdAt: '2026-06-28T16:40:00.000Z',
    allocations: [],
  },
]

async function main() {
  process.env.DATABASE_URL = loadDatabaseUrl()

  const [{ prisma }, reportModule, agencyModule] = await Promise.all([
    import('../backend/src/lib/prisma.ts'),
    import('../backend/src/modules/reports/application/report.service.ts'),
    import('../backend/src/modules/agencies/application/agency.service.ts'),
  ])

  const {
    getReportSummary,
    getAgencyReport,
    getAgencyLedger,
    getOutstandingBalanceReport,
  } = reportModule
  const { getAgencyById } = agencyModule

  try {
    const holdingAgencyCode = 'SYSHOLD'

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

      const agencyIdByKey = new Map<string, string>()

      for (const agency of agencies) {
        const createdAgency = await tx.agency.create({
          data: {
            parentAgencyId: agency.parentKey ? agencyIdByKey.get(agency.parentKey) : undefined,
            name: agency.name,
            code: agency.code,
            agencyType: agency.agencyType,
            category: agency.category,
            openingBalance: 0,
            primaryContactPerson: agency.primaryContactPerson,
            contactEmail: agency.contactEmail,
            contactPhone: agency.contactPhone,
            addressLine1: agency.addressLine1,
            addressLine2: agency.addressLine2,
            city: agency.city,
            state: agency.state,
            country: agency.country,
            postalCode: agency.postalCode,
            notes: agency.notes,
            isActive: true,
            createdAt: asDate(agency.createdAt),
            phoneNumbers: {
              create: agency.phoneNumbers,
            },
            emailAddresses: {
              create: agency.emailAddresses,
            },
            documents: {
              create: agency.documents,
            },
          },
        })

        agencyIdByKey.set(agency.key, createdAgency.id)
      }

      const groupIdByCode = new Map<string, string>()

      for (const group of groups) {
        const totalAmount = roundAmount(group.travelerCount * group.amountPerPax)
        const createdGroup = await tx.group.create({
          data: {
            agencyId: agencyIdByKey.get(group.agencyKey),
            name: group.name,
            code: group.code,
            amountPerPax: group.amountPerPax,
            totalAmount,
            description: group.description,
            destination: group.destination,
            departureDate: asDate(group.departureDate),
            returnDate: asDate(group.returnDate),
            status: 'COMPLETED',
            travelerCount: group.travelerCount,
            notes: group.notes,
            createdAt: asDate(group.createdAt),
          },
        })

        groupIdByCode.set(group.code, createdGroup.id)
      }

      const firstUser = await tx.user.findFirst({
        orderBy: {
          createdAt: 'asc',
        },
        select: {
          id: true,
          email: true,
        },
      })

      assertCondition(firstUser, 'At least one existing user is required to receive demo payments.')

      const paymentIdByKey = new Map<string, string>()

      for (const payment of payments) {
        const allocatedAmount = payment.allocations.reduce(
          (total, allocation) => total + allocation.allocatedAmount,
          0,
        )
        assertCondition(
          allocatedAmount <= payment.amount,
          `Payment ${payment.reference} is over-allocated at seed definition time.`,
        )

        const createdPayment = await tx.payment.create({
          data: {
            agencyId: agencyIdByKey.get(payment.agencyKey),
            receivedByUserId: firstUser.id,
            receiptNumber: payment.receiptNumber,
            reference: payment.reference,
            amount: payment.amount,
            currency: 'USD',
            method: payment.method,
            status: getDerivedPaymentStatus(payment.amount, allocatedAmount),
            paymentCity: payment.paymentCity,
            description: payment.description,
            paidAt: asDate(payment.paidAt),
            createdAt: asDate(payment.createdAt),
          },
        })

        paymentIdByKey.set(payment.key, createdPayment.id)

        for (const allocation of payment.allocations) {
          await tx.paymentGroup.create({
            data: {
              paymentId: createdPayment.id,
              groupId: groupIdByCode.get(allocation.groupCode),
              allocatedAmount: allocation.allocatedAmount,
              notes: allocation.notes,
              createdAt: asDate(allocation.createdAt),
            },
          })
        }
      }

      return {
        holdingAgencyId: holdingAgency.id,
        firstUser,
        agencyIdByKey: Object.fromEntries(agencyIdByKey),
        paymentIdByKey: Object.fromEntries(paymentIdByKey),
      }
    })

    const superAdminAuth: AuthenticatedUser = {
      id: result.firstUser.id,
      agencyId: result.holdingAgencyId,
      role: 'SUPER_ADMIN',
      email: result.firstUser.email,
    }

    const almParentAuth: AuthenticatedUser = {
      id: 'demo-alm-parent',
      agencyId: result.agencyIdByKey.alm,
      role: 'AGENCY_ADMIN',
      email: 'almuhajirtravel@gmail.com',
    }

    const ansParentAuth: AuthenticatedUser = {
      id: 'demo-ans-parent',
      agencyId: result.agencyIdByKey.ans,
      role: 'AGENCY_ADMIN',
      email: 'alansartravel@gmail.com',
    }

    const ikhBranchAuth: AuthenticatedUser = {
      id: 'demo-ikh-branch',
      agencyId: result.agencyIdByKey.ikh,
      role: 'AGENCY_ADMIN',
      email: 'ikhlastravel@gmail.com',
    }

    const aqtBranchAuth: AuthenticatedUser = {
      id: 'demo-aqt-branch',
      agencyId: result.agencyIdByKey.aqt,
      role: 'AGENCY_ADMIN',
      email: 'arabquraishi@gmail.com',
    }

    const mutBranchAuth: AuthenticatedUser = {
      id: 'demo-mut-branch',
      agencyId: result.agencyIdByKey.mut,
      role: 'AGENCY_ADMIN',
      email: 'mutamertravel@gmail.com',
    }

    const businessAgencyCodes = new Set(['ALM', 'IKH', 'AQT', 'ANS', 'MUT'])

    const createdBusinessAgencies = await prisma.agency.findMany({
      where: {
        code: {
          in: Array.from(businessAgencyCodes),
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
        agencyType: true,
        parentAgencyId: true,
      },
      orderBy: {
        code: 'asc',
      },
    })

    const groupRows = await prisma.group.findMany({
      where: {
        agency: {
          code: {
            in: Array.from(businessAgencyCodes),
          },
        },
      },
      select: {
        id: true,
        code: true,
        travelerCount: true,
        totalAmount: true,
        agency: {
          select: {
            code: true,
          },
        },
        paymentGroups: {
          select: {
            allocatedAmount: true,
          },
        },
      },
    })

    const paymentRows = await prisma.payment.findMany({
      where: {
        agency: {
          code: {
            in: Array.from(businessAgencyCodes),
          },
        },
      },
      select: {
        id: true,
        reference: true,
        amount: true,
        agency: {
          select: {
            code: true,
          },
        },
        paymentGroups: {
          select: {
            groupId: true,
            allocatedAmount: true,
          },
        },
      },
    })

    const paymentGroupRows = await prisma.paymentGroup.findMany({
      select: {
        paymentId: true,
        groupId: true,
        allocatedAmount: true,
      },
    })

    assertAmount(createdBusinessAgencies.length, 5, 'Business agency count')
    assertAmount(groupRows.length, 20, 'Group count')
    assertAmount(
      groupRows.reduce((total, group) => total + group.travelerCount, 0),
      500,
      'Passenger count',
    )
    assertAmount(
      groupRows
        .filter((group) => ['ALM', 'IKH', 'AQT'].includes(group.agency.code))
        .reduce((total, group) => total + Number(group.totalAmount ?? 0), 0),
      4500,
      'Almuhajir scope total group amount',
    )
    assertAmount(
      groupRows
        .filter((group) => ['ANS', 'MUT'].includes(group.agency.code))
        .reduce((total, group) => total + Number(group.totalAmount ?? 0), 0),
      2000,
      'Alansar scope total group amount',
    )

    const duplicateAllocationKeys = new Set<string>()
    const seenAllocationKeys = new Set<string>()

    paymentGroupRows.forEach((paymentGroup) => {
      const compositeKey = `${paymentGroup.paymentId}:${paymentGroup.groupId}`
      if (seenAllocationKeys.has(compositeKey)) {
        duplicateAllocationKeys.add(compositeKey)
      }
      seenAllocationKeys.add(compositeKey)
    })

    assertCondition(
      duplicateAllocationKeys.size === 0,
      'Duplicate payment-to-group allocations were found in the seeded dataset.',
    )

    groupRows.forEach((group) => {
      const allocatedAmount = group.paymentGroups.reduce((total, paymentGroup) => {
        return total + Number(paymentGroup.allocatedAmount)
      }, 0)
      assertCondition(
        roundAmount(allocatedAmount) <= roundAmount(Number(group.totalAmount ?? 0)),
        `Group ${group.code} is over-allocated.`,
      )
    })

    paymentRows.forEach((payment) => {
      const allocatedAmount = payment.paymentGroups.reduce((total, paymentGroup) => {
        return total + Number(paymentGroup.allocatedAmount)
      }, 0)
      assertCondition(
        roundAmount(allocatedAmount) <= roundAmount(Number(payment.amount)),
        `Payment ${payment.reference} is over-allocated.`,
      )
    })

    const allSummary = await getReportSummary(superAdminAuth, {
      year: 2026,
    })
    const maySummary = await getReportSummary(superAdminAuth, {
      year: 2026,
      month: 5,
    })
    const juneSummary = await getReportSummary(superAdminAuth, {
      year: 2026,
      month: 6,
    })
    const julySummary = await getReportSummary(superAdminAuth, {
      year: 2026,
      month: 7,
    })

    const outstandingReport = await getOutstandingBalanceReport(superAdminAuth, {
      sortBy: 'outstandingBalance',
      sortOrder: 'desc',
    })

    const almSummary = await getAgencyById(result.agencyIdByKey.alm, superAdminAuth, {
      includeBranches: false,
    })
    const ikhSummary = await getAgencyById(result.agencyIdByKey.ikh, superAdminAuth, {
      includeBranches: false,
    })
    const aqtSummary = await getAgencyById(result.agencyIdByKey.aqt, superAdminAuth, {
      includeBranches: false,
    })
    const almConsolidatedSummary = await getAgencyById(result.agencyIdByKey.alm, superAdminAuth, {
      includeBranches: true,
    })
    const ansSummary = await getAgencyById(result.agencyIdByKey.ans, superAdminAuth, {
      includeBranches: false,
    })
    const mutSummary = await getAgencyById(result.agencyIdByKey.mut, superAdminAuth, {
      includeBranches: false,
    })
    const ansConsolidatedSummary = await getAgencyById(result.agencyIdByKey.ans, superAdminAuth, {
      includeBranches: true,
    })

    const reportDateFrom = new Date('2026-05-01T00:00:00.000Z')
    const reportDateTo = new Date('2026-06-30T23:59:59.999Z')

    const almConsolidatedReport = await getAgencyReport(almParentAuth, {
      includeBranches: true,
      dateFrom: reportDateFrom,
      dateTo: reportDateTo,
    })
    const ikhBranchReport = await getAgencyReport(ikhBranchAuth, {
      includeBranches: false,
      dateFrom: reportDateFrom,
      dateTo: reportDateTo,
    })
    const ansConsolidatedReport = await getAgencyReport(ansParentAuth, {
      includeBranches: true,
      dateFrom: reportDateFrom,
      dateTo: reportDateTo,
    })

    const almLedger = await getAgencyLedger(almParentAuth, {
      agencyId: result.agencyIdByKey.alm,
      includeBranches: false,
      dateFrom: reportDateFrom,
      dateTo: reportDateTo,
    })
    const ikhLedger = await getAgencyLedger(ikhBranchAuth, {
      includeBranches: false,
      dateFrom: reportDateFrom,
      dateTo: reportDateTo,
    })
    const aqtLedger = await getAgencyLedger(aqtBranchAuth, {
      includeBranches: false,
      dateFrom: reportDateFrom,
      dateTo: reportDateTo,
    })
    const almConsolidatedLedger = await getAgencyLedger(almParentAuth, {
      includeBranches: true,
      dateFrom: reportDateFrom,
      dateTo: reportDateTo,
    })
    const ansLedger = await getAgencyLedger(ansParentAuth, {
      agencyId: result.agencyIdByKey.ans,
      includeBranches: false,
      dateFrom: reportDateFrom,
      dateTo: reportDateTo,
    })
    const mutLedger = await getAgencyLedger(mutBranchAuth, {
      includeBranches: false,
      dateFrom: reportDateFrom,
      dateTo: reportDateTo,
    })
    const ansConsolidatedLedger = await getAgencyLedger(ansParentAuth, {
      includeBranches: true,
      dateFrom: reportDateFrom,
      dateTo: reportDateTo,
    })

    const outstandingRowsByCode = new Map(
      outstandingReport.rows
        .filter((row) => businessAgencyCodes.has(row.agentNumber))
        .map((row) => [row.agentNumber, row]),
    )

    assertAmount(allSummary.totals.totalRevenue, 9000, 'Full-year payment revenue')
    assertAmount(maySummary.totals.totalRevenue, 2850, 'May payment revenue')
    assertAmount(juneSummary.totals.totalRevenue, 6150, 'June payment revenue')
    assertAmount(julySummary.totals.totalRevenue, 0, 'July payment revenue')
    assertAmount(allSummary.totals.outstandingBalance, 500, 'Full-year outstanding balance')
    assertAmount(allSummary.totals.advanceBalance, 3000, 'Full-year advance balance')
    assertAmount(allSummary.totals.netBalance, -2500, 'Full-year net balance')

    assertAmount(almConsolidatedSummary.summary.totalGroups, 10, 'Almuhajir consolidated group count')
    assertAmount(almConsolidatedSummary.summary.totalPax, 300, 'Almuhajir consolidated passenger count')
    assertAmount(almConsolidatedSummary.summary.totalGroupAmount, 4500, 'Almuhajir consolidated group amount')
    assertAmount(
      almConsolidatedSummary.summary.totalPaymentsReceived,
      7500,
      'Almuhajir consolidated total payments',
    )
    assertAmount(almConsolidatedSummary.summary.outstandingBalance, 0, 'Almuhajir outstanding balance')
    assertAmount(almConsolidatedSummary.summary.advanceBalance, 3000, 'Almuhajir advance balance')
    assertAmount(almConsolidatedSummary.summary.netBalance, -3000, 'Almuhajir net balance')

    assertAmount(ansConsolidatedSummary.summary.totalGroups, 10, 'Alansar consolidated group count')
    assertAmount(ansConsolidatedSummary.summary.totalPax, 200, 'Alansar consolidated passenger count')
    assertAmount(ansConsolidatedSummary.summary.totalGroupAmount, 2000, 'Alansar consolidated group amount')
    assertAmount(
      ansConsolidatedSummary.summary.totalPaymentsReceived,
      1500,
      'Alansar consolidated total payments',
    )
    assertAmount(ansConsolidatedSummary.summary.outstandingBalance, 500, 'Alansar outstanding balance')
    assertAmount(ansConsolidatedSummary.summary.advanceBalance, 0, 'Alansar advance balance')
    assertAmount(ansConsolidatedSummary.summary.netBalance, 500, 'Alansar net balance')

    assertAmount(
      almConsolidatedSummary.summary.totalGroupAmount,
      almSummary.summary.totalGroupAmount +
        ikhSummary.summary.totalGroupAmount +
        aqtSummary.summary.totalGroupAmount,
      'Almuhajir consolidated group amount rollup',
    )
    assertAmount(
      almConsolidatedSummary.summary.totalPaymentsReceived,
      almSummary.summary.totalPaymentsReceived +
        ikhSummary.summary.totalPaymentsReceived +
        aqtSummary.summary.totalPaymentsReceived,
      'Almuhajir consolidated payment rollup',
    )
    assertAmount(
      almConsolidatedSummary.summary.advanceBalance,
      almSummary.summary.advanceBalance +
        ikhSummary.summary.advanceBalance +
        aqtSummary.summary.advanceBalance,
      'Almuhajir consolidated advance rollup',
    )

    assertAmount(
      ansConsolidatedSummary.summary.totalGroupAmount,
      ansSummary.summary.totalGroupAmount + mutSummary.summary.totalGroupAmount,
      'Alansar consolidated group amount rollup',
    )
    assertAmount(
      ansConsolidatedSummary.summary.totalPaymentsReceived,
      ansSummary.summary.totalPaymentsReceived + mutSummary.summary.totalPaymentsReceived,
      'Alansar consolidated payment rollup',
    )
    assertAmount(
      ansConsolidatedSummary.summary.outstandingBalance,
      ansSummary.summary.outstandingBalance + mutSummary.summary.outstandingBalance,
      'Alansar consolidated outstanding rollup',
    )

    assertAmount(outstandingRowsByCode.get('ALM')?.advanceBalance ?? 0, 2600, 'ALM advance report row')
    assertAmount(outstandingRowsByCode.get('IKH')?.advanceBalance ?? 0, 200, 'IKH advance report row')
    assertAmount(outstandingRowsByCode.get('AQT')?.advanceBalance ?? 0, 200, 'AQT advance report row')
    assertAmount(outstandingRowsByCode.get('ANS')?.outstandingBalance ?? 0, 80, 'ANS outstanding report row')
    assertAmount(outstandingRowsByCode.get('MUT')?.outstandingBalance ?? 0, 420, 'MUT outstanding report row')

    assertCondition(
      almConsolidatedReport.agency.reportScope === 'CONSOLIDATED' &&
        almConsolidatedReport.groupDetails.length === 10 &&
        almConsolidatedReport.paymentHistory.length >= 7,
      'Almuhajir consolidated report did not return the expected parent scope output.',
    )
    assertCondition(
      ikhBranchReport.agency.reportScope === 'SINGLE' &&
        ikhBranchReport.groupDetails.length === 3 &&
        ikhBranchReport.paymentHistory.length >= 4,
      `Ikhlas branch report did not return the expected single-branch output. Scope=${ikhBranchReport.agency.reportScope}, groups=${ikhBranchReport.groupDetails.length}, payments=${ikhBranchReport.paymentHistory.length}, groupCodes=${ikhBranchReport.groupDetails.map((group) => group.groupNumber).join('|')}.`,
    )
    assertCondition(
      ansConsolidatedReport.agency.reportScope === 'CONSOLIDATED' &&
        ansConsolidatedReport.groupDetails.length === 10 &&
        ansConsolidatedReport.paymentHistory.length >= 5,
      'Alansar consolidated report did not return the expected parent scope output.',
    )

    assertAmount(almLedger.summary.netBalance, almSummary.summary.netBalance, 'ALM ledger net balance')
    assertAmount(ikhLedger.summary.netBalance, ikhSummary.summary.netBalance, 'IKH ledger net balance')
    assertAmount(aqtLedger.summary.netBalance, aqtSummary.summary.netBalance, 'AQT ledger net balance')
    assertAmount(
      almConsolidatedLedger.summary.netBalance,
      almConsolidatedSummary.summary.netBalance,
      'Almuhajir consolidated ledger net balance',
    )
    assertAmount(ansLedger.summary.netBalance, ansSummary.summary.netBalance, 'ANS ledger net balance')
    assertAmount(mutLedger.summary.netBalance, mutSummary.summary.netBalance, 'MUT ledger net balance')
    assertAmount(
      ansConsolidatedLedger.summary.netBalance,
      ansConsolidatedSummary.summary.netBalance,
      'Alansar consolidated ledger net balance',
    )

    const dashboardAgencyCount = outstandingReport.rows.filter((row) =>
      businessAgencyCodes.has(row.agentNumber),
    ).length
    const dashboardGroupCount = outstandingReport.rows
      .filter((row) => businessAgencyCodes.has(row.agentNumber))
      .reduce((total, row) => total + row.totalGroups, 0)
    const dashboardPaxCount = outstandingReport.rows
      .filter((row) => businessAgencyCodes.has(row.agentNumber))
      .reduce((total, row) => total + row.totalPax, 0)

    assertAmount(dashboardAgencyCount, 5, 'Dashboard agency count source')
    assertAmount(dashboardGroupCount, 20, 'Dashboard group count source')
    assertAmount(dashboardPaxCount, 500, 'Dashboard passenger count source')

    const summary = {
      agencies: createdBusinessAgencies.map((agency) => ({
        code: agency.code,
        name: agency.name,
        agencyType: agency.agencyType,
      })),
      totals: {
        agencies: dashboardAgencyCount,
        groups: dashboardGroupCount,
        passengers: dashboardPaxCount,
        payments: allSummary.totals.totalRevenue,
        outstandingBalance: allSummary.totals.outstandingBalance,
        advanceBalance: allSummary.totals.advanceBalance,
        netBalance: allSummary.totals.netBalance,
      },
      monthlyRevenue: {
        may: maySummary.totals.totalRevenue,
        june: juneSummary.totals.totalRevenue,
        july: julySummary.totals.totalRevenue,
      },
      almuhajirScope: {
        totalGroups: almConsolidatedSummary.summary.totalGroups,
        totalPax: almConsolidatedSummary.summary.totalPax,
        totalGroupAmount: almConsolidatedSummary.summary.totalGroupAmount,
        totalPaymentsReceived: almConsolidatedSummary.summary.totalPaymentsReceived,
        outstandingBalance: almConsolidatedSummary.summary.outstandingBalance,
        advanceBalance: almConsolidatedSummary.summary.advanceBalance,
        netBalance: almConsolidatedSummary.summary.netBalance,
      },
      alansarScope: {
        totalGroups: ansConsolidatedSummary.summary.totalGroups,
        totalPax: ansConsolidatedSummary.summary.totalPax,
        totalGroupAmount: ansConsolidatedSummary.summary.totalGroupAmount,
        totalPaymentsReceived: ansConsolidatedSummary.summary.totalPaymentsReceived,
        outstandingBalance: ansConsolidatedSummary.summary.outstandingBalance,
        advanceBalance: ansConsolidatedSummary.summary.advanceBalance,
        netBalance: ansConsolidatedSummary.summary.netBalance,
      },
      branchEndingBalances: {
        ALM: {
          outstandingBalance: almSummary.summary.outstandingBalance,
          advanceBalance: almSummary.summary.advanceBalance,
          netBalance: almSummary.summary.netBalance,
        },
        IKH: {
          outstandingBalance: ikhSummary.summary.outstandingBalance,
          advanceBalance: ikhSummary.summary.advanceBalance,
          netBalance: ikhSummary.summary.netBalance,
        },
        AQT: {
          outstandingBalance: aqtSummary.summary.outstandingBalance,
          advanceBalance: aqtSummary.summary.advanceBalance,
          netBalance: aqtSummary.summary.netBalance,
        },
        ANS: {
          outstandingBalance: ansSummary.summary.outstandingBalance,
          advanceBalance: ansSummary.summary.advanceBalance,
          netBalance: ansSummary.summary.netBalance,
        },
        MUT: {
          outstandingBalance: mutSummary.summary.outstandingBalance,
          advanceBalance: mutSummary.summary.advanceBalance,
          netBalance: mutSummary.summary.netBalance,
        },
      },
      dashboardNote:
        'The dashboard main totals populate immediately. Date-scoped widgets for today/current month remain zero in July because the demo business window ends on 30 June.',
    }

    console.log(JSON.stringify(summary, null, 2))
  } finally {
    const { prisma } = await import('../backend/src/lib/prisma.ts')
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
