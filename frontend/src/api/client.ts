import type {
  CompletedPatient,
  Patient,
  Purpose,
  RoleDefinition,
  Stage,
  StageSummaryResponse,
  UploadPatientsResponse,
  User,
  WorkflowLog,
} from '../types/domain';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8012/api';
const TOKEN_KEY = 'rt_access_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getToken();

  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    let message = 'Error inesperado';
    try {
      const data = await response.json();
      message = data.detail ?? message;
    } catch {
      message = response.statusText;
    }
    throw new Error(Array.isArray(message) ? JSON.stringify(message) : message);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const authApi = {
  async login(username: string, password: string): Promise<{ access_token: string; user: User }> {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },
  async me(): Promise<User> {
    return request('/auth/me');
  },
  async updateMe(payload: { full_name: string; username: string; password?: string }): Promise<User> {
    return request('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};

export const usersApi = {
  list(): Promise<User[]> {
    return request('/users');
  },
  create(payload: {
    full_name: string;
    username: string;
    password: string;
    role: User['role'];
    is_active: boolean;
  }): Promise<User> {
    return request('/users', { method: 'POST', body: JSON.stringify(payload) });
  },
  update(id: number, payload: Partial<Pick<User, 'full_name' | 'role' | 'is_active'>>): Promise<User> {
    return request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
  },
  changePassword(id: number, password: string): Promise<User> {
    return request(`/users/${id}/password`, { method: 'PATCH', body: JSON.stringify({ password }) });
  },
  deactivate(id: number): Promise<void> {
    return request(`/users/${id}`, { method: 'DELETE' });
  },
};

export const rolesApi = {
  list(): Promise<RoleDefinition[]> {
    return request('/roles');
  },
  create(payload: { name: string; processable_stages: Stage[] }): Promise<RoleDefinition> {
    return request('/roles', { method: 'POST', body: JSON.stringify(payload) });
  },
};

export const patientsApi = {
  list(q?: string, stage?: string, includeAll = false): Promise<Patient[]> {
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    if (stage) params.append('stage', stage);
    if (includeAll) params.append('include_all', 'true');
    const queryString = params.toString();
    return request(`/patients${queryString ? '?' + queryString : ''}`);
  },
  create(payload: Omit<Patient, 'id' | 'created_at' | 'current_stage' | 'root_patient_id' | 'ficha_number' | 'ficha_label' | 'ficha_count' | 'is_priority' | 'created_by_user_id' | 'latest_purpose' | 'logs_count'>): Promise<Patient> {
    return request('/patients', { method: 'POST', body: JSON.stringify(payload) });
  },
  createFicha(id: number, currentStage: Stage): Promise<Patient> {
    return request(`/patients/${id}/fichas`, {
      method: 'POST',
      body: JSON.stringify({ current_stage: currentStage }),
    });
  },
  updatePriority(id: number, isPriority: boolean): Promise<Patient> {
    return request(`/patients/${id}/priority`, {
      method: 'PATCH',
      body: JSON.stringify({ is_priority: isPriority }),
    });
  },
  logs(id: number): Promise<WorkflowLog[]> {
    return request(`/patients/${id}/logs`);
  },
  uploadTxt(file: File): Promise<UploadPatientsResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return request('/patients/upload-txt', { method: 'POST', body: formData });
  },
};

export const workflowApi = {
  summary(): Promise<StageSummaryResponse> {
    return request('/workflow/summary');
  },
  completed(): Promise<CompletedPatient[]> {
    return request('/workflow/completed');
  },
  reopenPatient(id: number): Promise<Patient> {
    return request(`/workflow/patients/${id}/reopen`, { method: 'POST' });
  },
  processPatient(id: number, purpose: Purpose, notes?: string): Promise<{ patient: Patient; log: WorkflowLog }> {
    return request(`/workflow/patients/${id}/process`, {
      method: 'POST',
      body: JSON.stringify({ purpose, notes }),
    });
  },
};
