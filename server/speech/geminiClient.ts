import { GoogleGenAI, LiveServerMessage, Modality, ThinkingLevel, Type } from '@google/genai';
import type { WebSocket, WebSocketServer } from 'ws';
import { verifyAuthToken } from '../auth/authService';
import {
  applyVoiceCorrection,
  extractBloodPressure,
  extractStructuredVisitDeterministic,
  matchBeneficiary,
} from '../../src/shared/clinicalEngine';
import { isGnaniConfigured } from './gnaniClient';
import { detectDangerSigns } from '../../src/shared/dangerSigns';
import { getLanguageConfig } from '../../src/shared/languages';
import type {
  Beneficiary,
  LanguageCode,
  StructuredVisitRecord,
  VisitType,
} from '../../src/shared/types';

const GEMINI_TIMEOUT_MS = 8000;

function cleanAiText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || /^(?:null|none|n\/a|na|unknown|not\s+mentioned|not\s+provided|-+|—)$/i.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: GEMINI_TIMEOUT_MS,
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function isGeminiConfigured(): boolean {
  return getGeminiClient() !== null;
}

export async function transcribeAudioWithGemini(params: {
  base64Audio: string;
  mimeType: string;
  language: LanguageCode;
}): Promise<{ transcript: string; detectedLanguage: string; latencyMs: number }> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const started = Date.now();
  const langCfg = getLanguageConfig(params.language);

  const cleanMime = (params.mimeType || 'audio/wav').split(';')[0].trim();

  const response = await withTimeout(
    ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: cleanMime,
              data: params.base64Audio,
            },
          },
          {
            text: `Transcribe this Indian healthcare field worker's spoken audio verbatim. The worker's primary selected language is ${langCfg.name} (${langCfg.bcp47}), and she may naturally code-mix English medical terms (such as BP, blood pressure, ANC checkup, TT/Td injection, IFA goli, BCG, OPV, Pentavalent, PHC, weight in kg, dates, and beneficiary IDs like ASHA00125). Output the spoken regional words in the native script of ${langCfg.name} without translating into English, and preserve exact numbers, BP readings (e.g. 120/80), weights, and dates without inventing words.`,
          },
        ],
      },
    }),
    14000,
    'Gemini STT',
  );

  const latencyMs = Date.now() - started;
  const transcript = (response.text ?? '').trim();
  return {
    transcript,
    detectedLanguage: langCfg.name,
    latencyMs,
  };
}

export async function synthesizeSpeechWithGemini(params: {
  text: string;
  language: LanguageCode;
  urgent?: boolean;
}): Promise<{ base64Wav: string; mimeType: string; latencyMs: number }> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const started = Date.now();
  const langCfg = getLanguageConfig(params.language);
  const styleInstruction = params.urgent
    ? `Urgent, clear, authoritative healthcare alert in ${langCfg.name}. Speak at a steady, unmistakable pace.`
    : `Calm, warm, reassuring community healthcare assistant speaking clearly in ${langCfg.name}.`;

  const response = await withTimeout(
    ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: params.text,
              speechMetadata: {
                style: styleInstruction,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    }),
    5000,
    'Gemini TTS',
  );

  const latencyMs = Date.now() - started;
  const base64Wav = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Wav) {
    throw new Error('Speech synthesis returned no audio payload.');
  }

  return {
    base64Wav,
    mimeType: 'audio/wav',
    latencyMs,
  };
}

