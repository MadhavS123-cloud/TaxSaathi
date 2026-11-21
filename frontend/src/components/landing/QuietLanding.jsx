import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { Mic, Scale } from 'lucide-react';
import StillLife from './StillLife';
import { CountUp, GoldLine, Item, Reveal, Stagger, ease, useCalm } from './motion';

const cream = '#F3EDE2';
const muted = '#B7AFA3';
const gold = '#C9A96E';

function Eyebrow({ children }) {
  return (
    <p className="mb-5 text-[11px] font-sans uppercase tracking-[0.28em]" style={{ color: gold }}>
      {children}
    </p>
  );
}

function Nav() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = (id) => (event) => {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header
      className="fixed inset-x-0 top-0 z-40 transition-colors duration-500"
      style={{
        background: scrolled ? 'rgba(12,12,12,0.92)' : 'transparent',
        borderBottom: scrolled ? '1px solid rgba(201,169,110,0.22)' : '1px solid transparent',
      }}
    >
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-3" data-cursor="interactive">
          <span className="flex h-8 w-8 items-center justify-center border text-sm font-serif" style={{ borderColor: gold, color: cream }}>
            CA
          </span>
          <span className="font-serif text-lg tracking-wide" style={{ color: cream }}>TaxSaathi</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {[
            ['desk', 'The desk'],
            ['method', 'Method'],
            ['practice', 'Practice'],
          ].map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={go(id)}
              className="text-sm font-sans transition-colors hover:text-[#F3EDE2]"
              style={{ color: muted }}
              data-cursor="interactive"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-5">
          <Link to="/login" className="text-sm font-sans" style={{ color: cream }} data-cursor="interactive">
            Sign in
          </Link>
          <button
            type="button"
            onClick={() => navigate('/login')}
            data-cursor="interactive"
            className="hidden border px-4 py-2 text-sm font-sans transition-transform duration-300 hover:-translate-y-0.5 sm:inline-block"
            style={{ borderColor: gold, background: gold, color: '#0C0C0C' }}
          >
            Request a desk
          </button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const calm = useCalm();
  const words = ['The', 'exceptions,', 'prepared', 'before', 'you', 'sit', 'down.'];

  return (
    <section className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-16 px-6 pb-24 pt-32 md:grid-cols-[1.05fr_0.95fr] md:pt-28">
      <div>
        <motion.div
          initial={calm ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: calm ? 0 : 0.7, ease }}
        >
          <Eyebrow>For chartered accountants in India</Eyebrow>
        </motion.div>
        <h1 className="max-w-xl font-serif text-5xl font-light leading-[1.08] md:text-6xl" style={{ color: cream }}>
          {words.map((word, index) => (
            <motion.span
              key={`${word}-${index}`}
              className="mr-[0.28em] inline-block"
              initial={calm ? false : { opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: calm ? 0 : 0.7, delay: calm ? 0 : 0.12 + index * 0.08, ease }}
            >
              {word}
            </motion.span>
          ))}
        </h1>
        <motion.p
          className="mt-8 max-w-md text-base font-sans leading-relaxed"
          style={{ color: muted }}
          initial={calm ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: calm ? 0 : 0.8, delay: calm ? 0 : 0.78, ease }}
        >
          TaxSaathi reads the invoice, matches the bank, and keeps the answer inside the statute. What reaches you is the line a partner should sign.
        </motion.p>
        <motion.div
          className="mt-10 flex items-center gap-6"
          initial={calm ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: calm ? 0 : 0.8, delay: calm ? 0 : 1.05, ease }}
        >
          <Link
            to="/login"
            data-cursor="interactive"
            className="border px-6 py-3 text-sm font-sans transition-transform duration-300 hover:-translate-y-0.5"
            style={{ borderColor: gold, background: gold, color: '#0C0C0C' }}
          >
            Request a desk
          </Link>
          <a href="#desk" className="text-sm font-sans" style={{ color: cream }} data-cursor="interactive">
            See the workflow
          </a>
        </motion.div>
      </div>
      <StillLife />
    </section>
  );
}

function TrustBar() {
  const points = ['Built for CAs', 'Exception-first workflow', 'Hindi and English', 'Amounts from the ledger'];
  return (
    <section className="mx-auto max-w-6xl px-6 pb-8">
      <GoldLine />
      <Stagger className="grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4" gap={0.1}>
        {points.map((point) => (
          <Item key={point}>
            <p className="font-serif text-lg font-light" style={{ color: cream }}>{point}</p>
          </Item>
        ))}
      </Stagger>
      <GoldLine />
    </section>
  );
}

