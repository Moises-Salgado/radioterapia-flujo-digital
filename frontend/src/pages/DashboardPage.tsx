import { useEffect, useMemo, useState } from 'react';
import { patientsApi, workflowApi } from '../api/client';
import { ProcessModal } from '../components/ProcessModal';
import { StageCard } from '../components/StageCard';
import { useAuth } from '../context/AuthContext';
import type { Patient, Purpose, Stage, StageSummaryItem, WorkflowLog } from '../types/domain';

const ALL_STAGES: Stage[] = ['Ingreso', 'Simulación', 'Dosimetría', 'Física Médica', 'Impresión', 'Enfermería', 'Citación', 'Inicio/Termino de tratamiento'];
const PURPOSES_BY_STAGE: Record<Exclude<Stage, 'Finalizado'>, Purpose[]> = {
  Ingreso: ['Simulación'],
  Simulación: ['Dosimetría'],
  Dosimetría: ['Física Médica'],
  'Física Médica': ['Medición', 'Planificación', 'Replanificación', 'Calcular Dosis'],
  Impresión: ['Imprimir', 'Devolver a Física Médica'],
  Enfermería: ['Recepción'],
  Citación: ['Citar', 'Fallecido / no disponible'],
  'Inicio/Termino de tratamiento': ['Iniciar/terminar tratamiento', 'Fallecido / no disponible'],
};
function getNextStage(stage: Stage, purpose?: Purpose): Stage {
  if (stage === 'Impresión' && purpose === 'Devolver a Física Médica') return 'Física Médica';
  if (purpose === 'Fallecido / no disponible') return 'Finalizado';
  if (stage === 'Ingreso') return 'Simulación';
  if (stage === 'Simulación') return 'Dosimetría';
  if (stage === 'Dosimetría') return 'Física Médica';
  if (stage === 'Física Médica') return 'Impresión';
  if (stage === 'Impresión') return 'Enfermería';
  if (stage === 'Enfermería') return 'Citación';
  if (stage === 'Citación') return 'Inicio/Termino de tratamiento';
  return 'Finalizado';
}

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