export async function extractStructuredVisitWithAI(params: {
  transcript: string;
  visitType?: VisitType | null;
  language: LanguageCode;
  workerId: string;
  beneficiaries: Beneficiary[];
  selectedBeneficiary?: Beneficiary | null;
}): Promise<{
  record: StructuredVisitRecord;
  ambiguityCandidates: Beneficiary[];
  latencyMs: number;
}> {
  const started = Date.now();
  // Always run deterministic baseline & deterministic safety engine in parallel
  const deterministicBase = extractStructuredVisitDeterministic({
    transcript: params.transcript,
    visitType: params.visitType,
    language: params.language,
    workerId: params.workerId,
    beneficiaries: params.beneficiaries,
    selectedBeneficiary: params.selectedBeneficiary,
    extractionSource: 'OFFLINE_DETERMINISTIC_PARSER',
  });

  const benMatch = params.selectedBeneficiary
    ? { status: 'MATCHED' as const, matches: [params.selectedBeneficiary] }
    : matchBeneficiary(params.transcript, params.beneficiaries);

  const ai = getGeminiClient();
  if (!ai) {
    return {
      record: deterministicBase,
      ambiguityCandidates: benMatch.status === 'AMBIGUOUS' ? benMatch.matches : [],
      latencyMs: Date.now() - started,
    };
  }

  try {
    const benListPrompt = params.beneficiaries
      .map((b) => `${b.beneficiaryCode}: ${b.displayName} (${b.beneficiaryType})`)
      .join('; ');

    const aiResponse = await withTimeout(
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `You are a clinical data extraction engine for ASHA community health workers in India.
Allowed synthetic beneficiaries: [${benListPrompt}].
Preferred visit type hint: ${params.visitType ?? 'auto-detect'}.
Primary language: ${params.language}.
Transcript: "${params.transcript}"

Rules:
1. Extract ONLY explicitly stated values. NEVER invent or guess missing measurements, blood pressures, dates, or vaccines. Leave unknown values null.
2. Preserve exact numbers (weights in kg as decimal numbers, bloodPressure normalized as "systolic/diastolic" e.g. "118/76", dates in YYYY-MM-DD assuming year 2026 if omitted).
3. Support all 12 Indian languages (Kannada, Hindi, Tamil, Telugu, Malayalam, Marathi, Bengali, Gujarati, Punjabi, Odia, Assamese, English) and code-mixing (e.g., "IFA goli regular aagi togondiddare" -> ifaStatus: "reported_taking"; "TT injection complete agide" -> vaccinationStatus: "reported_completed"; "ಬಿಪಿ 120/80", "वजन 52 किलो" -> bloodPressure: "120/80", weightKg: 52).
4. Match beneficiaryCode from the allowed list if mentioned; if an unlisted patient name is spoken, set beneficiaryName without inventing a code.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              beneficiaryCode: { type: Type.STRING, nullable: true },
              beneficiaryName: { type: Type.STRING, nullable: true },
              visitType: { type: Type.STRING },
              detectedLanguages: { type: Type.ARRAY, items: { type: Type.STRING } },
              weightKg: { type: Type.NUMBER, nullable: true },
              birthWeightKg: { type: Type.NUMBER, nullable: true },
              gestationalAgeWeeks: { type: Type.INTEGER, nullable: true },
              bloodPressure: { type: Type.STRING, nullable: true },
              ancStatus: { type: Type.STRING, nullable: true },
              ifaStatus: { type: Type.STRING, nullable: true },
              vaccinationStatus: { type: Type.STRING, nullable: true },
              feedingObservations: { type: Type.STRING, nullable: true },
              reportedTemperature: { type: Type.STRING, nullable: true },
              immunisationChecked: { type: Type.BOOLEAN, nullable: true },
              babyGender: { type: Type.STRING, nullable: true },
              patientCondition: { type: Type.STRING, nullable: true },
              precautions: { type: Type.STRING, nullable: true },
              vaccinesGiven: { type: Type.ARRAY, items: { type: Type.STRING } },
              vaccinesDue: { type: Type.ARRAY, items: { type: Type.STRING } },
              nextVisitDate: { type: Type.STRING, nullable: true },
              observations: { type: Type.STRING, nullable: true },
              aiDetectedDangerSymptom: { type: Type.BOOLEAN },
              aiDangerPhrase: { type: Type.STRING, nullable: true },
              aiNegatedDangerSymptom: { type: Type.BOOLEAN },
            },
          },
        },
      }),
      GEMINI_TIMEOUT_MS,
      'Gemini extraction',
    );

    const parsed = JSON.parse((aiResponse.text ?? '{}').trim()) as {
      beneficiaryCode?: string | null;
      beneficiaryName?: string | null;
      visitType?: string;
      detectedLanguages?: string[];
      weightKg?: number | null;
      birthWeightKg?: number | null;
      gestationalAgeWeeks?: number | null;
      bloodPressure?: string | null;
      ancStatus?: string | null;
      ifaStatus?: string | null;
      vaccinationStatus?: string | null;
      feedingObservations?: string | null;
      reportedTemperature?: string | null;
      immunisationChecked?: boolean | null;
      babyGender?: string | null;
      patientCondition?: string | null;
      precautions?: string | null;
      vaccinesGiven?: string[];
      vaccinesDue?: string[];
      nextVisitDate?: string | null;
      observations?: string | null;
      aiDetectedDangerSymptom?: boolean;
      aiDangerPhrase?: string | null;
      aiNegatedDangerSymptom?: boolean;
    };

    const resolvedBen =
      params.selectedBeneficiary ??
      params.beneficiaries.find(
        (b) => parsed.beneficiaryCode && b.beneficiaryCode.toUpperCase() === parsed.beneficiaryCode.toUpperCase(),
      ) ??
      (benMatch.status === 'MATCHED' ? benMatch.matches[0] : null);

    // Respect explicit visitType chosen by the worker; only auto-detect when null/unset
    const resolvedVisitType: VisitType =
      params.visitType ??
      (parsed.visitType === 'NEWBORN' || parsed.visitType === 'IMMUNISATION' || parsed.visitType === 'ANC'
        ? parsed.visitType
        : deterministicBase.visitType);

    const parsedBpClean = cleanAiText(parsed.bloodPressure);
    const normalizedParsedBp = parsedBpClean ? extractBloodPressure(parsedBpClean) : null;
    const parsedWeightValid =
      typeof parsed.weightKg === 'number' && Number.isFinite(parsed.weightKg) && parsed.weightKg > 0.3 && parsed.weightKg < 200
        ? parsed.weightKg
        : null;
    const parsedBirthWeightValid =
      typeof parsed.birthWeightKg === 'number' &&
      Number.isFinite(parsed.birthWeightKg) &&
      parsed.birthWeightKg > 0.3 &&
      parsed.birthWeightKg < 20
        ? parsed.birthWeightKg
        : null;

    // Re-run deterministic danger-sign rules on the resolved visit type (safety rules are NEVER overridden by LLM)
    const deterministicDanger = detectDangerSigns(params.transcript, resolvedVisitType);
    const mergedRecord: StructuredVisitRecord = {
      ...deterministicBase,
      beneficiaryId: resolvedBen?.beneficiaryCode ?? deterministicBase.beneficiaryId,
      beneficiaryName:
        resolvedBen?.displayName ?? cleanAiText(parsed.beneficiaryName) ?? deterministicBase.beneficiaryName,
      householdId: resolvedBen?.householdCode ?? deterministicBase.householdId,
      visitType: resolvedVisitType,
      detectedLanguages:
        parsed.detectedLanguages && parsed.detectedLanguages.length > 0
          ? parsed.detectedLanguages
          : deterministicBase.detectedLanguages,
      observations: cleanAiText(parsed.observations) ?? deterministicBase.observations,
      patientCondition: cleanAiText(parsed.patientCondition) ?? deterministicBase.patientCondition ?? null,
      precautions: cleanAiText(parsed.precautions) ?? deterministicBase.precautions ?? null,
      nextVisitDate: cleanAiText(parsed.nextVisitDate) ?? deterministicBase.nextVisitDate,
      dangerSignStatus: deterministicDanger.status,
      dangerAnalysis: deterministicDanger,
      referralStatus:
        deterministicDanger.status === 'positive_detected' ? 'immediate_phc_required' : 'not_required',
      confirmationStatus:
        deterministicDanger.status === 'positive_detected'
          ? 'emergency_unconfirmed'
          : 'pending_confirmation',
      extractionSource: 'GEMINI_STRUCTURED_AI',
    };

    if (resolvedVisitType === 'ANC') {
      mergedRecord.pregnancyDetails = {
        gestationalAgeWeeks:
          parsed.gestationalAgeWeeks ?? deterministicBase.pregnancyDetails?.gestationalAgeWeeks ?? null,
        ancStatus:
          (cleanAiText(parsed.ancStatus) as 'completed' | 'scheduled' | 'pending' | null) ??
          deterministicBase.pregnancyDetails?.ancStatus ??
          null,
        weightKg: parsedWeightValid ?? deterministicBase.pregnancyDetails?.weightKg ?? null,
        bloodPressure: normalizedParsedBp ?? deterministicBase.pregnancyDetails?.bloodPressure ?? null,
        pregnancyCondition:
          cleanAiText(parsed.patientCondition) ?? deterministicBase.pregnancyDetails?.pregnancyCondition ?? null,
        ifaStatus:
          (cleanAiText(parsed.ifaStatus) as 'reported_taking' | 'not_taking' | 'supplied' | 'unknown' | null) ??
          deterministicBase.pregnancyDetails?.ifaStatus ??
          null,
        vaccinationStatus:
          (cleanAiText(parsed.vaccinationStatus) as 'reported_completed' | 'due' | 'partial' | null) ??
          deterministicBase.pregnancyDetails?.vaccinationStatus ??
          null,
        tdDose: deterministicBase.pregnancyDetails?.tdDose ?? null,
        reportedSymptoms:
          deterministicDanger.matches.length > 0
            ? deterministicDanger.matches.map((m) => m.title).join('; ')
            : null,
      };
      mergedRecord.newbornDetails = null;
      mergedRecord.immunisationDetails = null;
    } else if (resolvedVisitType === 'NEWBORN') {
      const normalizedGender: 'Girl' | 'Boy' | null =
        parsed.babyGender && /girl|female/i.test(parsed.babyGender)
          ? 'Girl'
          : parsed.babyGender && /boy|male/i.test(parsed.babyGender)
            ? 'Boy'
            : deterministicBase.newbornDetails?.babyGender ?? null;
      mergedRecord.newbornDetails = {
        newbornId: resolvedBen?.beneficiaryCode ?? null,
        motherBeneficiaryId: resolvedBen?.motherBeneficiaryCode ?? null,
        birthDate: resolvedBen?.dateOfBirth ?? null,
        ageDays: null,
        birthWeightKg: parsedBirthWeightValid ?? deterministicBase.newbornDetails?.birthWeightKg ?? null,
        currentWeightKg: parsedWeightValid ?? deterministicBase.newbornDetails?.currentWeightKg ?? null,
        babyGender: normalizedGender,
        babyCondition: cleanAiText(parsed.patientCondition) ?? deterministicBase.newbornDetails?.babyCondition ?? null,
        feedingObservations:
          cleanAiText(parsed.feedingObservations) ?? deterministicBase.newbornDetails?.feedingObservations ?? null,
        reportedTemperature:
          cleanAiText(parsed.reportedTemperature) ?? deterministicBase.newbornDetails?.reportedTemperature ?? null,
        immunisationChecked:
          parsed.immunisationChecked ?? deterministicBase.newbornDetails?.immunisationChecked ?? null,
      };
      mergedRecord.pregnancyDetails = null;
      mergedRecord.immunisationDetails = null;
    } else if (resolvedVisitType === 'IMMUNISATION') {
      mergedRecord.immunisationDetails = {
        childAgeLabel: deterministicBase.immunisationDetails?.childAgeLabel ?? null,
        childWeightKg: parsedWeightValid ?? deterministicBase.immunisationDetails?.childWeightKg ?? null,
        childCondition: cleanAiText(parsed.patientCondition) ?? deterministicBase.immunisationDetails?.childCondition ?? null,
        vaccinesGiven:
          parsed.vaccinesGiven && parsed.vaccinesGiven.length > 0
            ? parsed.vaccinesGiven
            : deterministicBase.immunisationDetails?.vaccinesGiven ?? [],
        vaccinesDue:
          parsed.vaccinesDue && parsed.vaccinesDue.length > 0
            ? parsed.vaccinesDue
            : deterministicBase.immunisationDetails?.vaccinesDue ?? [],
        missedVaccines: [],
        previousVaccineHistory: null,
        scheduleVersion: 'NIS-2026.03',
      };
      mergedRecord.pregnancyDetails = null;
      mergedRecord.newbornDetails = null;
    }

    return {
      record: mergedRecord,
      ambiguityCandidates: !resolvedBen && benMatch.status === 'AMBIGUOUS' ? benMatch.matches : [],
      latencyMs: Date.now() - started,
    };
  } catch (err) {
    console.error('Gemini extraction error, returning explicit deterministic validation:', err);
    return {
      record: deterministicBase,
      ambiguityCandidates: benMatch.status === 'AMBIGUOUS' ? benMatch.matches : [],
      latencyMs: Date.now() - started,
    };
  }
}

export async function processVoiceCorrectionWithAI(params: {
  record: StructuredVisitRecord;
  correctionText: string;
  beneficiaries: Beneficiary[];
}) {
  // First try deterministic voice correction (instant for standard English/code-mixed corrections)
  const direct = applyVoiceCorrection(params.record, params.correctionText, params.beneficiaries);
  if (direct.action !== 'NEEDS_CLARIFICATION') {
    return direct;
  }

  // If multilingual/complex phrasing, translate/normalize intent via Gemini 4 Hydrogen and apply safely
  const ai = getGeminiClient();
  if (!ai) return direct;

  try {
    const resp = await withTimeout(
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Normalize this ASHA worker voice correction into a concise English command so our deterministic updater can patch the exact field.
Spoken correction: "${params.correctionText}"
Examples of output:
- "Yes, save"
- "Repeat the entire record"
- "Weight is 2.8 kilo"
- "BP is 120/80"
- "Condition is stable"
- "Precautions take IFA tablet daily"
- "Next visit is 2026-11-28"
- "Beneficiary is ASHA00125"
Return ONLY the normalized short command string.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      }),
      GEMINI_TIMEOUT_MS,
      'Gemini correction',
    );
    const normalized = (resp.text ?? '').trim();
    if (normalized) {
      return applyVoiceCorrection(params.record, normalized, params.beneficiaries);
    }
  } catch (err) {
    console.error('Voice correction normalization error:', err);
  }
  return direct;
}

/**
 * Real-time WebSocket streaming gateway bridging browser mic PCM frames to Gemini Live Transcription
 * and running parallel deterministic danger-sign detection on every interim/final utterance.
 */
export function attachVoiceWebSocketGateway(wss: WebSocketServer): void {
  wss.on('connection', async (clientWs: WebSocket, req) => {
    const url = new URL(req.url || '/', 'http://localhost');
    const token = url.searchParams.get('token') ?? '';
    const language = (url.searchParams.get('language') ?? 'en') as LanguageCode;
    const visitType = (url.searchParams.get('visitType') ?? 'ANC') as VisitType;

    const payload = verifyAuthToken(token);
    if (!payload) {
      clientWs.send(JSON.stringify({ type: 'ERROR', error: 'Unauthorized WebSocket session' }));
      clientWs.close(1008, 'Unauthorized');
      return;
    }

    const ai = getGeminiClient();
    let liveSession: Awaited<ReturnType<GoogleGenAI['live']['connect']>> | null = null;
    let accumulatedTranscript = '';

    if (ai) {
      try {
        liveSession = await ai.live.connect({
          model: 'gemini-3.5-transcribe-live',
          config: {
            responseModalities: [Modality.TEXT],
            inputAudioTranscription: {
              languageCodes: [], // Automatic multilingual + code-mixing detection
            },
          },
          callbacks: {
            onmessage: (message: LiveServerMessage) => {
              const content = message.serverContent;
              if (content?.interimInputTranscription?.text) {
                const partial = content.interimInputTranscription.text;
                const combined = `${accumulatedTranscript} ${partial}`.trim();
                const dangerCheck = detectDangerSigns(combined, visitType);
                clientWs.send(
                  JSON.stringify({
                    type: 'INTERIM_TRANSCRIPT',
                    text: partial,
                    combinedTranscript: combined,
                    dangerAnalysis: dangerCheck,
                  }),
                );
              }
              if (content?.inputTranscription?.text) {
                const finalChunk = content.inputTranscription.text;
                accumulatedTranscript = `${accumulatedTranscript} ${finalChunk}`.trim();
                const dangerCheck = detectDangerSigns(accumulatedTranscript, visitType);
                clientWs.send(
                  JSON.stringify({
                    type: 'FINAL_TRANSCRIPT',
                    text: finalChunk,
                    combinedTranscript: accumulatedTranscript,
                    dangerAnalysis: dangerCheck,
                  }),
                );
                if (dangerCheck.status === 'positive_detected') {
                  clientWs.send(
                    JSON.stringify({
                      type: 'DANGER_EVENT',
                      dangerAnalysis: dangerCheck,
                    }),
                  );
                }
              }
            },
            onerror: () => {
              clientWs.send(
                JSON.stringify({
                  type: 'PROVIDER_WARNING',
                  message: 'Live streaming STT connection interrupted. Fallback chunk transcription active.',
                }),
              );
            },
          },
        });

        clientWs.send(
          JSON.stringify({
            type: 'SESSION_READY',
            provider: 'gemini-3.5-transcribe-live',
            language,
          }),
        );
      } catch {
        clientWs.send(
          JSON.stringify({
            type: 'PROVIDER_WARNING',
            message: 'Live streaming STT unavailable; microphone recording will transcribe on stop.',
          }),
        );
      }
    } else if (!isGnaniConfigured()) {
      clientWs.send(
        JSON.stringify({
          type: 'PROVIDER_WARNING',
          message: 'Server speech key not configured; local browser speech recognition active.',
        }),
      );
    }

    clientWs.on('message', (rawData) => {
      try {
        const msg = JSON.parse(rawData.toString()) as { type?: string; audio?: string; pcmBase64?: string };
        const audioData = msg.audio || msg.pcmBase64;
        if (msg.type === 'AUDIO_PCM' && audioData && liveSession) {
          liveSession.sendRealtimeInput({
            audio: { data: audioData, mimeType: 'audio/pcm;rate=16000' },
          });
        }
        if (msg.type === 'BARGE_IN') {
          clientWs.send(JSON.stringify({ type: 'BARGE_IN_ACK', timestamp: Date.now() }));
        }
      } catch {
        // Ignore malformed frames cleanly
      }
    });

    clientWs.on('close', () => {
      try {
        liveSession?.close();
      } catch {
        // Ignore close cleanup errors
      }
    });
  });
}
