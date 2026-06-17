import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { patientsApi, workflowApi } from '../api/client';
import { ProcessModal } from '../components/ProcessModal';
import { StageCard } from '../components/StageCard';
import { useAuth } from '../context/AuthContext';
import type { Patient, Purpose, Stage, StageSummaryItem } from '../types/domain';

const ALL_STAGES: Stage[] = ['Dosimetría', 'Física Médica', 'Impresión', 'Enfermería', 'Citación'];
const PURPOSES_BY_STAGE: Record<Exclude<Stage, 'Finalizado'>, Purpose[]> = {
  Dosimetría: ['Medición', 'Física Médica'],
  'Física Médica': ['Medición', 'Planificación', 'Replanificación', 'Calcular Dosis'],
  Impresión: ['Imprimir', 'Devolver a Física Médica'],
  Enfermería: ['Recepción'],
  Citación: ['Recepción'],
};
const REQUIRED_ROLES: Record<Stage, string[]> = {
  Dosimetría: ['Físico Médico', 'Tecnólogo Médico'],
  'Física Médica': ['Físico Médico'],
  Impresión: ['Tecnólogo Médico'],
  Enfermería: ['Enfermero/a'],
  Citación: ['Tecnólogo Médico'],
  Finalizado: [],
};

function getNextStage(stage: Stage, purpose?: Purpose): Stage {
  if (stage === 'Impresión' && purpose === 'Devolver a Física Médica') return 'Física Médica';
  if (stage === 'Dosimetría') return 'Física Médica';
  if (stage === 'Física Médica') return 'Impresión';
  if (stage === 'Impresión') return 'Enfermería';
  if (stage === 'Enfermería') return 'Citación';
  if (stage === 'Citación') return 'Finalizado';
  return 'Finalizado';
}

const stageClassByStage: Record<Stage, string> = {
  Dosimetría: 'dosimetria',
  'Física Médica': 'fisica',
  Impresión: 'impresion',
  Enfermería: 'enfermeria',
  Citación: 'citacion',
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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);

  const availableStages = user?.processable_stages ?? [];
  const isStageAccessible = (stage: Stage) => {
    if (!user) return false;
    if (user.role === 'Admin') return true;
    return REQUIRED_ROLES[stage].includes(user.role);
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

  const canProcess = (patient: Patient | null): boolean => {
    if (!patient || !user || patient.current_stage === 'Finalizado') return false;
    if (user.role === 'Admin') return true;
    return REQUIRED_ROLES[patient.current_stage].includes(user.role);
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

  const processTooltip = (patient: Patient | null): string => {
    if (!patient) return 'Selecciona un paciente';
    if (patient.current_stage === 'Finalizado') return 'Paciente finalizado';
    if (canProcess(patient)) return 'Procesar etapa actual';
    return `Tu rol (${user?.role}) no puede procesar ${patient.current_stage}`;
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage('');
    try {
      const result = await patientsApi.uploadTxt(file);
      setMessage(`Carga lista: ${result.inserted} insertados, ${result.skipped} omitidos. ${result.errors.length ? 'Con errores.' : ''}`);
      await loadData(query, selectedStage);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo cargar el archivo');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleConfirmProcess = async (notes?: string) => {
    if (modalPatientIds.length === 0) return;
    setMessage('');
    const processedStage = patients.find((patient) => patient.id === modalPatientIds[0])?.current_stage ?? selectedStage;
    const firstPurpose = modalPatientIds[0] ? selectedPurposeByPatient[modalPatientIds[0]] : undefined;
    const nextStage = processedStage ? getNextStage(processedStage, firstPurpose) : undefined;
    try {
      await Promise.all(
        modalPatientIds.map((id) => workflowApi.processPatient(id, selectedPurposeByPatient[id], notes)),
      );
      setModalPatientIds([]);
      if (nextStage && nextStage !== 'Finalizado' && isStageAccessible(nextStage)) {
        setSelectedStage(nextStage);
      } else {
        await loadData(query);
      }
      const destination = nextStage ?? 'la siguiente etapa';
      setMessage(`${modalPatientIds.length} paciente${modalPatientIds.length === 1 ? '' : 's'} avanzado${modalPatientIds.length === 1 ? '' : 's'} a ${destination}.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo procesar la etapa');
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
        <label className="upload-button">
          {uploading ? 'Cargando...' : 'Cargar TXT'}
          <input type="file" accept=".txt" onChange={handleUpload} disabled={uploading} />
        </label>
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
              <InfoRow label="Etapa actual" value={selectedPatient.current_stage} strong stageClass={stageClassByStage[selectedPatient.current_stage]} />
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
            {loading && <span className="muted-text">Actualizando...</span>}
          </div>

          <div className="table-wrapper">
            <table className="workflow-table">
              <thead>
                <tr>
                  <th>Paciente</th>
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
                      className={selectedPatient?.id === patient.id ? 'selected-row' : ''}
                      onClick={() => setSelectedPatientId(patient.id)}
                    >
                      <td>
                        <div className="patient-cell">
                          <div>
                            <strong>{patient.full_name}</strong>
                            <span>{patient.rut}</span>
                          </div>
                        </div>
                      </td>
                      {visiblePurposes.map((purpose) => (
                        <td key={purpose} className="center-cell purpose-cell">
                          <button
                            type="button"
                            className={`purpose-dot ${selectedPurpose === purpose ? 'purpose-dot-active' : ''} ${!canProcessPatient ? 'purpose-dot-disabled' : ''}`}
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
                    <td colSpan={visiblePurposes.length + 1} className="empty-cell">No se encontraron pacientes.</td>
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
              disabled={validSelectedPatientIds.length === 0}
              title={validSelectedPatientIds.length === 0 ? 'Selecciona una opción para avanzar' : `Procesar ${validSelectedPatientIds.length} paciente${validSelectedPatientIds.length === 1 ? '' : 's'}`}
              onClick={() => validSelectedPatientIds.length > 0 && setModalPatientIds(validSelectedPatientIds)}
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
