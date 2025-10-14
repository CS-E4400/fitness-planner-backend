// types/workout.ts

import { WorkoutSet } from './workoutSet'

export interface Workout {
  id: string
  program_id: string
  user_id: string
  date: string
  duration_min?: number
  created_at: string
}

export interface CreateWorkoutRequest {
  program_id: string
  date?: string
  duration_min?: number
}

export interface UpdateWorkoutRequest extends Partial<CreateWorkoutRequest> {
  id: string
}
