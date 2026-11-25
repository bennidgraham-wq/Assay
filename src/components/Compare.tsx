import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import type { Index } from '../lib/data';
import type { Claim, Profile } from '../lib/types';
import { ratingValue } from '../lib/evidence';
import { href } from '../lib/router';
import { COMPARE_MAX, clearCompare, setCompareOpen, toggleCompare, useCompare } from '../lib/store';
import { t } from '../lib/motion';
import { Dialog } from './Dialog';
import { EvidenceRule, RatingLabel, VerdictTag } from './Evidence';

/** Add/remove a supplement from the comparison. Quiet text button with a check that draws in. */
export function CompareToggle({ id, name, className = '' }: { id: string; name: string; className?: string }) {
  const { ids } = useCompare();
  const on = ids.includes(id);
  const full = !on && ids.length >= COMPARE_MAX;
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={full}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleCompare(id);
      }}
      title={full ? `You can compare up to ${COMPARE_MAX} at a time` : undefined}
      aria-label={on ? `Remove ${name} from comparison` : `Add ${name} to comparison`}
      className={`inline-flex min-h-[2.25rem] items-center gap-2 rounded-full border px-3 text-[0.8125rem] transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${
        on ? 'border-ink bg-ink text-paper' : 'text-muted hover:border-ink hover:text-ink'
      } ${className}`}
      style={on ? undefined : { borderColor: 'var(--rule-strong)' }}
    >
      <span className="relative grid h-3.5 w-3.5 place-items-center rounded-[3px] border" style={{ borderColor: 'currentColor' }} aria-hidden>
        <AnimatePresence initial={false}>
          {on ? (
            <motion.svg key="c" width="10" height="10" viewBox="0 0 10 10" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={t.quick}>
              <path d="M1.8 5.2l2 2 4.4-4.6" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </motion.svg>
          ) : null}
        </AnimatePresence>
      </span>
      {on ? 'Comparing' : 'Compare'}
    </button>
  );
}

