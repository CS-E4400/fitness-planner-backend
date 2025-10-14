import { Workout } from './workout'

export interface Program {
  id: string
  user_id: string
  name: string
  goal?: string
  created_at: string
}

export interface CreateProgramRequest {
  name: string
  goal?: string
}

export interface UpdateProgramRequest extends Partial<CreateProgramRequest> {
  id: string
}
