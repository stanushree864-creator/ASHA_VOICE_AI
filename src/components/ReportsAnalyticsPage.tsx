import React, { useMemo, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getTranslations } from '../shared/i18n';
import type { AnalyticsBucket, LanguageCode, SavedVisitSummary, VisitType } from '../shared/types';

interface ReportsAnalyticsPageProps {
  language: LanguageCode;
  visits: SavedVisitSummary[];
  ashaWorkerName: string;
  analyticsRange: '7d' | '30d';
  analyticsBuckets: AnalyticsBucket[];
  onChangeRange: (r: '7d' | '30d') => void;
  onExportCsv: () => Promise<void>;
}

function getAsciiCategoryLabel(type: VisitType): string {
  if (type === 'ANC') return 'Pregnancy';
  if (type === 'NEWBORN') return 'Newborn';
  return 'Vaccines';
}

function formatVisitDetailsSummary(v: SavedVisitSummary, fallbackWorker: string) {
  const p = v.structuredPayload;
  const worker = p?.ashaWorkerName || v.workerName || fallbackWorker;
  const time = p?.visitTime ? ` · ${p.visitTime}` : '';
  const dateTime = `${v.visitDate}${time}`;

  const wt =
    v.visitType === 'NEWBORN'
      ? (p?.newbornDetails?.currentWeightKg ?? p?.newbornDetails?.birthWeightKg)
      : v.visitType === 'IMMUNISATION'
        ? p?.immunisationDetails?.childWeightKg
        : p?.pregnancyDetails?.weightKg;

  const bp = p?.pregnancyDetails?.bloodPressure;
  const gender = p?.newbornDetails?.babyGender;
  const vaccinesGiven = p?.immunisationDetails?.vaccinesGiven ?? [];
  const vaccinesDue = p?.immunisationDetails?.vaccinesDue ?? [];

  const condition =
    v.visitType === 'ANC'
      ? (p?.pregnancyDetails?.pregnancyCondition ?? p?.patientCondition)
      : v.visitType === 'NEWBORN'
        ? (p?.newbornDetails?.babyCondition ?? p?.patientCondition)
        : (p?.immunisationDetails?.childCondition ?? p?.patientCondition);

  const precautions = p?.precautions ?? null;

  const vitalsParts: string[] = [];
  if (wt !== null && wt !== undefined) vitalsParts.push(`${wt} kg`);
  if (bp) vitalsParts.push(`BP ${bp}`);
  if (gender) vitalsParts.push(gender);

  const clinicalParts: string[] = [];
  if (condition) clinicalParts.push(condition);
  if (vaccinesGiven.length > 0) clinicalParts.push(vaccinesGiven.join(', '));
  if (vaccinesDue.length > 0) clinicalParts.push(`Due: ${vaccinesDue.join(', ')}`);

  return {
    worker,
    dateTime,
    vitalsText: vitalsParts.join(' · ') || '—',
    clinicalText: clinicalParts.join(' | ') || '—',
    precautionsText: precautions || '—',
    nextVisitText: v.nextVisitDate || '—',
  };
}

