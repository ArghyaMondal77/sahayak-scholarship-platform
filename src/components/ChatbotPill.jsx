import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X, Mic, Volume2, VolumeX, Play, Square } from 'lucide-react';
import { useLang } from '../i18n/LanguageContext.jsx';
import { useUi } from '../context/UiContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getAllSchemes } from '../utils/schemeStorage.js';
import { matchSchemes } from '../utils/matcher.js';

const PHRASES = {
  en: 'Ask Sahayak',
  bn: 'সহায়ককে বলুন',
  hi: 'सहायक से पूछें',
};

const PLACEHOLDERS = {
  en: 'Describe your class, marks and income…',
  bn: 'আপনার শ্রেণি, নম্বর ও আয় লিখুন…',
  hi: 'अपनी कक्षा, अंक और आय लिखें…',
};

const SPEECH_LANG = {
  en: 'en-IN',
  bn: 'bn-IN',
  hi: 'hi-IN',
};

const THINKING = {
  en: 'Thinking…',
  bn: 'ভাবছি…',
  hi: 'सोच रहा हूँ…',
};

const ERROR_MSG = {
  en: 'Sorry, I could not reach Sahayak right now. Please try again.',
  bn: 'দুঃখিত, এখন সহায়কের সাথে যোগাযোগ করা যাচ্ছে না। আবার চেষ্টা করুন।',
  hi: 'क्षमा करें, अभी सहायक से संपर्क नहीं हो पाया। कृपया फिर से प्रयास करें।',
};

const SENSITIVE = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/;
const BLOCKED_MSG = 'Aadhaar-like numbers are blocked. Please remove them.';
const GREETING = 'Tell me your class, marks and income, and I will suggest likely schemes.';

function stripMarkdown(text) {
  return String(text)
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\*\*|\*|#/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Render bot text as React elements only (no innerHTML): line breaks, simple
// list lines, **bold** and http(s) links.
const INLINE_SPLIT = /(\*\*[^*\n]+\*\*|https?:\/\/[^\s<]+[^\s<.,;:!?)\]])/;
const LIST_LINE = /^\s*([-*]|\d+\.)\s+(.*)$/;

function renderInline(text, keyPrefix) {
  return String(text)
    .split(INLINE_SPLIT)
    .map((part, i) => {
      if (i % 2 === 0) return part;
      const key = `${keyPrefix}-${i}`;
      if (part.startsWith('**')) {
        return <strong key={key}>{part.slice(2, -2)}</strong>;
      }
      return (
        <a
          key={key}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-700 underline underline-offset-2 hover:text-emerald-700 break-all"
        >
          {part}
        </a>
      );
    });
}

function renderBotText(text) {
  return String(text)
    .split('\n')
    .map((line, li) => {
      const list = line.match(LIST_LINE);
      if (list) {
        const marker = list[1].endsWith('.') ? list[1] : '•';
        return (
          <div key={li} className="flex gap-2 pl-1">
            <span aria-hidden="true" className="shrink-0">{marker}</span>
            <span>{renderInline(list[2], li)}</span>
          </div>
        );
      }
      if (!line.trim()) return <div key={li} className="h-2" />;
      return <div key={li}>{renderInline(line, li)}</div>;
    });
}

// Same profile normalisation as src/pages/ForYou.jsx, so both use matcher.js identically.
function normalizeProfile(src) {
  const s = src || {};
  return {
    stage: String(s.stage ?? ''),
    stream: String(s.stream ?? ''),
    marks: Number(s.marks) || 0,
    income: Number(s.income) || 0,
    caste: String(s.caste ?? ''),
    gender: String(s.gender ?? ''),
    isUnmarried: s.isUnmarried === true,
    disabilityPct: Number(s.disabilityPct) || 0,
    district: String(s.district ?? ''),
  };
}

function buildEligibilitySummary(schemes, profile) {
  const matched = matchSchemes(schemes, normalizeProfile(profile));
  const matchedIds = new Set(matched.map((s) => s.id));
  return {
    eligible: matched.map((s) => ({ id: s.id, name: s.name, reasons: s.reasons ?? [] })),
    notEligible: schemes
      .filter((s) => !matchedIds.has(s.id))
      .map((s) => ({ id: s.id, name: s.name, reasons: [] })),
  };
}

