import { Hono } from 'hono'

const router = new Hono()

router.get('/', (c) => c.json({ message: '✅ Fitness Planner Backend is running!' }))

export const healthSwagger = {
  '/': {
    get: {
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
    }
  }
}

export default router