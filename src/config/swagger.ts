import swaggerJSDoc from 'swagger-jsdoc'
import path from 'path'

export const swaggerOptions = {
  definition: {
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
  },
  apis: [
    path.join(__dirname, '../routes/health.ts'),
    path.join(__dirname, '../routes/auth.ts'),
    path.join(__dirname, '../routes/workouts.ts'),
  ],
}

export const specs = swaggerJSDoc(swaggerOptions)