async function generateVisitsPdf(
  targetVisits: SavedVisitSummary[],
  fallbackWorker: string,
  filename: string,
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const maxWidth = pageWidth - margin * 2;
  let y = 16;

  const nowStr = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  doc.setFillColor(8, 127, 117);
  doc.rect(0, 0, pageWidth, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('ASHA Visit Report', margin, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Generated: ${nowStr}   |   Total Visits: ${targetVisits.length}`, margin, 19);

  y = 34;

  const ancCount = targetVisits.filter((v) => v.visitType === 'ANC').length;
  const nbCount = targetVisits.filter((v) => v.visitType === 'NEWBORN').length;
  const immCount = targetVisits.filter((v) => v.visitType === 'IMMUNISATION').length;

  doc.setTextColor(23, 43, 58);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(
    `Pregnancy: ${ancCount}    |    Newborn: ${nbCount}    |    Vaccines: ${immCount}`,
    margin,
    y,
  );
  y += 8;

  if (targetVisits.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.text('No saved visits recorded yet.', margin, y + 4);
    doc.save(filename);
    return;
  }

  targetVisits.forEach((v, idx) => {
    const d = formatVisitDetailsSummary(v, fallbackWorker);
    const lines: string[] = [
      `ASHA Worker: ${d.worker}   |   Date & Time: ${d.dateTime}`,
      `Patient: ${v.beneficiaryName} (${v.beneficiaryCode})   |   Category: ${getAsciiCategoryLabel(v.visitType)}`,
      `Vitals / Gender: ${d.vitalsText}`,
      `Condition / Vaccines: ${d.clinicalText}`,
      `Precautions: ${d.precautionsText}`,
      `Next Visit: ${d.nextVisitText}   |   Safety: ${v.dangerSignStatus === 'positive_detected' ? 'ALERT / REFERRED' : 'Safe'}`,
    ];

    const wrappedBlocks = lines.map((line) => doc.splitTextToSize(line, maxWidth - 8) as string[]);
    const totalLineCount = wrappedBlocks.reduce((acc, block) => acc + block.length, 0);
    const boxHeight = 10 + totalLineCount * 4.8;

    if (y + boxHeight > 282) {
      doc.addPage();
      y = 16;
    }

    doc.setDrawColor(231, 237, 242);
    doc.setFillColor(247, 249, 252);
    doc.roundedRect(margin, y, maxWidth, boxHeight, 2, 2, 'FD');

    doc.setTextColor(8, 127, 117);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`#${idx + 1} · ${v.beneficiaryName} (${getAsciiCategoryLabel(v.visitType)})`, margin + 4, y + 6);

    doc.setTextColor(23, 43, 58);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.8);
    let lineY = y + 11.5;
    wrappedBlocks.forEach((block) => {
      doc.text(block, margin + 4, lineY);
      lineY += block.length * 4.8;
    });

    y += boxHeight + 4;
  });

  doc.save(filename);
}

