import { createMiddleware } from 'hono/factory'
import jwt from 'jsonwebtoken'
import { ApiError } from '../types'

const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET

if (!supabaseJwtSecret) {
  console.error('SUPABASE_JWT_SECRET environment variable is required')
  process.exit(1)
}

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error: ApiError = {
      code: 'MISSING_AUTH_HEADER',
      message: 'Please sign in to access this feature',
      details: 'Authorization header with Bearer token is required'
    }
    return c.json({ error }, 401)
  }

  const token = authHeader.substring(7) // Remove 'Bearer ' prefix

  try {
    // Verify the JWT token using Supabase's JWT secret
    const payload = jwt.verify(token, supabaseJwtSecret) as any

    // Add user info to context
    c.set('user', {
      id: payload.sub,
      email: payload.email,
      role: payload.role
    })

    await next()
  } catch (error) {
    const apiError: ApiError = {
      code: 'INVALID_TOKEN',
      message: 'Your session has expired. Please sign in again',
      details: 'Invalid or expired JWT token'
    }
    return c.json({ error: apiError }, 401)
  }
})

// Optional auth middleware that doesn't fail if no token is provided
export const optionalAuthMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization')

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)

    try {
      const payload = jwt.verify(token, supabaseJwtSecret) as any
      c.set('user', {
        id: payload.sub,
        email: payload.email,
        role: payload.role
      })
    } catch (error) {
      // Silently ignore invalid tokens for optional auth
    }
  }

  await next()
})