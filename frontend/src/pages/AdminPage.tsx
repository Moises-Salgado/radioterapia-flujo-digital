import { FormEvent, useEffect, useState } from 'react';
import { usersApi } from '../api/client';
import type { Role, User } from '../types/domain';

const ROLES: Role[] = ['Admin', 'Físico Médico', 'Tecnólogo Médico', 'Enfermero/a'];

const emptyForm = {
  full_name: '',
  username: '',
  password: '',
  role: 'Tecnólogo Médico' as Role,
  is_active: true,
};

export function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<User | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const loadUsers = async () => {
    setUsers(await usersApi.list());
  };

  useEffect(() => {
    loadUsers().catch((err) => setMessage(err instanceof Error ? err.message : 'Error al cargar usuarios'));
  }, []);

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
    setForm(emptyForm);
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

  const deactivate = async (user: User) => {
    if (!window.confirm(`¿Desactivar a ${user.full_name}?`)) return;
    try {
      await usersApi.deactivate(user.id);
      await loadUsers();
      setMessage('Usuario desactivado.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo desactivar');
    }
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <div>
          <h1>Administración de usuarios</h1>
          <p>CRUD de usuarios, roles y estado de acceso.</p>
        </div>
      </div>

      {message && <div className="info-banner">{message}</div>}

      <div className="admin-grid">
        <section className="panel">
          <div className="panel-title">
            <span className="circle-icon">＋</span>
            <h2>{editing ? 'Editar usuario' : 'Crear usuario'}</h2>
          </div>
          <form className="user-form" onSubmit={handleSubmit}>
            <label>
              Nombre completo
              <input required value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} />
            </label>
            <label>
              Username
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
              <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Role })}>
                {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
              />
              Usuario activo
            </label>
            <div className="form-actions">
              {editing && <button type="button" className="secondary-button" onClick={resetForm}>Cancelar</button>}
              <button className="primary-button" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </section>

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
                  <th>Username</th>
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
                    <td>{user.is_active ? 'Activo' : 'Inactivo'}</td>
                    <td>
                      <div className="row-actions">
                        <button className="secondary-button small" onClick={() => startEdit(user)}>Editar</button>
                        <button className="danger-button small" onClick={() => deactivate(user)} disabled={!user.is_active}>Desactivar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
