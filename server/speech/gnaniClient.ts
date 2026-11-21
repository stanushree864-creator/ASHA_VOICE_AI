import { getLanguageConfig } from '../../src/shared/languages';
import type { LanguageCode } from '../../src/shared/types';

const GNANI_BASE_URL = 'https://api.vachana.ai';
const GNANI_TIMEOUT_MS = 15000;

function getGnaniSttLanguageCode(language: LanguageCode): string {
  if (language === 'en') return 'en-IN';
  if (language === 'or' || language === 'as') return 'indic-auto';
  return `${getLanguageConfig(language).bcp47},en-IN`;
}

function getGnaniTtsLanguageCode(language: LanguageCode): string {
  if (language === 'or' || language === 'as') return 'hi-IN';
  return getLanguageConfig(language).bcp47;
}

function getGnaniCredentials(): { apiKey: string; apiName: string } | null {
  const apiKey = process.env.GNANI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GNANI_API_KEY') {
    return null;
  }
  const apiName = process.env.GNANI_API_NAME?.trim() || 'asha@1510';
  return { apiKey, apiName };
}

export function isGnaniConfigured(): boolean {
  return getGnaniCredentials() !== null;
}

function getFileExtensionForMime(mimeType: string): { ext: string; cleanMime: string } {
  const lower = mimeType.toLowerCase();
  if (lower.includes('wav')) return { ext: 'wav', cleanMime: 'audio/wav' };
  if (lower.includes('webm')) return { ext: 'webm', cleanMime: 'audio/webm' };
  if (lower.includes('mp3') || lower.includes('mpeg')) return { ext: 'mp3', cleanMime: 'audio/mpeg' };
  if (lower.includes('ogg')) return { ext: 'ogg', cleanMime: 'audio/ogg' };
  if (lower.includes('flac')) return { ext: 'flac', cleanMime: 'audio/flac' };
  if (lower.includes('aac')) return { ext: 'aac', cleanMime: 'audio/aac' };
  if (lower.includes('m4a') || lower.includes('mp4')) return { ext: 'm4a', cleanMime: 'audio/mp4' };
  return { ext: 'wav', cleanMime: 'audio/wav' };
}

function getGnaniVoiceForLanguage(language: LanguageCode): string {
  switch (language) {
    case 'hi':
    case 'mr':
    case 'gu':
    case 'pa':
      return 'Lakshmi';
    case 'kn':
    case 'ta':
    case 'te':
    case 'ml':
    case 'bn':
    case 'or':
    case 'as':
    case 'en':
    default:
      return 'Lakshmi';
  }
}

export async function transcribeAudioWithGnani(params: {
  base64Audio: string;
  mimeType: string;
  language: LanguageCode;
}): Promise<{ transcript: string; detectedLanguage: string; latencyMs: number; provider: 'gnani-vachana' }> {
  const creds = getGnaniCredentials();
  if (!creds) {
    throw new Error('GNANI_API_KEY is not configured on the server.');
  }

  const started = Date.now();
  const langCfg = getLanguageConfig(params.language);
  const { ext, cleanMime } = getFileExtensionForMime(params.mimeType || 'audio/wav');
  const audioBuffer = Buffer.from(params.base64Audio, 'base64');

  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: cleanMime });
  formData.append('audio_file', blob, `visit.${ext}`);
  formData.append('model', 'prisma-v3.0');
  formData.append('language_code', getGnaniSttLanguageCode(params.language));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GNANI_TIMEOUT_MS);

  try {
    const response = await fetch(`${GNANI_BASE_URL}/stt/v3`, {
      method: 'POST',
      headers: {
        'X-API-Key-ID': creds.apiKey,
        'X-API-Key-Name': creds.apiName,
      },
      body: formData,
      signal: controller.signal,
    });

    const data = (await response.json().catch(() => ({}))) as {
      transcript?: string;
      text?: string;
      transcription?: string;
      result?: string;
      data?: { transcript?: string; text?: string; result?: string };
      results?: Array<{ transcript?: string; text?: string; result?: string }>;
      detail?: string;
      error?: string;
      message?: string;
    };

    if (!response.ok) {
      throw new Error(data.detail || data.error || data.message || `Gnani STT failed (${response.status})`);
    }

    const transcript = (
      data.transcript ||
      data.text ||
      data.transcription ||
      data.result ||
      data.data?.transcript ||
      data.data?.text ||
      data.data?.result ||
      data.results?.[0]?.transcript ||
      data.results?.[0]?.text ||
      data.results?.[0]?.result ||
      ''
    ).trim();

    return {
      transcript,
      detectedLanguage: langCfg.name,
      latencyMs: Date.now() - started,
      provider: 'gnani-vachana',
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function synthesizeSpeechWithGnani(params: {
  text: string;
  language: LanguageCode;
  speed?: number;
}): Promise<{ base64Wav: string; mimeType: string; latencyMs: number; provider: 'gnani-vachana' }> {
  const creds = getGnaniCredentials();
  if (!creds) {
    throw new Error('GNANI_API_KEY is not configured on the server.');
  }

  const started = Date.now();
  const clampedSpeed = Math.min(1.5, Math.max(0.7, Number(params.speed ?? 1.0) || 1.0));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GNANI_TIMEOUT_MS);

  try {
    const response = await fetch(`${GNANI_BASE_URL}/api/v1/tts/inference`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key-ID': creds.apiKey,
        'X-API-Key-Name': creds.apiName,
      },
      body: JSON.stringify({
        text: params.text,
        voice: getGnaniVoiceForLanguage(params.language),
        model: 'timbre-v3.0',
        language: getGnaniTtsLanguageCode(params.language),
        speed: clampedSpeed,
        audio_config: {
          encoding: 'linear_pcm',
          container: 'wav',
          num_channels: 1,
          sample_rate: 24000,
          sample_width: 2,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`Gnani TTS failed (${response.status}): ${errBody.slice(0, 200)}`);
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (contentType.startsWith('audio/') || contentType.includes('octet-stream')) {
      const arr = await response.arrayBuffer();
      const base64Wav = Buffer.from(arr).toString('base64');
      if (!base64Wav) {
        throw new Error('Gnani TTS returned empty audio stream.');
      }
      return {
        base64Wav,
        mimeType: contentType.includes('mpeg') ? 'audio/mpeg' : 'audio/wav',
        latencyMs: Date.now() - started,
        provider: 'gnani-vachana',
      };
    }

    const json = (await response.json().catch(() => ({}))) as {
      audio?: string;
      audio_base64?: string;
      audioContent?: string;
      data?: { audio?: string; audio_base64?: string };
      error?: string;
      message?: string;
    };

    const base64Wav =
      json.audio || json.audio_base64 || json.audioContent || json.data?.audio || json.data?.audio_base64;
    if (!base64Wav) {
      throw new Error(json.error || json.message || 'Gnani TTS returned no audio payload.');
    }

    return {
      base64Wav,
      mimeType: 'audio/wav',
      latencyMs: Date.now() - started,
      provider: 'gnani-vachana',
    };
  } finally {
    clearTimeout(timer);
  }
}
