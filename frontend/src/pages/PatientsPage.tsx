import { FormEvent, useEffect, useState } from 'react';
import { patientsApi } from '../api/client';
import type { Patient } from '../types/domain';

const emptyPatient = {
  rut: '',
  full_name: '',
  sex: 'Masculino',
  age: 0,
  phone: '',
  trusted_contact_phone: '',
  street: '',
  commune: '',
  region: '',
};

function formatRut(value: string): string {
  const clean = value.toUpperCase().replace(/[^0-9K]/g, '').slice(0, 9);
  if (clean.length <= 7) {
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  const body = clean.slice(0, -1);
  const verifier = clean.slice(-1);
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedBody}-${verifier}`;
}

export function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(emptyPatient);
  const [message, setMessage] = useState('');

  const load = async () => {
    setPatients(await patientsApi.list(query.trim() || undefined, undefined, true));
  };

  useEffect(() => {
    const handle = window.setTimeout(() => load().catch((err) => setMessage(err instanceof Error ? err.message : 'Error')), 300);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const createPatient = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    try {
      await patientsApi.create({ ...form, age: Number(form.age) });
      setForm(emptyPatient);
      await load();
      setMessage('Paciente creado en etapa Dosimetría.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo crear paciente');
    }
  };

  const handleRutChange = (value: string) => {
    setForm({ ...form, rut: formatRut(value) });
  };

  return (
    <div className="patients-page">
      <div className="page-header">
        <div>
          <h1>Pacientes</h1>
          <p>Búsqueda, revisión y creación manual de pacientes.</p>
        </div>
      </div>

      {message && <div className="info-banner">{message}</div>}

      <div className="admin-grid">
        <section className="panel">
          <div className="panel-title">
            <span className="circle-icon">＋</span>
            <h2>Crear paciente</h2>
          </div>
          <form className="user-form" onSubmit={createPatient}>
            <label>
              RUT
              <input
                required
                inputMode="text"
                maxLength={12}
                placeholder="12.345.678-9"
                value={form.rut}
                onChange={(event) => handleRutChange(event.target.value)}
              />
            </label>
            <label>Nombre completo<input required value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} /></label>
            <label>
              Sexo
              <select required value={form.sex} onChange={(event) => setForm({ ...form, sex: event.target.value })}>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
              </select>
            </label>
            <label>Edad<input required type="number" min={0} max={130} value={form.age} onChange={(event) => setForm({ ...form, age: Number(event.target.value) })} /></label>
            <label>Teléfono<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
            <label>Teléfono confianza<input value={form.trusted_contact_phone} onChange={(event) => setForm({ ...form, trusted_contact_phone: event.target.value })} /></label>
            <label>Calle<input value={form.street} onChange={(event) => setForm({ ...form, street: event.target.value })} /></label>
            <label>Comuna<input value={form.commune} onChange={(event) => setForm({ ...form, commune: event.target.value })} /></label>
            <label>Región<input value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })} /></label>
            <button className="primary-button">Crear paciente</button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-title panel-title-between">
            <div>
              <span className="circle-icon">⌕</span>
              <h2>Buscar pacientes</h2>
            </div>
          </div>
          <div className="search-box standalone-search">
            <span>⌕</span>
            <input placeholder="RUT o nombre" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="table-wrapper">
            <table className="workflow-table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>RUT</th>
                  <th>Ficha</th>
                  <th>Etapa</th>
                  <th>Teléfono</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr key={patient.id}>
                    <td><strong>{patient.full_name}</strong></td>
                    <td>{patient.rut}</td>
                    <td><span className="ficha-badge">{patient.ficha_label}</span></td>
                    <td><span className="stage-pill">{patient.current_stage}</span></td>
                    <td>{patient.phone}</td>
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
