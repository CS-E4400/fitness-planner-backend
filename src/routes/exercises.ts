import { Hono } from "hono";
import { createSupabaseClient } from "../config/supabase";
import { authMiddleware } from "../middleware/auth";
import { ApiError } from "../types";
import { withSwagger, createErrorSpec } from "../utils/route-wrapper";

const router = new Hono();

const exerciseSchema = {
    type: 'object',
    properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        muscle_group: { type: 'string' },
        description: { type: 'string' },
        video_url: { type: 'string' },
        created_at: { type: 'string', format: 'date-time' }
    }
};

router.get("/", authMiddleware, withSwagger('/api/exercises', 'GET', {
    summary: 'Get all exercises',
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: 'List of exercises',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            data: {
                                type: 'array',
                                items: exerciseSchema
                            }
                        }
                    }
                }
            }
        },
        401: createErrorSpec('MISSING_AUTH_HEADER', 'Please sign in to access this feature'),
        500: createErrorSpec('EXERCISES_FETCH_FAILED', 'Unable to load exercises')
    }
})(async (c): Promise<Response> => {
    const authHeader = c.req.header("Authorization");
    const token = authHeader!.split(" ")[1];

    const supabase = createSupabaseClient(token);

    const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .order('name', { ascending: true });

    if (error) {
        console.error("❌ Error fetching exercises:", error);
        const apiError: ApiError = {
            code: 'EXERCISES_FETCH_FAILED',
            message: 'Unable to load exercises',
            details: error.message
        };
        return c.json({ error: apiError }, 500);
    }

    return c.json({ data });
}));

export default router;
