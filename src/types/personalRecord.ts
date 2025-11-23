export interface ExercisePersonalRecord {
    id: string;
    user_id: string;
    exercise_id: string;
    max_weight: number;
    reps_at_max: number;
    created_at?: string;
    updated_at?: string;
}
