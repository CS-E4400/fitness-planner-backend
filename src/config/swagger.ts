import swaggerJSDoc from 'swagger-jsdoc'
import path from 'path'

// Manual fallback specification in case JSDoc parsing fails
const manualSpec = {
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
    },
    '/auth/google': {
      get: {
        summary: 'Initiate Google OAuth login',
        description: 'Redirects to Google OAuth consent screen for authentication',
        responses: {
          302: { description: 'Redirect to Google OAuth' },
          400: {
            description: 'OAuth initiation failed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: {
                      type: 'object',
                      properties: {
                        code: { type: 'string', example: 'OAUTH_INIT_FAILED' },
                        message: { type: 'string', example: 'Unable to start Google sign-in. Please try again' },
                        details: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: {
                      type: 'object',
                      properties: {
                        code: { type: 'string', example: 'OAUTH_ERROR' },
                        message: { type: 'string', example: 'Sign-in service is temporarily unavailable. Please try again later' },
                        details: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/auth/session': {
      get: {
        summary: 'Get current user session',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Current user session information',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        role: { type: 'string' }
                      }
                    },
                    session: { type: 'object', nullable: true }
                  }
                }
              }
            }
          },
          401: {
            description: 'Authentication required',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: {
                      type: 'object',
                      properties: {
                        code: { type: 'string', example: 'MISSING_AUTH_HEADER' },
                        message: { type: 'string', example: 'Please sign in to access this feature' },
                        details: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/workouts': {
      get: {
        summary: 'Get user workouts',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'List of user workouts',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          program_id: { type: 'string' },
                          user_id: { type: 'string' },
                          date: { type: 'string', format: 'date' },
                          duration_min: { type: 'integer' },
                          created_at: { type: 'string', format: 'date-time' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          401: {
            description: 'Authentication required',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: {
                      type: 'object',
                      properties: {
                        code: { type: 'string', example: 'MISSING_AUTH_HEADER' },
                        message: { type: 'string', example: 'Please sign in to access this feature' },
                        details: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: {
                      type: 'object',
                      properties: {
                        code: { type: 'string', example: 'WORKOUTS_FETCH_FAILED' },
                        message: { type: 'string', example: 'Unable to load your workouts right now. Please try again later' },
                        details: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        summary: 'Create a new workout',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['program_id'],
                properties: {
                  program_id: { type: 'string', description: 'ID of the workout program' },
                  date: { type: 'string', format: 'date', description: 'Date of the workout (defaults to today)' },
                  duration_min: { type: 'integer', description: 'Duration in minutes' }
                }
              },
              example: {
                program_id: '123e4567-e89b-12d3-a456-426614174000',
                date: '2025-10-14',
                duration_min: 60
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Workout created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        program_id: { type: 'string' },
                        user_id: { type: 'string' },
                        date: { type: 'string', format: 'date' },
                        duration_min: { type: 'integer' },
                        created_at: { type: 'string', format: 'date-time' }
                      }
                    }
                  }
                }
              }
            }
          },
          401: {
            description: 'Authentication required',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: {
                      type: 'object',
                      properties: {
                        code: { type: 'string', example: 'MISSING_AUTH_HEADER' },
                        message: { type: 'string', example: 'Please sign in to access this feature' },
                        details: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: {
                      type: 'object',
                      properties: {
                        code: { type: 'string', example: 'WORKOUT_CREATE_FAILED' },
                        message: { type: 'string', example: 'Unable to save your workout. Please check your data and try again' },
                        details: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

let specs: any

try {
  const swaggerOptions = {
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
      path.join(process.cwd(), 'src/routes/health.ts'),
      path.join(process.cwd(), 'src/routes/auth.ts'),
      path.join(process.cwd(), 'src/routes/workouts.ts')
    ],
  }

  specs = swaggerJSDoc(swaggerOptions)

  // Check if JSDoc parsing worked (should have paths)
  if (!specs.paths || Object.keys(specs.paths).length === 0) {
    console.warn('JSDoc parsing failed, falling back to manual specification')
    specs = manualSpec
  }
} catch (error) {
  console.warn('Error parsing JSDoc, falling back to manual specification:', error)
  specs = manualSpec
}

export { specs }