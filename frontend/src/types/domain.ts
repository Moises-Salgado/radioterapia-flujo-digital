export type Role = 'Admin' | 'Físico Médico' | 'Tecnólogo Médico' | 'Enfermero/a';

export type Stage =
  | 'Dosimetría'
  | 'Física Médica'
  | 'Impresión'
  | 'Enfermería'
  | 'Citación'
  | 'Finalizado';

export type Purpose =
  | 'Medición'
  | 'Física Médica'
  | 'Planificación'
  | 'Replanificación'
  | 'Calcular Dosis'
  | 'Imprimir'
  | 'Devolver a Física Médica'
  | 'Recepción';

export interface User {
  id: number;
  full_name: string;
  username: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  processable_stages: Stage[];
}

export interface Patient {
  id: number;
  rut: string;
  full_name: string;
  sex: string;
  age: number;
  phone?: string | null;
  trusted_contact_phone?: string | null;
  street?: string | null;
  commune?: string | null;
  region?: string | null;
  current_stage: Stage;
  root_patient_id: number;
  ficha_number: number;
  ficha_label: string;
  ficha_count: number;
  is_priority: boolean;
  created_by_user_id?: number | null;
  created_at: string;
  latest_purpose?: Purpose | null;
  logs_count: number;
}

export interface WorkflowLog {
  id: number;
  patient_id: number;
  processed_stage: Stage;
  user_id: number;
  user?: User | null;
  purpose: Purpose;
  fecha_hora: string;
  notes?: string | null;
}

export interface StageSummaryItem {
  stage: Stage;
  count: number;
}

export interface StageSummaryResponse {
  stages: StageSummaryItem[];
}

export interface CompletedPatient {
  patient: Patient;
  finished_at: string;
}

export interface UploadPatientsResponse {
  inserted: number;
  skipped: number;
  errors: string[];
}
