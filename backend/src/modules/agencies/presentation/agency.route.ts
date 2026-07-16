import { Router } from 'express'
import { authenticate } from '../../../middlewares/authenticate.js'
import { requireRole } from '../../../middlewares/require-role.js'
import {
  createAgencyController,
  deleteAgencyController,
  getAgencyController,
  listAgenciesController,
  updateAgencyController,
} from './agency.controller.js'

export const agencyRouter = Router()

agencyRouter.use(authenticate)

agencyRouter.get('/', listAgenciesController)
agencyRouter.get('/:id', getAgencyController)
agencyRouter.post('/', requireRole(['SUPER_ADMIN']), createAgencyController)
agencyRouter.patch('/:id', requireRole(['SUPER_ADMIN']), updateAgencyController)
agencyRouter.delete('/:id', requireRole(['SUPER_ADMIN']), deleteAgencyController)
