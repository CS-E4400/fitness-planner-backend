import { Hono } from 'hono'
import { supabasePublic } from '../config/supabase'
import { env } from '../config/env'
import { authMiddleware } from '../middleware/auth'
import { ApiError } from '../types'

const router = new Hono()

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Initiate Google OAuth login
 *     description: Redirects to Google OAuth consent screen for authentication
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth
 *       400:
 *         description: OAuth initiation failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "OAUTH_INIT_FAILED"
 *                     message:
 *                       type: string
 *                       example: "Unable to start Google sign-in. Please try again"
 *                     details:
 *                       type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "OAUTH_ERROR"
 *                     message:
 *                       type: string
 *                       example: "Sign-in service is temporarily unavailable. Please try again later"
 *                     details:
 *                       type: string
 */
router.get('/google', async (c): Promise<Response> => {
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
})

/**
 * @swagger
 * /auth/session:
 *   get:
 *     summary: Get current user session
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user session information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                 session:
 *                   type: object
 *                   nullable: true
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "MISSING_AUTH_HEADER"
 *                     message:
 *                       type: string
 *                       example: "Please sign in to access this feature"
 *                     details:
 *                       type: string
 */
router.get('/session', authMiddleware, async (c): Promise<Response> => {
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
})

export default router