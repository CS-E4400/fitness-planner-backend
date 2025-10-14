export interface Exercise {
  id: string
  name: string
  muscle_group: string
}

export interface CreateExerciseRequest {
  name: string
  muscle_group: string
}

export interface UpdateExerciseRequest extends Partial<CreateExerciseRequest> {
  id: string
}
