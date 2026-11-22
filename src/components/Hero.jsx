import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useUi } from '../context/UiContext.jsx';
import { useLang } from '../i18n/LanguageContext.jsx';
import { containsSensitive, scrubSensitive } from '../utils/scrubber.js';
import { parseStudentQuery } from '../utils/queryParser';

const BG_URL =
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1600&q=80';

const PHRASES = [
  'Find scholarships you actually qualify for.',
  'No middlemen. No confusing forms.',
  'Verified West Bengal & Central schemes.',
];

const CHIPS = [
  {
    label: 'Class 12 Girl • 78% • ₹1.5L income',
    profile: {
      stage: 'class_11_12',
      stream: 'arts',
      marks: 78,
      income: 150000,
      caste: 'general',
      gender: 'female',
      isUnmarried: true,
      disabilityPct: 0,
      district: 'Kolkata',
    },
  },
  {
    label: 'B.Tech SC Student • 65%',
    profile: {
      stage: 'ug',
      stream: 'engineering',
      marks: 65,
      income: 150000,
      caste: 'sc',
      gender: 'male',
      isUnmarried: true,
      disabilityPct: 0,
      district: 'Nadia',
    },
  },
  {
    label: 'PhD Research Scholar',
    profile: {
      stage: 'phd',
      stream: 'all',
      marks: 70,
      income: 180000,
      caste: 'general',
      gender: 'male',
      isUnmarried: true,
      disabilityPct: 0,
      district: 'Kolkata',
    },
  },
];

const SPEECH_LANG = { en: 'en-IN', bn: 'bn-IN', hi: 'hi-IN' };

// Maps /api/chat extract LABEL values to the internal profile keys.
const STAGE_KEY = {
  'Class 5–8': 'class_5_8',
  'Class 9–10': 'class_9_10',
  'Class 11–12': 'class_11_12',
  UG: 'ug',
  PG: 'pg',
  PhD: 'phd',
  Diploma: 'diploma',
};

const lowerOrUndef = (v) => (typeof v === 'string' ? v.toLowerCase() : undefined);

function mapExtracted(extracted) {
  const mapped = {
    stage: STAGE_KEY[extracted.stage],
    gender: lowerOrUndef(extracted.gender),
    caste: lowerOrUndef(extracted.caste),
    marks: extracted.marks,
    income: extracted.income,
    district: extracted.district,
    stream: extracted.stream,
    isUnmarried: extracted.isUnmarried,
  };
  return Object.fromEntries(Object.entries(mapped).filter(([, v]) => v !== undefined));
}

