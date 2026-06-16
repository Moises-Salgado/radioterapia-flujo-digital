# Radioterapia Flujo Digital

Plataforma web full-stack para gestionar pacientes y el flujo interno de procesos en un servicio de Radioterapia.

Stack propuesto:

- **Frontend:** React + TypeScript + Vite.
- **Backend:** Python + FastAPI + SQLAlchemy.
- **Base de datos:** SQLite para prueba local. La arquitectura permite migrar a PostgreSQL sin cambiar la lógica principal.
- **Autenticación:** JWT Bearer Token.
- **Roles:** Admin, Físico Médico, Tecnólogo Médico, Enfermero/a.

## Credenciales iniciales

Al iniciar el backend se crea automáticamente un usuario administrador:

- Usuario: `admin`
- Contraseña: `admin123`

En producción debes cambiar esta contraseña inmediatamente, configurar `JWT_SECRET_KEY` en variables de entorno y desactivar los datos de prueba con `ENABLE_DEMO_DATA=false`.

## Estructura general

```txt
radioterapia-flujo-digital/
  backend/
    app/
      api/
      core/
      models/
      schemas/
      services/
      main.py
    requirements.txt
    .env.example
  frontend/
    src/
      api/
      components/
      context/
      pages/
      types/
    package.json
  database/
    schema.sql
  data/
    pacientes_demo.txt
```

## Cómo ejecutar en VSCode

### 1. Backend

Abre una terminal en la carpeta `backend`:

```bash
cd backend
python -m venv .venv
```

En Windows PowerShell:

```bash
.\.venv\Scripts\activate
```

En Linux/macOS:

```bash
source .venv/bin/activate
```

Instala dependencias:

```bash
pip install -r requirements.txt
```

Ejecuta el backend:

```bash
uvicorn app.main:app --reload
```

Variables útiles en `backend/.env`:

```env
JWT_SECRET_KEY=usa-una-clave-segura
ENABLE_DEMO_DATA=false
```

API disponible en:

```txt
http://localhost:8000
```

Documentación automática:

```txt
http://localhost:8000/docs
```

### 2. Frontend

Abre otra terminal en la carpeta `frontend`:

```bash
cd frontend
npm install
npm run dev
```

Variables útiles en `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000/api
VITE_SHOW_DEMO_ACCESS=false
```

Frontend disponible normalmente en:

```txt
http://localhost:5173
```

## Cargar pacientes desde TXT

Puedes usar el archivo incluido:

```txt
data/pacientes_demo.txt
```

Formato esperado por línea:

```txt
RUT,Nombre,Sexo,Edad,Telefono,ContactoConfianza,Calle,Comuna,Region
```

Ejemplo:

```txt
11111111-1,Juan Pérez,M,58,+56911111111,+56922222222,Av. Siempre Viva 123,Concepción,Biobío
```

## Flujo implementado

Orden estricto:

1. Dosimetría
2. Física Médica
3. Impresión
4. Enfermería
5. Citación
6. Finalizado

Permisos por etapa:

| Etapa | Roles permitidos |
|---|---|
| Dosimetría | Físico Médico, Tecnólogo Médico |
| Física Médica | Físico Médico |
| Impresión | Tecnólogo Médico |
| Enfermería | Enfermero/a |
| Citación | Tecnólogo Médico |

Al procesar un paciente, se abre un modal donde el usuario debe seleccionar obligatoriamente el propósito de la ficha:

- Medición
- Planificación
- Replanificación
- Calcular Dosis

El backend registra auditoría en `workflow_logs` con paciente, etapa, usuario, propósito, fecha/hora del servidor y observaciones.

## Notas de producción

Para un ambiente hospitalario real, se recomienda agregar:

- HTTPS obligatorio.
- PostgreSQL administrado o servidor interno respaldado.
- Backups automáticos y pruebas de restauración.
- Integración con directorio institucional, si aplica.
- Políticas de contraseñas y expiración de sesión.
- Logs de acceso y eventos de seguridad.
- Revisión legal/local sobre tratamiento de datos clínicos.
