import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Bot,
  Languages,
  Mic,
  MicOff,
  Send,
  Volume2,
  WifiOff,
} from 'lucide-react';
import { getOfflineProtocolReferences } from '../shared/enhancementEngine';
import { getLanguageConfig, SUPPORTED_LANGUAGES } from '../shared/languages';
import type { AiAssistantMessage, LanguageCode } from '../shared/types';
import { api } from '../utils/apiClient';

interface MultilingualAiAssistantProps {
  language: LanguageCode;
  onChangeLanguage: (lang: LanguageCode) => void;
  isOnline: boolean;
  voiceSpeed?: number;
}

const SAMPLE_QUESTIONS = [
  'What warning signs require immediate 108 referral during pregnancy?',
  'How should an ASHA worker counsel on IFA & calcium tablets?',
  'What are the HBNC Day 1 to Day 42 checks for low-birth-weight babies?',
  'Which vaccines are scheduled at 6 weeks and 10 weeks?',
];

export const MultilingualAiAssistant: React.FC<MultilingualAiAssistantProps> = ({
  language,
  onChangeLanguage,
  isOnline,
  voiceSpeed = 1.0,
}) => {
  const langCfg = getLanguageConfig(language);
  const [questionInput, setQuestionInput] = useState('');
  const [messages, setMessages] = useState<AiAssistantMessage[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [showOfflineHandbook, setShowOfflineHandbook] = useState(false);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  const protocolCards = useMemo(() => getOfflineProtocolReferences(language), [language]);

  const speakReply = async (msg: AiAssistantMessage) => {
    setSpeakingId(msg.id);
    try {
      if (isOnline) {
        const ttsRes = await api
          .synthesizeSpeech({
            text: msg.text,
            language: msg.language,
            speed: voiceSpeed,
          })
          .catch(() => null);
        if (ttsRes?.base64Wav) {
          const audio = new Audio(`data:${ttsRes.mimeType || 'audio/wav'};base64,${ttsRes.base64Wav}`);
          audio.onended = () => setSpeakingId(null);
          await audio.play();
          return;
        }
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(msg.text);
        utter.lang = getLanguageConfig(msg.language).bcp47;
        utter.rate = voiceSpeed;
        utter.onend = () => setSpeakingId(null);
        utter.onerror = () => setSpeakingId(null);
        window.speechSynthesis.speak(utter);
        return;
      }
    } finally {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        setSpeakingId(null);
      }
    }
  };

  const handleToggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecCtor =
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

    if (!SpeechRecCtor) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'error',
          text: 'Browser speech recognition is unavailable here. Type your question in any language or use the quick clinical prompt chips below.',
          language,
          timestamp: new Date().toISOString(),
        },
      ]);
      return;
    }

    const rec = new (SpeechRecCtor as new () => {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      onresult: (ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
      onerror: () => void;
      onend: () => void;
      start: () => void;
      stop: () => void;
    })();
    rec.lang = langCfg.bcp47;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (ev) => {
      const spoken = ev.results?.[0]?.[0]?.transcript ?? '';
      if (spoken.trim()) {
        setQuestionInput((prev) => (prev ? `${prev} ${spoken}` : spoken));
      }
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    setIsListening(true);
    rec.start();
  };

  const handleSendQuestion = async (overrideText?: string) => {
    const query = (overrideText ?? questionInput).trim();
    if (!query || isAsking) return;

    const userMsg: AiAssistantMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text: query,
      language,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    if (!overrideText) setQuestionInput('');

    if (!isOnline) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'error',
          text: 'Device is currently offline. Live Gemini AI Q&A requires internet connectivity — open the Offline NHM Protocol Handbook below for immediate clinical checklists.',
          language,
          timestamp: new Date().toISOString(),
        },
      ]);
      setShowOfflineHandbook(true);
      return;
    }

    setIsAsking(true);
    try {
      const res = await api.askMultilingualAssistant({
        question: query,
        language,
      });
      const aiMsg: AiAssistantMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        text: res.reply,
        language: res.language,
        timestamp: new Date().toISOString(),
        modelUsed: res.modelUsed,
        suggestedQuestions: res.suggestedQuestions,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'error',
          text:
            err instanceof Error
              ? err.message
              : 'Unable to reach AI Voice Assistant service.',
          language,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-[#102B35] via-[#0D5B5E] to-[#087F75] p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-2.5 py-1 text-xs font-bold text-[#A5D8CE]">
              <Bot className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Multilingual AI Voice Assistant · 12 Indian Languages</span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight">
              ASHA Clinical Guidance Voice Assistant
            </h2>
            <p className="mt-1 text-xs text-teal-100">
              Ask maternal, newborn, or vaccination questions by voice or text in {langCfg.name} ({langCfg.nativeName}) with spoken read-back.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs">
            <Languages className="h-4 w-4 text-[#A5D8CE]" aria-hidden="true" />
            <label htmlFor="ai-lang-select" className="sr-only">
              Assistant Language
            </label>
            <select
              id="ai-lang-select"
              value={language}
              onChange={(e) => onChangeLanguage(e.target.value as LanguageCode)}
              className="bg-transparent font-bold text-white focus:outline-none"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} className="text-[#172B3A]">
                  {l.nativeName} ({l.name})
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {!isOnline && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <div className="flex items-center gap-2 font-semibold">
            <WifiOff className="h-4 w-4" aria-hidden="true" />
            <span>Offline detected — use the NHM Offline Reference Checklists below until reconnected.</span>
          </div>
          <button
            type="button"
            onClick={() => setShowOfflineHandbook((p) => !p)}
            className="rounded-lg bg-amber-900 px-3 py-1 font-bold text-white"
          >
            {showOfflineHandbook ? 'Hide Handbook' : 'Open Handbook'}
          </button>
        </div>
      )}

      <section className="rounded-2xl border border-[#E7EDF2] bg-white p-5 space-y-4">
        {/* Quick Field Prompts */}
        <div>
          <div className="text-xs font-bold text-[#718096]">Quick Field Questions</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {SAMPLE_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void handleSendQuestion(q)}
                className="rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-3 py-1.5 text-left text-xs font-medium text-[#172B3A] hover:border-[#087F75] hover:text-[#087F75]"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation Feed */}
        <div className="min-h-[220px] max-h-[420px] space-y-3 overflow-y-auto rounded-2xl border border-[#E7EDF2] bg-[#F7F9FC] p-4">
          {messages.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#718096]">
              Tap the microphone to speak in {langCfg.nativeName} or type a healthcare question below.
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#087F75] text-white'
                      : msg.role === 'error'
                        ? 'border border-amber-200 bg-amber-50 text-amber-950'
                        : 'border border-[#E7EDF2] bg-white text-[#172B3A] shadow-xs'
                  }`}
                >
                  {msg.role === 'error' && (
                    <div className="mb-1 flex items-center gap-1.5 font-bold text-amber-900">
                      <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Assistant Notice</span>
                    </div>
                  )}
                  <p className="whitespace-pre-line">{msg.text}</p>

                  {msg.role === 'assistant' && (
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#E7EDF2] pt-2">
                      <span className="font-mono text-[10px] text-[#718096]">
                        {msg.modelUsed ?? 'Gemini AI'} · {getLanguageConfig(msg.language).name}
                      </span>
                      <button
                        type="button"
                        onClick={() => void speakReply(msg)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#E8F7F1] px-2.5 py-1 text-[11px] font-bold text-[#087F75] hover:bg-[#D1FAE5]"
                      >
                        <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{speakingId === msg.id ? 'Speaking...' : 'Listen'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {msg.suggestedQuestions.map((sq) => (
                      <button
                        key={sq}
                        type="button"
                        onClick={() => void handleSendQuestion(sq)}
                        className="rounded-lg border border-[#087F75]/30 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#087F75] hover:bg-[#E8F7F1]"
                      >
                        {sq}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
          {isAsking && (
            <div className="text-xs font-semibold text-[#087F75]">
              Thinking in {langCfg.name}...
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSendQuestion();
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <button
            type="button"
            onClick={handleToggleVoiceInput}
            aria-label={isListening ? 'Stop Voice Input' : 'Speak Question'}
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition-colors ${
              isListening
                ? 'bg-[#D94B4B] text-white'
                : 'border border-[#D4DDD9] bg-[#F7F9FC] text-[#172B3A] hover:border-[#087F75]'
            }`}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4 text-[#087F75]" />}
            <span>{isListening ? 'Listening...' : 'Voice'}</span>
          </button>

          <input
            type="text"
            value={questionInput}
            onChange={(e) => setQuestionInput(e.target.value)}
            placeholder={`Ask a clinical question in ${langCfg.name}...`}
            className="min-h-[44px] flex-1 rounded-xl border border-[#D4DDD9] px-3.5 text-sm"
          />

          <button
            type="submit"
            disabled={isAsking || !questionInput.trim()}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#087F75] px-4 text-xs font-bold text-white hover:bg-[#066860] disabled:opacity-50"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            <span>Ask</span>
          </button>
        </form>
      </section>

      {/* Collapsible Offline NHM Protocol Handbook */}
      <section className="rounded-2xl border border-[#E7EDF2] bg-white p-5">
        <button
          type="button"
          onClick={() => setShowOfflineHandbook((p) => !p)}
          className="flex w-full items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
            <span className="font-display text-sm font-bold text-[#172B3A]">
              Offline NHM Clinical Handbook (Always Available Without Internet)
            </span>
          </div>
          <span className="text-xs font-bold text-[#087F75]">
            {showOfflineHandbook ? 'Hide' : 'Show'}
          </span>
        </button>

        {showOfflineHandbook && (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {protocolCards.map((c) => (
              <div key={c.id} className="rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] p-3.5 text-xs">
                <div className="font-bold text-[#087F75]">{c.title}</div>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-[#172B3A]">
                  {c.keyChecklist.map((k) => (
                    <li key={k}>{k}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