function FieldRow({ label, value }) {
  return (
    <Item>
      <div className="flex items-baseline justify-between gap-6 border-b py-3" style={{ borderColor: 'rgba(243,237,226,0.08)' }}>
        <span className="text-[11px] font-sans uppercase tracking-[0.18em]" style={{ color: muted }}>{label}</span>
        <span className="font-serif text-base" style={{ color: cream }}>{value}</span>
      </div>
    </Item>
  );
}

function DocumentSection() {
  return (
    <section id="desk" className="mx-auto grid max-w-6xl scroll-mt-24 items-center gap-16 px-6 py-32 md:grid-cols-2 md:py-40">
      <Reveal>
        <Eyebrow>01 · Document upload</Eyebrow>
        <h2 className="font-serif text-4xl font-light leading-tight md:text-5xl" style={{ color: cream }}>
          A file becomes a set of fields.
        </h2>
        <p className="mt-6 max-w-md text-base leading-relaxed" style={{ color: muted }}>
          Drop invoices and receipts. TaxSaathi reads the page and returns the invoice number, date, vendor, GSTIN, taxable value, and the tax split. A failed read stays in the queue for review.
        </p>
      </Reveal>
      <Reveal delay={0.12}>
        <motion.div
          className="border p-8"
          style={{ borderColor: 'rgba(201,169,110,0.35)', background: '#141414' }}
          initial={false}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.35, ease }}
        >
          <p className="mb-6 text-[11px] uppercase tracking-[0.22em]" style={{ color: gold }}>Extracted · Sharma Traders</p>
          <Stagger gap={0.1}>
            <FieldRow label="Invoice no" value="INV-ST-2401" />
            <FieldRow label="Date" value="05 Jan 2026" />
            <FieldRow label="Vendor" value="Sharma Traders" />
            <FieldRow label="GSTIN" value="29AAPFS1234A1Z5" />
            <FieldRow label="Taxable value" value="₹10,000" />
            <FieldRow label="CGST / SGST" value="₹900 / ₹900" />
          </Stagger>
        </motion.div>
      </Reveal>
    </section>
  );
}

function ReconciliationSection() {
  const rows = [
    ['INV-EX-1001', 'Exact', '₹25,000'],
    ['INV-PA-1002', 'Partial · ₹7,000 short', '₹18,000'],
    ['INV-PN-1004', 'Unmatched', '₹9,600'],
  ];
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-16 px-6 py-32 md:grid-cols-2 md:py-40">
      <Reveal className="md:order-2">
        <Eyebrow>02 · Ledger reconciliation</Eyebrow>
        <h2 className="font-serif text-4xl font-light leading-tight md:text-5xl" style={{ color: cream }}>
          The bank is matched by rule.
        </h2>
        <p className="mt-6 max-w-md text-base leading-relaxed" style={{ color: muted }}>
          A unique reference settles first. The same amount on the same date follows. Several payments against one invoice become a partial, with the shortfall written down. An overpayment is left for a person. No model decides a match.
        </p>
      </Reveal>
      <Reveal delay={0.1} className="md:order-1">
        <div className="border p-8" style={{ borderColor: 'rgba(201,169,110,0.35)', background: '#141414' }}>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: gold }}>Sample book</p>
              <p className="mt-3 font-serif text-5xl font-light" style={{ color: cream }}>
                <CountUp to={33} suffix="%" />
              </p>
              <p className="mt-2 text-sm" style={{ color: muted }}>One of these three settled in full.</p>
            </div>
            <Scale size={22} strokeWidth={1.25} color={gold} />
          </div>
          <Stagger className="mt-8" gap={0.12}>
            {rows.map(([ref, state, amount]) => (
              <Item key={ref}>
                <div
                  className="mb-3 flex items-center justify-between border px-4 py-3"
                  style={{
                    borderColor: state.startsWith('Exact') ? 'rgba(201,169,110,0.45)' : 'rgba(243,237,226,0.08)',
                    background: state.startsWith('Exact') ? 'rgba(201,169,110,0.06)' : 'transparent',
                  }}
                >
                  <div>
                    <p className="font-serif" style={{ color: cream }}>{ref}</p>
                    <p className="text-xs" style={{ color: muted }}>{state}</p>
                  </div>
                  <p className="font-serif" style={{ color: cream }}>{amount}</p>
                </div>
              </Item>
            ))}
          </Stagger>
        </div>
      </Reveal>
    </section>
  );
}

