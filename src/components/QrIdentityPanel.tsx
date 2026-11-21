import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Camera,
  CheckCircle2,
  Download,
  HeartPulse,
  QrCode,
  ScanLine,
  Search,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import { buildPatientQrPayload, encodePatientQrPayload } from '../shared/enhancementEngine';
import type {
  AshaPatientConnection,
  HealthcareMode,
  QrResolvedPatientResponse,
} from '../shared/types';
import { api } from '../utils/apiClient';

interface QrIdentityPanelProps {
  connectedPatients: AshaPatientConnection[];
  isPatientRole?: boolean;
  selfPatientUniqueId?: string | null;
  onOpenCareMode?: (mode: HealthcareMode) => void;
}

export const QrIdentityPanel: React.FC<QrIdentityPanelProps> = ({
  connectedPatients,
  isPatientRole = false,
  selfPatientUniqueId = null,
  onOpenCareMode,
}) => {
  const defaultId =
    selfPatientUniqueId || connectedPatients[0]?.patientUniqueId || 'PAT-2026-0001';

  const [selectedPatientId, setSelectedPatientId] = useState(defaultId);
  const [qrSvg, setQrSvg] = useState<string>('');
  const [qrString, setQrString] = useState<string>('');
  const [scanInput, setScanInput] = useState('');
  const [resolved, setResolved] = useState<QrResolvedPatientResponse | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (selfPatientUniqueId) {
      setSelectedPatientId(selfPatientUniqueId);
    }
  }, [selfPatientUniqueId]);

  // Generate QR SVG locally & fetch full verified card
  useEffect(() => {
    if (!selectedPatientId) return;
    let cancelled = false;
    setLoading(true);
    setScanError(null);

    void api
      .getPatientQrIdentity(selectedPatientId)
      .then(async (res) => {
        if (cancelled) return;
        setResolved(res);
        setQrString(res.qrString);
        const svg = await QRCode.toString(res.qrString, {
          type: 'svg',
          width: 220,
          margin: 1,
          color: { dark: '#102B35', light: '#FFFFFF' },
        });
        if (!cancelled) setQrSvg(svg);
      })
      .catch(async (err) => {
        if (cancelled) return;
        // Fallback local deterministic QR rendering if offline
        const localPat = connectedPatients.find((p) => p.patientUniqueId === selectedPatientId);
        if (localPat) {
          const payload = buildPatientQrPayload({
            patientUniqueId: localPat.patientUniqueId,
            fullName: localPat.patientName,
            assignedMode: localPat.assignedMode,
            locality: localPat.patientLocality,
          });
          const raw = encodePatientQrPayload(payload);
          setQrString(raw);
          const svg = await QRCode.toString(raw, { type: 'svg', width: 220, margin: 1 });
          if (!cancelled) setQrSvg(svg);
        } else {
          setScanError(err instanceof Error ? err.message : 'Could not load QR Health ID');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [connectedPatients, selectedPatientId]);

  const stopCamera = () => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => () => stopCamera(), []);

  const handleResolveScan = async (input: string) => {
    if (!input.trim()) return;
    setLoading(true);
    setScanError(null);
    try {
      const res = await api.resolvePatientQrScan(input.trim());
      setResolved(res);
      setSelectedPatientId(res.patient.patientUniqueId);
      setQrString(res.qrString);
      const svg = await QRCode.toString(res.qrString, {
        type: 'svg',
        width: 220,
        margin: 1,
        color: { dark: '#102B35', light: '#FFFFFF' },
      });
      setQrSvg(svg);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'QR lookup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStartCameraScan = async () => {
    setCameraError(null);
    const DetectorCtor = (
      window as unknown as {
        BarcodeDetector?: new (opts: { formats: string[] }) => {
          detect: (src: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
        };
      }
    ).BarcodeDetector;

    if (!navigator.mediaDevices?.getUserMedia || !DetectorCtor) {
      setCameraError(
        'Live browser BarcodeDetector camera scanning is unavailable on this browser. Paste a QR payload or Patient ID (e.g., PAT-2026-0001) below.',
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const detector = new DetectorCtor({ formats: ['qr_code'] });
      const scanFrame = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0 && codes[0].rawValue) {
            stopCamera();
            setScanInput(codes[0].rawValue);
            await handleResolveScan(codes[0].rawValue);
            return;
          }
        } catch {
          // ignore transient frame error
        }
        if (streamRef.current) {
          requestAnimationFrame(() => void scanFrame());
        }
      };
      requestAnimationFrame(() => void scanFrame());
    } catch (err) {
      setCameraError(err instanceof Error ? err.message : 'Unable to start camera');
      stopCamera();
    }
  };

  const handleDownloadQrSvg = () => {
    if (!qrSvg || !resolved) return;
    const blob = new Blob([qrSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${resolved.patient.patientUniqueId}-qr-health-id.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-[#102B35] via-[#0D5B5E] to-[#087F75] p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-2.5 py-1 text-xs font-bold text-[#A5D8CE]">
              <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
              <span>QR-Based Patient Identity</span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight">
              {isPatientRole ? 'My QR Health Identity Card' : 'Patient QR Health ID & Scanner'}
            </h2>
            <p className="mt-1 text-xs text-teal-100">
              Instant patient identification & record lookup using verifiable ASHA Health ID QR cards.
            </p>
          </div>
        </div>
      </section>

      <div className={`grid grid-cols-1 gap-5 ${isPatientRole ? '' : 'lg:grid-cols-2'}`}>
        {/* Generated QR Health ID Card */}
        <section className="rounded-2xl border border-[#E7EDF2] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7EDF2] pb-3">
            <h3 className="font-display text-base font-bold text-[#172B3A]">
              Verifiable QR Health ID Card
            </h3>
            {!isPatientRole && connectedPatients.length > 0 && (
              <select
                aria-label="Select patient for QR card"
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="min-h-[36px] rounded-xl border border-[#D4DDD9] bg-[#F7F9FC] px-3 text-xs font-semibold"
              >
                {connectedPatients.map((c) => (
                  <option key={c.patientId} value={c.patientUniqueId}>
                    {c.patientName} ({c.patientUniqueId})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="mt-4 flex flex-col items-center gap-4 rounded-2xl border-2 border-[#087F75]/25 bg-[#F7F9FC] p-5 sm:flex-row sm:items-start">
            <div className="flex shrink-0 flex-col items-center rounded-2xl border border-[#E7EDF2] bg-white p-3 shadow-xs">
              {qrSvg ? (
                <div
                  aria-label="Patient QR Health ID Code"
                  className="h-[190px] w-[190px] [&>svg]:h-full [&>svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              ) : (
                <div className="flex h-[190px] w-[190px] items-center justify-center text-xs text-[#718096]">
                  {loading ? 'Generating QR...' : 'QR ready'}
                </div>
              )}
              <span className="mt-2 font-mono text-[11px] font-bold text-[#087F75]">
                {resolved?.patient.patientUniqueId ?? selectedPatientId}
              </span>
            </div>

            <div className="min-w-0 flex-1 space-y-2.5 text-xs">
              <div>
                <div className="text-[11px] font-semibold text-[#718096]">Beneficiary Name</div>
                <div className="font-display text-lg font-extrabold text-[#172B3A]">
                  {resolved?.patient.fullName ?? 'Patient'}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-lg bg-[#E8F7F1] px-2.5 py-1 font-bold text-[#087F75]">
                  Mode: {(resolved?.patient.assignedMode ?? 'PREGNANCY').replace('_', ' ')}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 font-semibold text-[#172B3A]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#10A77A]" aria-hidden="true" />
                  Consent: {resolved?.consentGranted ? 'GRANTED' : 'RESTRICTED'}
                </span>
              </div>

              <div className="text-[#475B62]">
                Locality: <strong>{resolved?.patient.locality ?? 'Devanahalli Block'}</strong>
                {resolved?.connectedWorkerName && (
                  <> · ASHA: <strong>{resolved.connectedWorkerName}</strong> ({resolved.connectedWorkerUniqueId})</>
                )}
              </div>

              {resolved?.summary && (
                <div className="rounded-xl border border-[#E7EDF2] bg-white p-3 space-y-1">
                  {resolved.summary.pregnancyStage && (
                    <div className="flex items-center gap-1.5 font-semibold text-[#087F75]">
                      <HeartPulse className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {resolved.summary.pregnancyStage} ({resolved.summary.gestationalWeeks ?? '?'}w) · Risk:{' '}
                        {resolved.summary.riskLevel ?? 'NORMAL'}
                      </span>
                    </div>
                  )}
                  {resolved.summary.babyName && (
                    <div className="font-semibold text-[#2563EB]">
                      Newborn: {resolved.summary.babyName} · Current Wt: {resolved.summary.currentWeightKg ?? '—'} kg
                    </div>
                  )}
                  {resolved.summary.pendingVaccinesCount !== undefined && (
                    <div className="text-[#172B3A]">
                      Pending/Scheduled Vaccines: <strong>{resolved.summary.pendingVaccinesCount}</strong>
                    </div>
                  )}
                  {resolved.summary.upcomingAppointmentDate && (
                    <div className="font-mono text-[11px] text-[#087F75]">
                      Next Checkup: {resolved.summary.upcomingAppointmentDate}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadQrSvg}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-[#087F75] px-3.5 text-xs font-bold text-white hover:bg-[#066860]"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Download QR Card
                </button>
                {onOpenCareMode && resolved && (
                  <button
                    type="button"
                    onClick={() => onOpenCareMode(resolved.patient.assignedMode)}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-[#D4DDD9] bg-white px-3.5 text-xs font-bold text-[#172B3A] hover:border-[#087F75]"
                  >
                    <UserCheck className="h-3.5 w-3.5 text-[#087F75]" aria-hidden="true" />
                    Open Care Mode
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ASHA QR Scanner & Instant Lookup */}
        {!isPatientRole && (
          <section className="rounded-2xl border border-[#E7EDF2] bg-white p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E7EDF2] pb-3">
              <div className="flex items-center gap-2">
                <ScanLine className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
                <h3 className="font-display text-base font-bold text-[#172B3A]">
                  Scan or Resolve Patient QR Code
                </h3>
              </div>
              <button
                type="button"
                onClick={cameraActive ? stopCamera : () => void handleStartCameraScan()}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-[#087F75] px-3 text-xs font-bold text-[#087F75] hover:bg-[#E8F7F1]"
              >
                {cameraActive ? <X className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
                <span>{cameraActive ? 'Stop Camera' : 'Scan with Camera'}</span>
              </button>
            </div>

            {cameraActive && (
              <div className="overflow-hidden rounded-xl border border-[#087F75] bg-black">
                <video ref={videoRef} className="h-48 w-full object-cover" muted playsInline />
              </div>
            )}

            {cameraError && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                {cameraError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleResolveScan(scanInput);
              }}
              className="space-y-3"
            >
              <div>
                <label htmlFor="qr-scan-input" className="block text-xs font-semibold text-[#172B3A]">
                  QR Payload or Patient Unique ID
                </label>
                <div className="mt-1 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
                    <input
                      id="qr-scan-input"
                      type="text"
                      value={scanInput}
                      onChange={(e) => setScanInput(e.target.value)}
                      placeholder='Paste QR JSON or enter PAT-2026-0001'
                      className="min-h-[40px] w-full rounded-xl border border-[#D4DDD9] bg-white pl-9 pr-3 font-mono text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="min-h-[40px] rounded-xl bg-[#10A77A] px-4 text-xs font-bold text-white hover:bg-[#0D9169]"
                  >
                    Lookup
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-[#718096]">
                  Quick Field Test Scans:
                </div>
                <div className="flex flex-wrap gap-2">
                  {['PAT-2026-0001', 'PAT-2026-0002', 'PAT-2026-0003', 'PAT-2026-0004'].map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setScanInput(id);
                        void handleResolveScan(id);
                      }}
                      className="rounded-lg border border-[#E7EDF2] bg-[#F7F9FC] px-2.5 py-1 font-mono text-[11px] font-bold text-[#087F75] hover:border-[#087F75]"
                    >
                      Scan {id}
                    </button>
                  ))}
                  {qrString && (
                    <button
                      type="button"
                      onClick={() => {
                        setScanInput(qrString);
                        void handleResolveScan(qrString);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#A7F3D0] bg-[#E8F7F1] px-2.5 py-1 text-[11px] font-bold text-[#064E3B]"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Test Full JSON QR Payload
                    </button>
                  )}
                </div>
              </div>
            </form>

            {scanError && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-[#991B1B]">
                {scanError}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};
