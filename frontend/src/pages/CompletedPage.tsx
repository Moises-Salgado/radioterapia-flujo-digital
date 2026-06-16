import { useEffect, useState } from 'react';
import { workflowApi } from '../api/client';
import type { CompletedPatient } from '../types/domain';

export function CompletedPage() {
  const [completedPatients, setCompletedPatients] = useState<CompletedPatient[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

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
              </tr>
            </thead>
            <tbody>
              {completedPatients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="empty-cell">
                    No hay pacientes finalizados aún.
                  </td>
                </tr>
              ) : (
                completedPatients.map((item) => (
                  <tr key={item.patient.id}>
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
