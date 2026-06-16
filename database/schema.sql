-- Script de referencia para SQLite.
-- La app crea estas tablas automáticamente con SQLAlchemy al iniciar.

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name VARCHAR(150) NOT NULL,
  username VARCHAR(80) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_users_username ON users(username);

CREATE TABLE IF NOT EXISTS patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rut VARCHAR(30) NOT NULL UNIQUE,
  full_name VARCHAR(180) NOT NULL,
  sex VARCHAR(20) NOT NULL,
  age INTEGER NOT NULL,
  phone VARCHAR(50),
  trusted_contact_phone VARCHAR(50),
  street VARCHAR(180),
  commune VARCHAR(100),
  region VARCHAR(100),
  current_stage VARCHAR(50) NOT NULL DEFAULT 'Dosimetría',
  created_by_user_id INTEGER,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(created_by_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS ix_patients_rut ON patients(rut);
CREATE INDEX IF NOT EXISTS ix_patients_full_name ON patients(full_name);
CREATE INDEX IF NOT EXISTS ix_patients_current_stage ON patients(current_stage);

CREATE TABLE IF NOT EXISTS workflow_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  processed_stage VARCHAR(50) NOT NULL,
  user_id INTEGER NOT NULL,
  purpose VARCHAR(50) NOT NULL,
  fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  FOREIGN KEY(patient_id) REFERENCES patients(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS ix_workflow_logs_patient_id ON workflow_logs(patient_id);
CREATE INDEX IF NOT EXISTS ix_workflow_logs_user_id ON workflow_logs(user_id);
CREATE INDEX IF NOT EXISTS ix_workflow_logs_fecha_hora ON workflow_logs(fecha_hora);
