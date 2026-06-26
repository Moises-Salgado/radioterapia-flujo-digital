import { useEffect, useMemo, useState } from 'react';
import { patientsApi, workflowApi } from '../api/client';
import { ProcessModal } from '../components/ProcessModal';
import { StageCard } from '../components/StageCard';
import { useAuth } from '../context/AuthContext';
import type { Patient, Purpose, Stage, StageSummaryItem } from '../types/domain';

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

  const loadData = async (search = query, stage = selectedStage) => {
    setLoading(true);
    try {
      const [patientsResponse, summaryResponse] = await Promise.all([
        patientsApi.list(search.trim() || undefined, stage || undefined),
        workflowApi.summary(),
      ]);
      setPatients(patientsResponse);
      setSummary(summaryResponse.stages);
      if (!selectedPatientId && patientsResponse.length > 0) setSelectedPatientId(patientsResponse[0].id);
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

  const getStageCount = (stage: Stage) => summary.find((item) => item.stage === stage)?.count ?? 0;
  const activePatientsCount = ALL_STAGES.reduce((total, stage) => total + getStageCount(stage), 0);
  const accessiblePatientsCount = accessibleStages.reduce((total, stage) => total + getStageCount(stage), 0);
  const finalizadosCount = getStageCount('Finalizado');
  const fichaCreationStages: Stage[] = ['Dosimetría', 'Física Médica'];
  const showPriorityColumn = selectedStage === 'Dosimetría';

  const canProcess = (patient: Patient | null): boolean => {
    if (!patient || !user || patient.current_stage === 'Finalizado') return false;
    if (user.role === 'Admin') return true;
    return availableStages.includes(patient.current_stage);
  };

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

  const handleConfirmProcess = async (notes?: string) => {
    if (modalPatientIds.length === 0) return;
    setMessage('');
    const processedStage = patients.find((patient) => patient.id === modalPatientIds[0])?.current_stage ?? selectedStage;
    const firstPurpose = modalPatientIds[0] ? selectedPurposeByPatient[modalPatientIds[0]] : undefined;
    const nextStage = processedStage ? getNextStage(processedStage, firstPurpose) : undefined;
    try {
      const priorityIdsToSave = prioritySelectedPatientIds;
      await Promise.all(priorityIdsToSave.map((id) => patientsApi.updatePriority(id, true)));
      await Promise.all(
        modalPatientIds.map((id) => workflowApi.processPatient(id, selectedPurposeByPatient[id], notes)),
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
                    </tr>
                  );
                })}
                {patients.length === 0 && (
                  <tr>
                    <td colSpan={visiblePurposes.length + 2 + (showPriorityColumn ? 1 : 0)} className="empty-cell">No se encontraron pacientes.</td>
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