function silenceSpeech() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export default function ChatbotPill() {
  const { lang } = useLang();
  const { liteMode } = useUi();
  const { user } = useAuth();
  const currentUser = user;
  const sessionKey = currentUser?.email || 'guest';
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [warning, setWarning] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const recognitionRef = useRef(null);
  const sendRef = useRef(null);

  const phrase = PHRASES[lang] ?? PHRASES.en;
  const placeholder = PLACEHOLDERS[lang] ?? PLACEHOLDERS.en;
  const speechSupported =
    typeof window !== 'undefined' &&
    (Boolean(window.SpeechRecognition) || Boolean(window.webkitSpeechRecognition));
  const speechOutSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  function stopRecognition(abort = false) {
    const rec = recognitionRef.current;
    if (!rec) return;
    recognitionRef.current = null;
    try {
      if (abort) rec.abort?.();
      else rec.stop?.();
    } catch {
      /* recognition already ended */
    }
  }

  // Stop any active recognition and speech when the drawer closes.
  useEffect(() => {
    if (!open) {
      stopRecognition(false);
      silenceSpeech();
      setSpeakingIndex(null);
    }
  }, [open]);

  // Abort any active recognition and speech on unmount.
  useEffect(() => {
    return () => {
      stopRecognition(true);
      silenceSpeech();
    };
  }, []);

  // Isolate chat history per signed-in user (or guest); reset on account change.
  useEffect(() => {
    setMessages([]);
    setSpeakingIndex(null);
    window.speechSynthesis?.cancel();
  }, [sessionKey]);

  function handleChange(e) {
    const next = e.target.value;
    if (SENSITIVE.test(next)) {
      setWarning(BLOCKED_MSG);
      return;
    }
    setWarning('');
    setValue(next);
  }

  function speak(text, index) {
    if (!speechOutSupported) return;
    silenceSpeech();
    const utterance = new SpeechSynthesisUtterance(stripMarkdown(text));
    utterance.lang = SPEECH_LANG[lang] || 'en-IN';
    const clear = () => setSpeakingIndex((cur) => (cur === index ? null : cur));
    utterance.onend = clear;
    utterance.onerror = clear;
    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
  }

  function toggleSpeak(index, text) {
    if (speakingIndex === index) {
      silenceSpeech();
      setSpeakingIndex(null);
      return;
    }
    speak(text, index);
  }

  async function sendMessage(rawText) {
    const text = String(rawText ?? '').trim();
    if (!text || loading) return;
    if (SENSITIVE.test(text)) {
      setWarning(BLOCKED_MSG);
      return;
    }

    const history = messages.slice(-4).map((m) => ({ role: m.role, text: m.text }));
    const botIndex = messages.length + 1;
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setValue('');
    setWarning('');
    setLoading(true);

    const allSchemes = getAllSchemes() ?? [];
    const eligibilitySummary =
      currentUser?.role === 'student' && currentUser.profile
        ? buildEligibilitySummary(allSchemes, currentUser.profile)
        : null;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          lang,
          history,
          schemes: allSchemes,
          userProfile: currentUser?.role === 'student' ? currentUser.profile : null,
          eligibilitySummary,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply =
        typeof data?.reply === 'string' && data.reply.trim()
          ? data.reply
          : (ERROR_MSG[lang] ?? ERROR_MSG.en);
      setMessages((prev) => [...prev, { role: 'bot', text: reply }]);
      if (voiceOn && typeof data?.reply === 'string' && data.reply.trim()) {
        speak(reply, botIndex);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'bot', text: ERROR_MSG[lang] ?? ERROR_MSG.en }]);
    } finally {
      setLoading(false);
    }
  }

  // Keep a ref to the latest send function so recognition callbacks never go stale.
  sendRef.current = sendMessage;

  function handleSubmit(e) {
    e.preventDefault();
    sendMessage(value);
  }

  function handleMic() {
    if (!speechSupported) return;
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    stopRecognition(true);
    const rec = new Ctor();
    rec.lang = SPEECH_LANG[lang] || 'en-IN';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? '';
      if (transcript.trim()) sendRef.current?.(transcript);
    };
    rec.onend = () => {
      if (recognitionRef.current === rec) recognitionRef.current = null;
      setListening(false);
    };
    rec.onerror = () => {
      if (recognitionRef.current === rec) recognitionRef.current = null;
      setListening(false);
    };
    recognitionRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      recognitionRef.current = null;
      setListening(false);
    }
  }

  const pillClasses =
    'fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-full border border-stone-700/60 bg-[#111827] pl-2 pr-4 py-2 text-white shadow-xl cursor-pointer transition-all' +
    (liteMode ? '' : ' hover:scale-105');

  const drawerClasses =
    'fixed bottom-20 right-5 z-50 w-[92vw] sm:w-96 max-h-[70vh] flex flex-col rounded-2xl border border-stone-200 bg-white shadow-2xl p-4 overflow-hidden';

  const micClasses =
    'rounded-full border border-stone-200 p-2.5 hover:bg-stone-100 disabled:opacity-40' +
    (listening ? ' ring-2 ring-red-500 text-red-600 animate-pulse' : '');

  const drawerContent = (
    <>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display font-semibold text-ink">Sahayak</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVoiceOn((v) => !v)}
            aria-pressed={voiceOn}
            disabled={!speechOutSupported}
            title={speechOutSupported ? 'Read replies aloud' : 'Voice output is not supported in this browser'}
            className="inline-flex items-center gap-1 rounded-full border border-stone-200 px-2 py-1 text-xs text-ink/80 hover:bg-stone-100 disabled:opacity-40"
          >
            {voiceOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>Voice reply</span>
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close chat"
            className="rounded-full p-1 text-ink/70 hover:text-ink"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
        Never enter Aadhaar or sensitive ID numbers.
      </div>

      <div className="flex-1 overflow-y-auto min-h-[120px] py-3 text-sm text-ink/70 space-y-2">
        <p>{GREETING}</p>
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === 'user'
                ? 'ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-ink px-3 py-2 text-white'
                : 'mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-stone-100 px-3 py-2 text-ink'
            }
          >
            <div>{m.role === 'bot' ? renderBotText(m.text) : m.text}</div>
            {m.role === 'bot' && speechOutSupported && (
              <button
                type="button"
                onClick={() => toggleSpeak(i, m.text)}
                aria-label={speakingIndex === i ? 'Stop reading' : 'Read aloud'}
                title={speakingIndex === i ? 'Stop reading' : 'Read aloud'}
                className="mt-1 inline-flex items-center gap-1 text-xs text-ink/60 hover:text-ink"
              >
                {speakingIndex === i ? (
                  <Square className="w-3 h-3" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
              </button>
            )}
          </div>
        ))}
        {loading && (
          <div
            role="status"
            aria-live="polite"
            className="mr-auto rounded-2xl rounded-bl-sm bg-stone-100 px-3 py-2 text-xs text-ink/60 animate-pulse"
          >
            {THINKING[lang] ?? THINKING.en}
          </div>
        )}
      </div>

      {warning && <p className="mb-2 text-xs text-red-600">{warning}</p>}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className="rounded-full border border-stone-200 px-4 py-2.5 text-sm flex-1 min-w-0"
        />
        <button
          type="button"
          onClick={handleMic}
          disabled={!speechSupported}
          title={speechSupported ? 'Speak' : 'Voice input is not supported in this browser'}
          aria-label="Voice input"
          aria-pressed={listening}
          className={micClasses}
        >
          <Mic className="w-4 h-4" />
        </button>
        <button
          type="submit"
          disabled={loading}
          className="bg-[#D97706] text-white rounded-full px-4 py-2.5 text-sm font-semibold hover:bg-amber-600 disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </>
  );

  return (
    <>
      {open &&
        (liteMode ? (
          <div className={drawerClasses}>{drawerContent}</div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={drawerClasses}
          >
            {drawerContent}
          </motion.div>
        ))}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={phrase}
        className={pillClasses}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D97706] text-white">
          <Sparkles className="w-4 h-4" />
        </span>
        <span className="text-sm font-medium">{phrase}</span>
      </button>
    </>
  );
}