export const ReportsAnalyticsPage: React.FC<ReportsAnalyticsPageProps> = ({
  language,
  visits,
  ashaWorkerName,
  analyticsRange,
  analyticsBuckets,
  onChangeRange,
  onExportCsv,
}) => {
  const [typeFilter, setTypeFilter] = useState<'ALL' | VisitType>('ALL');
  const [isExporting, setIsExporting] = useState(false);

  const t = getTranslations(language);
  const rt = t.reports;

  const getCategoryLabel = (type: VisitType) => {
    if (type === 'ANC') return t.categories.pregnancy;
    if (type === 'NEWBORN') return t.categories.newborn;
    return t.categories.vaccines;
  };

  const filteredVisits = useMemo(
    () => (typeFilter === 'ALL' ? visits : visits.filter((v) => v.visitType === typeFilter)),
    [typeFilter, visits],
  );

  const categoryData = useMemo(
    () => [
      { name: t.categories.pregnancy, value: visits.filter((v) => v.visitType === 'ANC').length, color: '#087F75' },
      { name: t.categories.newborn, value: visits.filter((v) => v.visitType === 'NEWBORN').length, color: '#10A77A' },
      { name: t.categories.vaccines, value: visits.filter((v) => v.visitType === 'IMMUNISATION').length, color: '#60A5FA' },
    ],
    [t.categories.newborn, t.categories.pregnancy, t.categories.vaccines, visits],
  );

  const handleDownloadCsv = async () => {
    setIsExporting(true);
    try {
      await onExportCsv();
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadAllPdf = async () => {
    const stamp = new Date().toISOString().slice(0, 10);
    await generateVisitsPdf(filteredVisits, ashaWorkerName, `asha-visit-report-${stamp}.pdf`);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#E7EDF2] bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7EDF2] pb-4">
          <h2 className="font-display text-xl font-bold text-[#172B3A]">{rt.title}</h2>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleDownloadAllPdf()}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[#087F75] px-4 py-2 text-xs font-bold text-white hover:bg-[#066860]"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              <span>{rt.downloadPdf}</span>
            </button>

            <button
              type="button"
              onClick={() => void handleDownloadCsv()}
              disabled={isExporting}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-4 py-2 text-xs font-semibold text-[#172B3A] hover:border-[#087F75] disabled:opacity-50"
            >
              <Download className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
              <span>{isExporting ? t.form.saving : rt.downloadCsv}</span>
            </button>
          </div>
        </div>

        {/* Recorded Visits Table */}
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
            <h3 className="font-display text-sm font-bold text-[#172B3A]">
              {rt.visitRecords} ({filteredVisits.length})
            </h3>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  { id: 'ALL', label: t.categories.all },
                  { id: 'ANC', label: t.categories.pregnancy },
                  { id: 'NEWBORN', label: t.categories.newborn },
                  { id: 'IMMUNISATION', label: t.categories.vaccines },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTypeFilter(item.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    typeFilter === item.id
                      ? 'bg-[#087F75] text-white'
                      : 'border border-[#E7EDF2] bg-[#F7F9FC] text-[#718096]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E7EDF2]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F9FC] text-[#718096]">
                <tr className="border-b border-[#E7EDF2]">
                  <th className="whitespace-nowrap px-3 py-2.5 font-semibold">{rt.dateTime}</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-semibold">{rt.ashaWorker}</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-semibold">{rt.category}</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-semibold">{rt.patient}</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-semibold">{rt.vitalsCol}</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-semibold">{rt.clinicalCol}</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-semibold">{rt.precautions}</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-semibold">{rt.nextVisit}</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-semibold">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7EDF2]">
                {filteredVisits.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-[#718096]">
                      {rt.noVisits}
                    </td>
                  </tr>
                ) : (
                  filteredVisits.map((v) => {
                    const details = formatVisitDetailsSummary(v, ashaWorkerName);
                    return (
                      <tr key={v.id} className="align-top hover:bg-[#F7F9FC]/60">
                        <td className="whitespace-nowrap px-3 py-2.5 font-mono tabular-nums text-[#172B3A]">
                          {details.dateTime}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 font-medium text-[#172B3A]">
                          {details.worker}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-[#087F75]">
                          {getCategoryLabel(v.visitType)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-[#172B3A]">
                          {v.beneficiaryName}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[#172B3A]">
                          {details.vitalsText}
                        </td>
                        <td className="max-w-[220px] px-3 py-2.5 text-[#172B3A]">
                          {details.clinicalText}
                        </td>
                        <td className="max-w-[200px] px-3 py-2.5 text-[#172B3A]">
                          {details.precautionsText}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 font-mono tabular-nums text-[#172B3A]">
                          {details.nextVisitText}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5">
                          <button
                            type="button"
                            onClick={() =>
                              void generateVisitsPdf(
                                [v],
                                ashaWorkerName,
                                `visit-${v.beneficiaryName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${v.visitDate}.pdf`,
                              )
                            }
                            aria-label={`${rt.downloadPdf} - ${v.beneficiaryName}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#E7EDF2] bg-white px-2.5 py-1 text-[11px] font-bold text-[#087F75] hover:border-[#087F75] hover:bg-[#E8F7F1]"
                          >
                            <FileText className="h-3 w-3" aria-hidden="true" />
                            <span>PDF</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Charts */}
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <div className="min-w-0 rounded-2xl border border-[#E7EDF2] bg-[#F7F9FC] p-4 lg:col-span-8">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-[#172B3A]">
                {rt.visitsLabel} ({analyticsRange === '7d' ? rt.days7 : rt.days30})
              </h3>
              <div className="flex gap-1 rounded-lg border border-[#E7EDF2] bg-white p-1">
                {(['7d', '30d'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onChangeRange(r)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                      analyticsRange === r ? 'bg-[#087F75] text-white' : 'text-[#718096]'
                    }`}
                  >
                    {r === '7d' ? rt.days7 : rt.days30}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsBuckets} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7EDF2" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#718096' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#718096' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E7EDF2', fontSize: 12 }} />
                  <Bar dataKey="ANC" name={t.categories.pregnancy} stackId="a" fill="#087F75" />
                  <Bar dataKey="NEWBORN" name={t.categories.newborn} stackId="a" fill="#10A77A" />
                  <Bar dataKey="IMMUNISATION" name={t.categories.vaccines} stackId="a" fill="#60A5FA" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-[#E7EDF2] bg-[#F7F9FC] p-4 lg:col-span-4">
            <h3 className="font-display text-sm font-bold text-[#172B3A]">
              {rt.categoriesLabel} ({visits.length})
            </h3>
            <div className="mt-2 h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={40}
                    outerRadius={68}
                    paddingAngle={3}
                  >
                    {categoryData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 text-xs">
              {categoryData.map((c) => (
                <div key={c.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[#172B3A]">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: c.color }}
                    />
                    {c.name}
                  </span>
                  <span className="font-mono font-bold tabular-nums text-[#172B3A]">{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
