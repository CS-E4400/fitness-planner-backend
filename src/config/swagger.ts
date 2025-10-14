import { getCollectedSwaggerSpecs, validateSwaggerCoverage } from '../utils/route-wrapper'

// Import route modules to ensure swagger specs are registered
import '../routes/health'
import '../routes/auth'
import '../routes/workouts'

// Validate swagger coverage on module load
const routeSpecs = validateSwaggerCoverage()

// Convert collected specs to OpenAPI paths format
const paths: Record<string, any> = {}
for (const [routeKey, spec] of Object.entries(routeSpecs)) {
  const [path, method] = routeKey.split(':')
  if (!paths[path]) paths[path] = {}
  paths[path][method] = spec
}

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
  paths
}