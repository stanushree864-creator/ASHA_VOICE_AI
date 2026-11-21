import React, { useState } from 'react';
import {
  Baby,
  Bell,
  CalendarClock,
  CheckCircle2,
  HeartPulse,
  Link2,
  MessageSquare,
  Send,
  ShieldCheck,
  Syringe,
  UserCheck,
} from 'lucide-react';
import {
  calculatePregnancyStage,
  summarizeVaccinationProgress,
} from '../shared/connectivityEngine';
import type { PatientConnectivityPortal } from '../shared/types';
import { api } from '../utils/apiClient';
import { EmergencyContactsPanel } from './EmergencyContactsPanel';
import { QrIdentityPanel } from './QrIdentityPanel';

interface PatientPortalDashboardProps {
  portal: PatientConnectivityPortal | null;
  onRefresh: () => Promise<void>;
}

export const PatientPortalDashboard: React.FC<PatientPortalDashboardProps> = ({
  portal,
  onRefresh,
}) => {
  const [ashaIdInput, setAshaIdInput] = useState('');
  const [connectNotes, setConnectNotes] = useState('');
  const [connecting, setConnecting] = useState(false);

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [urgency, setUrgency] = useState<'NORMAL' | 'URGENT'>('NORMAL');
  const [sendingHelp, setSendingHelp] = useState(false);

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!portal) {
    return (
      <div className="rounded-2xl border border-[#E7EDF2] bg-white p-8 text-center text-sm text-[#718096]">
        Loading your patient portal...
      </div>
    );
  }

  const {
    patient,
    connections,
    connectedWorker,
    pregnancyRecord,
    newbornRecord,
    vaccinationRecords,
    appointments,
    assistanceRequests,
    notifications,
  } = portal;

  const pendingIncoming = connections.filter(
    (c) => c.status === 'PENDING' && c.initiatedBy === 'ASHA_WORKER',
  );
  const pendingOutgoing = connections.filter(
    (c) => c.status === 'PENDING' && c.initiatedBy === 'PATIENT',
  );
  const rejectedConnections = connections.filter((c) => c.status === 'REJECTED');

  const handleRequestAshaConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ashaIdInput.trim()) return;
    setConnecting(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const res = await api.requestConnection({
        ashaUniqueId: ashaIdInput.trim().toUpperCase(),
        assignedMode: patient.assignedMode,
        notes: connectNotes.trim() || undefined,
      });
      setStatusMsg(
        `Connection request sent to ${res.connection.ashaWorkerName} (${res.connection.ashaUniqueId}). Status: PENDING.`,
      );
      setAshaIdInput('');
      setConnectNotes('');
      await onRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to send connection request');
    } finally {
      setConnecting(false);
    }
  };

  const handleRespondConnection = async (connId: string, decision: 'APPROVE' | 'REJECT') => {
    setErrorMsg(null);
    try {
      await api.respondToConnection(connId, decision);
      setStatusMsg(decision === 'APPROVE' ? 'Connected with ASHA worker!' : 'Request declined.');
      await onRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to update connection');
    }
  };

  const handleToggleConsent = async () => {
    const next = patient.consentStatus === 'GRANTED' ? 'WITHDRAWN' : 'GRANTED';
    setErrorMsg(null);
    try {
      await api.updatePatientConsent(next);
      setStatusMsg(
        next === 'GRANTED'
          ? 'Health record sharing consent granted.'
          : 'Health record sharing consent withdrawn.',
      );
      await onRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to update consent');
    }
  };

  const handleSendAssistance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSendingHelp(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      await api.sendAssistanceRequest({
        subject: subject.trim(),
        message: message.trim(),
        urgency,
      });
      setStatusMsg('Assistance request sent to your connected ASHA worker.');
      setSubject('');
      setMessage('');
      setUrgency('NORMAL');
      await onRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to send assistance request');
    } finally {
      setSendingHelp(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    await api.markCareNotificationRead(id).catch(() => undefined);
    await onRefresh();
  };

  const modeMeta =
    patient.assignedMode === 'PREGNANCY'
      ? { label: 'Pregnancy Mode', icon: HeartPulse, badge: 'bg-[#E8F7F1] text-[#087F75]' }
      : patient.assignedMode === 'NEWBORN_CARE'
        ? { label: 'Newborn Care Mode', icon: Baby, badge: 'bg-[#EDF5FF] text-[#2563EB]' }
        : { label: 'Vaccination Mode', icon: Syringe, badge: 'bg-amber-50 text-[#D97706]' };
  const ModeIcon = modeMeta.icon;

  return (
    <div className="space-y-6">
      {/* Patient Identity & Unique ID Header */}
      <section className="rounded-2xl bg-gradient-to-r from-[#102B35] via-[#0D5B5E] to-[#087F75] p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-white/15 px-2.5 py-1 font-mono text-xs font-bold text-[#A5D8CE]">
                Patient ID: {patient.patientUniqueId}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-[#087F75]">
                <ModeIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {modeMeta.label}
              </span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-extrabold">
              Welcome, {patient.fullName}
            </h2>
            <p className="mt-1 text-xs text-teal-100">
              {patient.locality ?? 'Devanahalli Block'} · View your records, upcoming checkups, and connect with your ASHA worker.
            </p>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 p-3.5 text-xs">
            <div className="flex items-center gap-2 font-bold">
              <ShieldCheck className="h-4 w-4 text-[#A5D8CE]" aria-hidden="true" />
              <span>Record Sharing Consent: {patient.consentStatus}</span>
            </div>
            <button
              type="button"
              onClick={() => void handleToggleConsent()}
              className="mt-2 min-h-[34px] rounded-lg bg-white px-3 py-1 text-xs font-bold text-[#087F75] hover:bg-[#E8F7F1]"
            >
              {patient.consentStatus === 'GRANTED' ? 'Withdraw Consent' : 'Grant Consent'}
            </button>
          </div>
        </div>
      </section>

      {statusMsg && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-[#A7F3D0] bg-[#E8F7F1] px-4 py-3 text-xs font-semibold text-[#064E3B]"
        >
          <CheckCircle2 className="h-4 w-4 text-[#10A77A]" aria-hidden="true" />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-[#991B1B]"
        >
          {errorMsg}
        </div>
      )}

      {/* Connected ASHA Worker Section */}
      <section className="rounded-2xl border border-[#E7EDF2] bg-white p-5">
        <div className="flex items-center gap-2 border-b border-[#E7EDF2] pb-3">
          <UserCheck className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
          <h3 className="font-display text-base font-bold text-[#172B3A]">
            Connected ASHA Worker
          </h3>
        </div>

        {connectedWorker ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#A7F3D0] bg-[#E8F7F1]/60 p-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-base font-bold text-[#172B3A]">
                  {connectedWorker.ashaWorkerName}
                </span>
                <span className="rounded-md bg-white px-2 py-0.5 font-mono text-xs font-bold text-[#087F75]">
                  {connectedWorker.ashaUniqueId}
                </span>
                <span className="rounded-md bg-[#10A77A] px-2 py-0.5 text-[10px] font-bold text-white">
                  Connected
                </span>
              </div>
              <p className="mt-1 text-xs text-[#475B62]">
                Area: {connectedWorker.ashaAssignedArea} · Assigned Mode:{' '}
                <strong>{connectedWorker.assignedMode.replace('_', ' ')}</strong>
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {pendingIncoming.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs"
              >
                <div>
                  <div className="font-bold text-[#172B3A]">
                    {c.ashaWorkerName} ({c.ashaUniqueId}) invited you to connect
                  </div>
                  <div className="mt-0.5 text-[#718096]">Status: Pending your approval</div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleRespondConnection(c.id, 'APPROVE')}
                    className="min-h-[36px] rounded-lg bg-[#10A77A] px-3 text-xs font-bold text-white"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRespondConnection(c.id, 'REJECT')}
                    className="min-h-[36px] rounded-lg border border-red-200 bg-white px-3 text-xs font-bold text-[#D94B4B]"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}

            {pendingOutgoing.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs"
              >
                <span className="font-bold text-[#172B3A]">
                  Request to {c.ashaWorkerName} ({c.ashaUniqueId})
                </span>{' '}
                — <span className="font-bold text-amber-800">Pending Approval</span>
              </div>
            ))}

            {rejectedConnections.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-red-200 bg-red-50/70 p-3.5 text-xs"
              >
                Connection with {c.ashaWorkerName} ({c.ashaUniqueId}) —{' '}
                <span className="font-bold text-[#991B1B]">Rejected</span>
              </div>
            ))}

            <form
              onSubmit={(e) => void handleRequestAshaConnection(e)}
              className="rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] p-4"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-[#172B3A]">
                <Link2 className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
                <span>Connect with your ASHA Worker using ASHA Worker ID</span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="pat-asha-id" className="block text-xs font-semibold text-[#172B3A]">
                    ASHA Worker ID *
                  </label>
                  <input
                    id="pat-asha-id"
                    type="text"
                    required
                    value={ashaIdInput}
                    onChange={(e) => setAshaIdInput(e.target.value)}
                    placeholder="e.g., ASHA-2026-0001"
                    className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] bg-white px-3 font-mono text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="pat-conn-note" className="block text-xs font-semibold text-[#172B3A]">
                    Note (optional)
                  </label>
                  <input
                    id="pat-conn-note"
                    type="text"
                    value={connectNotes}
                    onChange={(e) => setConnectNotes(e.target.value)}
                    placeholder="e.g., Antenatal follow-up"
                    className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] bg-white px-3 text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={connecting}
                    className="min-h-[40px] w-full rounded-xl bg-[#087F75] px-4 text-xs font-bold text-white hover:bg-[#066860] disabled:opacity-60"
                  >
                    {connecting ? 'Sending...' : 'Request Connection'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </section>

      {/* Health Records & Upcoming Appointments */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#E7EDF2] bg-white p-5">
          <h3 className="border-b border-[#E7EDF2] pb-3 font-display text-base font-bold text-[#172B3A]">
            My Health Records ({modeMeta.label})
          </h3>

          {patient.assignedMode === 'PREGNANCY' && (
            <div className="mt-4 space-y-3 text-xs">
              {pregnancyRecord ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-[#F7F9FC] p-3">
                      <div className="text-[#718096]">Stage</div>
                      <div className="mt-0.5 font-bold text-[#172B3A]">
                        {calculatePregnancyStage(
                          pregnancyRecord.gestationalWeeks,
                          pregnancyRecord.expectedDeliveryDate,
                        ).stageLabel}
                      </div>
                    </div>
                    <div className="rounded-xl bg-[#F7F9FC] p-3">
                      <div className="text-[#718096]">Expected Delivery Date</div>
                      <div className="mt-0.5 font-mono font-bold text-[#087F75]">
                        {pregnancyRecord.expectedDeliveryDate ?? 'Not set'}
                      </div>
                    </div>
                    <div className="rounded-xl bg-[#F7F9FC] p-3">
                      <div className="text-[#718096]">BP & Weight</div>
                      <div className="mt-0.5 font-mono font-bold text-[#172B3A]">
                        {pregnancyRecord.bloodPressure ?? '—'} ·{' '}
                        {pregnancyRecord.weightKg != null ? `${pregnancyRecord.weightKg} kg` : '—'}
                      </div>
                    </div>
                    <div className="rounded-xl bg-[#F7F9FC] p-3">
                      <div className="text-[#718096]">ANC Visits & IFA</div>
                      <div className="mt-0.5 font-bold text-[#172B3A]">
                        {pregnancyRecord.ancVisitsCompleted} visits ·{' '}
                        {pregnancyRecord.ifaTabletsStatus ?? '—'}
                      </div>
                    </div>
                  </div>
                  {pregnancyRecord.visitNotes && (
                    <p className="rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] p-3 text-[#172B3A]">
                      <strong>ASHA Notes:</strong> {pregnancyRecord.visitNotes}
                    </p>
                  )}
                </>
              ) : (
                <p className="py-4 text-[#718096]">
                  No pregnancy visit details recorded yet. Your connected ASHA worker will update this after your checkup.
                </p>
              )}
            </div>
          )}

          {patient.assignedMode === 'NEWBORN_CARE' && (
            <div className="mt-4 space-y-3 text-xs">
              {newbornRecord ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#F7F9FC] p-3">
                    <div className="text-[#718096]">Baby & Birth Date</div>
                    <div className="mt-0.5 font-bold text-[#172B3A]">
                      {newbornRecord.babyName} · {newbornRecord.birthDate}
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#F7F9FC] p-3">
                    <div className="text-[#718096]">Birth / Current Weight</div>
                    <div className="mt-0.5 font-mono font-bold text-[#087F75]">
                      {newbornRecord.birthWeightKg ?? '—'} kg → {newbornRecord.currentWeightKg ?? '—'} kg
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#F7F9FC] p-3">
                    <div className="text-[#718096]">Feeding & Temp</div>
                    <div className="mt-0.5 font-bold text-[#172B3A]">
                      {newbornRecord.feedingStatus ?? '—'} ({newbornRecord.temperature ?? '—'})
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#F7F9FC] p-3">
                    <div className="text-[#718096]">HBNC Visits Completed</div>
                    <div className="mt-0.5 font-mono font-bold text-[#172B3A]">
                      {newbornRecord.hbncVisitsCompleted}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="py-4 text-[#718096]">No newborn record recorded yet.</p>
              )}
            </div>
          )}

          {(patient.assignedMode === 'VACCINATION' || vaccinationRecords.length > 0) && (
            <div className="mt-4 space-y-2.5 text-xs">
              <div className="font-bold text-[#172B3A]">
                Vaccination Schedule ({summarizeVaccinationProgress(vaccinationRecords).completedCount}/
                {vaccinationRecords.length} Completed)
              </div>
              {vaccinationRecords.length === 0 ? (
                <p className="py-2 text-[#718096]">No vaccinations scheduled yet.</p>
              ) : (
                vaccinationRecords.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-3 py-2"
                  >
                    <div>
                      <div className="font-bold text-[#172B3A]">{v.vaccineName}</div>
                      <div className="font-mono text-[11px] text-[#718096]">
                        {v.doseLabel} · Due {v.dueDate}
                      </div>
                    </div>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        v.status === 'COMPLETED'
                          ? 'bg-[#E8F7F1] text-[#087F75]'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {v.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Upcoming Appointments */}
        <div className="rounded-2xl border border-[#E7EDF2] bg-white p-5">
          <div className="flex items-center gap-2 border-b border-[#E7EDF2] pb-3">
            <CalendarClock className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
            <h3 className="font-display text-base font-bold text-[#172B3A]">
              Upcoming Appointments & Checkups ({appointments.length})
            </h3>
          </div>
          {appointments.length === 0 ? (
            <p className="py-8 text-center text-xs text-[#718096]">No upcoming appointments scheduled.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {appointments.map((a) => (
                <li
                  key={a.id}
                  className="rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] p-3.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[#172B3A]">{a.title}</span>
                    <span className="font-mono font-bold text-[#087F75]">
                      {a.scheduledDate} {a.scheduledTime ? `· ${a.scheduledTime}` : ''}
                    </span>
                  </div>
                  <div className="mt-1 text-[#718096]">
                    {a.location ?? 'PHC'} · {a.ashaWorkerName ?? 'ASHA Worker'}
                    {a.notes ? ` · ${a.notes}` : ''}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Request Assistance & Notifications */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#E7EDF2] bg-white p-5">
          <div className="flex items-center gap-2 border-b border-[#E7EDF2] pb-3">
            <MessageSquare className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
            <h3 className="font-display text-base font-bold text-[#172B3A]">
              Request Assistance from ASHA Worker
            </h3>
          </div>

          <form onSubmit={(e) => void handleSendAssistance(e)} className="mt-3 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label htmlFor="assist-subj" className="block text-xs font-semibold text-[#172B3A]">
                  Subject *
                </label>
                <input
                  id="assist-subj"
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Need IFA tablets or checkup question"
                  className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                />
              </div>
              <div>
                <label htmlFor="assist-urg" className="block text-xs font-semibold text-[#172B3A]">
                  Urgency
                </label>
                <select
                  id="assist-urg"
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as 'NORMAL' | 'URGENT')}
                  className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="assist-msg" className="block text-xs font-semibold text-[#172B3A]">
                Message *
              </label>
              <textarea
                id="assist-msg"
                rows={2}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe what help or advice you need..."
                className="mt-1 w-full rounded-xl border border-[#D4DDD9] p-3 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={sendingHelp || !connectedWorker}
              className="inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl bg-[#087F75] px-4 text-xs font-bold text-white hover:bg-[#066860] disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              {sendingHelp ? 'Sending...' : 'Send Assistance Request'}
            </button>
          </form>

          {assistanceRequests.length > 0 && (
            <div className="mt-4 space-y-2.5 border-t border-[#E7EDF2] pt-3">
              <div className="text-xs font-bold text-[#718096]">Your Previous Requests</div>
              {assistanceRequests.map((r) => (
                <div key={r.id} className="rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[#172B3A]">{r.subject}</span>
                    <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-[#087F75]">
                      {r.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[#475B62]">{r.message}</p>
                  {r.ashaResponse && (
                    <div className="mt-2 rounded-lg border border-[#A7F3D0] bg-[#E8F7F1] p-2.5 text-[#064E3B]">
                      <strong>ASHA Reply:</strong> {r.ashaResponse}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[#E7EDF2] bg-white p-5">
          <div className="flex items-center gap-2 border-b border-[#E7EDF2] pb-3">
            <Bell className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
            <h3 className="font-display text-base font-bold text-[#172B3A]">
              Reminders & Notifications ({portal.unreadNotificationsCount} unread)
            </h3>
          </div>
          {notifications.length === 0 ? (
            <p className="py-8 text-center text-xs text-[#718096]">No notifications yet.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`flex items-start justify-between gap-2 rounded-xl border p-3 text-xs ${
                    n.isRead
                      ? 'border-[#E7EDF2] bg-[#F7F9FC]'
                      : 'border-[#087F75]/30 bg-[#E8F7F1]/50'
                  }`}
                >
                  <div>
                    <div className="font-bold text-[#172B3A]">{n.title}</div>
                    <p className="mt-0.5 text-[#718096]">{n.message}</p>
                    <div className="mt-1 font-mono text-[10px] text-[#718096]">
                      From: {n.senderName}
                    </div>
                  </div>
                  {!n.isRead && (
                    <button
                      type="button"
                      onClick={() => void handleMarkRead(n.id)}
                      className="shrink-0 rounded-lg border border-[#E7EDF2] bg-white px-2 py-1 text-[10px] font-semibold text-[#087F75]"
                    >
                      Mark Read
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ASHA Worker Emergency Contact Information & Family Emergency Contact */}
      <EmergencyContactsPanel userRole="PATIENT" />

      {/* Patient Verifiable QR Health Identity Card */}
      <QrIdentityPanel
        connectedPatients={[]}
        isPatientRole={true}
        selfPatientUniqueId={patient.patientUniqueId}
      />
    </div>
  );
};
