
import { env } from '../config/env.js'
export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Travel Agency Management System API',
    version: '1.0.0',
    description:
      'Phase 3 backend for authentication, CRUD operations, validation, and Prisma-backed business APIs.',
  },

servers: [
  {
    url:
      env.NODE_ENV === 'production'
        ? 'https://backend-production-43711.up.railway.app'
        : 'http://localhost:4000',
    description:
      env.NODE_ENV === 'production'
        ? 'Production API'
        : 'Local Development API',
  },
],
  
  
  tags: [
    { name: 'Auth' },
    { name: 'Health' },
    { name: 'Agencies' },
    { name: 'Users' },
    { name: 'Groups' },
    { name: 'Payments' },
    { name: 'Payment Groups' },
    { name: 'Reports' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      AgencyInput: {
        type: 'object',
        required: ['name', 'code'],
        properties: {
          name: { type: 'string' },
          code: { type: 'string' },
          contactEmail: { type: 'string', format: 'email' },
          contactPhone: { type: 'string' },
          addressLine1: { type: 'string' },
          addressLine2: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          country: { type: 'string' },
          postalCode: { type: 'string' },
          isActive: { type: 'boolean' },
        },
      },
      Agency: {
        allOf: [
          { $ref: '#/components/schemas/AgencyInput' },
          {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        ],
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password' },
        },
      },
      BootstrapInput: {
        type: 'object',
        required: ['agency', 'adminUser'],
        properties: {
          agency: { $ref: '#/components/schemas/AgencyInput' },
          adminUser: {
            type: 'object',
            required: ['firstName', 'lastName', 'email', 'password', 'role'],
            properties: {
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              email: { type: 'string', format: 'email' },
              phone: { type: 'string' },
              password: { type: 'string', format: 'password' },
              role: {
                type: 'string',
                enum: ['SUPER_ADMIN', 'AGENCY_ADMIN', 'AGENT', 'ACCOUNTANT', 'OPERATIONS'],
              },
            },
          },
        },
      },
      PublicUser: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          agencyId: { type: 'string', format: 'uuid' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', nullable: true },
          role: {
            type: 'string',
            enum: ['SUPER_ADMIN', 'AGENCY_ADMIN', 'AGENT', 'ACCOUNTANT', 'OPERATIONS'],
          },
          isActive: { type: 'boolean' },
          lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateUserInput: {
        type: 'object',
        required: ['agencyId', 'firstName', 'lastName', 'email', 'password', 'role'],
        properties: {
          agencyId: { type: 'string', format: 'uuid' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          password: { type: 'string', format: 'password' },
          role: {
            type: 'string',
            enum: ['SUPER_ADMIN', 'AGENCY_ADMIN', 'AGENT', 'ACCOUNTANT', 'OPERATIONS'],
          },
          isActive: { type: 'boolean' },
        },
      },
      UpdateUserInput: {
        type: 'object',
        properties: {
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          password: { type: 'string', format: 'password' },
          role: {
            type: 'string',
            enum: ['SUPER_ADMIN', 'AGENCY_ADMIN', 'AGENT', 'ACCOUNTANT', 'OPERATIONS'],
          },
          isActive: { type: 'boolean' },
        },
      },
      GroupInput: {
        type: 'object',
        required: ['agencyId', 'name', 'code', 'destination', 'departureDate', 'returnDate'],
        properties: {
          agencyId: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          code: { type: 'string' },
          description: { type: 'string' },
          destination: { type: 'string' },
          departureDate: { type: 'string', format: 'date-time' },
          returnDate: { type: 'string', format: 'date-time' },
          status: {
            type: 'string',
            enum: ['PLANNED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
          },
          travelerCount: { type: 'integer' },
          notes: { type: 'string' },
        },
      },
      PaymentInput: {
        type: 'object',
        required: ['agencyId', 'reference', 'amount', 'currency', 'method'],
        properties: {
          agencyId: { type: 'string', format: 'uuid' },
          receivedByUserId: { type: 'string', format: 'uuid' },
          reference: { type: 'string' },
          amount: { type: 'number' },
          currency: { type: 'string', minLength: 3, maxLength: 3 },
          method: {
            type: 'string',
            enum: ['CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'ONLINE', 'OTHER'],
          },
          status: {
            type: 'string',
            enum: ['PENDING', 'PARTIALLY_ALLOCATED', 'ALLOCATED', 'FAILED', 'REFUNDED'],
          },
          description: { type: 'string' },
          paidAt: { type: 'string', format: 'date-time' },
        },
      },
      PaymentGroupInput: {
        type: 'object',
        required: ['paymentId', 'groupId', 'allocatedAmount'],
        properties: {
          paymentId: { type: 'string', format: 'uuid' },
          groupId: { type: 'string', format: 'uuid' },
          allocatedAmount: { type: 'number' },
          notes: { type: 'string' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          user: { $ref: '#/components/schemas/PublicUser' },
        },
      },
      CollectionResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {},
          },
        },
      },
      ReportSummary: {
        type: 'object',
        properties: {
          filters: {
            type: 'object',
            properties: {
              year: { type: 'integer' },
              month: { type: 'integer', nullable: true },
            },
          },
          totals: {
            type: 'object',
            properties: {
              totalRevenue: { type: 'number' },
              outstandingBalance: { type: 'number' },
              allocatedRevenue: { type: 'number' },
              allocationCoverageRate: { type: 'number' },
              paymentCount: { type: 'integer' },
              activeAgencyCount: { type: 'integer' },
            },
          },
          monthlyRevenue: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                month: { type: 'string' },
                revenue: { type: 'number' },
              },
            },
          },
          countryRevenue: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                country: { type: 'string' },
                revenue: { type: 'number' },
                outstandingBalance: { type: 'number' },
              },
            },
          },
          agencyRevenue: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                agencyId: { type: 'string', format: 'uuid' },
                agencyName: { type: 'string' },
                agencyCode: { type: 'string' },
                country: { type: 'string' },
                revenue: { type: 'number' },
                outstandingBalance: { type: 'number' },
                paymentCount: { type: 'integer' },
              },
            },
          },
          outstandingBalances: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                reference: { type: 'string' },
                agencyName: { type: 'string' },
                country: { type: 'string' },
                amount: { type: 'number' },
                remainingBalance: { type: 'number' },
                status: { type: 'string' },
                paidAt: { type: 'string', format: 'date-time', nullable: true },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    '/api/v1/health': {
      get: {
        tags: ['Health'],
        summary: 'Check API health',
        responses: {
          '200': {
            description: 'Service is healthy',
          },
        },
      },
    },
    '/api/v1/auth/bootstrap': {
      post: {
        tags: ['Auth'],
        summary: 'Bootstrap the first agency and admin user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BootstrapInput' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Bootstrap completed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Authenticate a user and receive a JWT token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginInput' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Authentication successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get the currently authenticated user',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Authenticated user returned',
          },
        },
      },
    },
    '/api/v1/agencies': {
      get: {
        tags: ['Agencies'],
        summary: 'List agencies',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Agencies returned' } },
      },
      post: {
        tags: ['Agencies'],
        summary: 'Create an agency',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AgencyInput' },
            },
          },
        },
        responses: { '201': { description: 'Agency created' } },
      },
    },
    '/api/v1/agencies/{id}': {
      get: {
        tags: ['Agencies'],
        summary: 'Get an agency by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Agency returned' } },
      },
      patch: {
        tags: ['Agencies'],
        summary: 'Update an agency',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AgencyInput' },
            },
          },
        },
        responses: { '200': { description: 'Agency updated' } },
      },
      delete: {
        tags: ['Agencies'],
        summary: 'Delete an agency',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '204': { description: 'Agency deleted' } },
      },
    },
    '/api/v1/users': {
      get: {
        tags: ['Users'],
        summary: 'List users',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Users returned' } },
      },
      post: {
        tags: ['Users'],
        summary: 'Create a user',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateUserInput' },
            },
          },
        },
        responses: { '201': { description: 'User created' } },
      },
    },
    '/api/v1/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get a user by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'User returned' } },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update a user',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateUserInput' },
            },
          },
        },
        responses: { '200': { description: 'User updated' } },
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete a user',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '204': { description: 'User deleted' } },
      },
    },
    '/api/v1/groups': {
      get: {
        tags: ['Groups'],
        summary: 'List groups',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Groups returned' } },
      },
      post: {
        tags: ['Groups'],
        summary: 'Create a group',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/GroupInput' },
            },
          },
        },
        responses: { '201': { description: 'Group created' } },
      },
    },
    '/api/v1/groups/{id}': {
      get: {
        tags: ['Groups'],
        summary: 'Get a group by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Group returned' } },
      },
      patch: {
        tags: ['Groups'],
        summary: 'Update a group',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/GroupInput' },
            },
          },
        },
        responses: { '200': { description: 'Group updated' } },
      },
      delete: {
        tags: ['Groups'],
        summary: 'Delete a group',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '204': { description: 'Group deleted' } },
      },
    },
    '/api/v1/payments': {
      get: {
        tags: ['Payments'],
        summary: 'List payments',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Payments returned' } },
      },
      post: {
        tags: ['Payments'],
        summary: 'Create a payment',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PaymentInput' },
            },
          },
        },
        responses: { '201': { description: 'Payment created' } },
      },
    },
    '/api/v1/payments/{id}': {
      get: {
        tags: ['Payments'],
        summary: 'Get a payment by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Payment returned' } },
      },
      patch: {
        tags: ['Payments'],
        summary: 'Update a payment',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PaymentInput' },
            },
          },
        },
        responses: { '200': { description: 'Payment updated' } },
      },
      delete: {
        tags: ['Payments'],
        summary: 'Delete a payment',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '204': { description: 'Payment deleted' } },
      },
    },
    '/api/v1/payment-groups': {
      get: {
        tags: ['Payment Groups'],
        summary: 'List payment allocations',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Payment allocations returned' } },
      },
      post: {
        tags: ['Payment Groups'],
        summary: 'Create a payment allocation',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PaymentGroupInput' },
            },
          },
        },
        responses: { '201': { description: 'Payment allocation created' } },
      },
    },
    '/api/v1/payment-groups/{id}': {
      get: {
        tags: ['Payment Groups'],
        summary: 'Get a payment allocation by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Payment allocation returned' } },
      },
      patch: {
        tags: ['Payment Groups'],
        summary: 'Update a payment allocation',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PaymentGroupInput' },
            },
          },
        },
        responses: { '200': { description: 'Payment allocation updated' } },
      },
      delete: {
        tags: ['Payment Groups'],
        summary: 'Delete a payment allocation',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '204': { description: 'Payment allocation deleted' } },
      },
    },
    '/api/v1/reports/summary': {
      get: {
        tags: ['Reports'],
        summary: 'Get the reporting summary for charts and exports',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'year', in: 'query', schema: { type: 'integer' } },
          { name: 'month', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          '200': {
            description: 'Report summary returned',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ReportSummary' },
              },
            },
          },
        },
      },
    },
    '/api/v1/reports/export/{format}': {
      get: {
        tags: ['Reports'],
        summary: 'Export reports in CSV, Excel, or PDF format',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'format', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'year', in: 'query', schema: { type: 'integer' } },
          { name: 'month', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          '200': {
            description: 'Export file returned',
          },
        },
      },
    },
  },
} as const
