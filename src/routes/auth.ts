import { Hono } from 'hono'
import { supabasePublic } from '../config/supabase'
import { env } from '../config/env'
import { authMiddleware } from '../middleware/auth'
import { ApiError } from '../types'
import { withSwagger, createErrorSpec } from '../utils/route-wrapper'

const router = new Hono()

router.get('/google', withSwagger('/auth/google', 'GET', {
  summary: 'Initiate Google OAuth login',
  description: 'Redirects to Google OAuth consent screen for authentication',
  responses: {
    302: { description: 'Redirect to Google OAuth' },
    400: createErrorSpec('OAUTH_INIT_FAILED', 'Unable to start Google sign-in. Please try again'),
    500: createErrorSpec('OAUTH_ERROR', 'Sign-in service is temporarily unavailable. Please try again later')
  }
})(async (c): Promise<Response> => {
  try {
    const { data, error } = await supabasePublic.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${env.frontendUrl}/auth/callback` }
    })

    if (error) {
      const apiError: ApiError = {
        code: 'OAUTH_INIT_FAILED',
        message: 'Unable to start Google sign-in. Please try again',
        details: error.message
      };
      return c.json({ error: apiError }, 400);
    }
    return c.redirect(data.url)
  } catch (error) {
    const apiError: ApiError = {
      code: 'OAUTH_ERROR',
      message: 'Sign-in service is temporarily unavailable. Please try again later',
      details: 'Failed to initiate Google OAuth'
    };
    return c.json({ error: apiError }, 500);
  }
}))

router.get('/session', authMiddleware, withSwagger('/auth/session', 'GET', {
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
    401: createErrorSpec('MISSING_AUTH_HEADER', 'Please sign in to access this feature')
  }
})(async (c): Promise<Response> => {
  try {
    const user = (c as any).get('user') as { id: string; email?: string; role?: string }
    return c.json({ user, session: null })
  } catch {
    const apiError: ApiError = {
      code: 'SESSION_ERROR',
      message: 'Unable to retrieve your session information',
      details: 'Failed to get session'
    };
    return c.json({ user: null, session: null, error: apiError });
  }
}))

export default router