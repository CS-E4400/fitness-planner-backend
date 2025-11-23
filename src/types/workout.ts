// types/workout.ts

export interface WorkoutExercise {
  id: string
  name: string
  sets: number
  reps: number
  weight_kg?: number
  rest_seconds?: number
  notes?: string
}

export interface Workout {
  id: string
  user_id: string
  name: string
  description?: string
  exercises: WorkoutExercise[]
  duration_minutes?: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  created_at: string
  updated_at: string
}

export interface CreateWorkoutRequest {
  name?: string;
  description?: string;
  exercises: any[];
  duration_minutes?: number;
  difficulty?: Workout['difficulty'];
}

export interface UpdateWorkoutRequest extends Partial<CreateWorkoutRequest> {
  id: string
}
