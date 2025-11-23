import { Hono } from "hono";
import { createSupabaseClient } from "../config/supabase";
import { authMiddleware } from "../middleware/auth";
import { ApiError } from "../types";
import { withSwagger, createErrorSpec } from "../utils/route-wrapper";

const router = new Hono();

const foodSchema = {
    type: 'object',
    properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        brand: { type: 'string' },
        serving_size: { type: 'number' },
        serving_unit: { type: 'string' },
        calories: { type: 'number' },
        protein: { type: 'number' },
        carbs: { type: 'number' },
        fat: { type: 'number' },
        category: { type: 'string' },
        measurement_type: { type: 'string', enum: ['weight', 'unit'] },
        created_at: { type: 'string', format: 'date-time' }
    }
};

router.get("/", authMiddleware, withSwagger('/api/foods', 'GET', {
    summary: 'Get all foods',
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: 'List of foods',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            data: {
                                type: 'array',
                                items: foodSchema
                            }
                        }
                    }
                }
            }
        },
        401: createErrorSpec('MISSING_AUTH_HEADER', 'Please sign in to access this feature'),
        500: createErrorSpec('FOODS_FETCH_FAILED', 'Unable to load foods')
    }
})(async (c): Promise<Response> => {
    const authHeader = c.req.header("Authorization");
    const token = authHeader!.split(" ")[1];

    const supabase = createSupabaseClient(token);

    const { data, error } = await supabase
        .from("foods")
        .select("*")
        .order('name', { ascending: true });

    if (error) {
        console.error("❌ Error fetching foods:", error);
        const apiError: ApiError = {
            code: 'FOODS_FETCH_FAILED',
            message: 'Unable to load foods',
            details: error.message
        };
        return c.json({ error: apiError }, 500);
    }

    return c.json({ data });
}));

export default router;