export function DashboardPage() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [summary, setSummary] = useState<StageSummaryItem[]>([]);
  const [query, setQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [modalPatientIds, setModalPatientIds] = useState<number[]>([]);
  const [selectedPurposeByPatient, setSelectedPurposeByPatient] = useState<Record<number, Purpose>>({});
  const [priorityByPatient, setPriorityByPatient] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [creatingFicha, setCreatingFicha] = useState(false);
  const [fichaPatientToCreate, setFichaPatientToCreate] = useState<Patient | null>(null);
  const [selectedPatientLogs, setSelectedPatientLogs] = useState<WorkflowLog[]>([]);
  const [loadingPatientLogs, setLoadingPatientLogs] = useState(false);
  const [observationsModalPatient, setObservationsModalPatient] = useState<Patient | null>(null);
  const [observationsModalLogs, setObservationsModalLogs] = useState<WorkflowLog[]>([]);
  const [loadingObservationsModal, setLoadingObservationsModal] = useState(false);
  const [resimulatePatient, setResimulatePatient] = useState<Patient | null>(null);
  const [resimulateNotes, setResimulateNotes] = useState('');
  const [resimulatePassword, setResimulatePassword] = useState('');
  const [resimulateError, setResimulateError] = useState('');
  const [resimulating, setResimulating] = useState(false);

  const availableStages = user?.processable_stages ?? [];
  const isStageAccessible = (stage: Stage) => {
    if (!user) return false;
    if (user.role === 'Admin') return true;
    return availableStages.includes(stage);
  };
  const accessibleStages = ALL_STAGES.filter(isStageAccessible);
  const visiblePurposes = selectedStage && selectedStage !== 'Finalizado' ? PURPOSES_BY_STAGE[selectedStage] : [];

  // Inicializar selectedStage cuando el usuario cambia
  useEffect(() => {
    if (accessibleStages.length > 0 && !selectedStage) {
      setSelectedStage(accessibleStages[0]);
    }
  }, [accessibleStages, selectedStage]);

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId) ?? patients[0] ?? null,
    [patients, selectedPatientId],
  );
  const observationLogs = useMemo(
    () => selectedPatientLogs.filter((log) => Boolean(log.notes?.trim())),
    [selectedPatientLogs],
  );

  const loadData = async (search = query, stage = selectedStage) => {
    setLoading(true);
    try {
      const [patientsResponse, summaryResponse] = await Promise.all([
        patientsApi.list(search.trim() || undefined, stage || undefined),
        workflowApi.summary(),
      ]);
      setPatients(patientsResponse);
      setSummary(summaryResponse.stages);
      setSelectedPatientId((currentId) => {
        if (patientsResponse.length === 0) return null;
        if (currentId && patientsResponse.some((patient) => patient.id === currentId)) return currentId;
        return patientsResponse[0].id;
      });
      setSelectedPurposeByPatient({});
      setPriorityByPatient(
        Object.fromEntries(patientsResponse.filter((patient) => patient.is_priority).map((patient) => [patient.id, true])),
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStage) {
      loadData('', selectedStage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStage]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (selectedStage) loadData(query, selectedStage);
    }, 350);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    if (!selectedPatientId) {
      setSelectedPatientLogs([]);
      return () => {
        cancelled = true;
      };
    }

    setLoadingPatientLogs(true);
    patientsApi.logs(selectedPatientId)
      .then((logs) => {
        if (!cancelled) setSelectedPatientLogs(logs);
      })
      .catch(() => {
        if (!cancelled) setSelectedPatientLogs([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingPatientLogs(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPatientId]);

  const getStageCount = (stage: Stage) => summary.find((item) => item.stage === stage)?.count ?? 0;
  const formatLogDateTime = (value: string) =>
    new Date(value).toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  const activePatientsCount = ALL_STAGES.reduce((total, stage) => total + getStageCount(stage), 0);
  const accessiblePatientsCount = accessibleStages.reduce((total, stage) => total + getStageCount(stage), 0);
  const finalizadosCount = getStageCount('Finalizado');
  const fichaCreationStages: Stage[] = ['Dosimetría', 'Física Médica'];
  const showPriorityColumn = selectedStage === 'Dosimetría';
  const canShowResimulateColumn = Boolean(
    selectedStage && ALL_STAGES.indexOf(selectedStage) > ALL_STAGES.indexOf('Simulación'),
  );

  const canProcess = (patient: Patient | null): boolean => {
    if (!patient || !user || patient.current_stage === 'Finalizado') return false;
    if (user.role === 'Admin') return true;
    return availableStages.includes(patient.current_stage);
  };
  const canResimulate = (patient: Patient | null): boolean => (
    Boolean(
      patient
      && patient.current_stage !== 'Finalizado'
      && ALL_STAGES.indexOf(patient.current_stage) > ALL_STAGES.indexOf('Simulación')
      && canProcess(patient),
    )
  );

  const validSelectedPatientIds = useMemo(
    () => Object.keys(selectedPurposeByPatient)
      .map(Number)
      .filter((id) => {
        const patient = patients.find((p) => p.id === id);
        return Boolean(patient && canProcess(patient) && selectedPurposeByPatient[id]);
      }),
    [patients, selectedPurposeByPatient],
  );
  const prioritySelectedPatientIds = useMemo(
    () => patients
      .filter((patient) => patient.current_stage === 'Dosimetría' && !patient.is_priority && priorityByPatient[patient.id])
      .map((patient) => patient.id),
    [patients, priorityByPatient],
  );

  const processTooltip = (patient: Patient | null): string => {
    if (!patient) return 'Selecciona un paciente';
    if (patient.current_stage === 'Finalizado') return 'Paciente finalizado';
    if (canProcess(patient)) return 'Procesar etapa actual';
    return `Tu rol (${user?.role}) no puede procesar ${patient.current_stage}`;
  };

  const handleConfirmProcess = async (notesByPatient: Record<number, string | undefined>) => {
    if (modalPatientIds.length === 0) return;
    setMessage('');
    const processedStage = patients.find((patient) => patient.id === modalPatientIds[0])?.current_stage ?? selectedStage;
    const firstPurpose = modalPatientIds[0] ? selectedPurposeByPatient[modalPatientIds[0]] : undefined;
    const nextStage = processedStage ? getNextStage(processedStage, firstPurpose) : undefined;
    try {
      const priorityIdsToSave = prioritySelectedPatientIds;
      await Promise.all(priorityIdsToSave.map((id) => patientsApi.updatePriority(id, true)));
      await Promise.all(
        modalPatientIds.map((id) => workflowApi.processPatient(id, selectedPurposeByPatient[id], notesByPatient[id])),
      );
      setModalPatientIds([]);
      await loadData(query, selectedStage);
      const destination = nextStage ?? 'la siguiente etapa';
      setMessage(`${modalPatientIds.length} paciente${modalPatientIds.length === 1 ? '' : 's'} avanzado${modalPatientIds.length === 1 ? '' : 's'} a ${destination}.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo procesar la etapa');
    }
  };

  const handleContinueClick = () => {
    if (validSelectedPatientIds.length === 0 && prioritySelectedPatientIds.length > 0) {
      setMessage('Marcaste Prioridad, pero falta seleccionar Física Médica para avanzar el paciente.');
      return;
    }
    if (validSelectedPatientIds.length > 0) {
      setModalPatientIds(validSelectedPatientIds);
    }
  };

  const handleCreateFicha = async () => {
    if (!fichaPatientToCreate) return;
    setCreatingFicha(true);
    setMessage('');
    try {
      const newFicha = await patientsApi.createFicha(fichaPatientToCreate.id, fichaPatientToCreate.current_stage);
      const canSeeNewFicha = isStageAccessible(newFicha.current_stage);
      setFichaPatientToCreate(null);
      if (canSeeNewFicha) {
        setSelectedStage(newFicha.current_stage);
        setSelectedPatientId(newFicha.id);
      }
      await loadData(query, canSeeNewFicha ? newFicha.current_stage : selectedStage);
      setMessage(`Se creó ${newFicha.ficha_label} para ${newFicha.full_name}.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo crear la ficha');
    } finally {
      setCreatingFicha(false);
    }
  };

  const handleOpenObservations = async (patient: Patient) => {
    setSelectedPatientId(patient.id);
    setObservationsModalPatient(patient);
    setLoadingObservationsModal(true);
    try {
      const logs = await patientsApi.logs(patient.id);
      setObservationsModalLogs(logs.filter((log) => Boolean(log.notes?.trim())));
    } catch {
      setObservationsModalLogs([]);
    } finally {
      setLoadingObservationsModal(false);
    }
  };

  const openResimulateModal = (patient: Patient) => {
    setResimulatePatient(patient);
    setResimulateNotes('');
    setResimulatePassword('');
    setResimulateError('');
  };

  const handleResimulate = async () => {
    if (!resimulatePatient || !resimulatePassword.trim()) return;
    setResimulating(true);
    setMessage('');
    setResimulateError('');
    try {
      await workflowApi.resimulatePatient(
        resimulatePatient.id,
        resimulatePassword,
        resimulateNotes.trim() || undefined,
      );
      const patientName = resimulatePatient.full_name;
      const fichaLabel = resimulatePatient.ficha_label;
      setResimulatePatient(null);
      setResimulateNotes('');
      setResimulatePassword('');
      setResimulateError('');
      await loadData(query, selectedStage);
      setMessage(`${patientName} (${fichaLabel}) fue enviado a Simulación.`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'No se pudo enviar a resimulación';
      if (errorMessage.toLowerCase().includes('contraseña') || errorMessage.toLowerCase().includes('clave')) {
        setResimulateError('Clave incorrecta');
      } else {
        setResimulateError(errorMessage);
      }
    } finally {
      setResimulating(false);
    }
  };


  return (
    <div className="dashboard-page">
      <div className="metric-grid">
        <MetricCard label="Pacientes activos" value={activePatientsCount} tone="primary" />
        <MetricCard label="En mis etapas" value={accessiblePatientsCount} tone="success" />
        <MetricCard label={selectedStage ? `En ${selectedStage}` : 'Etapa seleccionada'} value={selectedStage ? getStageCount(selectedStage) : 0} tone="stage" />
        <MetricCard label="Finalizados" value={finalizadosCount} tone="muted" />
      </div>

      <div className="stage-grid">
        {ALL_STAGES.map((stage, index) => {
          const accessible = isStageAccessible(stage);
          return (
            <StageCard
              key={stage}
              stage={stage}
              index={index + 1}
              count={getStageCount(stage)}
              active={selectedStage === stage}
              disabled={!accessible}
              onClick={() => {
                if (!accessible) return;
                setSelectedStage(stage);
              }}
            />
          );
        })}
      </div>

      <div className="toolbar-card">
        <div className="search-box">
          <span>⌕</span>
          <input
            placeholder="Buscar paciente por RUT o nombre..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      {message && <div className="info-banner">{message}</div>}

      <div className="dashboard-grid">
        <section className="panel patient-info-card">
          <div className="panel-title">
            <span className="circle-icon">●</span>
            <h2>Información del paciente</h2>
          </div>
          {selectedPatient ? (
            <div className="patient-fields">
              <InfoRow label="Nombre" value={selectedPatient.full_name} />
              <InfoRow label="RUT" value={selectedPatient.rut} />
              <InfoRow label="Sexo" value={selectedPatient.sex} />
              <InfoRow label="Edad" value={`${selectedPatient.age} años`} />
              <InfoRow label="Teléfono" value={selectedPatient.phone ?? '-'} />
              <InfoRow label="Otro teléfono" value={selectedPatient.trusted_contact_phone ?? '-'} />
              <InfoRow label="Domicilio" value={[selectedPatient.street, selectedPatient.commune, selectedPatient.region].filter(Boolean).join(', ')} />
              <InfoRow label="Ficha" value={selectedPatient.ficha_label} strong />
              <InfoRow label="Etapa actual" value={selectedPatient.current_stage} strong stageClass={stageClassByStage[selectedPatient.current_stage]} />
              {fichaCreationStages.includes(selectedPatient.current_stage) && (
                <div className="patient-ficha-action">
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => setFichaPatientToCreate(selectedPatient)}
                    disabled={creatingFicha}
                  >
                    Crear nueva ficha
                  </button>
                </div>
              )}
              <div className="patient-observations">
                <div className="patient-observations-header">
                  <strong>Observaciones</strong>
                  {selectedPatient.observation_count > 0 && (
                    <span>{selectedPatient.observation_count}</span>
                  )}
                </div>
                {loadingPatientLogs ? (
                  <p className="muted-text">Cargando observaciones...</p>
                ) : observationLogs.length > 0 ? (
                  <div className="observation-list">
                    {observationLogs.map((log) => (
                      <article key={log.id} className="observation-item">
                        <div className="observation-meta">
                          <span>{log.processed_stage}</span>
                          <span>{formatLogDateTime(log.fecha_hora)}</span>
                        </div>
                        <p>{log.notes}</p>
                        <small>
                          {log.user?.full_name ?? 'Usuario no registrado'} - {log.purpose}
                        </small>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="muted-text">Sin observaciones registradas.</p>
                )}
              </div>
            </div>
          ) : (
            <p className="muted-text">No hay pacientes para mostrar.</p>
          )}
        </section>

        <section className="panel workflow-card">
          <div className="panel-title panel-title-between">
            <div>
              <span className="circle-icon">☷</span>
              <div>
                <h2>Seguimiento del flujo de trabajo</h2>
                {selectedStage && (
                  <div className="workflow-stage-context">
                    <span className={`stage-pill stage-pill-${stageClassByStage[selectedStage]}`}>{selectedStage}</span>
                    <span>{getStageCount(selectedStage)} paciente{getStageCount(selectedStage) === 1 ? '' : 's'} en esta etapa</span>
                  </div>
                )}
              </div>
            </div>
            <div className="workflow-actions">
              {loading && <span className="muted-text">Actualizando...</span>}
            </div>
          </div>

          <div className="table-wrapper">
            <table className="workflow-table">
              <thead>
                <tr>
                  <th className="patient-header">Paciente</th>
                  <th className="ficha-header">Ficha</th>
                  {showPriorityColumn && <th className="priority-header">Prioridad</th>}
                  {visiblePurposes.map((purpose) => (
                    <th key={purpose} className="purpose-header">{purpose}</th>
                  ))}
                  {canShowResimulateColumn && <th className="purpose-header">Resimular</th>}
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => {
                  const canProcessPatient = canProcess(patient);
                  const selectedPurpose = selectedPurposeByPatient[patient.id] ?? null;
                  return (
                    <tr
                      key={patient.id}
                      className={`${selectedPatient?.id === patient.id ? 'selected-row' : ''} ${patient.is_priority ? 'priority-row' : ''}`}
                      onClick={() => setSelectedPatientId(patient.id)}
                    >
                      <td className="patient-column">
                        <div className="patient-cell">
                          <div>
                            <strong title={patient.full_name}>
                              {patient.full_name}
                            </strong>
                            <span title={patient.rut}>{patient.rut}</span>
                            {patient.observation_count > 0 && (
                              <button
                                type="button"
                                className="observation-badge observation-badge-button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleOpenObservations(patient);
                                }}
                                title={`Ver ${patient.observation_count} observación${patient.observation_count === 1 ? '' : 'es'} de ${patient.ficha_label}`}
                              >
                                Obs. {patient.observation_count}
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="center-cell ficha-cell">
                        <span className="ficha-badge">{patient.ficha_label}</span>
                      </td>
                      {showPriorityColumn && (
                        <td className="center-cell priority-cell">
                          <label className={`priority-check ${patient.is_priority || priorityByPatient[patient.id] ? 'priority-check-active' : ''}`}>
                            <input
                              type="checkbox"
                              checked={Boolean(patient.is_priority || priorityByPatient[patient.id])}
                              disabled={!canProcessPatient || patient.is_priority}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) => {
                                if (!canProcessPatient || patient.is_priority) return;
                                const checked = event.target.checked;
                                setPriorityByPatient((current) => ({ ...current, [patient.id]: checked }));
                              }}
                            />
                            <span>{patient.is_priority || priorityByPatient[patient.id] ? '✓' : ''}</span>
                          </label>
                        </td>
                      )}
                      {visiblePurposes.map((purpose) => (
                        <td key={purpose} className="center-cell purpose-cell">
                          <button
                            type="button"
                            className={`purpose-dot ${purpose === 'Fallecido / no disponible' ? 'purpose-dot-square purpose-dot-unavailable' : ''} ${selectedPurpose === purpose ? 'purpose-dot-active' : ''} ${!canProcessPatient ? 'purpose-dot-disabled' : ''}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (!canProcessPatient) return;
                              setSelectedPurposeByPatient((current) => {
                                const next = { ...current };
                                if (next[patient.id] === purpose) {
                                  delete next[patient.id];
                                } else {
                                  next[patient.id] = purpose;
                                }
                                return next;
                              });
                            }}
                            disabled={!canProcessPatient}
                            aria-label={`Seleccionar ${purpose} para ${patient.full_name}`}
                            title={purpose}
                          >
                            {selectedPurpose === purpose ? '✓' : ''}
                          </button>
                        </td>
                      ))}
                      {canShowResimulateColumn && (
                        <td className="center-cell purpose-cell">
                          <button
                            type="button"
                            className={`resimulate-row-button ${!canResimulate(patient) ? 'purpose-dot-disabled' : ''}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (!canResimulate(patient)) return;
                              openResimulateModal(patient);
                            }}
                            disabled={!canResimulate(patient)}
                            title={`Enviar ${patient.ficha_label} a Simulación`}
                            aria-label={`Resimular ${patient.full_name} ${patient.ficha_label}`}
                          >
                            !
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {patients.length === 0 && (
                  <tr>
                    <td colSpan={visiblePurposes.length + 2 + (showPriorityColumn ? 1 : 0) + (canShowResimulateColumn ? 1 : 0)} className="empty-cell">No se encontraron pacientes.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="workflow-footer">
            <div className="muted-text">
              {patients.length} paciente{patients.length === 1 ? '' : 's'} visible · {validSelectedPatientIds.length} listo{validSelectedPatientIds.length === 1 ? '' : 's'} para procesar
            </div>
            <button
              className="primary-button continue-button"
              disabled={validSelectedPatientIds.length === 0 && prioritySelectedPatientIds.length === 0}
              title={validSelectedPatientIds.length === 0 ? 'Selecciona una opción para avanzar' : `Procesar ${validSelectedPatientIds.length} paciente${validSelectedPatientIds.length === 1 ? '' : 's'}`}
              onClick={handleContinueClick}
            >
              {validSelectedPatientIds.length > 1 ? `Procesar ${validSelectedPatientIds.length} pacientes` : 'Continuar con la siguiente etapa →'}
            </button>
          </div>
        </section>

      </div>

      {modalPatientIds.length > 0 && (
        <ProcessModal
          patients={patients.filter((patient) => modalPatientIds.includes(patient.id))}
          purposesByPatient={selectedPurposeByPatient}
          onClose={() => setModalPatientIds([])}
          onConfirm={handleConfirmProcess}
        />
      )}

      {resimulatePatient && (
        <div className="modal-backdrop observations-modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card resimulate-modal-card">
            <div className="modal-header">
              <div className="resimulate-modal-heading">
                <span className="resimulate-warning-icon" aria-hidden="true">!</span>
                <div>
                  <strong>Confirmar resimulación</strong>
                  <span>{resimulatePatient.full_name} - {resimulatePatient.rut} - {resimulatePatient.ficha_label}</span>
                </div>
              </div>
              <button
                className="icon-button modal-close-button"
                type="button"
                onClick={() => setResimulatePatient(null)}
                disabled={resimulating}
                aria-label="Cerrar resimulación"
              >
                x
              </button>
            </div>

            <div className="modal-body">
              <div className="resimulate-warning-panel">
                Esta acción enviará la ficha desde <strong>{resimulatePatient.current_stage}</strong> a <strong>Simulación</strong> y quedará registrada en el historial.
              </div>

              <label className="field-label" htmlFor="resimulate-notes">Observación</label>
              <textarea
                id="resimulate-notes"
                rows={4}
                placeholder="Opcional, explique el motivo de la resimulación"
                value={resimulateNotes}
                onChange={(event) => setResimulateNotes(event.target.value)}
                disabled={resimulating}
              />

              <label className="field-label" htmlFor="resimulate-password">Clave del usuario en sesión</label>
              <input
                id="resimulate-password"
                type="password"
                placeholder="Escriba su clave para confirmar"
                value={resimulatePassword}
                onChange={(event) => {
                  setResimulatePassword(event.target.value);
                  if (resimulateError) setResimulateError('');
                }}
                disabled={resimulating}
                aria-invalid={Boolean(resimulateError)}
              />
              {resimulateError && <div className="resimulate-error">{resimulateError}</div>}
            </div>

            <div className="modal-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setResimulatePatient(null)}
                disabled={resimulating}
              >
                Cancelar
              </button>
              <button
                className="danger-button"
                type="button"
                onClick={handleResimulate}
                disabled={resimulating || !resimulatePassword.trim()}
              >
                {resimulating ? 'Confirmando...' : 'Confirmar resimulación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {observationsModalPatient && (
        <div className="modal-backdrop observations-modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card observations-modal-card">
            <div className="modal-header">
              <div>
                <strong>Observaciones de ficha</strong>
                <span>{observationsModalPatient.full_name} - {observationsModalPatient.rut} - {observationsModalPatient.ficha_label}</span>
              </div>
              <button
                className="icon-button modal-close-button"
                type="button"
                onClick={() => setObservationsModalPatient(null)}
                aria-label="Cerrar observaciones"
              >
                x
              </button>
            </div>

            <div className="modal-body">
              {loadingObservationsModal ? (
                <p className="muted-text">Cargando observaciones...</p>
              ) : observationsModalLogs.length > 0 ? (
                <div className="observations-modal-list">
                  {observationsModalLogs.map((log) => (
                    <article key={log.id} className="observation-item observation-item-modal">
                      <div className="observation-meta">
                        <span>{log.processed_stage}</span>
                        <span>{formatLogDateTime(log.fecha_hora)}</span>
                      </div>
                      <p>{log.notes}</p>
                      <small>{log.user?.full_name ?? 'Usuario no registrado'} - {log.purpose}</small>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="muted-text">Esta ficha no tiene observaciones registradas.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {fichaPatientToCreate && (
        <div className="modal-backdrop">
          <div className="modal-card ficha-modal-card">
            <div className="modal-header">
              <div>
                <strong>Confirmar nueva ficha</strong>
                <span>Revise los datos antes de crear una ficha adicional para este paciente.</span>
              </div>
              <button
                className="icon-button modal-close-button"
                type="button"
                onClick={() => setFichaPatientToCreate(null)}
                disabled={creatingFicha}
                aria-label="Cerrar"
              >
                x
              </button>
            </div>

            <div className="modal-body">
              <div className="ficha-confirmation">
                <p>
                  ¿Desea crear una nueva ficha para el paciente <strong>{fichaPatientToCreate.full_name}</strong>?
                </p>
                <div className="ficha-confirmation-grid">
                  <div>
                    <span>Paciente</span>
                    <strong>{fichaPatientToCreate.full_name}</strong>
                  </div>
                  <div>
                    <span>RUT</span>
                    <strong>{fichaPatientToCreate.rut}</strong>
                  </div>
                  <div className={`ficha-stage-confirmation ficha-stage-confirmation-${stageClassByStage[fichaPatientToCreate.current_stage]}`}>
                    <span>Etapa de creación</span>
                    <strong className={`stage-pill stage-pill-${stageClassByStage[fichaPatientToCreate.current_stage]}`}>{fichaPatientToCreate.current_stage}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setFichaPatientToCreate(null)}
                disabled={creatingFicha}
              >
                Cancelar
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={handleCreateFicha}
                disabled={creatingFicha}
              >
                {creatingFicha ? 'Creando...' : 'Crear nueva ficha'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: number; tone: 'primary' | 'success' | 'stage' | 'muted' }) {
  return (
    <section className={`metric-card metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </section>
  );
}

function InfoRow({ label, value, strong = false, stageClass }: { label: string; value: string; strong?: boolean; stageClass?: string }) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong className={`${strong ? 'blue-text' : ''} ${stageClass ? `stage-text stage-text-${stageClass}` : ''}`}>{value || '-'}</strong>
    </div>
  );
}
