import { useEffect, useState } from 'react';
import { workflowApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { CompletedPatient } from '../types/domain';

export function CompletedPage() {
  const { user } = useAuth();
  const [completedPatients, setCompletedPatients] = useState<CompletedPatient[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [reopeningId, setReopeningId] = useState<number | null>(null);
  const canReopen = user?.role === 'Admin';

  const loadCompleted = async () => {
    setLoading(true);
    setMessage('');
    try {
      setCompletedPatients(await workflowApi.completed());
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudieron cargar los pacientes finalizados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompleted();
  }, []);

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleReopen = async (item: CompletedPatient) => {
    const confirmed = window.confirm(`¿Reabrir a ${item.patient.full_name}? Volverá a la etapa Inicio/Termino de tratamiento.`);
    if (!confirmed) return;

    setReopeningId(item.patient.id);
    setMessage('');
    try {
      await workflowApi.reopenPatient(item.patient.id);
      setCompletedPatients((current) => current.filter((completed) => completed.patient.id !== item.patient.id));
      setMessage(`${item.patient.full_name} fue reabierto y enviado a Inicio/Termino de tratamiento.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo reabrir el paciente');
    } finally {
      setReopeningId(null);
    }
  };

  return (
    <div className="completed-page">
      <div className="page-header">
        <div>
          <h1>Finalizados</h1>
          <p>Pacientes que completaron todas las etapas del flujo clínico.</p>
        </div>
        <button className="secondary-button" onClick={loadCompleted} disabled={loading}>
          {loading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {message && <div className="info-banner">{message}</div>}

      <section className="panel">
        <div className="panel-title panel-title-between">
          <div>
            <span className="circle-icon">✓</span>
            <h2>Registro de pacientes finalizados</h2>
          </div>
          <span className="muted-text">{completedPatients.length} total</span>
        </div>

        <div className="table-wrapper">
          <table className="workflow-table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>RUT</th>
                <th>Teléfono</th>
                <th>Finalizado</th>
                {canReopen && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {completedPatients.length === 0 ? (
                <tr>
                  <td colSpan={canReopen ? 5 : 4} className="empty-cell">
                    No hay pacientes finalizados aún.
                  </td>
                </tr>
              ) : (
                completedPatients.map((item) => (
                  <tr key={item.patient.id} className={item.patient.is_priority ? 'priority-row' : ''}>
                    <td>
                      <div className="patient-cell">
                        <div>
                          <strong>{item.patient.full_name}</strong>
                          <span>{item.patient.current_stage}</span>
                        </div>
                      </div>
                    </td>
                    <td>{item.patient.rut}</td>
                    <td>{item.patient.phone ?? '-'}</td>
                    <td>{formatDateTime(item.finished_at)}</td>
                    {canReopen && (
                      <td>
                        <button
                          className="secondary-button small"
                          onClick={() => handleReopen(item)}
                          disabled={reopeningId === item.patient.id}
                        >
                          {reopeningId === item.patient.id ? 'Reabriendo...' : 'Reabrir'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
