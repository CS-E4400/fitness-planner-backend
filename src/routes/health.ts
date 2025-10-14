import { Hono } from 'hono'
import { withSwagger } from '../utils/route-wrapper'

const router = new Hono()

router.get('/', withSwagger('/', 'GET', {
  summary: 'Health check',
  responses: {
    200: {
      description: 'Server is running',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' }
            }
          }
        }
      }
    }
  }
})((c) => c.json({ message: '✅ Fitness Planner Backend is running!' })))

export default router