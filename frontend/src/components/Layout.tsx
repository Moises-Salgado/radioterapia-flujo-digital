import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Layout() {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [profileForm, setProfileForm] = useState({ full_name: '', username: '', password: '' });
  const [profileMessage, setProfileMessage] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  const avatarStorageKey = user ? `rt_avatar_${user.id}` : '';

  useEffect(() => {
    if (!user) return;
    setProfileForm({ full_name: user.full_name, username: user.username, password: '' });
    setAvatarUrl(localStorage.getItem(`rt_avatar_${user.id}`) ?? '');
  }, [user]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !avatarStorageKey) return;

    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : '';
      if (!value) return;
      localStorage.setItem(avatarStorageKey, value);
      setAvatarUrl(value);
      setProfileMessage('Imagen actualizada.');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleAvatarRemove = () => {
    if (!avatarStorageKey) return;
    localStorage.removeItem(avatarStorageKey);
    setAvatarUrl('');
    setProfileMessage('Imagen eliminada.');
  };

  const handleProfileSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileMessage('');
    try {
      await updateProfile({
        full_name: profileForm.full_name.trim(),
        username: profileForm.username.trim(),
        password: profileForm.password.trim() || undefined,
      });
      setProfileForm((current) => ({ ...current, password: '' }));
      setProfileMessage('Perfil actualizado.');
    } catch (err) {
      setProfileMessage(err instanceof Error ? err.message : 'No se pudo actualizar el perfil');
    } finally {
      setSavingProfile(false);
    }
  };

  const userInitial = user?.full_name?.slice(0, 1) ?? 'U';
  const avatar = avatarUrl ? <img src={avatarUrl} alt="" /> : userInitial;
  const formattedDateTime = currentTime.toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">RT</div>
          <div>
            <strong>Radioterapia</strong>
            <span>Flujo Digital</span>
          </div>
        </div>

        <nav className="side-nav">
          <NavLink to="/dashboard">
            <NavIcon type="dashboard" />
            Dashboard
          </NavLink>
          <NavLink to="/patients">
            <NavIcon type="patients" />
            Pacientes
          </NavLink>
          <NavLink to="/completed">
            <NavIcon type="completed" />
            Finalizados
          </NavLink>
          {user?.role === 'Admin' && (
            <NavLink to="/admin">
              <NavIcon type="users" />
              Usuarios
            </NavLink>
          )}
        </nav>

        <div className="profile-area">
          <button className="sidebar-user profile-trigger" onClick={() => setProfileOpen((current) => !current)}>
            <span className="avatar">{avatar}</span>
            <span className="sidebar-user-text">
              <strong title={user?.full_name}>{user?.full_name}</strong>
              <span title={user?.role}>{user?.role}</span>
            </span>
            <span className={`profile-arrow ${profileOpen ? 'profile-arrow-open' : ''}`} aria-hidden="true" />
          </button>
          <button className="sidebar-logout-button" onClick={handleLogout}>
            Cerrar sesión
          </button>

          {profileOpen && (
            <div className="profile-menu">
              <div className="profile-menu-header">
                <div>
                  <strong>Mi perfil</strong>
                  <span>Actualiza tu información personal</span>
                </div>
              </div>

              <div className="profile-photo-card">
                <span className="avatar avatar-large">{avatar}</span>
                <div className="profile-photo-copy">
                  <strong>Imagen de perfil</strong>
                  <span>Usa una imagen cuadrada para mejor resultado.</span>
                </div>
                <label className="profile-upload-button">
                  Subir foto
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} />
                </label>
                {avatarUrl && (
                  <button type="button" className="profile-remove-photo" onClick={handleAvatarRemove}>
                    Quitar
                  </button>
                )}
              </div>

              <form className="profile-form" onSubmit={handleProfileSubmit}>
                <label>
                  Nombre completo
                  <input
                    required
                    value={profileForm.full_name}
                    onChange={(event) => setProfileForm({ ...profileForm, full_name: event.target.value })}
                  />
                </label>
                <label>
                  Usuario
                  <input
                    required
                    value={profileForm.username}
                    onChange={(event) => setProfileForm({ ...profileForm, username: event.target.value })}
                  />
                </label>
                <label>
                  Nueva contraseña
                  <input
                    type="password"
                    placeholder="Opcional"
                    value={profileForm.password}
                    onChange={(event) => setProfileForm({ ...profileForm, password: event.target.value })}
                  />
                </label>
                {profileMessage && <div className="profile-message">{profileMessage}</div>}
                <div className="profile-actions">
                  <button className="primary-button small" disabled={savingProfile}>
                    {savingProfile ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <strong>Servicio de Radioterapia</strong>
            <span>Gestión interna de fichas clínicas</span>
          </div>
          <div className="topbar-actions">
            <span className="topbar-context">Rol: {user?.role}</span>
            <span className="topbar-divider" />
            <span className="topbar-context">{formattedDateTime}</span>
          </div>
        </header>
        <section className="content-area">
          <Outlet />
        </section>
      </main>
    </div>
  );
}

function NavIcon({ type }: { type: 'dashboard' | 'patients' | 'completed' | 'users' }) {
  const paths = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    patients: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="4" />
        <path d="M19 8v6" />
        <path d="M22 11h-6" />
      </>
    ),
    completed: (
      <>
        <path d="M9 11l2 2 4-5" />
        <path d="M20 11.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8" />
        <path d="M15 4h5v5" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  };

  return (
    <span className="nav-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        {paths[type]}
      </svg>
    </span>
  );
}
