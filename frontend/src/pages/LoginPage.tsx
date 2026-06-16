import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const showDemoAccess = import.meta.env.VITE_SHOW_DEMO_ACCESS !== 'false';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-mark">RT</div>
          <div>
            <strong>Radioterapia</strong>
            <span>Gestión de fichas</span>
          </div>
        </div>
        <h1>Bienvenido/a</h1>
        <p>Acceso interno para seguimiento seguro de pacientes por etapas.</p>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Usuario
            <input value={username} onChange={(event) => setUsername(event.target.value)} autoFocus />
          </label>
          <label>
            Contraseña
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error && <div className="alert-error">{error}</div>}
          <button className="primary-button" disabled={loading}>{loading ? 'Ingresando...' : 'Ingresar'}</button>
        </form>

        {showDemoAccess && (
          <div className="demo-users">
            <strong>Accesos de prueba</strong>
            <span>admin / admin123</span>
            <span>fisico / demo123</span>
            <span>tecnologo / demo123</span>
            <span>enfermeria / demo123</span>
          </div>
        )}
      </div>
    </div>
  );
}
