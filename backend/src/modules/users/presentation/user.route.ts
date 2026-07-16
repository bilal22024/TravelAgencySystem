import { Router } from 'express'
import { authenticate } from '../../../middlewares/authenticate.js'
import { requireRole } from '../../../middlewares/require-role.js'
import {
  createUserController,
  deleteUserController,
  getUserController,
  listUsersController,
  updateUserController,
} from './user.controller.js'

export const userRouter = Router()

userRouter.use(authenticate)

userRouter.get('/', listUsersController)
userRouter.get('/:id', getUserController)
userRouter.post(
  '/',
  requireRole(['SUPER_ADMIN', 'AGENCY_ADMIN']),
  createUserController,
)
userRouter.patch(
  '/:id',
  requireRole(['SUPER_ADMIN', 'AGENCY_ADMIN']),
  updateUserController,
)
userRouter.delete(
  '/:id',
  requireRole(['SUPER_ADMIN', 'AGENCY_ADMIN']),
  deleteUserController,
)
