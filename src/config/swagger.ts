import { healthSwagger } from '../routes/health'
import { authSwagger } from '../routes/auth'
import { workoutsSwagger } from '../routes/workouts'

export const specs = {
  openapi: '3.0.0',
  info: {
    title: 'Fitness Planner API',
    version: '1.0.0',
    description: 'API for Fitness Planner Backend',
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  paths: {
    ...healthSwagger,
    ...authSwagger,
    ...workoutsSwagger,
  }
}