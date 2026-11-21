import React, { useState } from 'react';
import {
  Bell,
  Check,
  CheckCircle2,
  Copy,
  Link2,
  MessageSquare,
  Send,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type {
  AshaConnectivityDashboard,
  HealthcareMode,
} from '../shared/types';
import { api } from '../utils/apiClient';

interface ConnectedPatientsPageProps {
  dashboard: AshaConnectivityDashboard | null;
  onRefresh: () => Promise<void>;
  onOpenMode: (mode: HealthcareMode) => void;
}

export const ConnectedPatientsPage: React.FC<ConnectedPatientsPageProps> = ({
  dashboard,
  onRefresh,
  onOpenMode,
}) => {
  const [connectPatId, setConnectPatId] = useState('');
  const [connectMode, setConnectMode] = useState<HealthcareMode>('PREGNANCY');
  const [connectNotes, setConnectNotes] = useState('');
  const [submittingConnect, setSubmittingConnect] = useState(false);

  const [regName, setRegName] = useState('');
  const [regMode, setRegMode] = useState<HealthcareMode>('PREGNANCY');
  const [regPhone, setRegPhone] = useState('');
  const [regLocality, setRegLocality] = useState('Devanahalli Ward 4');
  const [submittingReg, setSubmittingReg] = useState(false);

  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyAshaId = () => {
    const id = dashboard?.worker.ashaUniqueId;
    if (!id) return;
    void navigator.clipboard?.writeText(id);
    setCopiedId(true);
    window.setTimeout(() => setCopiedId(false), 1800);
  };

  const handleConnectByPatientId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectPatId.trim()) return;
    setSubmittingConnect(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const res = await api.requestConnection({
        patientUniqueId: connectPatId.trim().toUpperCase(),
        assignedMode: connectMode,
        notes: connectNotes.trim() || undefined,
      });
      setStatusMsg(
        `Connection request sent to ${res.connection.patientName} (${res.connection.patientUniqueId}). Status: ${res.connection.status}.`,
      );
      setConnectPatId('');
      setConnectNotes('');
      await onRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to send connection request');
    } finally {
      setSubmittingConnect(false);
    }
  };

  const handleRegisterAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) return;
    setSubmittingReg(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const res = await api.registerAndConnectPatient({
        fullName: regName.trim(),
        phone: regPhone.trim() || undefined,
        locality: regLocality.trim() || undefined,
        assignedMode: regMode,
        consentGranted: true,
      });
      setStatusMsg(
        `Registered & connected ${res.patient.fullName} with unique Patient ID ${res.patientUniqueId} (username: ${res.username}).`,
      );
      setRegName('');
      setRegPhone('');
      await onRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to register patient');
    } finally {
      setSubmittingReg(false);
    }
  };

  const handleRespondConnection = async (connId: string, decision: 'APPROVE' | 'REJECT') => {
    setErrorMsg(null);
    try {
      await api.respondToConnection(connId, decision);
      setStatusMsg(
        decision === 'APPROVE'
          ? 'Connection approved! Accounts are now linked.'
          : 'Connection request rejected.',
      );
      await onRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update connection');
    }
  };

  const handleReplyAssistance = async (reqId: string) => {
    const text = (replyDrafts[reqId] ?? '').trim();
    if (!text) return;
    setErrorMsg(null);
    try {
      await api.respondAssistanceRequest(reqId, { ashaResponse: text, status: 'RESPONDED' });
      setReplyDrafts((prev) => ({ ...prev, [reqId]: '' }));
      setStatusMsg('Response sent to patient.');
      await onRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to send response');
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    await api.markCareNotificationRead(id).catch(() => undefined);
    await onRefresh();
  };

  const modeBadge = (mode: HealthcareMode) => {
    if (mode === 'PREGNANCY') return 'bg-[#E8F7F1] text-[#087F75]';
    if (mode === 'NEWBORN_CARE') return 'bg-[#EDF5FF] text-[#2563EB]';
    return 'bg-amber-50 text-[#D97706]';
  };

  const statusBadge = (status: string) => {
    if (status === 'CONNECTED') return 'bg-[#E8F7F1] text-[#087F75]';
    if (status === 'PENDING') return 'bg-amber-100 text-amber-800';
    return 'bg-red-100 text-[#991B1B]';
  };

  return (
    <div className="space-y-6">
      {/* ASHA Worker Unique ID Card */}
      <section className="rounded-2xl border border-[#E7EDF2] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-[#172B3A]">
              ASHA Worker–Patient Connectivity
            </h2>
            <p className="mt-1 text-xs text-[#718096]">
              Share your permanent ASHA Worker ID with patients or connect directly using a Patient ID.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-[#A7F3D0] bg-[#E8F7F1] px-4 py-2.5">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#087F75]">
                Your Unique ASHA ID
              </div>
              <div className="font-mono text-base font-extrabold text-[#102B35]">
                {dashboard?.worker.ashaUniqueId ?? 'ASHA-2026-0001'}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyAshaId}
              aria-label="Copy ASHA Unique ID"
              className="inline-flex min-h-[36px] items-center gap-1 rounded-xl bg-white px-2.5 py-1 text-xs font-semibold text-[#087F75] shadow-xs hover:bg-[#F7F9FC]"
            >
              {copiedId ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedId ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </section>

      {statusMsg && (
        <div
          role="status"
          className="flex items-center justify-between rounded-2xl border border-[#A7F3D0] bg-[#E8F7F1] px-4 py-3 text-xs font-semibold text-[#064E3B]"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#10A77A]" aria-hidden="true" />
            {statusMsg}
          </span>
          <button type="button" onClick={() => setStatusMsg(null)} aria-label="Dismiss status">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
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

      {/* Two Forms: Connect by Patient ID + Register New Patient */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <form
          onSubmit={(e) => void handleConnectByPatientId(e)}
          className="rounded-2xl border border-[#E7EDF2] bg-white p-5"
        >
          <div className="flex items-center gap-2 border-b border-[#E7EDF2] pb-3">
            <Link2 className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
            <h3 className="font-display text-sm font-bold text-[#172B3A]">
              Connect with Existing Patient by ID
            </h3>
          </div>
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="conn-pat-id" className="block text-xs font-semibold text-[#172B3A]">
                  Patient Unique ID *
                </label>
                <input
                  id="conn-pat-id"
                  type="text"
                  required
                  value={connectPatId}
                  onChange={(e) => setConnectPatId(e.target.value)}
                  placeholder="e.g., PAT-2026-0001"
                  className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 font-mono text-sm"
                />
              </div>
              <div>
                <label htmlFor="conn-mode" className="block text-xs font-semibold text-[#172B3A]">
                  Healthcare Mode
                </label>
                <select
                  id="conn-mode"
                  value={connectMode}
                  onChange={(e) => setConnectMode(e.target.value as HealthcareMode)}
                  className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                >
                  <option value="PREGNANCY">Pregnancy Mode</option>
                  <option value="NEWBORN_CARE">Newborn Care Mode</option>
                  <option value="VACCINATION">Vaccination Mode</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="conn-notes" className="block text-xs font-semibold text-[#172B3A]">
                Note for Patient (optional)
              </label>
              <input
                id="conn-notes"
                type="text"
                value={connectNotes}
                onChange={(e) => setConnectNotes(e.target.value)}
                placeholder="e.g., Ward 4 antenatal follow-up"
                className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={submittingConnect}
              className="min-h-[42px] w-full rounded-xl bg-[#087F75] px-4 text-xs font-bold text-white hover:bg-[#066860] disabled:opacity-60"
            >
              {submittingConnect ? 'Sending Request...' : 'Send Connection Request'}
            </button>
          </div>
        </form>

        <form
          onSubmit={(e) => void handleRegisterAndConnect(e)}
          className="rounded-2xl border border-[#E7EDF2] bg-white p-5"
        >
          <div className="flex items-center gap-2 border-b border-[#E7EDF2] pb-3">
            <UserPlus className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
            <h3 className="font-display text-sm font-bold text-[#172B3A]">
              Register New Patient & Auto-Connect
            </h3>
          </div>
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="cp-reg-name" className="block text-xs font-semibold text-[#172B3A]">
                  Patient Name *
                </label>
                <input
                  id="cp-reg-name"
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g., Divya"
                  className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                />
              </div>
              <div>
                <label htmlFor="cp-reg-mode" className="block text-xs font-semibold text-[#172B3A]">
                  Healthcare Mode
                </label>
                <select
                  id="cp-reg-mode"
                  value={regMode}
                  onChange={(e) => setRegMode(e.target.value as HealthcareMode)}
                  className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                >
                  <option value="PREGNANCY">Pregnancy Mode</option>
                  <option value="NEWBORN_CARE">Newborn Care Mode</option>
                  <option value="VACCINATION">Vaccination Mode</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="cp-reg-phone" className="block text-xs font-semibold text-[#172B3A]">
                  Phone Number
                </label>
                <input
                  id="cp-reg-phone"
                  type="text"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="+91 98..."
                  className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                />
              </div>
              <div>
                <label htmlFor="cp-reg-loc" className="block text-xs font-semibold text-[#172B3A]">
                  Locality
                </label>
                <input
                  id="cp-reg-loc"
                  type="text"
                  value={regLocality}
                  onChange={(e) => setRegLocality(e.target.value)}
                  className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submittingReg}
              className="min-h-[42px] w-full rounded-xl bg-[#10A77A] px-4 text-xs font-bold text-white hover:bg-[#0D9169] disabled:opacity-60"
            >
              {submittingReg ? 'Registering...' : 'Register Patient & Generate PAT ID'}
            </button>
          </div>
        </form>
      </section>

      {/* Pending Connection Requests */}
      <section className="rounded-2xl border border-[#E7EDF2] bg-white p-5">
        <div className="flex items-center justify-between border-b border-[#E7EDF2] pb-3">
          <h3 className="font-display text-base font-bold text-[#172B3A]">
            Pending Connection Requests ({dashboard?.pendingRequests.length ?? 0})
          </h3>
        </div>
        {!dashboard || dashboard.pendingRequests.length === 0 ? (
          <p className="py-6 text-center text-xs text-[#718096]">No pending connection requests.</p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {dashboard.pendingRequests.map((conn) => (
              <li
                key={conn.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3.5"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-[#172B3A]">{conn.patientName}</span>
                    <span className="rounded-md bg-white px-2 py-0.5 font-mono text-xs font-bold text-[#087F75]">
                      {conn.patientUniqueId}
                    </span>
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${modeBadge(conn.assignedMode)}`}>
                      {conn.assignedMode.replace('_', ' ')}
                    </span>
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${statusBadge(conn.status)}`}>
                      {conn.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#718096]">
                    Initiated by {conn.initiatedBy === 'PATIENT' ? 'Patient' : 'You'}
                    {conn.notes ? ` · "${conn.notes}"` : ''}
                  </p>
                </div>

                {conn.initiatedBy === 'PATIENT' ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleRespondConnection(conn.id, 'APPROVE')}
                      className="min-h-[36px] rounded-lg bg-[#10A77A] px-3 py-1 text-xs font-bold text-white hover:bg-[#0D9169]"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRespondConnection(conn.id, 'REJECT')}
                      className="min-h-[36px] rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-bold text-[#D94B4B] hover:bg-red-50"
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-amber-800">
                    Awaiting patient approval
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Connected Patients List */}
      <section className="rounded-2xl border border-[#E7EDF2] bg-white p-5">
        <div className="flex items-center gap-2 border-b border-[#E7EDF2] pb-3">
          <Users className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
          <h3 className="font-display text-base font-bold text-[#172B3A]">
            Connected Patients ({dashboard?.connectedPatients.length ?? 0})
          </h3>
        </div>
        {!dashboard || dashboard.connectedPatients.length === 0 ? (
          <p className="py-6 text-center text-xs text-[#718096]">No connected patients yet.</p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {dashboard.connectedPatients.map((p) => (
              <div
                key={p.id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] p-4"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-display text-sm font-bold text-[#172B3A]">
                      {p.patientName}
                    </span>
                    <span className="rounded-md bg-[#E8F7F1] px-2 py-0.5 font-mono text-xs font-bold text-[#087F75]">
                      {p.patientUniqueId}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className={`rounded-md px-2 py-0.5 font-bold ${modeBadge(p.assignedMode)}`}>
                      {p.assignedMode.replace('_', ' ')}
                    </span>
                    <span className="rounded-md bg-[#E8F7F1] px-2 py-0.5 font-bold text-[#087F75]">
                      Connected
                    </span>
                    <span className="text-[#718096]">
                      Consent: <strong>{p.consentStatus}</strong>
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-[#718096]">
                    {p.patientLocality ?? 'Ward 4'} {p.patientPhone ? `· ${p.patientPhone}` : ''}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenMode(p.assignedMode)}
                  className="min-h-[36px] rounded-xl border border-[#087F75] bg-white px-3 py-1.5 text-xs font-bold text-[#087F75] hover:bg-[#E8F7F1]"
                >
                  Open in {p.assignedMode.replace('_', ' ')} Mode
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Two-way Assistance Requests & Notifications */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#E7EDF2] bg-white p-5">
          <div className="flex items-center gap-2 border-b border-[#E7EDF2] pb-3">
            <MessageSquare className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
            <h3 className="font-display text-base font-bold text-[#172B3A]">
              Patient Assistance Requests ({dashboard?.assistanceRequests.length ?? 0})
            </h3>
          </div>
          {!dashboard || dashboard.assistanceRequests.length === 0 ? (
            <p className="py-6 text-center text-xs text-[#718096]">No assistance requests yet.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {dashboard.assistanceRequests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] p-3.5 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-[#172B3A]">
                      {req.patientName} ({req.patientUniqueId})
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        req.urgency === 'URGENT'
                          ? 'bg-red-100 text-[#991B1B]'
                          : req.status === 'OPEN'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-[#E8F7F1] text-[#087F75]'
                      }`}
                    >
                      {req.urgency === 'URGENT' ? 'URGENT · ' : ''}
                      {req.status}
                    </span>
                  </div>
                  <div className="mt-1 font-semibold text-[#087F75]">{req.subject}</div>
                  <p className="mt-1 text-[#172B3A]">{req.message}</p>

                  {req.ashaResponse && (
                    <div className="mt-2 rounded-lg border border-[#A7F3D0] bg-[#E8F7F1] p-2.5 text-[#064E3B]">
                      <strong>Your Reply:</strong> {req.ashaResponse}
                    </div>
                  )}

                  <div className="mt-2.5 flex gap-2">
                    <input
                      type="text"
                      aria-label={`Reply to ${req.patientName}`}
                      value={replyDrafts[req.id] ?? ''}
                      onChange={(e) =>
                        setReplyDrafts((prev) => ({ ...prev, [req.id]: e.target.value }))
                      }
                      placeholder="Write a response to the patient..."
                      className="min-h-[36px] flex-1 rounded-lg border border-[#D4DDD9] bg-white px-3 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => void handleReplyAssistance(req.id)}
                      className="inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-[#087F75] px-3 text-xs font-bold text-white hover:bg-[#066860]"
                    >
                      <Send className="h-3.5 w-3.5" aria-hidden="true" />
                      Reply
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[#E7EDF2] bg-white p-5">
          <div className="flex items-center gap-2 border-b border-[#E7EDF2] pb-3">
            <Bell className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
            <h3 className="font-display text-base font-bold text-[#172B3A]">
              Connectivity Notifications ({dashboard?.unreadNotificationsCount ?? 0} unread)
            </h3>
          </div>
          {!dashboard || dashboard.notifications.length === 0 ? (
            <p className="py-6 text-center text-xs text-[#718096]">No notifications yet.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {dashboard.notifications.slice(0, 8).map((n) => (
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
                      onClick={() => void handleMarkNotificationRead(n.id)}
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
    </div>
  );
};