/** Floating glass pill (appears once something is selected) and the comparison drawer it opens. */
export function CompareDock({ index }: { index: Index }) {
  const { ids, open } = useCompare();
  const profiles = ids.map((id) => index.byId.get(id)).filter(Boolean) as Profile[];
  return (
    <>
      <AnimatePresence>
        {profiles.length && !open ? (
          <motion.div
            className="fixed inset-x-0 z-50 flex justify-center px-4"
            style={{ bottom: 'max(16px, env(safe-area-inset-bottom, 0px))' }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0, transition: t.spring }}
            exit={{ opacity: 0, y: 16, transition: t.exit }}
          >
            <div className="glass glass-edge flex max-w-full items-center gap-1 rounded-full p-1.5 pl-4">
              <span className="mr-2 hidden min-w-0 truncate text-sm text-muted sm:block">{profiles.map((p) => p.name).join(' · ')}</span>
              <button type="button" onClick={() => setCompareOpen(true)} className="inline-flex min-h-[2.5rem] items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-paper transition-transform duration-150 active:scale-[0.97]">
                Compare
                <motion.span key={profiles.length} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={t.spring} className="data rounded-full bg-paper/20 px-1.5 text-[0.72rem]">
                  {profiles.length}
                </motion.span>
              </button>
              <button type="button" onClick={clearCompare} className="grid h-10 w-10 place-items-center rounded-full text-muted transition-colors hover:text-ink" aria-label="Clear comparison">
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.4" /></svg>
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <Dialog open={open && profiles.length > 0} onClose={() => setCompareOpen(false)} label="Compare supplements" variant="drawer">
        <CompareSheet profiles={profiles} index={index} />
      </Dialog>
    </>
  );
}

const best = (p: Profile): Claim | undefined => [...p.claims].sort((a, b) => ratingValue(b.rating) - ratingValue(a.rating))[0];

function CompareSheet({ profiles, index }: { profiles: Profile[]; index: Index }) {
  const suggestions = index.profiles.filter((p) => !profiles.includes(p) && profiles.some((x) => x.category === p.category || x.related?.includes(p.id))).slice(0, 4);
  const cols = { '--cols': `repeat(${profiles.length}, minmax(0, 1fr))` } as React.CSSProperties;
  const rows: { label: string; render: (p: Profile) => React.ReactNode }[] = [
    {
      label: 'Best-supported claim',
      render: (p) => {
        const c = best(p);
        return c ? (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <VerdictTag verdict={c.verdict} />
              <RatingLabel rating={c.rating} className="text-[0.68rem]" />
            </div>
            <a href={href.claim(c.id)} onClick={() => setCompareOpen(false)} className="link mt-2 inline text-[0.95rem]">{c.claim}</a>
          </div>
        ) : null;
      },
    },
    {
      label: 'Evidence, claim by claim',
      render: (p) => (
        <ul className="space-y-2">
          {[...p.claims].sort((a, b) => ratingValue(b.rating) - ratingValue(a.rating)).map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate" title={c.claim}>{c.outcome || c.claim}</span>
              <EvidenceRule rating={c.rating} />
            </li>
          ))}
        </ul>
      ),
    },
    { label: 'Forms', render: (p) => (p.formulations?.length ? <span className="text-sm">{p.formulations.map((f) => f.name).join(', ')}</span> : <Missing />) },
    { label: 'Doses used in research', render: (p) => (p.research_doses_summary ? <span className="text-sm">{p.research_doses_summary}</span> : <Missing />) },
    { label: 'Upper limit', render: (p) => (p.upper_limit ? <span className="text-sm">{p.upper_limit}</span> : <Missing />) },
    { label: 'Safety and interactions', render: (p) => (p.cautions || p.interactions ? <span className="text-sm">{[p.cautions, p.interactions].filter(Boolean).join(' ')}</span> : <Missing />) },
    {
      label: 'What the research has not shown',
      render: (p) => {
        const gaps = p.claims.filter((c) => c.verdict === 'not_established' || c.verdict === 'contradicted');
        return gaps.length ? (
          <ul className="space-y-1.5 text-sm">
            {gaps.map((c) => (
              <li key={c.id} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c.verdict === 'contradicted' ? 'var(--clay)' : 'var(--rule-strong)' }} aria-hidden />
                <span>{c.claim} <span className="text-muted">({c.verdict === 'contradicted' ? 'evidence against' : 'not established'})</span></span>
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-sm text-muted">Every claim we reviewed has at least some support.</span>
        );
      },
    },
  ];
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-start justify-between gap-4 border-b px-5 pb-4 pt-5 sm:px-6" style={{ borderColor: 'var(--glass-line)' }}>
        <div>
          <div className="kicker">Side by side</div>
          <h2 className="t-h3 mt-1">Compare supplements</h2>
          <p className="t-small mt-1 text-muted">Ratings apply to individual claims, so compare claim by claim, not product by product.</p>
        </div>
        <button type="button" onClick={() => setCompareOpen(false)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]" aria-label="Close comparison">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" /></svg>
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
        <LayoutGroup>
          <div className="px-5 pb-6 sm:px-6">
            {/* Column heads */}
            <div className="z-10 -mx-5 grid gap-x-5 gap-y-3 border-b px-5 py-4 sm:sticky sm:top-0 sm:-mx-6 sm:px-6 sm:[grid-template-columns:var(--cols)]" style={{ ...cols, borderColor: 'var(--glass-line)', background: 'var(--glass-strong)' }}>
              <AnimatePresence initial={false} mode="popLayout">
                {profiles.map((p) => (
                  <motion.div key={p.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={t.spring} className="min-w-0">
                    <div className="eyebrow">{p.category}</div>
                    <div className="mt-0.5 flex items-start justify-between gap-2">
                      <a href={href.supplement(p.id)} onClick={() => setCompareOpen(false)} className="display text-[1.35rem] leading-tight no-underline hover:text-forest-deep">{p.name}</a>
                      <button type="button" onClick={() => toggleCompare(p.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:text-ink" aria-label={`Remove ${p.name}`}>
                        <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" /></svg>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {rows.map((r) => (
              <section key={r.label} className="border-b py-4" style={{ borderColor: 'var(--glass-line)' }}>
                <h3 className="eyebrow mb-2.5">{r.label}</h3>
                <div className="grid gap-x-5 gap-y-4 sm:[grid-template-columns:var(--cols)]" style={cols}>
                  {profiles.map((p) => (
                    <motion.div key={p.id} layout="position" transition={t.spring} className="min-w-0 leading-relaxed">
                      {profiles.length > 1 ? <div className="mb-1 text-[0.8125rem] font-medium sm:hidden">{p.name}</div> : null}
                      {r.render(p)}
                    </motion.div>
                  ))}
                </div>
              </section>
            ))}
            {profiles.length < COMPARE_MAX && suggestions.length ? (
              <div className="pt-5">
                <div className="eyebrow mb-2">Add to the comparison</div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((p) => (
                    <button key={p.id} type="button" className="chip" onClick={() => toggleCompare(p.id)}>
                      + {p.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </LayoutGroup>
      </div>
    </div>
  );
}

const Missing = () => <span className="text-sm text-muted">Not covered in this review</span>;
