import { Router } from 'express'
import { authenticate } from '../../../middlewares/authenticate.js'
import {
  bulkCreateGroupsController,
  createGroupController,
  deleteGroupController,
  getGroupController,
  listGroupsController,
  updateGroupController,
} from './group.controller.js'

export const groupRouter = Router()

groupRouter.use(authenticate)

groupRouter.get('/', listGroupsController)
groupRouter.get('/:id', getGroupController)
groupRouter.post('/bulk', bulkCreateGroupsController)
groupRouter.post('/', createGroupController)
groupRouter.patch('/:id', updateGroupController)
groupRouter.delete('/:id', deleteGroupController)
