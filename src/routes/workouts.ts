import { Hono } from "hono";
import { createSupabaseClient } from "../config/supabase";
import { authMiddleware } from "../middleware/auth";
import { CreateWorkoutRequest, ApiError } from "../types";

const router = new Hono();

/**
 * @swagger
 * /api/workouts:
 *   get:
 *     summary: Get user workouts
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user workouts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       program_id:
 *                         type: string
 *                       user_id:
 *                         type: string
 *                       date:
 *                         type: string
 *                         format: date
 *                       duration_min:
 *                         type: integer
 *                       created_at:
 *                         type: string
 *                         format: date-time
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
 *                       example: "WORKOUTS_FETCH_FAILED"
 *                     message:
 *                       type: string
 *                       example: "Unable to load your workouts right now. Please try again later"
 *                     details:
 *                       type: string
 */
router.get("/", authMiddleware, async (c): Promise<Response> => {
  const user = (c as any).get("user") as {
    id: string;
    email?: string;
    role?: string;
  };
  const authHeader = c.req.header("Authorization");
  const token = authHeader!.split(" ")[1]; // We know this exists because middleware passed

  const supabase = createSupabaseClient(token);

  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .eq("user_id", user.id);

  if (error) {
    console.error("❌ Error fetching workouts:", error);
    const apiError: ApiError = {
      code: 'WORKOUTS_FETCH_FAILED',
      message: 'Unable to load your workouts right now. Please try again later',
      details: error.message
    };
    return c.json({ error: apiError }, 500);
  }

  return c.json({ data });
});

/**
 * @swagger
 * /api/workouts:
 *   post:
 *     summary: Create a new workout
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - program_id
 *             properties:
 *               program_id:
 *                 type: string
 *                 description: ID of the workout program
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Date of the workout (defaults to today)
 *               duration_min:
 *                 type: integer
 *                 description: Duration in minutes
 *             example:
 *               program_id: "123e4567-e89b-12d3-a456-426614174000"
 *               date: "2025-10-14"
 *               duration_min: 60
 *     responses:
 *       200:
 *         description: Workout created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     program_id:
 *                       type: string
 *                     user_id:
 *                       type: string
 *                     date:
 *                       type: string
 *                       format: date
 *                     duration_min:
 *                       type: integer
 *                     created_at:
 *                       type: string
 *                       format: date-time
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
 *                       example: "WORKOUT_CREATE_FAILED"
 *                     message:
 *                       type: string
 *                       example: "Unable to save your workout. Please check your data and try again"
 *                     details:
 *                       type: string
 */
router.post("/", authMiddleware, async (c): Promise<Response> => {
  const user = (c as any).get("user") as {
    id: string;
    email?: string;
    role?: string;
  };
  const body: CreateWorkoutRequest = await c.req.json();
  const authHeader = c.req.header("Authorization");
  const token = authHeader!.split(" ")[1]; // We know this exists because middleware passed

  const supabase = createSupabaseClient(token);

  const workoutData = {
    ...body,
    user_id: user.id,
  };

  const { data, error } = await supabase
    .from("workouts")
    .insert(workoutData)
    .select();

  if (error) {
    console.error("❌ Supabase insert error:", error);
    console.log("🧩 Sent data:", workoutData);
    const apiError: ApiError = {
      code: 'WORKOUT_CREATE_FAILED',
      message: 'Unable to save your workout. Please check your data and try again',
      details: error.message
    };
    return c.json({ error: apiError }, 500);
  }

  console.log("✅ Workout created for user:", user.email);
  return c.json({ data: data[0] });
});

export default router;
