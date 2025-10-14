// Type for swagger spec
export type SwaggerSpec = {
  summary?: string
  description?: string
  security?: any[]
  requestBody?: any
  responses: Record<string, any>
}

// Type for route handler
export type RouteHandler = (c: any) => Promise<Response> | Response

// Store for collecting swagger specs by path
const swaggerRegistry: Record<string, SwaggerSpec> = {}

// Wrapper function that ensures swagger documentation is provided
export function withSwagger(path: string, method: string, swaggerSpec: SwaggerSpec) {
  return function(handler: RouteHandler) {
    // Register the swagger spec
    swaggerRegistry[`${path}:${method.toLowerCase()}`] = swaggerSpec

    // Return the handler unchanged
    return handler
  }
}

// Get all collected swagger specs
export function getCollectedSwaggerSpecs(): Record<string, SwaggerSpec> {
  return { ...swaggerRegistry }
}

// Validate that swagger specs exist for routes (call this at startup)
export function validateSwaggerCoverage() {
  const specs = getCollectedSwaggerSpecs()
  console.log(`📋 Swagger validation: Found ${Object.keys(specs).length} documented endpoints`)

  // In development, warn if no specs are found
  if (Object.keys(specs).length === 0) {
    console.warn('⚠️  No swagger specs found! Make sure to use withSwagger() wrapper on all routes.')
  }

  return specs
}

// Helper to create standardized error responses
export function createErrorSpec(code: string, message: string) {
  return {
    description: 'Error response',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: code },
                message: { type: 'string', example: message },
                details: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }
}