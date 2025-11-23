import { Hono } from "hono";
import { createSupabaseClient } from "../config/supabase";
import { authMiddleware } from "../middleware/auth";
import { ApiError } from "../types";
import { withSwagger, createErrorSpec } from "../utils/route-wrapper";

const router = new Hono();

const prSchema = {
    type: 'object',
    properties: {
        id: { type: 'string' },
        user_id: { type: 'string' },
        exercise_id: { type: 'string' },
        max_weight: { type: 'number' },
        reps_at_max: { type: 'integer' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        exercise: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                muscle_group: { type: 'string' }
            }
        }
    }
};

router.get("/", authMiddleware, withSwagger('/api/personal-records', 'GET', {
    summary: 'Get user personal records',
    security: [{ bearerAuth: [] }],
    parameters: [
        { name: 'exerciseIds', in: 'query', schema: { type: 'string' }, description: 'Comma-separated list of exercise IDs' }
    ],
    responses: {
        200: {
            description: 'List of personal records',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            data: {
                                type: 'array',
                                items: prSchema
                            }
                        }
                    }
                }
            }
        },
        500: createErrorSpec('PRS_FETCH_FAILED', 'Unable to load personal records')
    }
})(async (c): Promise<Response> => {
    const user = (c as any).get("user");
    const authHeader = c.req.header("Authorization");
    const token = authHeader!.split(" ")[1];
    const exerciseIdsParam = c.req.query('exerciseIds');

    const supabase = createSupabaseClient(token);

    let query = supabase
        .from("exercise_personal_records")
        .select(`
      *,
      exercise:exercises (
        id,
        name,
        muscle_group
      )
    `)
        .eq("user_id", user.id);

    if (exerciseIdsParam) {
        const exerciseIds = exerciseIdsParam.split(',');
        query = query.in('exercise_id', exerciseIds);
    }

    const { data, error } = await query;

    if (error) {
        console.error("❌ Error fetching PRs:", error);
        const apiError: ApiError = {
            code: 'PRS_FETCH_FAILED',
            message: 'Unable to load personal records',
            details: error.message
        };
        return c.json({ error: apiError }, 500);
    }

    return c.json({ data });
}));

export default router;