function useTyped(text, active) {
  const calm = useCalm();
  const [shown, setShown] = useState(calm ? text : '');

  useEffect(() => {
    if (!active) return undefined;
    if (calm) {
      setShown(text);
      return undefined;
    }
    setShown('');
    let index = 0;
    const timer = setInterval(() => {
      index += 1;
      setShown(text.slice(0, index));
      if (index >= text.length) clearInterval(timer);
    }, 36);
    return () => clearInterval(timer);
  }, [active, calm, text]);

  return shown;
}

function VoiceSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-20% 0px' });
  const calm = useCalm();
  const line = 'Sharma ji ki kitni payment baaki hai?';
  const typed = useTyped(line, inView);

  return (
    <section ref={ref} className="mx-auto grid max-w-6xl items-center gap-16 px-6 py-32 md:grid-cols-2 md:py-40">
      <Reveal>
        <Eyebrow>03 · Voice desk</Eyebrow>
        <h2 className="font-serif text-4xl font-light leading-tight md:text-5xl" style={{ color: cream }}>
          Ask the ledger, in the room’s language.
        </h2>
        <p className="mt-6 max-w-md text-base leading-relaxed" style={{ color: muted }}>
          A Hindi or Hinglish question is heard, then answered from the saved reconciliation. The rupee figure is calculated in code. The voice only reads the number the books already hold.
        </p>
      </Reveal>
      <Reveal delay={0.12}>
        <div className="border p-8" style={{ borderColor: 'rgba(201,169,110,0.35)', background: '#141414' }}>
          <div className="mb-8 flex items-center gap-4">
            <span className="relative flex h-12 w-12 items-center justify-center border" style={{ borderColor: gold }}>
              {!calm && (
                <motion.span
                  className="absolute inset-0 border"
                  style={{ borderColor: gold }}
                  animate={{ scale: [1, 1.35], opacity: [0.45, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
                />
              )}
              <Mic size={18} strokeWidth={1.25} color={gold} />
            </span>
            <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: gold }}>Listening</p>
          </div>
          <p className="min-h-[3.5rem] font-serif text-2xl font-light leading-snug" style={{ color: cream }}>
            {typed}
            {!calm && typed.length < line.length && <span style={{ color: gold }}>|</span>}
          </p>
          <motion.div
            className="mt-8 border-t pt-6"
            style={{ borderColor: 'rgba(201,169,110,0.28)' }}
            initial={calm ? false : { opacity: 0, height: 0 }}
            animate={inView ? { opacity: 1, height: 'auto' } : {}}
            transition={{ duration: calm ? 0 : 0.7, delay: calm ? 0 : 1.6, ease }}
          >
            <p className="font-serif text-xl font-light" style={{ color: cream }}>
              Do invoice ka payment baaki hai. Kul atharah hazar paanch sau rupaye.
            </p>
            <p className="mt-3 text-sm" style={{ color: muted }}>Spoken from the ledger total. ₹18,500.</p>
          </motion.div>
        </div>
      </Reveal>
    </section>
  );
}

function AdvisorySection() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-16 px-6 py-32 md:grid-cols-2 md:py-40">
      <Reveal className="md:order-2">
        <Eyebrow>04 · Tax advisory</Eyebrow>
        <h2 className="font-serif text-4xl font-light leading-tight md:text-5xl" style={{ color: cream }}>
          An answer only when the Act is in the room.
        </h2>
        <p className="mt-6 max-w-md text-base leading-relaxed" style={{ color: muted }}>
          Questions are answered from the Income Tax Act 2025, the CGST Act, and the IGST Act. A citation is kept only if that section was retrieved. If the corpus is silent, TaxSaathi says so.
        </p>
      </Reveal>
      <Reveal delay={0.1} className="md:order-1">
        <Stagger className="space-y-4" gap={0.14}>
          <Item>
            <div className="ml-auto max-w-sm border px-5 py-4" style={{ borderColor: 'rgba(243,237,226,0.12)' }}>
              <p className="font-sans text-sm leading-relaxed" style={{ color: cream }}>
                When can input tax credit be taken on a tax invoice?
              </p>
            </div>
          </Item>
          <Item>
            <div className="max-w-md border px-5 py-5" style={{ borderColor: 'rgba(201,169,110,0.4)', background: '#141414' }}>
              <p className="font-serif text-lg font-light leading-relaxed" style={{ color: cream }}>
                Credit follows the conditions set out in the retrieved text of the CGST Act, including a valid tax invoice.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="border px-2 py-1 text-[11px] uppercase tracking-[0.16em]" style={{ borderColor: gold, color: gold }}>
                  CGST Act · s.16
                </span>
                <span className="border px-2 py-1 text-[11px] uppercase tracking-[0.16em]" style={{ borderColor: 'rgba(243,237,226,0.16)', color: muted }}>
                  Grounded
                </span>
              </div>
            </div>
          </Item>
        </Stagger>
      </Reveal>
    </section>
  );
}

