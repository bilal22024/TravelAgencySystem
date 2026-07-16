import { Router } from 'express'
import { authenticate } from '../../../middlewares/authenticate.js'
import {
  bootstrapController,
  loginController,
  meController,
} from './auth.controller.js'

export const authRouter = Router()

authRouter.post('/bootstrap', bootstrapController)
authRouter.post('/login', loginController)
authRouter.get('/me', authenticate, meController)
