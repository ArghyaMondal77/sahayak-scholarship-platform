import { motion } from 'framer-motion';
import { CheckCircle2, ShieldCheck, WifiOff } from 'lucide-react';
import { useUi } from '../context/UiContext.jsx';
import { useLang } from '../i18n/LanguageContext.jsx';

const CARD_CLASS = 'rounded-3xl bg-white border border-stone-border shadow-sm p-6 md:p-8';

const RULES = [
  'Class 10–12 student',
  'Income below ₹1.5 lakh',
  'Marks 60% or above',
];

export default function BentoGrid() {
  const { liteMode } = useUi();
  const { t } = useLang();

  const motionProps = liteMode
    ? { initial: false }
    : {
        initial: { opacity: 0, y: 40 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.2 },
        transition: { duration: 0.6 },
      };

  return (
    <section>
      <h2 className="font-display text-2xl sm:text-3xl mb-6">{t('bento_heading')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 md:gap-6">
        <motion.div {...motionProps} className={`${CARD_CLASS} md:col-span-4`}>
          <h3 className="font-display text-xl font-semibold">Speak in Your Own Words</h3>
          <p className="mt-2 text-stone-600">
            Talk or type in English, বাংলা or हिन्दी. Describe your class, marks and family income in
            plain language.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {['EN', 'বাংলা', 'हिन्दी'].map((l) => (
              <span key={l} className="rounded-full border border-stone-border px-3 py-1 text-xs font-semibold">
                {l}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div {...motionProps} className={`${CARD_CLASS} md:col-span-2`}>
          <h3 className="font-display text-xl font-semibold">Rule-by-Rule Reasoning</h3>
          <p className="mt-2 text-stone-600">
            See exactly which rule you match, and which one you do not yet.
          </p>
          <ul className="mt-4 space-y-2">
            {RULES.map((r) => (
              <li key={r} className="flex items-center gap-2 text-sm">
                <CheckCircle2 size={18} className="text-emerald shrink-0" />
                {r}
              </li>
            ))}
          </ul>
          <span className="mt-4 inline-block rounded-full bg-emerald text-white text-xs font-semibold px-3 py-1">
            Likely Eligible
          </span>
        </motion.div>

        <motion.div {...motionProps} className={`${CARD_CLASS} md:col-span-3`}>
          <ShieldCheck size={28} className="text-emerald" />
          <h3 className="mt-3 font-display text-xl font-semibold">Zero Aadhaar. Verified CSCs.</h3>
          <p className="mt-2 text-stone-600">
            We never ask for Aadhaar, PAN or bank numbers. Find a nearby registered cyber centre with
            fixed fees.
          </p>
        </motion.div>

        <motion.div {...motionProps} className={`${CARD_CLASS} md:col-span-3`}>
          <WifiOff size={28} className="text-saffron" />
          <h3 className="mt-3 font-display text-xl font-semibold">Built for 2G & Villages</h3>
          <p className="mt-2 text-stone-600">
            Lite Mode turns off animations and keeps pages light for slow connections.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
