import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  isGnaniConfigured,
  synthesizeSpeechWithGnani,
  transcribeAudioWithGnani,
} from './gnaniClient';

test('isGnaniConfigured respects environment variable presence and placeholder check', () => {
  const prevKey = process.env.GNANI_API_KEY;
  try {
    delete process.env.GNANI_API_KEY;
    assert.equal(isGnaniConfigured(), false);

    process.env.GNANI_API_KEY = 'MY_GNANI_API_KEY';
    assert.equal(isGnaniConfigured(), false);

    process.env.GNANI_API_KEY = 'vach_test_key_123';
    assert.equal(isGnaniConfigured(), true);
  } finally {
    if (prevKey === undefined) delete process.env.GNANI_API_KEY;
    else process.env.GNANI_API_KEY = prevKey;
  }
});

test('transcribeAudioWithGnani sends X-API-Key-ID, X-API-Key-Name, and audio_file FormData', async () => {
  const prevKey = process.env.GNANI_API_KEY;
  const prevName = process.env.GNANI_API_NAME;
  process.env.GNANI_API_KEY = 'vach_test_key_123';
  process.env.GNANI_API_NAME = 'asha@1510';

  let capturedUrl = '';
  let capturedHeaders: Record<string, string> = {};
  let hasAudioFile = false;

  const fetchMock = mock.method(globalThis, 'fetch', async (url: string | URL | Request, init?: RequestInit) => {
    capturedUrl = String(url);
    capturedHeaders = (init?.headers as Record<string, string>) || {};
    if (init?.body instanceof FormData) {
      hasAudioFile = init.body.has('audio_file') && init.body.get('model') === 'prisma-v3.0';
    }
    return new Response(JSON.stringify({ transcript: 'ತೂಕ 52 ಕೆಜಿ ಬಿಪಿ 118/76' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });

  try {
    const res = await transcribeAudioWithGnani({
      base64Audio: Buffer.from('RIFFfakewav').toString('base64'),
      mimeType: 'audio/wav',
      language: 'kn',
    });
    assert.equal(capturedUrl, 'https://api.vachana.ai/stt/v3');
    assert.equal(capturedHeaders['X-API-Key-ID'], 'vach_test_key_123');
    assert.equal(capturedHeaders['X-API-Key-Name'], 'asha@1510');
    assert.equal(hasAudioFile, true);
    assert.equal(res.transcript, 'ತೂಕ 52 ಕೆಜಿ ಬಿಪಿ 118/76');
    assert.equal(res.provider, 'gnani-vachana');
  } finally {
    fetchMock.mock.restore();
    if (prevKey === undefined) delete process.env.GNANI_API_KEY;
    else process.env.GNANI_API_KEY = prevKey;
    if (prevName === undefined) delete process.env.GNANI_API_NAME;
    else process.env.GNANI_API_NAME = prevName;
  }
});

test('synthesizeSpeechWithGnani handles both binary WAV and JSON base64 responses', async () => {
  const prevKey = process.env.GNANI_API_KEY;
  process.env.GNANI_API_KEY = 'vach_test_key_123';

  let callCount = 0;
  const fetchMock = mock.method(globalThis, 'fetch', async () => {
    callCount += 1;
    if (callCount === 1) {
      return new Response(Buffer.from('RIFFwavbytes'), {
        status: 200,
        headers: { 'content-type': 'audio/wav' },
      });
    }
    return new Response(JSON.stringify({ audio_base64: Buffer.from('RIFFjsonwav').toString('base64') }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });

  try {
    const binaryRes = await synthesizeSpeechWithGnani({
      text: 'ಭೇಟಿ ಉಳಿಸಲಾಗಿದೆ.',
      language: 'kn',
      speed: 1.0,
    });
    assert.equal(binaryRes.mimeType, 'audio/wav');
    assert.equal(Buffer.from(binaryRes.base64Wav, 'base64').toString(), 'RIFFwavbytes');

    const jsonRes = await synthesizeSpeechWithGnani({
      text: 'Visit saved.',
      language: 'en',
      speed: 1.1,
    });
    assert.equal(jsonRes.mimeType, 'audio/wav');
    assert.equal(Buffer.from(jsonRes.base64Wav, 'base64').toString(), 'RIFFjsonwav');
  } finally {
    fetchMock.mock.restore();
    if (prevKey === undefined) delete process.env.GNANI_API_KEY;
    else process.env.GNANI_API_KEY = prevKey;
  }
});

test('transcribeAudioWithGnani maps regional languages, indic-auto fallback, and parses data.result payloads', async () => {
  const prevKey = process.env.GNANI_API_KEY;
  process.env.GNANI_API_KEY = 'vach_test_key_123';

  const capturedLangs: Array<{ lang: FormDataEntryValue | null; filename: string | null }> = [];
  const fetchMock = mock.method(globalThis, 'fetch', async (_url: string | URL | Request, init?: RequestInit) => {
    if (init?.body instanceof FormData) {
      const file = init.body.get('audio_file');
      capturedLangs.push({
        lang: init.body.get('language_code'),
        filename: file instanceof File ? file.name : null,
      });
    }
    return new Response(JSON.stringify({ data: { result: 'नाम प्रिया वजन 52 किलो बीपी 120/80' } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });

  try {
    const knRes = await transcribeAudioWithGnani({
      base64Audio: Buffer.from('fakewebm').toString('base64'),
      mimeType: 'audio/webm;codecs=opus',
      language: 'kn',
    });
    assert.equal(knRes.transcript, 'नाम प्रिया वजन 52 किलो बीपी 120/80');

    await transcribeAudioWithGnani({
      base64Audio: Buffer.from('fakewav').toString('base64'),
      mimeType: 'audio/wav',
      language: 'or',
    });

    await transcribeAudioWithGnani({
      base64Audio: Buffer.from('fakewav').toString('base64'),
      mimeType: 'audio/wav',
      language: 'en',
    });

    assert.deepEqual(capturedLangs, [
      { lang: 'kn-IN,en-IN', filename: 'visit.webm' },
      { lang: 'indic-auto', filename: 'visit.wav' },
      { lang: 'en-IN', filename: 'visit.wav' },
    ]);
  } finally {
    fetchMock.mock.restore();
    if (prevKey === undefined) delete process.env.GNANI_API_KEY;
    else process.env.GNANI_API_KEY = prevKey;
  }
});

