import React, { useCallback, useEffect, useState } from 'react';
import {
  Baby,
  Bell,
  CalendarPlus,
  CheckCircle2,
  ClipboardEdit,
  HeartPulse,
  Plus,
  ShieldAlert,
  Syringe,
  UserPlus,
  X,
} from 'lucide-react';
import {
  calculateNewbornGrowthSummary,
  calculatePregnancyStage,
  summarizeVaccinationProgress,
} from '../shared/connectivityEngine';
import type {
  HealthcareMode,
  NewbornModePatientItem,
  PregnancyModePatientItem,
  VaccinationModePatientItem,
  VaccinationStatus,
} from '../shared/types';
import { api } from '../utils/apiClient';

interface HealthcareModeWorkspaceProps {
  activeMode: HealthcareMode;
  onChangeMode: (mode: HealthcareMode) => void;
  onRefreshDashboard: () => void;
  onStartVoiceVisit?: (visitType: 'ANC' | 'NEWBORN' | 'IMMUNISATION') => void;
}

export const HealthcareModeWorkspace: React.FC<HealthcareModeWorkspaceProps> = ({
  activeMode,
  onChangeMode,
  onRefreshDashboard,
  onStartVoiceVisit,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [pregnancyPatients, setPregnancyPatients] = useState<PregnancyModePatientItem[]>([]);
  const [newbornPatients, setNewbornPatients] = useState<NewbornModePatientItem[]>([]);
  const [vaccinationPatients, setVaccinationPatients] = useState<VaccinationModePatientItem[]>([]);

  // Register patient modal state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regAge, setRegAge] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regLocality, setRegLocality] = useState('Devanahalli Ward 4');
  const [regConsent, setRegConsent] = useState(true);
  const [regPregWeeks, setRegPregWeeks] = useState('16');
  const [regEdd, setRegEdd] = useState('');
  const [regMotherName, setRegMotherName] = useState('');
  const [regBirthDate, setRegBirthDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [regBirthWeight, setRegBirthWeight] = useState('2.8');
  const [regVaccineName, setRegVaccineName] = useState('OPV-1 & Pentavalent-1');
  const [regVaccineDue, setRegVaccineDue] = useState(() => new Date().toISOString().slice(0, 10));
  const [submittingReg, setSubmittingReg] = useState(false);

  // Edit Pregnancy modal state
  const [editingPreg, setEditingPreg] = useState<PregnancyModePatientItem | null>(null);
  const [pregStage, setPregStage] = useState('Second Trimester');
  const [pregWeeks, setPregWeeks] = useState('');
  const [pregEdd, setPregEdd] = useState('');
  const [pregBp, setPregBp] = useState('');
  const [pregWeight, setPregWeight] = useState('');
  const [pregHb, setPregHb] = useState('');
  const [pregAncCount, setPregAncCount] = useState('1');
  const [pregIfa, setPregIfa] = useState('Taking daily');
  const [pregRisk, setPregRisk] = useState<'NORMAL' | 'MONITOR' | 'HIGH_RISK'>('NORMAL');
  const [pregNotes, setPregNotes] = useState('');
  const [pregNextDate, setPregNextDate] = useState('');

  // Schedule Appointment modal state
  const [apptTarget, setApptTarget] = useState<{
    patientId: string;
    patientName: string;
    mode: HealthcareMode;
  } | null>(null);
  const [apptTitle, setApptTitle] = useState('');
  const [apptDate, setApptDate] = useState('');
  const [apptTime, setApptTime] = useState('10:00 AM');
  const [apptLocation, setApptLocation] = useState('Devanahalli PHC');
  const [apptNotes, setApptNotes] = useState('');

  // Edit Newborn modal state
  const [editingNb, setEditingNb] = useState<NewbornModePatientItem | null>(null);
  const [nbCurrentWeight, setNbCurrentWeight] = useState('');
  const [nbLength, setNbLength] = useState('');
  const [nbTemp, setNbTemp] = useState('98.4 F');
  const [nbFeeding, setNbFeeding] = useState('Exclusive breastfeeding well');
  const [nbVisits, setNbVisits] = useState('1');
  const [nbNotes, setNbNotes] = useState('');
  const [nbNextDate, setNbNextDate] = useState('');

  // Add Vaccine modal state
  const [vaccTarget, setVaccTarget] = useState<VaccinationModePatientItem | null>(null);
  const [newVaccName, setNewVaccName] = useState('');
  const [newVaccDose, setNewVaccDose] = useState('Scheduled Dose');
  const [newVaccDue, setNewVaccDue] = useState('');
  const [newVaccStatus, setNewVaccStatus] = useState<VaccinationStatus>('SCHEDULED');

  const loadModeData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pRes, nRes, vRes] = await Promise.all([
        api.getPregnancyModePatients(),
        api.getNewbornModePatients(),
        api.getVaccinationModePatients(),
      ]);
      setPregnancyPatients(pRes.patients);
      setNewbornPatients(nRes.patients);
      setVaccinationPatients(vRes.patients);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load healthcare mode records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadModeData();
  }, [loadModeData]);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) return;
    setSubmittingReg(true);
    setError(null);
    try {
      const res = await api.registerAndConnectPatient({
        fullName: regName.trim(),
        username: regUsername.trim() || undefined,
        age: regAge ? Number(regAge) : undefined,
        phone: regPhone.trim() || undefined,
        locality: regLocality.trim() || undefined,
        assignedMode: activeMode,
        consentGranted: regConsent,
        gestationalWeeks: activeMode === 'PREGNANCY' && regPregWeeks ? Number(regPregWeeks) : undefined,
        expectedDeliveryDate: activeMode === 'PREGNANCY' && regEdd ? regEdd : undefined,
        babyName: activeMode === 'NEWBORN_CARE' ? regName.trim() : undefined,
        motherName: activeMode === 'NEWBORN_CARE' ? regMotherName.trim() || 'Mother' : undefined,
        birthDate: activeMode === 'NEWBORN_CARE' ? regBirthDate : undefined,
        birthWeightKg: activeMode === 'NEWBORN_CARE' && regBirthWeight ? Number(regBirthWeight) : undefined,
        initialVaccineName: activeMode === 'VACCINATION' ? regVaccineName : undefined,
        initialVaccineDueDate: activeMode === 'VACCINATION' ? regVaccineDue : undefined,
      });
      setStatusMsg(
        `Registered ${res.patient.fullName} (${res.patientUniqueId}) and connected to your account.`,
      );
      setShowRegisterModal(false);
      setRegName('');
      setRegUsername('');
      setRegAge('');
      setRegPhone('');
      await loadModeData();
      onRefreshDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register patient');
    } finally {
      setSubmittingReg(false);
    }
  };

  const openEditPregnancy = (item: PregnancyModePatientItem) => {
    setEditingPreg(item);
    setPregStage(item.record?.pregnancyStage ?? 'Second Trimester');
    setPregWeeks(item.record?.gestationalWeeks != null ? String(item.record.gestationalWeeks) : '');
    setPregEdd(item.record?.expectedDeliveryDate ?? '');
    setPregBp(item.record?.bloodPressure ?? '');
    setPregWeight(item.record?.weightKg != null ? String(item.record.weightKg) : '');
    setPregHb(item.record?.hemoglobinGDl != null ? String(item.record.hemoglobinGDl) : '');
    setPregAncCount(String((item.record?.ancVisitsCompleted ?? 0) + 1));
    setPregIfa(item.record?.ifaTabletsStatus ?? 'Taking daily');
    setPregRisk(item.record?.riskLevel ?? 'NORMAL');
    setPregNotes(item.record?.visitNotes ?? '');
    setPregNextDate(item.record?.nextCheckupDate ?? '');
  };

  const handleSavePregnancy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPreg) return;
    try {
      await api.updatePregnancyRecord(editingPreg.patient.id, {
        pregnancyStage: pregStage,
        gestationalWeeks: pregWeeks ? Number(pregWeeks) : null,
        expectedDeliveryDate: pregEdd || null,
        bloodPressure: pregBp || null,
        weightKg: pregWeight ? Number(pregWeight) : null,
        hemoglobinGDl: pregHb ? Number(pregHb) : null,
        ancVisitsCompleted: Number(pregAncCount) || 1,
        ifaTabletsStatus: pregIfa || null,
        riskLevel: pregRisk,
        visitNotes: pregNotes || null,
        nextCheckupDate: pregNextDate || null,
        sendReminder: true,
      });
      setStatusMsg(`Updated pregnancy record for ${editingPreg.patient.fullName} and notified patient.`);
      setEditingPreg(null);
      await loadModeData();
      onRefreshDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update pregnancy record');
    }
  };

  const handleScheduleAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apptTarget || !apptTitle.trim() || !apptDate) return;
    try {
      await api.scheduleModeAppointment(apptTarget.patientId, {
        title: apptTitle.trim(),
        scheduledDate: apptDate,
        scheduledTime: apptTime,
        location: apptLocation,
        notes: apptNotes,
        sendReminder: true,
        healthcareMode: apptTarget.mode,
      });
      setStatusMsg(`Scheduled checkup & sent reminder to ${apptTarget.patientName}.`);
      setApptTarget(null);
      setApptTitle('');
      setApptNotes('');
      await loadModeData();
      onRefreshDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule checkup');
    }
  };

  const openEditNewborn = (item: NewbornModePatientItem) => {
    setEditingNb(item);
    setNbCurrentWeight(item.record?.currentWeightKg != null ? String(item.record.currentWeightKg) : '');
    setNbLength(item.record?.lengthCm != null ? String(item.record.lengthCm) : '');
    setNbTemp(item.record?.temperature ?? '98.4 F');
    setNbFeeding(item.record?.feedingStatus ?? 'Exclusive breastfeeding well');
    setNbVisits(String((item.record?.hbncVisitsCompleted ?? 0) + 1));
    setNbNotes(item.record?.healthNotes ?? '');
    setNbNextDate(item.record?.nextCheckupDate ?? '');
  };

  const handleSaveNewborn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNb) return;
    try {
      await api.updateNewbornRecord(editingNb.patient.id, {
        babyName: editingNb.record?.babyName ?? editingNb.patient.fullName,
        motherName: editingNb.record?.motherName ?? 'Mother',
        birthDate: editingNb.record?.birthDate ?? new Date().toISOString().slice(0, 10),
        birthWeightKg: editingNb.record?.birthWeightKg ?? null,
        currentWeightKg: nbCurrentWeight ? Number(nbCurrentWeight) : null,
        lengthCm: nbLength ? Number(nbLength) : null,
        temperature: nbTemp || null,
        feedingStatus: nbFeeding || null,
        hbncVisitsCompleted: Number(nbVisits) || 1,
        healthNotes: nbNotes || null,
        nextCheckupDate: nbNextDate || null,
        sendReminder: true,
      });
      setStatusMsg(`Updated newborn record for ${editingNb.patient.fullName} and sent care reminder.`);
      setEditingNb(null);
      await loadModeData();
      onRefreshDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update newborn record');
    }
  };

  const handleAddVaccine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaccTarget || !newVaccName.trim() || !newVaccDue) return;
    try {
      await api.addVaccinationRecord(vaccTarget.patient.id, {
        vaccineName: newVaccName.trim(),
        doseLabel: newVaccDose.trim() || 'Scheduled Dose',
        dueDate: newVaccDue,
        status: newVaccStatus,
        sendReminder: true,
      });
      setStatusMsg(`Added ${newVaccName.trim()} for ${vaccTarget.patient.fullName} & sent reminder.`);
      setVaccTarget(null);
      setNewVaccName('');
      await loadModeData();
      onRefreshDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add vaccine record');
    }
  };

  const handleToggleVaccineStatus = async (
    patientName: string,
    recordId: string,
    nextStatus: VaccinationStatus,
    sendReminder = false,
  ) => {
    try {
      await api.updateVaccinationStatus(recordId, {
        status: nextStatus,
        sendReminder,
      });
      setStatusMsg(
        sendReminder
          ? `Sent vaccination reminder to ${patientName}.`
          : `Updated vaccination status for ${patientName} to ${nextStatus}.`,
      );
      await loadModeData();
      onRefreshDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update vaccination');
    }
  };

  const handleSendModeReminder = async (
    patientId: string,
    patientName: string,
    mode: HealthcareMode,
  ) => {
    const type =
      mode === 'PREGNANCY'
        ? 'ANC_REMINDER'
        : mode === 'NEWBORN_CARE'
          ? 'NEWBORN_REMINDER'
          : 'VACCINATION_REMINDER';
    const title =
      mode === 'PREGNANCY'
        ? 'Antenatal Checkup Reminder'
        : mode === 'NEWBORN_CARE'
          ? 'Newborn HBNC Checkup Reminder'
          : 'Upcoming Vaccination Reminder';
    const message =
      mode === 'PREGNANCY'
        ? 'Please remember your upcoming antenatal checkup and daily IFA tablets.'
        : mode === 'NEWBORN_CARE'
          ? 'Reminder for your baby’s scheduled weight & feeding checkup.'
          : 'Your child has an upcoming vaccination session scheduled. Please bring the MCP card.';

    try {
      await api.sendCareReminder({ patientId, notificationType: type, title, message });
      setStatusMsg(`Reminder sent to ${patientName}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reminder');
    }
  };

  const modeTabs: Array<{
    id: HealthcareMode;
    label: string;
    count: number;
    icon: React.ComponentType<{ className?: string }>;
    badgeClass: string;
  }> = [
    {
      id: 'PREGNANCY',
      label: 'Pregnancy Mode',
      count: pregnancyPatients.length,
      icon: HeartPulse,
      badgeClass: 'bg-[#E8F7F1] text-[#087F75]',
    },
    {
      id: 'NEWBORN_CARE',
      label: 'Newborn Care Mode',
      count: newbornPatients.length,
      icon: Baby,
      badgeClass: 'bg-[#EDF5FF] text-[#2563EB]',
    },
    {
      id: 'VACCINATION',
      label: 'Vaccination Mode',
      count: vaccinationPatients.length,
      icon: Syringe,
      badgeClass: 'bg-amber-50 text-[#D97706]',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Mode Selector Header */}
      <section className="rounded-2xl border border-[#E7EDF2] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-[#172B3A]">
              Healthcare Modes Workspace
            </h2>
            <p className="mt-1 text-xs text-[#718096]">
              Dedicated clinical management for Pregnancy, Newborn Care, and Vaccination patients.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onStartVoiceVisit && (
              <button
                type="button"
                onClick={() =>
                  onStartVoiceVisit(
                    activeMode === 'PREGNANCY'
                      ? 'ANC'
                      : activeMode === 'NEWBORN_CARE'
                        ? 'NEWBORN'
                        : 'IMMUNISATION',
                  )
                }
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-[#087F75] bg-white px-4 py-2 text-xs font-bold text-[#087F75] hover:bg-[#E8F7F1]"
              >
                Record Voice Visit
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowRegisterModal(true)}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[#087F75] px-4 py-2 text-xs font-bold text-white hover:bg-[#066860]"
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              <span>
                Register{' '}
                {activeMode === 'PREGNANCY'
                  ? 'Pregnant Patient'
                  : activeMode === 'NEWBORN_CARE'
                    ? 'Newborn'
                    : 'Vaccination Patient'}
              </span>
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {modeTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusMsg(null);
                  setError(null);
                  onChangeMode(tab.id);
                }}
                className={`flex min-h-[60px] items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                  active
                    ? 'border-[#087F75] bg-[#E8F7F1]/70 shadow-xs'
                    : 'border-[#E7EDF2] bg-[#F7F9FC] hover:border-[#087F75]/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${tab.badgeClass}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <div className="font-display text-sm font-bold text-[#172B3A]">
                      {tab.label}
                    </div>
                    <div className="font-mono text-[11px] text-[#718096]">
                      {tab.count} {tab.count === 1 ? 'patient' : 'patients'}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {statusMsg && (
        <div
          role="status"
          className="flex items-center justify-between gap-2 rounded-2xl border border-[#A7F3D0] bg-[#E8F7F1] px-4 py-3 text-xs font-semibold text-[#064E3B]"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#10A77A]" aria-hidden="true" />
            {statusMsg}
          </span>
          <button type="button" onClick={() => setStatusMsg(null)} aria-label="Dismiss">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-[#991B1B]"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-[#E7EDF2] bg-white p-8 text-center text-sm text-[#718096]">
          Loading healthcare mode records...
        </div>
      ) : (
        <>
          {/* PREGNANCY MODE */}
          {activeMode === 'PREGNANCY' && (
            <section className="space-y-4">
              {pregnancyPatients.length === 0 ? (
                <div className="rounded-2xl border border-[#E7EDF2] bg-white p-8 text-center text-sm text-[#718096]">
                  No connected pregnant patients yet. Register a pregnant patient above to start tracking.
                </div>
              ) : (
                pregnancyPatients.map((item) => {
                  const stage = calculatePregnancyStage(
                    item.record?.gestationalWeeks ?? null,
                    item.record?.expectedDeliveryDate ?? null,
                  );
                  return (
                    <article
                      key={item.patient.id}
                      className="rounded-2xl border border-[#E7EDF2] bg-white p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E7EDF2] pb-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-display text-lg font-bold text-[#172B3A]">
                              {item.patient.fullName}
                            </h3>
                            <span className="rounded-md bg-[#E8F7F1] px-2 py-0.5 font-mono text-xs font-bold text-[#087F75]">
                              {item.patient.patientUniqueId}
                            </span>
                            {item.record?.riskLevel && item.record.riskLevel !== 'NORMAL' && (
                              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                                {item.record.riskLevel}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-[#718096]">
                            {item.patient.locality ?? 'Ward 4'} · Age {item.patient.age ?? '—'} ·{' '}
                            {stage.stageLabel}
                            {stage.weeksRemaining !== null
                              ? ` · ~${stage.weeksRemaining} wks to EDD`
                              : ''}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEditPregnancy(item)}
                            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#087F75] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#066860]"
                          >
                            <ClipboardEdit className="h-3.5 w-3.5" aria-hidden="true" />
                            Update Record
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setApptTarget({
                                patientId: item.patient.id,
                                patientName: item.patient.fullName,
                                mode: 'PREGNANCY',
                              });
                              setApptTitle('Antenatal Checkup (ANC)');
                              setApptDate(
                                item.record?.nextCheckupDate ??
                                  new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
                              );
                            }}
                            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-3 py-1.5 text-xs font-semibold text-[#172B3A] hover:border-[#087F75]"
                          >
                            <CalendarPlus className="h-3.5 w-3.5 text-[#087F75]" aria-hidden="true" />
                            Schedule ANC
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void handleSendModeReminder(
                                item.patient.id,
                                item.patient.fullName,
                                'PREGNANCY',
                              )
                            }
                            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#E7EDF2] bg-white px-3 py-1.5 text-xs font-semibold text-[#087F75] hover:bg-[#E8F7F1]"
                          >
                            <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                            Remind
                          </button>
                        </div>
                      </div>

                      {!item.consentGranted && (
                        <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                          <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>
                            Patient has not granted clinical detail sharing consent. Sensitive vitals are masked until consent is granted.
                          </span>
                        </div>
                      )}

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                        <div className="rounded-xl bg-[#F7F9FC] p-3">
                          <div className="text-[11px] font-semibold text-[#718096]">EDD</div>
                          <div className="mt-0.5 font-mono text-xs font-bold text-[#172B3A]">
                            {item.record?.expectedDeliveryDate ?? 'Not set'}
                          </div>
                        </div>
                        <div className="rounded-xl bg-[#F7F9FC] p-3">
                          <div className="text-[11px] font-semibold text-[#718096]">BP / Weight</div>
                          <div className="mt-0.5 font-mono text-xs font-bold text-[#172B3A]">
                            {item.record?.bloodPressure ?? '—'} ·{' '}
                            {item.record?.weightKg != null ? `${item.record.weightKg} kg` : '—'}
                          </div>
                        </div>
                        <div className="rounded-xl bg-[#F7F9FC] p-3">
                          <div className="text-[11px] font-semibold text-[#718096]">Hemoglobin</div>
                          <div className="mt-0.5 font-mono text-xs font-bold text-[#172B3A]">
                            {item.record?.hemoglobinGDl != null
                              ? `${item.record.hemoglobinGDl} g/dL`
                              : '—'}
                          </div>
                        </div>
                        <div className="rounded-xl bg-[#F7F9FC] p-3">
                          <div className="text-[11px] font-semibold text-[#718096]">ANC Visits / IFA</div>
                          <div className="mt-0.5 text-xs font-bold text-[#172B3A]">
                            {item.record?.ancVisitsCompleted ?? 0} visits ·{' '}
                            {item.record?.ifaTabletsStatus ?? '—'}
                          </div>
                        </div>
                        <div className="rounded-xl bg-[#F7F9FC] p-3">
                          <div className="text-[11px] font-semibold text-[#718096]">Next Checkup</div>
                          <div className="mt-0.5 font-mono text-xs font-bold text-[#087F75]">
                            {item.record?.nextCheckupDate ?? 'Schedule ANC'}
                          </div>
                        </div>
                      </div>

                      {item.record?.visitNotes && (
                        <p className="mt-3 rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-3 py-2 text-xs text-[#172B3A]">
                          <span className="font-bold">Visit Notes:</span> {item.record.visitNotes}
                        </p>
                      )}

                      {item.appointments.length > 0 && (
                        <div className="mt-3 border-t border-[#E7EDF2] pt-3">
                          <div className="text-[11px] font-bold text-[#718096]">
                            Upcoming Antenatal Checkups ({item.appointments.length})
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-2">
                            {item.appointments.map((ap) => (
                              <div
                                key={ap.id}
                                className="rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-3 py-1.5 text-xs"
                              >
                                <span className="font-bold text-[#172B3A]">{ap.title}</span> ·{' '}
                                <span className="font-mono text-[#087F75]">{ap.scheduledDate}</span>{' '}
                                {ap.scheduledTime ? `(${ap.scheduledTime})` : ''}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </section>
          )}

          {/* NEWBORN CARE MODE */}
          {activeMode === 'NEWBORN_CARE' && (
            <section className="space-y-4">
              {newbornPatients.length === 0 ? (
                <div className="rounded-2xl border border-[#E7EDF2] bg-white p-8 text-center text-sm text-[#718096]">
                  No connected newborn patients yet. Register a newborn above to begin growth & HBNC tracking.
                </div>
              ) : (
                newbornPatients.map((item) => {
                  const growth = calculateNewbornGrowthSummary(
                    item.record?.birthWeightKg ?? null,
                    item.record?.currentWeightKg ?? null,
                    item.record?.birthDate ?? null,
                  );
                  return (
                    <article
                      key={item.patient.id}
                      className="rounded-2xl border border-[#E7EDF2] bg-white p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E7EDF2] pb-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-display text-lg font-bold text-[#172B3A]">
                              {item.record?.babyName ?? item.patient.fullName}
                            </h3>
                            <span className="rounded-md bg-[#EDF5FF] px-2 py-0.5 font-mono text-xs font-bold text-[#2563EB]">
                              {item.patient.patientUniqueId}
                            </span>
                            <span
                              className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                growth.growthStatus === 'THRIVING'
                                  ? 'bg-[#E8F7F1] text-[#087F75]'
                                  : growth.growthStatus === 'NEEDS_ATTENTION'
                                    ? 'bg-red-100 text-[#991B1B]'
                                    : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {growth.growthStatus}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[#718096]">
                            Mother: {item.record?.motherName ?? '—'} · DOB:{' '}
                            {item.record?.birthDate ?? '—'}
                            {growth.ageDays !== null ? ` (${growth.ageDays} days old)` : ''}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEditNewborn(item)}
                            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#087F75] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#066860]"
                          >
                            <ClipboardEdit className="h-3.5 w-3.5" aria-hidden="true" />
                            Update Growth & Checkup
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setApptTarget({
                                patientId: item.patient.id,
                                patientName: item.patient.fullName,
                                mode: 'NEWBORN_CARE',
                              });
                              setApptTitle('HBNC Newborn Weight & Feeding Check');
                              setApptDate(
                                item.record?.nextCheckupDate ??
                                  new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
                              );
                            }}
                            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-3 py-1.5 text-xs font-semibold text-[#172B3A] hover:border-[#087F75]"
                          >
                            <CalendarPlus className="h-3.5 w-3.5 text-[#087F75]" aria-hidden="true" />
                            Schedule Checkup
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void handleSendModeReminder(
                                item.patient.id,
                                item.patient.fullName,
                                'NEWBORN_CARE',
                              )
                            }
                            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#E7EDF2] bg-white px-3 py-1.5 text-xs font-semibold text-[#087F75] hover:bg-[#E8F7F1]"
                          >
                            <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                            Remind
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                        <div className="rounded-xl bg-[#F7F9FC] p-3">
                          <div className="text-[11px] font-semibold text-[#718096]">Birth Weight</div>
                          <div className="mt-0.5 font-mono text-xs font-bold text-[#172B3A]">
                            {item.record?.birthWeightKg != null
                              ? `${item.record.birthWeightKg} kg`
                              : '—'}
                          </div>
                        </div>
                        <div className="rounded-xl bg-[#F7F9FC] p-3">
                          <div className="text-[11px] font-semibold text-[#718096]">Current Weight</div>
                          <div className="mt-0.5 font-mono text-xs font-bold text-[#172B3A]">
                            {item.record?.currentWeightKg != null
                              ? `${item.record.currentWeightKg} kg`
                              : '—'}
                            {growth.weightGainKg !== null
                              ? ` (${growth.weightGainKg >= 0 ? '+' : ''}${growth.weightGainKg} kg)`
                              : ''}
                          </div>
                        </div>
                        <div className="rounded-xl bg-[#F7F9FC] p-3">
                          <div className="text-[11px] font-semibold text-[#718096]">Temp / Feeding</div>
                          <div className="mt-0.5 text-xs font-bold text-[#172B3A]">
                            {item.record?.temperature ?? '—'} · {item.record?.feedingStatus ?? '—'}
                          </div>
                        </div>
                        <div className="rounded-xl bg-[#F7F9FC] p-3">
                          <div className="text-[11px] font-semibold text-[#718096]">HBNC Visits</div>
                          <div className="mt-0.5 font-mono text-xs font-bold text-[#172B3A]">
                            {item.record?.hbncVisitsCompleted ?? 0} completed
                          </div>
                        </div>
                        <div className="rounded-xl bg-[#F7F9FC] p-3">
                          <div className="text-[11px] font-semibold text-[#718096]">Next Checkup</div>
                          <div className="mt-0.5 font-mono text-xs font-bold text-[#087F75]">
                            {item.record?.nextCheckupDate ?? 'Not scheduled'}
                          </div>
                        </div>
                      </div>

                      {item.record?.healthNotes && (
                        <p className="mt-3 rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-3 py-2 text-xs text-[#172B3A]">
                          <span className="font-bold">Clinical Notes:</span> {item.record.healthNotes}
                        </p>
                      )}
                    </article>
                  );
                })
              )}
            </section>
          )}

          {/* VACCINATION MODE */}
          {activeMode === 'VACCINATION' && (
            <section className="space-y-4">
              {vaccinationPatients.length === 0 ? (
                <div className="rounded-2xl border border-[#E7EDF2] bg-white p-8 text-center text-sm text-[#718096]">
                  No patients eligible for vaccination tracking yet.
                </div>
              ) : (
                vaccinationPatients.map((item) => {
                  const stats = summarizeVaccinationProgress(item.vaccines);
                  return (
                    <article
                      key={item.patient.id}
                      className="rounded-2xl border border-[#E7EDF2] bg-white p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E7EDF2] pb-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-display text-lg font-bold text-[#172B3A]">
                              {item.patient.fullName}
                            </h3>
                            <span className="rounded-md bg-amber-50 px-2 py-0.5 font-mono text-xs font-bold text-[#D97706]">
                              {item.patient.patientUniqueId}
                            </span>
                            <span className="rounded-md bg-[#E8F7F1] px-2 py-0.5 font-mono text-xs font-bold text-[#087F75]">
                              {stats.completedCount}/{stats.totalCount} Completed ({stats.completionPct}%)
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[#718096]">
                            {item.patient.locality ?? 'Ward 5'} · Pending/Scheduled: {stats.pendingCount}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setVaccTarget(item);
                              setNewVaccName('');
                              setNewVaccDue(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
                            }}
                            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#087F75] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#066860]"
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                            Add Vaccine Schedule
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void handleSendModeReminder(
                                item.patient.id,
                                item.patient.fullName,
                                'VACCINATION',
                              )
                            }
                            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#E7EDF2] bg-white px-3 py-1.5 text-xs font-semibold text-[#087F75] hover:bg-[#E8F7F1]"
                          >
                            <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                            Send Reminder
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2.5">
                        {item.vaccines.map((v) => (
                          <div
                            key={v.id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-4 py-3"
                          >
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold text-[#172B3A]">
                                  {v.vaccineName}
                                </span>
                                <span className="text-xs text-[#718096]">({v.doseLabel})</span>
                                <span
                                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                    v.status === 'COMPLETED'
                                      ? 'bg-[#E8F7F1] text-[#087F75]'
                                      : v.status === 'OVERDUE'
                                        ? 'bg-red-100 text-[#991B1B]'
                                        : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {v.status}
                                </span>
                              </div>
                              <div className="mt-1 font-mono text-[11px] text-[#718096]">
                                Due: {v.dueDate}
                                {v.administeredDate ? ` · Given: ${v.administeredDate}` : ''}
                                {v.notes ? ` · ${v.notes}` : ''}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {v.status !== 'COMPLETED' ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleToggleVaccineStatus(
                                        item.patient.fullName,
                                        v.id,
                                        'COMPLETED',
                                      )
                                    }
                                    className="min-h-[34px] rounded-lg bg-[#10A77A] px-3 py-1 text-xs font-semibold text-white hover:bg-[#0D9169]"
                                  >
                                    Mark Completed
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleToggleVaccineStatus(
                                        item.patient.fullName,
                                        v.id,
                                        v.status,
                                        true,
                                      )
                                    }
                                    className="min-h-[34px] rounded-lg border border-[#E7EDF2] bg-white px-3 py-1 text-xs font-semibold text-[#087F75] hover:bg-[#E8F7F1]"
                                  >
                                    Send Reminder
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleToggleVaccineStatus(
                                      item.patient.fullName,
                                      v.id,
                                      'PENDING',
                                    )
                                  }
                                  className="min-h-[34px] rounded-lg border border-[#E7EDF2] bg-white px-3 py-1 text-xs font-semibold text-[#718096] hover:text-[#172B3A]"
                                >
                                  Reopen as Pending
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>
                  );
                })
              )}
            </section>
          )}
        </>
      )}

      {/* REGISTER PATIENT MODAL */}
      {showRegisterModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Register Patient"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E7EDF2] pb-3">
              <h3 className="font-display text-lg font-bold text-[#172B3A]">
                Register Patient ({activeMode.replace('_', ' ')})
              </h3>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                aria-label="Close registration modal"
                className="rounded-lg p-1 text-[#718096] hover:bg-[#F7F9FC]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={(e) => void handleRegisterSubmit(e)} className="mt-4 space-y-3">
              <div>
                <label htmlFor="reg-pat-name" className="block text-xs font-semibold text-[#172B3A]">
                  Patient Full Name *
                </label>
                <input
                  id="reg-pat-name"
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g., Suma Gowda"
                  className="mt-1 min-h-[42px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="reg-pat-user" className="block text-xs font-semibold text-[#172B3A]">
                    Account Username (optional)
                  </label>
                  <input
                    id="reg-pat-user"
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="Auto-generated if blank"
                    className="mt-1 min-h-[42px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="reg-pat-age" className="block text-xs font-semibold text-[#172B3A]">
                    Age (Years)
                  </label>
                  <input
                    id="reg-pat-age"
                    type="number"
                    min="0"
                    max="100"
                    value={regAge}
                    onChange={(e) => setRegAge(e.target.value)}
                    className="mt-1 min-h-[42px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="reg-pat-phone" className="block text-xs font-semibold text-[#172B3A]">
                    Phone Number
                  </label>
                  <input
                    id="reg-pat-phone"
                    type="text"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+91 98..."
                    className="mt-1 min-h-[42px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="reg-pat-loc" className="block text-xs font-semibold text-[#172B3A]">
                    Ward / Locality
                  </label>
                  <input
                    id="reg-pat-loc"
                    type="text"
                    value={regLocality}
                    onChange={(e) => setRegLocality(e.target.value)}
                    className="mt-1 min-h-[42px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                  />
                </div>
              </div>

              {activeMode === 'PREGNANCY' && (
                <div className="grid grid-cols-2 gap-3 rounded-xl bg-[#F7F9FC] p-3">
                  <div>
                    <label htmlFor="reg-preg-weeks" className="block text-xs font-semibold text-[#172B3A]">
                      Gestational Weeks
                    </label>
                    <input
                      id="reg-preg-weeks"
                      type="number"
                      min="1"
                      max="42"
                      value={regPregWeeks}
                      onChange={(e) => setRegPregWeeks(e.target.value)}
                      className="mt-1 min-h-[40px] w-full rounded-lg border border-[#D4DDD9] bg-white px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-preg-edd" className="block text-xs font-semibold text-[#172B3A]">
                      Expected Delivery Date
                    </label>
                    <input
                      id="reg-preg-edd"
                      type="date"
                      value={regEdd}
                      onChange={(e) => setRegEdd(e.target.value)}
                      className="mt-1 min-h-[40px] w-full rounded-lg border border-[#D4DDD9] bg-white px-3 text-sm"
                    />
                  </div>
                </div>
              )}

              {activeMode === 'NEWBORN_CARE' && (
                <div className="grid grid-cols-3 gap-3 rounded-xl bg-[#F7F9FC] p-3">
                  <div>
                    <label htmlFor="reg-nb-mother" className="block text-xs font-semibold text-[#172B3A]">
                      Mother Name
                    </label>
                    <input
                      id="reg-nb-mother"
                      type="text"
                      value={regMotherName}
                      onChange={(e) => setRegMotherName(e.target.value)}
                      className="mt-1 min-h-[40px] w-full rounded-lg border border-[#D4DDD9] bg-white px-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-nb-dob" className="block text-xs font-semibold text-[#172B3A]">
                      Birth Date
                    </label>
                    <input
                      id="reg-nb-dob"
                      type="date"
                      value={regBirthDate}
                      onChange={(e) => setRegBirthDate(e.target.value)}
                      className="mt-1 min-h-[40px] w-full rounded-lg border border-[#D4DDD9] bg-white px-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-nb-wt" className="block text-xs font-semibold text-[#172B3A]">
                      Birth Wt (kg)
                    </label>
                    <input
                      id="reg-nb-wt"
                      type="number"
                      step="0.05"
                      value={regBirthWeight}
                      onChange={(e) => setRegBirthWeight(e.target.value)}
                      className="mt-1 min-h-[40px] w-full rounded-lg border border-[#D4DDD9] bg-white px-2.5 text-sm"
                    />
                  </div>
                </div>
              )}

              {activeMode === 'VACCINATION' && (
                <div className="grid grid-cols-2 gap-3 rounded-xl bg-[#F7F9FC] p-3">
                  <div>
                    <label htmlFor="reg-vacc-name" className="block text-xs font-semibold text-[#172B3A]">
                      Next Due Vaccine
                    </label>
                    <input
                      id="reg-vacc-name"
                      type="text"
                      value={regVaccineName}
                      onChange={(e) => setRegVaccineName(e.target.value)}
                      className="mt-1 min-h-[40px] w-full rounded-lg border border-[#D4DDD9] bg-white px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-vacc-due" className="block text-xs font-semibold text-[#172B3A]">
                      Due Date
                    </label>
                    <input
                      id="reg-vacc-due"
                      type="date"
                      value={regVaccineDue}
                      onChange={(e) => setRegVaccineDue(e.target.value)}
                      className="mt-1 min-h-[40px] w-full rounded-lg border border-[#D4DDD9] bg-white px-3 text-sm"
                    />
                  </div>
                </div>
              )}

              <label className="flex items-start gap-2 rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] p-3 text-xs text-[#172B3A]">
                <input
                  type="checkbox"
                  checked={regConsent}
                  onChange={(e) => setRegConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#087F75]"
                />
                <span>
                  Patient consented to share health records with connected ASHA worker for follow-up care.
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="min-h-[42px] rounded-xl border border-[#E7EDF2] px-4 text-xs font-semibold text-[#718096]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReg}
                  className="min-h-[42px] rounded-xl bg-[#087F75] px-5 text-xs font-bold text-white hover:bg-[#066860] disabled:opacity-60"
                >
                  {submittingReg ? 'Registering...' : 'Register & Generate Patient ID'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PREGNANCY MODAL */}
      {editingPreg && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Update Pregnancy Record"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E7EDF2] pb-3">
              <h3 className="font-display text-lg font-bold text-[#172B3A]">
                Update Pregnancy Record · {editingPreg.patient.fullName}
              </h3>
              <button
                type="button"
                onClick={() => setEditingPreg(null)}
                aria-label="Close pregnancy modal"
              >
                <X className="h-5 w-5 text-[#718096]" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={(e) => void handleSavePregnancy(e)} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ep-stage" className="block text-xs font-semibold text-[#172B3A]">
                    Pregnancy Stage
                  </label>
                  <select
                    id="ep-stage"
                    value={pregStage}
                    onChange={(e) => setPregStage(e.target.value)}
                    className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                  >
                    <option value="First Trimester">First Trimester</option>
                    <option value="Second Trimester">Second Trimester</option>
                    <option value="Third Trimester">Third Trimester</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="ep-weeks" className="block text-xs font-semibold text-[#172B3A]">
                    Gestational Weeks
                  </label>
                  <input
                    id="ep-weeks"
                    type="number"
                    value={pregWeeks}
                    onChange={(e) => setPregWeeks(e.target.value)}
                    className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ep-edd" className="block text-xs font-semibold text-[#172B3A]">
                    Expected Delivery Date
                  </label>
                  <input
                    id="ep-edd"
                    type="date"
                    value={pregEdd}
                    onChange={(e) => setPregEdd(e.target.value)}
                    className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="ep-next" className="block text-xs font-semibold text-[#172B3A]">
                    Next ANC Checkup Date
                  </label>
                  <input
                    id="ep-next"
                    type="date"
                    value={pregNextDate}
                    onChange={(e) => setPregNextDate(e.target.value)}
                    className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="ep-bp" className="block text-xs font-semibold text-[#172B3A]">
                    Blood Pressure
                  </label>
                  <input
                    id="ep-bp"
                    type="text"
                    value={pregBp}
                    onChange={(e) => setPregBp(e.target.value)}
                    placeholder="118/76"
                    className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="ep-wt" className="block text-xs font-semibold text-[#172B3A]">
                    Weight (kg)
                  </label>
                  <input
                    id="ep-wt"
                    type="number"
                    step="0.1"
                    value={pregWeight}
                    onChange={(e) => setPregWeight(e.target.value)}
                    className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="ep-hb" className="block text-xs font-semibold text-[#172B3A]">
                    Hb (g/dL)
                  </label>
                  <input
                    id="ep-hb"
                    type="number"
                    step="0.1"
                    value={pregHb}
                    onChange={(e) => setPregHb(e.target.value)}
                    className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="ep-anc" className="block text-xs font-semibold text-[#172B3A]">
                    ANC Visits Done
                  </label>
                  <input
                    id="ep-anc"
                    type="number"
                    value={pregAncCount}
                    onChange={(e) => setPregAncCount(e.target.value)}
                    className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="ep-ifa" className="block text-xs font-semibold text-[#172B3A]">
                    IFA Tablets
                  </label>
                  <input
                    id="ep-ifa"
                    type="text"
                    value={pregIfa}
                    onChange={(e) => setPregIfa(e.target.value)}
                    className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="ep-risk" className="block text-xs font-semibold text-[#172B3A]">
                    Risk Level
                  </label>
                  <select
                    id="ep-risk"
                    value={pregRisk}
                    onChange={(e) =>
                      setPregRisk(e.target.value as 'NORMAL' | 'MONITOR' | 'HIGH_RISK')
                    }
                    className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="MONITOR">Monitor</option>
                    <option value="HIGH_RISK">High Risk</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="ep-notes" className="block text-xs font-semibold text-[#172B3A]">
                  Visit Notes
                </label>
                <textarea
                  id="ep-notes"
                  rows={2}
                  value={pregNotes}
                  onChange={(e) => setPregNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#D4DDD9] p-3 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPreg(null)}
                  className="min-h-[40px] rounded-xl border border-[#E7EDF2] px-4 text-xs font-semibold text-[#718096]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] rounded-xl bg-[#087F75] px-5 text-xs font-bold text-white"
                >
                  Save & Notify Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE APPOINTMENT MODAL */}
      {apptTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Schedule Checkup Appointment"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E7EDF2] pb-3">
              <h3 className="font-display text-lg font-bold text-[#172B3A]">
                Schedule Checkup · {apptTarget.patientName}
              </h3>
              <button type="button" onClick={() => setApptTarget(null)} aria-label="Close">
                <X className="h-5 w-5 text-[#718096]" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={(e) => void handleScheduleAppointment(e)} className="mt-4 space-y-3">
              <div>
                <label htmlFor="ap-title" className="block text-xs font-semibold text-[#172B3A]">
                  Checkup Title *
                </label>
                <input
                  id="ap-title"
                  type="text"
                  required
                  value={apptTitle}
                  onChange={(e) => setApptTitle(e.target.value)}
                  className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ap-date" className="block text-xs font-semibold text-[#172B3A]">
                    Date *
                  </label>
                  <input
                    id="ap-date"
                    type="date"
                    required
                    value={apptDate}
                    onChange={(e) => setApptDate(e.target.value)}
                    className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="ap-time" className="block text-xs font-semibold text-[#172B3A]">
                    Time
                  </label>
                  <input
                    id="ap-time"
                    type="text"
                    value={apptTime}
                    onChange={(e) => setApptTime(e.target.value)}
                    className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="ap-loc" className="block text-xs font-semibold text-[#172B3A]">
                  Location
                </label>
                <input
                  id="ap-loc"
                  type="text"
                  value={apptLocation}
                  onChange={(e) => setApptLocation(e.target.value)}
                  className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                />
              </div>
              <div>
                <label htmlFor="ap-notes" className="block text-xs font-semibold text-[#172B3A]">
                  Instructions
                </label>
                <input
                  id="ap-notes"
                  type="text"
                  value={apptNotes}
                  onChange={(e) => setApptNotes(e.target.value)}
                  placeholder="e.g., Bring MCP card"
                  className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setApptTarget(null)}
                  className="min-h-[40px] rounded-xl border border-[#E7EDF2] px-4 text-xs font-semibold text-[#718096]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] rounded-xl bg-[#087F75] px-5 text-xs font-bold text-white"
                >
                  Schedule & Send Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT NEWBORN MODAL */}
      {editingNb && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Update Newborn Record"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E7EDF2] pb-3">
              <h3 className="font-display text-lg font-bold text-[#172B3A]">
                Update Newborn Record · {editingNb.patient.fullName}
              </h3>
              <button type="button" onClick={() => setEditingNb(null)} aria-label="Close">
                <X className="h-5 w-5 text-[#718096]" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={(e) => void handleSaveNewborn(e)} className="mt-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="nb-wt" className="block text-xs font-semibold text-[#172B3A]">
                    Weight (kg)
                  </label>
                  <input
                    id="nb-wt"
                    type="number"
                    step="0.05"
                    value={nbCurrentWeight}
                    onChange={(e) => setNbCurrentWeight(e.target.value)}
                    className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="nb-len" className="block text-xs font-semibold text-[#172B3A]">
                    Length (cm)
                  </label>
                  <input
                    id="nb-len"
                    type="number"
                    step="0.5"
                    value={nbLength}
                    onChange={(e) => setNbLength(e.target.value)}
                    className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="nb-temp" className="block text-xs font-semibold text-[#172B3A]">
                    Temp
                  </label>
                  <input
                    id="nb-temp"
                    type="text"
                    value={nbTemp}
                    onChange={(e) => setNbTemp(e.target.value)}
                    className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="nb-visits" className="block text-xs font-semibold text-[#172B3A]">
                    HBNC Visits Done
                  </label>
                  <input
                    id="nb-visits"
                    type="number"
                    value={nbVisits}
                    onChange={(e) => setNbVisits(e.target.value)}
                    className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="nb-next" className="block text-xs font-semibold text-[#172B3A]">
                    Next Checkup
                  </label>
                  <input
                    id="nb-next"
                    type="date"
                    value={nbNextDate}
                    onChange={(e) => setNbNextDate(e.target.value)}
                    className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="nb-feed" className="block text-xs font-semibold text-[#172B3A]">
                  Feeding Observations
                </label>
                <input
                  id="nb-feed"
                  type="text"
                  value={nbFeeding}
                  onChange={(e) => setNbFeeding(e.target.value)}
                  className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                />
              </div>
              <div>
                <label htmlFor="nb-notes" className="block text-xs font-semibold text-[#172B3A]">
                  Health Notes
                </label>
                <textarea
                  id="nb-notes"
                  rows={2}
                  value={nbNotes}
                  onChange={(e) => setNbNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#D4DDD9] p-3 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingNb(null)}
                  className="min-h-[40px] rounded-xl border border-[#E7EDF2] px-4 text-xs font-semibold text-[#718096]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] rounded-xl bg-[#087F75] px-5 text-xs font-bold text-white"
                >
                  Save Newborn Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD VACCINE MODAL */}
      {vaccTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add Vaccine Schedule"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E7EDF2] pb-3">
              <h3 className="font-display text-lg font-bold text-[#172B3A]">
                Add Vaccine · {vaccTarget.patient.fullName}
              </h3>
              <button type="button" onClick={() => setVaccTarget(null)} aria-label="Close">
                <X className="h-5 w-5 text-[#718096]" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={(e) => void handleAddVaccine(e)} className="mt-4 space-y-3">
              <div>
                <label htmlFor="av-name" className="block text-xs font-semibold text-[#172B3A]">
                  Vaccine Name *
                </label>
                <input
                  id="av-name"
                  type="text"
                  required
                  value={newVaccName}
                  onChange={(e) => setNewVaccName(e.target.value)}
                  placeholder="e.g., MR-1 & JE-1"
                  className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="av-dose" className="block text-xs font-semibold text-[#172B3A]">
                    Milestone / Dose
                  </label>
                  <input
                    id="av-dose"
                    type="text"
                    value={newVaccDose}
                    onChange={(e) => setNewVaccDose(e.target.value)}
                    className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="av-due" className="block text-xs font-semibold text-[#172B3A]">
                    Due Date *
                  </label>
                  <input
                    id="av-due"
                    type="date"
                    required
                    value={newVaccDue}
                    onChange={(e) => setNewVaccDue(e.target.value)}
                    className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="av-status" className="block text-xs font-semibold text-[#172B3A]">
                  Initial Status
                </label>
                <select
                  id="av-status"
                  value={newVaccStatus}
                  onChange={(e) => setNewVaccStatus(e.target.value as VaccinationStatus)}
                  className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                >
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="PENDING">Pending</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVaccTarget(null)}
                  className="min-h-[40px] rounded-xl border border-[#E7EDF2] px-4 text-xs font-semibold text-[#718096]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] rounded-xl bg-[#087F75] px-5 text-xs font-bold text-white"
                >
                  Save & Notify Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
