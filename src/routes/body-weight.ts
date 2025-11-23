import { Hono } from "hono";
import { createSupabaseClient } from "../config/supabase";
import { authMiddleware } from "../middleware/auth";
import { CreateBodyWeightRequest, ApiError } from "../types";
import { withSwagger, createErrorSpec } from "../utils/route-wrapper";

const router = new Hono();

const bodyWeightSchema = {
    type: 'object',
    properties: {
        id: { type: 'string' },
        user_id: { type: 'string' },
        weight: { type: 'number' },
        date: { type: 'string', format: 'date' },
        created_at: { type: 'string', format: 'date-time' }
    }
};

router.get("/", authMiddleware, withSwagger('/api/body-weight', 'GET', {
    summary: 'Get user body weight records',
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: 'List of body weight records',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            data: {
                                type: 'array',
                                items: bodyWeightSchema
                            }
                        }
                    }
                }
            }
        },
        401: createErrorSpec('MISSING_AUTH_HEADER', 'Please sign in to access this feature'),
        500: createErrorSpec('BODY_WEIGHT_FETCH_FAILED', 'Unable to load your weight records')
    }
})(async (c): Promise<Response> => {
    const user = (c as any).get("user");
    const authHeader = c.req.header("Authorization");
    const token = authHeader!.split(" ")[1];

    const supabase = createSupabaseClient(token);

    const { data, error } = await supabase
        .from("body_weight")
        .select("id, weight, date")
        .eq("user_id", user.id)
        .order('date', { ascending: true });

    if (error) {
        console.error("❌ Error fetching body weight:", error);
        const apiError: ApiError = {
            code: 'BODY_WEIGHT_FETCH_FAILED',
            message: 'Unable to load your weight records',
            details: error.message
        };
        return c.json({ error: apiError }, 500);
    }

    return c.json({ data });
}));

router.post("/", authMiddleware, withSwagger('/api/body-weight', 'POST', {
    summary: 'Log a new body weight',
    security: [{ bearerAuth: [] }],
    requestBody: {
        required: true,
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    required: ['weight', 'date'],
                    properties: {
                        weight: { type: 'number' },
                        date: { type: 'string', format: 'date' }
                    }
                }
            }
        }
    },
    responses: {
        200: {
            description: 'Body weight logged successfully',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            data: bodyWeightSchema
                        }
                    }
                }
            }
        },
        500: createErrorSpec('BODY_WEIGHT_CREATE_FAILED', 'Unable to save your weight')
    }
})(async (c): Promise<Response> => {
    const user = (c as any).get("user");
    const body: CreateBodyWeightRequest = await c.req.json();
    const authHeader = c.req.header("Authorization");
    const token = authHeader!.split(" ")[1];

    const supabase = createSupabaseClient(token);

    const { data, error } = await supabase
        .from("body_weight")
        .upsert({
            user_id: user.id,
            weight: body.weight,
            date: body.date
        }, { onConflict: 'user_id, date' })
        .select()
        .single();

    if (error) {
        console.error("❌ Error creating body weight:", error);
        return c.json({ error: { code: 'BODY_WEIGHT_CREATE_FAILED', message: error.message } }, 500);
    }

    return c.json({ data });
}));

export default router;
