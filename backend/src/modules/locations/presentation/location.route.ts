import { Router } from 'express'
import { authenticate } from '../../../middlewares/authenticate.js'
import { requireRole } from '../../../middlewares/require-role.js'
import {
  createCityController,
  listCitiesController,
  listCountriesController,
} from './location.controller.js'

export const locationRouter = Router()

locationRouter.use(authenticate)

locationRouter.get('/countries', listCountriesController)
locationRouter.get('/cities', listCitiesController)
locationRouter.post('/cities', requireRole(['SUPER_ADMIN']), createCityController)
