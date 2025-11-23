export interface WorkoutTemplate {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    created_at?: string;
    template_exercises?: TemplateExercise[];
}

export interface TemplateExercise {
    id: string;
    template_id: string;
    exercise_id: string;
    sets: number;
    reps: number;
    weight: number;
    rest_seconds?: number;
    notes?: string;
    order_index: number;
    exercise?: {
        name: string;
        muscle_group: string;
    };
}

export interface CreateWorkoutTemplateRequest {
    name: string;
    description?: string;
    exercises: {
        exercise_id: string;
        sets: number;
        reps: number;
        weight: number;
        rest_seconds?: number;
        notes?: string;
        order_index: number;
    }[];
}
