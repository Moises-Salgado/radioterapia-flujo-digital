import { FormEvent, useEffect, useMemo, useState } from 'react';
import { rolesApi, usersApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Role, RoleDefinition, Stage, User } from '../types/domain';

const STAGES: Stage[] = [
  'Ingreso',
  'Simulación',
  'Dosimetría',
  'Física Médica',
  'Impresión',
  'Enfermería',
  'Citación',
  'Inicio/Termino de tratamiento',
];

const emptyUserForm = {
  full_name: '',
  username: '',
  password: '',
  role: '' as Role,
  is_active: true,
};

const emptyRoleForm = {
  name: '',
  processable_stages: [] as Stage[],
};

export function AdminPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [form, setForm] = useState(emptyUserForm);
  const [roleForm, setRoleForm] = useState(emptyRoleForm);
  const [editing, setEditing] = useState<User | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);

  const defaultRole = useMemo(
    () => roles.find((role) => role.name === 'Tecnólogo Médico')?.name ?? roles.find((role) => role.name !== 'Admin')?.name ?? roles[0]?.name ?? '',
    [roles],
  );

  const loadUsers = async () => {
    setUsers(await usersApi.list());
  };

  const loadRoles = async () => {
    const response = await rolesApi.list();
    setRoles(response);
    setForm((current) => ({ ...current, role: current.role || response.find((role) => role.name === 'Tecnólogo Médico')?.name || response[0]?.name || '' }));
  };

  const loadData = async () => {
    await Promise.all([loadRoles(), loadUsers()]);
  };

  useEffect(() => {
    loadData().catch((err) => setMessage(err instanceof Error ? err.message : 'Error al cargar datos'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!form.role && defaultRole) setForm((current) => ({ ...current, role: defaultRole }));
  }, [defaultRole, form.role]);

  const startEdit = (user: User) => {
    setEditing(user);
    setForm({
      full_name: user.full_name,
      username: user.username,
      password: '',
      role: user.role,
      is_active: user.is_active,
    });
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ ...emptyUserForm, role: defaultRole });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      if (editing) {
        await usersApi.update(editing.id, {
          full_name: form.full_name,
          role: form.role,
          is_active: form.is_active,
        });
        if (form.password.trim()) {
          await usersApi.changePassword(editing.id, form.password.trim());
        }
        setMessage('Usuario actualizado.');
      } else {
        await usersApi.create(form);
        setMessage('Usuario creado.');
      }
      resetForm();
      await loadUsers();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async (event: FormEvent) => {
    event.preventDefault();
    setRoleLoading(true);
    setMessage('');
    try {
      await rolesApi.create(roleForm);
      setRoleForm(emptyRoleForm);
      await loadRoles();
      setMessage('Rol creado.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo crear el rol');
    } finally {
      setRoleLoading(false);
    }
  };

  const toggleStage = (stage: Stage) => {
    setRoleForm((current) => {
      const selected = current.processable_stages.includes(stage);
      return {
        ...current,
        processable_stages: selected
          ? current.processable_stages.filter((item) => item !== stage)
          : [...current.processable_stages, stage],
      };
    });
  };

  const toggleUserStatus = async (user: User) => {
    const nextActive = !user.is_active;
    const action = nextActive ? 'activar' : 'desactivar';
    if (!nextActive && !window.confirm(`¿Desactivar a ${user.full_name}?`)) return;
    try {
      await usersApi.update(user.id, { is_active: nextActive });
      await loadUsers();
      setMessage(`Usuario ${nextActive ? 'activado' : 'desactivado'}.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : `No se pudo ${action}`);
    }
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <div>
          <h1>Administración de usuarios</h1>
          <p>Usuarios, roles y estado de acceso.</p>
        </div>
      </div>

      {message && <div className="info-banner">{message}</div>}

      <div className="admin-grid">
        <div className="admin-side-stack">
          <section className="panel">
            <div className="panel-title">
              <span className="circle-icon">+</span>
              <h2>{editing ? 'Editar usuario' : 'Crear usuario'}</h2>
            </div>
            <form className="user-form" onSubmit={handleSubmit}>
              <label>
                Nombre completo
                <input required value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} />
              </label>
              <label>
                Usuario
                <input
                  required
                  disabled={Boolean(editing)}
                  value={form.username}
                  onChange={(event) => setForm({ ...form, username: event.target.value })}
                />
              </label>
              <label>
                Contraseña {editing && <span className="muted-text">(opcional)</span>}
                <input
                  type="password"
                  required={!editing}
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                />
              </label>
              <label>
                Rol
                <select required value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Role })}>
                  {roles.map((role) => <option key={role.id} value={role.name}>{role.name}</option>)}
                </select>
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  disabled={Boolean(editing && editing.id === currentUser?.id)}
                  onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
                />
                Usuario activo
              </label>
              <div className="form-actions">
                {editing && <button type="button" className="secondary-button" onClick={resetForm}>Cancelar</button>}
                <button className="primary-button" disabled={loading || !form.role}>{loading ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </section>

          <section className="panel">
            <div className="panel-title">
              <span className="circle-icon">R</span>
              <h2>Crear rol</h2>
            </div>
            <form className="user-form" onSubmit={handleCreateRole}>
              <label>
                Nombre del rol
                <input
                  required
                  value={roleForm.name}
                  onChange={(event) => setRoleForm({ ...roleForm, name: event.target.value })}
                  placeholder="Ej: Administrativo"
                />
              </label>
              <div className="role-stage-field">
                <strong>Etapas que puede procesar</strong>
                <div className="role-stage-grid">
                  {STAGES.map((stage) => (
                    <label key={stage} className="role-stage-option">
                      <input
                        type="checkbox"
                        checked={roleForm.processable_stages.includes(stage)}
                        onChange={() => toggleStage(stage)}
                      />
                      <span>{stage}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-actions">
                <button className="primary-button" disabled={roleLoading || roleForm.processable_stages.length === 0}>
                  {roleLoading ? 'Creando...' : 'Crear rol'}
                </button>
              </div>
            </form>
          </section>
        </div>

        <div className="admin-content-stack">
          <section className="panel">
            <div className="panel-title">
              <span className="circle-icon">☷</span>
              <h2>Usuarios registrados</h2>
            </div>
            <div className="table-wrapper">
              <table className="workflow-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td><strong>{user.full_name}</strong></td>
                      <td>{user.username}</td>
                      <td><span className="stage-pill">{user.role}</span></td>
                      <td><span className={`status-pill ${user.is_active ? 'status-active' : 'status-inactive'}`}>{user.is_active ? 'Activo' : 'Inactivo'}</span></td>
                      <td>
                        <div className="row-actions">
                          <button className="secondary-button small" onClick={() => startEdit(user)}>Editar</button>
                          <button
                            className={`${user.is_active ? 'danger-button' : 'secondary-button'} small`}
                            onClick={() => toggleUserStatus(user)}
                            disabled={user.id === currentUser?.id}
                          >
                            {user.is_active ? 'Inactivar' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <div className="panel-title">
              <span className="circle-icon">↔</span>
              <h2>Roles disponibles</h2>
            </div>
            <div className="role-list">
              {roles.map((role) => (
                <article key={role.id} className="role-card">
                  <div>
                    <strong>{role.name}</strong>
                    <span>{role.is_system ? 'Rol del sistema' : 'Rol creado'}</span>
                  </div>
                  <div className="role-stage-pills">
                    {role.processable_stages.map((stage) => <span key={stage} className="stage-pill">{stage}</span>)}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
