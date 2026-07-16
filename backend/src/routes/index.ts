import { Router } from 'express'
import { agencyRouter } from '../modules/agencies/presentation/agency.route.js'
import { authRouter } from '../modules/auth/presentation/auth.route.js'
import { groupRouter } from '../modules/groups/presentation/group.route.js'
import { healthRouter } from '../modules/health/presentation/health.route.js'
import { paymentGroupRouter } from '../modules/payments/presentation/payment-group.route.js'
import { paymentRouter } from '../modules/payments/presentation/payment.route.js'
import { reportRouter } from '../modules/reports/presentation/report.route.js'
import { userRouter } from '../modules/users/presentation/user.route.js'

export const apiRouter = Router()

apiRouter.use('/v1', healthRouter)
apiRouter.use('/v1/auth', authRouter)
apiRouter.use('/v1/agencies', agencyRouter)
apiRouter.use('/v1/users', userRouter)
apiRouter.use('/v1/groups', groupRouter)
apiRouter.use('/v1/payments', paymentRouter)
apiRouter.use('/v1/payment-groups', paymentGroupRouter)
apiRouter.use('/v1/reports', reportRouter)
