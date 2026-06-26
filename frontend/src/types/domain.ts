export type Role = string;

export type Stage =
  | 'Ingreso'
  | 'Simulaci\u00f3n'
  | 'Dosimetr\u00eda'
  | 'F\u00edsica M\u00e9dica'
  | 'Impresi\u00f3n'
  | 'Enfermer\u00eda'
  | 'Citaci\u00f3n'
  | 'Inicio/Termino de tratamiento'
  | 'Finalizado';

export type Purpose =
  | 'Simulaci\u00f3n'
  | 'Dosimetr\u00eda'
  | 'Medici\u00f3n'
  | 'F\u00edsica M\u00e9dica'
  | 'Planificaci\u00f3n'
  | 'Replanificaci\u00f3n'
  | 'Calcular Dosis'
  | 'Imprimir'
  | 'Devolver a F\u00edsica M\u00e9dica'
  | 'Citar'
  | 'Recepci\u00f3n'
  | 'Iniciar/terminar tratamiento'
  | 'Fallecido / no disponible';

export interface User {
  id: number;
  full_name: string;
  username: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  processable_stages: Stage[];
}

export interface RoleDefinition {
  id: number;
  name: Role;
  processable_stages: Stage[];
  is_system: boolean;
  created_at: string;
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