function DraftSection() {
  const calm = useCalm();
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-16 px-6 py-32 md:grid-cols-2 md:py-40">
      <Reveal>
        <Eyebrow>05 · Client note and review</Eyebrow>
        <h2 className="font-serif text-4xl font-light leading-tight md:text-5xl" style={{ color: cream }}>
          The note is written. It is not sent.
        </h2>
        <p className="mt-6 max-w-md text-base leading-relaxed" style={{ color: muted }}>
          A plain-language reminder is drafted from the unpaid invoices. It waits, marked for a CA. Approve or reject is a decision on the desk. Nothing leaves without that review.
        </p>
      </Reveal>
      <Reveal delay={0.12}>
        <motion.article
          className="border p-8"
          style={{ borderColor: 'rgba(201,169,110,0.35)', background: '#141414' }}
          initial={calm ? false : { opacity: 0, x: 28 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-10% 0px' }}
          transition={{ duration: calm ? 0 : 0.8, ease }}
        >
          <div className="flex items-center justify-between gap-4">
            <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: gold }}>Client note</p>
            <motion.span
              className="border px-2 py-1 text-[11px] uppercase tracking-[0.16em]"
              style={{ borderColor: gold, color: gold }}
              animate={calm ? undefined : { opacity: [0.55, 1, 0.55] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              Requires CA Review
            </motion.span>
          </div>
          <p className="mt-6 font-serif text-2xl font-light leading-snug" style={{ color: cream }}>
            Aapke do invoice ka payment baaki hai, kul atharah hazar paanch sau rupaye.
          </p>
          <p className="mt-4 text-sm" style={{ color: muted }}>Draft — requires CA review. Not delivered.</p>
          <div className="mt-8 flex gap-3">
            {['Approve', 'Reject'].map((label) => (
              <button
                key={label}
                type="button"
                data-cursor="interactive"
                className="border px-4 py-2 text-sm transition-transform duration-300 hover:-translate-y-0.5"
                style={{
                  borderColor: label === 'Approve' ? gold : 'rgba(243,237,226,0.24)',
                  color: label === 'Approve' ? '#0C0C0C' : cream,
                  background: label === 'Approve' ? gold : 'transparent',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </motion.article>
      </Reveal>
    </section>
  );
}

function AuditSection() {
  const rows = [
    ['09:14', 'Invoice uploaded', 'INV-ST-2401'],
    ['09:16', 'Reconciliation saved', '1 partial · 1 unmatched'],
    ['09:18', 'Voice answer spoken', '₹18,500 outstanding'],
    ['09:21', 'Client note held', 'Draft — requires CA review'],
    ['09:24', 'Exception approved', 'INV-EX-1001'],
  ];
  return (
    <section className="mx-auto max-w-6xl px-6 py-32 md:py-40">
      <Reveal>
        <Eyebrow>06 · Audit trail</Eyebrow>
        <h2 className="max-w-xl font-serif text-4xl font-light leading-tight md:text-5xl" style={{ color: cream }}>
          Every action keeps its place.
        </h2>
        <p className="mt-6 max-w-lg text-base leading-relaxed" style={{ color: muted }}>
          Uploads, matches, spoken answers, and review decisions are written down in order. The history is the file, not a recollection.
        </p>
      </Reveal>
      <div className="mt-12 border-t" style={{ borderColor: 'rgba(201,169,110,0.28)' }}>
      <Stagger gap={0.08}>
        {rows.map(([time, action, detail]) => (
          <Item key={time + action}>
            <div className="grid grid-cols-[4.5rem_1fr] gap-6 border-b py-5 md:grid-cols-[6rem_14rem_1fr]" style={{ borderColor: 'rgba(243,237,226,0.08)' }}>
              <span className="text-sm" style={{ color: gold }}>{time}</span>
              <span className="font-serif text-lg" style={{ color: cream }}>{action}</span>
              <span className="hidden text-sm md:block" style={{ color: muted }}>{detail}</span>
            </div>
          </Item>
        ))}
      </Stagger>
      </div>
    </section>
  );
}

function MethodSection() {
  const steps = [
    ['01', 'Upload', 'Invoices and the bank statement enter the case.'],
    ['02', 'Reconcile', 'Rules pair what they can. Exceptions remain.'],
    ['03', 'Review', 'A junior hears the ledger and reads the draft.'],
    ['04', 'Approve', 'A CA signs the match, or sends it back.'],
  ];
  return (
    <section id="method" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-32 md:py-40">
      <Reveal>
        <Eyebrow>Method</Eyebrow>
        <h2 className="font-serif text-4xl font-light md:text-5xl" style={{ color: cream }}>Four quiet steps.</h2>
      </Reveal>
      <div className="relative mt-16">
        <GoldLine className="absolute left-0 right-0 top-3 hidden md:block" />
        <Stagger className="grid gap-10 md:grid-cols-4" gap={0.14}>
          {steps.map(([n, title, body]) => (
            <Item key={n}>
              <div className="relative bg-[#0C0C0C] pr-6 pt-0">
                <span className="font-serif text-sm" style={{ color: gold }}>{n}</span>
                <h3 className="mt-6 font-serif text-2xl font-light" style={{ color: cream }}>{title}</h3>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: muted }}>{body}</p>
              </div>
            </Item>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

function PracticeSection() {
  const calm = useCalm();
  return (
    <section id="practice" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-32 md:py-40">
      <div className="grid items-stretch gap-16 md:grid-cols-[1.3fr_0.7fr]">
        <motion.blockquote
          className="border-l pl-8"
          style={{ borderColor: gold }}
          initial={calm ? false : { opacity: 0, x: -36 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-10% 0px' }}
          transition={{ duration: calm ? 0 : 0.9, ease }}
        >
          <p className="font-serif text-3xl font-light leading-snug md:text-4xl" style={{ color: cream }}>
            “Before TaxSaathi, our associates spent three weeks just typing GST line items to the ledger. Now, the system highlights the 2% of exceptions, and we spend our time actually advising the client on resolving them.”
          </p>
          <footer className="mt-8 text-sm" style={{ color: muted }}>
            — Senior Associate, Mid-sized GST Advisory Practice
          </footer>
        </motion.blockquote>
        <div className="flex flex-col justify-center gap-10">
          <GoldLine className="md:hidden" />
          <div>
            <p className="font-serif text-6xl font-light" style={{ color: cream }}>
              <CountUp to={3} /> <span className="text-3xl">Weeks</span>
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed" style={{ color: muted }}>
              Average time saved per statutory audit engagement during reconciliation.
            </p>
          </div>
          <GoldLine />
          <div>
            <p className="font-serif text-6xl font-light" style={{ color: cream }}>
              <CountUp to={98} suffix="%" />
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed" style={{ color: muted }}>
              Reduction in manual data entry errors across all invoice extractions.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Close() {
  const navigate = useNavigate();
  return (
    <section className="mx-auto max-w-6xl px-6 pb-28 pt-12">
      <GoldLine />
      <Reveal className="py-24">
        <h2 className="max-w-2xl font-serif text-4xl font-light leading-tight md:text-6xl" style={{ color: cream }}>
          The desk is ready when the file is.
        </h2>
        <button
          type="button"
          onClick={() => navigate('/login')}
          data-cursor="interactive"
          className="mt-10 border px-6 py-3 text-sm font-sans transition-transform duration-300 hover:-translate-y-0.5"
          style={{ borderColor: gold, background: gold, color: '#0C0C0C' }}
        >
          Request a desk
        </button>
      </Reveal>
      <footer className="flex flex-col justify-between gap-4 border-t py-8 sm:flex-row" style={{ borderColor: 'rgba(201,169,110,0.22)' }}>
        <p className="font-serif" style={{ color: cream }}>TaxSaathi</p>
        <p className="text-sm" style={{ color: muted }}>
          A pre-accounting desk. A CA reviews every output.
        </p>
      </footer>
    </section>
  );
}

export default function QuietLanding() {
  return (
    <div className="quiet-landing min-h-screen" style={{ background: '#0C0C0C', color: cream }}>
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: 'radial-gradient(ellipse at 20% 0%, rgba(201,169,110,0.08), transparent 42%)' }}
      />
      <Nav />
      <main className="relative">
        <Hero />
        <TrustBar />
        <DocumentSection />
        <ReconciliationSection />
        <VoiceSection />
        <AdvisorySection />
        <DraftSection />
        <AuditSection />
        <MethodSection />
        <PracticeSection />
        <Close />
      </main>
    </div>
  );
}
