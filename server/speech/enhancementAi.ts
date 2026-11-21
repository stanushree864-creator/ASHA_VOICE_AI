import { GoogleGenAI, Type } from '@google/genai';
import { getLanguageConfig } from '../../src/shared/languages';
import type { LanguageCode, PregnancyRiskFactor, PregnancyRiskTier } from '../../src/shared/types';

const GEMINI_TEXT_MODEL = 'gemini-4-hydrogen';

function createClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    const err = new Error('GEMINI_API_KEY is not configured on the server.');
    (err as Error & { code?: string }).code = 'GEMINI_UNCONFIGURED';
    throw err;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: 12000,
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function isEnhancementGeminiReady(): boolean {
  const apiKey = process.env.GEMINI_API_KEY;
  return Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY');
}

export async function askMultilingualAssistantWithGemini(params: {
  question: string;
  language: LanguageCode;
  contextSummary?: string;
}): Promise<{
  reply: string;
  suggestedQuestions: string[];
  modelUsed: string;
}> {
  const ai = createClient();
  const langCfg = getLanguageConfig(params.language);

  const systemInstruction = `You are a practical field clinical guidance assistant for Indian ASHA community health workers following NHM (National Health Mission), HBNC, PMSMA, and NIS (National Immunisation Schedule) protocols.
Respond strictly in ${langCfg.name} (${langCfg.nativeName}, BCP-47: ${langCfg.bcp47}) so the worker can read or listen directly in her selected language.
Keep answers concise, actionable, culturally appropriate for rural/semi-urban Indian households, and always advise immediate PHC / 108 referral when any obstetric or newborn danger sign is present. Never prescribe schedule-H prescription drugs; focus on ASHA protocols (BP/Hb checks, IFA/calcium adherence, KMC, exclusive breastfeeding, ORS, vaccines, warning signs, and referral).`;

  const response = await ai.models.generateContent({
    model: GEMINI_TEXT_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `${params.contextSummary ? `Worker context: ${params.contextSummary}\n\n` : ''}Question: ${params.question}`,
          },
        ],
      },
    ],
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reply: {
            type: Type.STRING,
            description: `Clear, field-ready clinical guidance answer written in ${langCfg.name}.`,
          },
          suggestedQuestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: `2 to 3 short follow-up questions in ${langCfg.name} relevant to this topic.`,
          },
        },
        required: ['reply', 'suggestedQuestions'],
      },
    },
  });

  const rawText = (response.text ?? '').trim();
  if (!rawText) {
    throw new Error('Empty response returned from Gemini assistant');
  }

  try {
    const parsed = JSON.parse(rawText) as { reply?: string; suggestedQuestions?: string[] };
    return {
      reply: (parsed.reply || rawText).trim(),
      suggestedQuestions: Array.isArray(parsed.suggestedQuestions)
        ? parsed.suggestedQuestions.slice(0, 3)
        : [],
      modelUsed: GEMINI_TEXT_MODEL,
    };
  } catch {
    return {
      reply: rawText,
      suggestedQuestions: [],
      modelUsed: GEMINI_TEXT_MODEL,
    };
  }
}

export async function analyzePregnancyRiskWithGemini(params: {
  patientName: string;
  gestationalWeeks: number | null;
  bloodPressure: string | null;
  hemoglobinGDl: number | null;
  weightKg: number | null;
  ancVisitsCompleted: number;
  symptomsOrNotes: string | null;
  deterministicTier: PregnancyRiskTier;
  deterministicScore: number;
  factors: PregnancyRiskFactor[];
}): Promise<{ summary: string; modelUsed: string }> {
  const ai = createClient();

  const prompt = `Summarize maternal risk triage for an ASHA worker under Indian NHM / PMSMA guidelines in 2-3 concise sentences.
Patient: ${params.patientName}
Gestational Weeks: ${params.gestationalWeeks ?? 'Unknown'}
BP: ${params.bloodPressure ?? 'Not recorded'}
Hemoglobin: ${params.hemoglobinGDl != null ? `${params.hemoglobinGDl} g/dL` : 'Not recorded'}
Weight: ${params.weightKg != null ? `${params.weightKg} kg` : 'Not recorded'}
ANC Visits Completed: ${params.ancVisitsCompleted}
Notes/Symptoms: ${params.symptomsOrNotes || 'None reported'}
Clinical Rule Score: ${params.deterministicScore}/100 (${params.deterministicTier})
Triggered Factors: ${params.factors.map((f) => `${f.label} (${f.observedValue})`).join('; ') || 'None'}

Provide immediate practical next actions for the ASHA worker and whether PHC/FRU doctor referral is urgent.`;

  const response = await ai.models.generateContent({
    model: GEMINI_TEXT_MODEL,
    contents: prompt,
  });

  const summary = (response.text ?? '').trim();
  if (!summary) {
    throw new Error('Empty pregnancy risk summary returned by Gemini');
  }

  return { summary, modelUsed: GEMINI_TEXT_MODEL };
}