export default function Hero() {
  const { liteMode } = useUi();
  const { lang, t } = useLang();
  const navigate = useNavigate();

  const [bgFailed, setBgFailed] = useState(false);
  const [value, setValue] = useState('');
  const [privacyNote, setPrivacyNote] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [phraseIndex, setPhraseIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);

  const recognitionRef = useRef(null);
  const [micSupported] = useState(
    () =>
      typeof window !== 'undefined' &&
      Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
  );

  useEffect(() => {
    if (liteMode) return undefined;
    const phrase = PHRASES[phraseIndex];
    let timer;
    if (!deleting) {
      if (typed.length < phrase.length) {
        timer = setTimeout(() => setTyped(phrase.slice(0, typed.length + 1)), 45);
      } else {
        timer = setTimeout(() => setDeleting(true), 1800);
      }
    } else if (typed.length > 0) {
      timer = setTimeout(() => setTyped(phrase.slice(0, typed.length - 1)), 25);
    } else {
      setDeleting(false);
      setPhraseIndex((i) => (i + 1) % PHRASES.length);
      return undefined;
    }
    return () => clearTimeout(timer);
  }, [liteMode, typed, deleting, phraseIndex]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  const displayed = liteMode ? PHRASES[0] : typed;
  const analyzingTranslated = t('hero_analyzing');
  const analyzingLabel =
    analyzingTranslated && analyzingTranslated !== 'hero_analyzing'
      ? analyzingTranslated
      : 'Analyzing...';

  const handleChange = (e) => {
    const raw = e.target.value;
    setPrivacyNote(containsSensitive(raw));
    setValue(scrubSensitive(raw));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAnalyzing(true);
    try {
      const cleaned = scrubSensitive(value);
      let parsedProfile = null;
      if (!liteMode && navigator.onLine !== false) {
        try {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'extract', message: value }),
          });
          const result = await res.json();
          const extracted = result?.extracted;
          if (
            result?.mode !== 'demo' &&
            extracted &&
            typeof extracted === 'object' &&
            Object.keys(extracted).length > 0
          ) {
            parsedProfile = mapExtracted(extracted);
          }
        } catch {
          parsedProfile = null;
        }
      }
      if (!parsedProfile) {
        parsedProfile = parseStudentQuery(cleaned);
      }
      navigate('/for-you', { state: { parsedProfile } });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (recognitionRef.current) recognitionRef.current.stop();
    const rec = new SR();
    rec.lang = SPEECH_LANG[lang] || 'en-IN';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setValue(scrubSensitive(transcript));
    };
    rec.onend = () => {
      recognitionRef.current = null;
    };
    recognitionRef.current = rec;
    rec.start();
  };

  const handleChip = (chip) => {
    setPrivacyNote(false);
    setValue(scrubSensitive(chip.label));
    const parsedProfile = chip.profile;
    navigate('/for-you', { state: { parsedProfile } });
  };

  const bgImage = bgFailed ? (
    <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-ink via-stone-800 to-amber-700" />
  ) : liteMode ? null : (
    <img
      src={BG_URL}
      alt=""
      onError={() => setBgFailed(true)}
      className="absolute inset-0 h-full w-full object-cover opacity-35 animate-ken-burns"
    />
  );

  return (
    <section className="relative overflow-hidden rounded-3xl min-h-[520px] sm:min-h-[560px] lg:min-h-[600px] flex items-center border border-stone-border shadow-sm">
      {bgImage}
      <div className="absolute inset-0 bg-gradient-to-br from-ink/90 via-ink/70 to-amber-900/50" />

      <div className="relative z-10 w-full px-6 py-12 sm:px-10 lg:px-16 text-white lg:grid lg:grid-cols-12 lg:gap-10 lg:items-center">
        <div className="lg:col-span-7 max-w-3xl">
          <p
            className="font-calligraphy text-3xl sm:text-4xl text-amber-300"
            style={{ textShadow: '0 0 18px rgba(251,191,36,0.55)' }}
          >
            {t('hero_script')}
          </p>

          <h1 className="mt-4 font-display font-bold text-4xl sm:text-5xl lg:text-6xl leading-tight">
            <span aria-live="polite">{displayed}</span>
            <span aria-hidden="true" className="animate-pulse text-amber-300">
              |
            </span>
          </h1>

          <form onSubmit={handleSubmit} className="mt-8">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 flex items-center">
                <input
                  type="text"
                  value={value}
                  onChange={handleChange}
                  placeholder={t('hero_placeholder')}
                  className="w-full bg-white rounded-full px-5 py-3.5 pr-14 text-ink text-base outline-none"
                />
                <button
                  type="button"
                  onClick={handleMic}
                  disabled={!micSupported}
                  title={micSupported ? undefined : t('hero_mic_unsupported')}
                  aria-label={t('hero_mic')}
                  className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-saffron text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Mic size={18} />
                </button>
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 bg-saffron hover:bg-amber-600 text-white rounded-full px-6 py-3.5 font-semibold"
              >
                {analyzing ? analyzingLabel : t('hero_cta')}
                <ArrowRight size={18} />
              </button>
            </div>

            {privacyNote && (
              <p className="mt-2 text-sm text-amber-200">{t('hero_privacy_note')}</p>
            )}
          </form>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-sm text-amber-200 mr-1">{t('hero_chips_label')}</span>
            {CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleChip(chip)}
                className="rounded-full bg-white/90 text-ink text-sm px-4 py-2 hover:bg-white"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {!liteMode && (
          <div className="lg:col-span-5 mt-10 lg:mt-0">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-5 text-white backdrop-blur-md">
              <p className="font-display text-sm uppercase tracking-wide text-amber-200">
                Live Verification Snapshot
              </p>
              <ul className="mt-4 space-y-3">
                <li className="flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-emerald-300 shrink-0" />
                  <span>12+ Verified WB & Central Schemes</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-emerald-300 shrink-0" />
                  <span>Zero Aadhaar Required</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-emerald-300 shrink-0" />
                  <span>Updated Nov 2026</span>
                </li>
              </ul>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs">SVMCM: Up to ₹60k/yr</span>
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs">Kanyaratna: ₹25k</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
