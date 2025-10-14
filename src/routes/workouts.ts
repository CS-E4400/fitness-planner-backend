import { Hono } from "hono";
import { createSupabaseClient } from "../config/supabase";
import { authMiddleware } from "../middleware/auth";
import { CreateWorkoutRequest, ApiError } from "../types";
import { withSwagger, createErrorSpec } from "../utils/route-wrapper";

const router = new Hono();

router.get("/", authMiddleware, withSwagger('/api/workouts', 'GET', {
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
    401: createErrorSpec('MISSING_AUTH_HEADER', 'Please sign in to access this feature'),
    500: createErrorSpec('WORKOUTS_FETCH_FAILED', 'Unable to load your workouts right now. Please try again later')
  }
})(async (c): Promise<Response> => {
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
}));

router.post("/", authMiddleware, withSwagger('/api/workouts', 'POST', {
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
    401: createErrorSpec('MISSING_AUTH_HEADER', 'Please sign in to access this feature'),
    500: createErrorSpec('WORKOUT_CREATE_FAILED', 'Unable to save your workout. Please check your data and try again')
  }
})(async (c): Promise<Response> => {
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
}));

export default router;
