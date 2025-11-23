import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { swaggerUI } from '@hono/swagger-ui'
import { env } from './config/env'
import { specs } from './config/swagger'
import healthRoutes from './routes/health'
import authRoutes from './routes/auth'
import workoutRoutes from './routes/workouts'
import mealRoutes from './routes/meals'
import personalRecordRoutes from './routes/personal-records'
import bodyWeightRoutes from './routes/body-weight'
import workoutTemplateRoutes from './routes/workout-templates'
import exerciseRoutes from './routes/exercises'
import foodRoutes from './routes/foods'
import mealTemplateRoutes from './routes/meal-templates'
import userRoutes from './routes/users'

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
app.route("/api/meals", mealRoutes);
app.route("/api/personal-records", personalRecordRoutes);
app.route("/api/body-weight", bodyWeightRoutes);
app.route("/api/workout-templates", workoutTemplateRoutes);
app.route("/api/exercises", exerciseRoutes);
app.route("/api/foods", foodRoutes);
app.route("/api/meal-templates", mealTemplateRoutes);
app.route("/api/users", userRoutes);

// 📖 Swagger routes
app.get('/swagger.json', (c) => c.json(specs))
app.get('/docs', swaggerUI({ url: '/swagger.json' }))

// 🚀 Export for Bun
export default {
  port: env.port,
  fetch: app.fetch,
}
