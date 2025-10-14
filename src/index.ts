import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { swaggerUI } from '@hono/swagger-ui'
import { env } from './config/env'
import { specs } from './config/swagger'
import healthRoutes from './routes/health'
import authRoutes from './routes/auth'
import workoutRoutes from './routes/workouts'

const app = new Hono()

// 🧱 CORS setup
app.use('/*', cors({
  origin: env.frontendUrl,
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}))

// 📋 Mount route modules
app.route('/', healthRoutes)
app.route('/auth', authRoutes)
app.route('/api/workouts', workoutRoutes)

// 📖 Swagger routes
app.get('/swagger.json', (c) => c.json(specs))
app.get('/docs', swaggerUI({ url: '/swagger.json' }))

// 🚀 Export for Bun
export default {
  port: env.port,
  fetch: app.fetch,
}
