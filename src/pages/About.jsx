export default function About() {
  return (
    <div className="mx-auto w-[94%] max-w-[1100px] pb-16 pt-6 md:pt-10">
      <header className="mb-10">
        <h1 className="font-display text-3xl sm:text-4xl">About Sahayak</h1>
        <p className="mt-2 max-w-2xl text-ink/70">
          Claim What&apos;s Yours. Sahayak helps students find the scholarships they are likely eligible for, and the verified help needed to apply.
        </p>
      </header>

      <section aria-labelledby="how-heading">
        <h2 id="how-heading" className="font-display text-2xl font-semibold">How Sahayak Works</h2>
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h3 className="font-display text-lg font-semibold">Deterministic rules</h3>
            <p className="mt-2 text-sm text-ink/75">
              Each scheme is a set of editable eligibility rules. The same answers always produce the same result. There is no AI guesswork.
            </p>
          </article>
          <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h3 className="font-display text-lg font-semibold">Labelled as Likely Eligible</h3>
            <p className="mt-2 text-sm text-ink/75">
              Every match is shown as <span className="font-semibold text-emerald-700">Likely Eligible</span>. Final eligibility is always decided by the official portal.
            </p>
          </article>
          <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h3 className="font-display text-lg font-semibold">No sensitive IDs</h3>
            <p className="mt-2 text-sm text-ink/75">
              Sahayak collects zero Aadhaar numbers or other sensitive identity IDs.
            </p>
          </article>
        </div>
      </section>

      <section aria-labelledby="ai-works-heading" className="mt-14">
        <h2 id="ai-works-heading" className="font-display text-2xl font-semibold">How Sahayak AI Works (Zero-Hallucination Design)</h2>
        <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <ul className="list-disc space-y-2 pl-5 text-sm text-ink/75">
            <li>Grounded strictly on verified scheme data and synced directly with the deterministic matcher rules engine (src/utils/matcher.js). It never guesses eligibility or invents dates.</li>
            <li>Protected by a 4-layer prompt-injection defense and automatic scrubbing of 12-digit ID numbers before anything is sent to the AI.</li>
            <li>Supports English, বাংলা, and हिन्दी, via text and voice.</li>
          </ul>
          <p className="mt-4 text-sm font-semibold text-ink/85">Sahayak is an independent guidance tool—always verify final dates and submit applications on the official government portal.</p>
        </div>
      </section>

      <section aria-labelledby="who-pays-heading" className="mt-14">
        <h2 id="who-pays-heading" className="font-display text-2xl font-semibold">Who Pays?</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink/70">
          Students never pay to use Sahayak. The service is sustained by three transparent sources.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#D97706]">01</span>
            <h3 className="mt-2 font-display text-lg font-semibold">CSR &amp; Private Foundations</h3>
            <p className="mt-2 text-sm text-ink/75">
              Sponsor rural outreach so private scholarships reach underserved districts.
            </p>
          </article>
          <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#D97706]">02</span>
            <h3 className="mt-2 font-display text-lg font-semibold">Admin-Verified Cyber Centres (CSCs)</h3>
            <p className="mt-2 text-sm text-ink/75">
              Pay a small monthly verification/listing fee in exchange for pre-qualified, document-ready student footfall. Form-fill fee shown to students is transparent at ₹30–₹50, with zero middlemen.
            </p>
          </article>
          <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#D97706]">03</span>
            <h3 className="mt-2 font-display text-lg font-semibold">DBT Bank Partnerships</h3>
            <p className="mt-2 text-sm text-ink/75">
              Pay referral/acquisition fees for verified, DBT-ready zero-balance student accounts (SBI, IPPB, rural banks), aligned with RBI financial inclusion goals.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
