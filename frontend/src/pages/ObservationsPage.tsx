import { useEffect, useMemo, useState } from 'react';
import { patientsApi } from '../api/client';
import type { Observation, Stage } from '../types/domain';

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

const stageClassByStage: Record<Stage, string> = {
  Ingreso: 'ingreso',
  Simulación: 'simulacion',
  Dosimetría: 'dosimetria',
  'Física Médica': 'fisica',
  Impresión: 'impresion',
  Enfermería: 'enfermeria',
  Citación: 'citacion',
  'Inicio/Termino de tratamiento': 'tratamiento',
  Finalizado: 'finalizado',
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ObservationsPage() {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState<Stage | ''>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadObservations = async (search = query, selectedStage = stage) => {
    setLoading(true);
    setMessage('');
    try {
      setObservations(await patientsApi.observations(search.trim() || undefined, selectedStage || undefined));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudieron cargar las observaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handle = window.setTimeout(() => {
      loadObservations(query, stage);
    }, 250);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, stage]);

  const fichasCount = useMemo(
    () => new Set(observations.map((observation) => observation.patient_id)).size,
    [observations],
  );

  return (
    <div className="observations-page">
      <div className="page-header">
        <div>
          <h1>Observaciones</h1>
          <p>Registro acumulado de observaciones por ficha clínica.</p>
        </div>
        <button className="secondary-button" onClick={() => loadObservations()} disabled={loading}>
          {loading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      <div className="observations-toolbar">
        <div className="search-box">
          <span>⌕</span>
          <input
            placeholder="Buscar por paciente, RUT o ficha..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <select value={stage} onChange={(event) => setStage(event.target.value as Stage | '')}>
          <option value="">Todas las etapas</option>
          {STAGES.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>

      {message && <div className="info-banner">{message}</div>}

      <div className="observation-metrics">
        <section className="metric-card metric-primary">
          <span>Observaciones</span>
          <strong>{observations.length}</strong>
        </section>
        <section className="metric-card metric-success">
          <span>Fichas con registro</span>
          <strong>{fichasCount}</strong>
        </section>
        <section className="metric-card metric-stage">
          <span>Filtro activo</span>
          <strong>{stage || 'Todas'}</strong>
        </section>
      </div>

      <section className="panel observations-register">
        <div className="panel-title panel-title-between">
          <div>
            <span className="circle-icon">!</span>
            <h2>Registro por ficha</h2>
          </div>
          <span className="muted-text">{loading ? 'Cargando...' : `${observations.length} registro${observations.length === 1 ? '' : 's'}`}</span>
        </div>

        {observations.length === 0 ? (
          <div className="empty-cell">No hay observaciones registradas.</div>
        ) : (
          <div className="observations-register-list">
            {observations.map((observation) => (
              <article key={observation.id} className="observation-register-card">
                <div className="observation-register-main">
                  <div>
                    <div className="observation-patient-line">
                      <strong>{observation.patient_name}</strong>
                      <span className="ficha-badge">{observation.ficha_label}</span>
                    </div>
                    <span className="observation-subtitle">{observation.patient_rut} - actualmente en {observation.current_stage}</span>
                  </div>
                  <span className={`stage-pill stage-pill-${stageClassByStage[observation.processed_stage]}`}>
                    {observation.processed_stage}
                  </span>
                </div>
                <p>{observation.notes}</p>
                <footer>
                  <span>{formatDateTime(observation.fecha_hora)}</span>
                  <span>{observation.user?.full_name ?? 'Usuario no registrado'} - {observation.purpose}</span>
                </footer>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
