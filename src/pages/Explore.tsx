import { useMemo, useState } from 'react';
import type { Index } from '../lib/data';
import { strongestRating } from '../lib/data';
import { CATEGORIES, VERDICTS } from '../lib/evidence';
import type { Profile, Verdict } from '../lib/types';
import { href } from '../lib/router';
import { Page } from '../components/Layout';
import { CompareToggle } from '../components/Compare';
import { AnimatePresence, motion } from 'framer-motion';
import { t } from '../lib/motion';
import { PageTitle } from './shared';
import { sessionStorageTake } from './Home';

type EvFilter = 'all' | 'strong' | 'promising' | 'weak' | 'against';
const EV_FILTERS: { id: EvFilter; label: string; test: (p: Profile) => boolean }[] = [
  { id: 'all', label: 'Any evidence', test: () => true },
  { id: 'strong', label: 'Has a strong claim (4–5)', test: (p) => strongestRating(p) >= 4 },
  { id: 'promising', label: 'Best is promising (3)', test: (p) => strongestRating(p) === 3 },
  { id: 'weak', label: 'Best is limited (1–2)', test: (p) => strongestRating(p) > 0 && strongestRating(p) <= 2 },
  { id: 'against', label: 'Has a claim with evidence against', test: (p) => p.claims.some((c) => c.rating === 'against') },
];

export function ExplorePage({ index }: { index: Index }) {
  const [cat, setCat] = useState<string>(() => sessionStorageTake('assay-cat') || 'all');
  const [ev, setEv] = useState<EvFilter>('all');
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();

  const reviewed = useMemo(
    () =>
      index.profiles.filter(
        (p) =>
          (cat === 'all' || p.category === cat) &&
          EV_FILTERS.find((f) => f.id === ev)!.test(p) &&
          (!term || [p.name, ...(p.aliases ?? []), ...(p.outcomes ?? [])].some((t) => t.toLowerCase().includes(term))),
      ),
    [index, cat, ev, term],
  );
  const queued = useMemo(
    () =>
      index.catalog.filter(
        (c) =>
          !index.byId.has(c.id) &&
          (cat === 'all' || c.category === cat) &&
          (!term || [c.name, ...(c.aliases ?? []), ...(c.outcomes ?? [])].some((t) => t.toLowerCase().includes(term))),
      ),
    [index, cat, term],
  );
  const cats = CATEGORIES.filter((c) => index.catalog.some((i) => i.category === c) || index.profiles.some((p) => p.category === c));

  return (
    <Page>
      <PageTitle kicker="Explore" title="The supplement index.">
        {index.profiles.length} supplements reviewed claim by claim, and {index.catalog.length - index.profiles.length} more in the catalogue waiting for review.
      </PageTitle>

      <div className="grid gap-5 border-b hair py-6">
        <div className="flex max-w-md items-center gap-3 border-b pb-2" style={{ borderColor: 'var(--ink)' }}>
          <label htmlFor="explore-filter" className="eyebrow shrink-0">Filter</label>
          <input id="explore-filter" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or outcome, e.g. sleep" className="min-h-[2.25rem] min-w-0 flex-1 bg-transparent placeholder:text-muted focus:outline-none" />
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Category">
          <button className="chip" aria-pressed={cat === 'all'} onClick={() => setCat('all')}>All categories</button>
          {cats.map((c) => (
            <button key={c} className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Evidence strength">
          {EV_FILTERS.map((f) => (
            <button key={f.id} className="chip" aria-pressed={ev === f.id} onClick={() => setEv(f.id)}>{f.label}</button>
          ))}
        </div>
      </div>

      <section className="mt-2">
        {reviewed.length ? (
          <motion.ul layout>
            <AnimatePresence initial={false} mode="popLayout">
              {reviewed.map((p) => (
                <motion.li
                  key={p.id}
                  layout="position"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: t.base }}
                  exit={{ opacity: 0, transition: t.exit }}
                  className="group relative grid gap-3 border-b hair py-7 md:grid-cols-[15rem_minmax(0,1fr)_13rem_auto] md:items-center md:gap-8"
                >
                  <div className="min-w-0">
                    <a href={href.supplement(p.id)} className="no-underline after:absolute after:inset-0 after:content-['']">
                      <span className="t-h2 block transition-colors duration-200 group-hover:text-forest-deep" style={{ viewTransitionName: `sup-${p.id}` } as React.CSSProperties}>
                        {p.name}
                      </span>
                    </a>
                    <div className="eyebrow mt-2">{p.category}</div>
                  </div>
                  <p className="min-w-0 text-[0.97rem] leading-relaxed text-muted">{p.summary}</p>
                  <VerdictTally p={p} />
                  <div className="relative z-10 md:justify-self-end">
                    <CompareToggle id={p.id} name={p.name} />
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        ) : (
          <div className="py-14"><p className="t-h3">No reviewed supplements match these filters.</p><button className="btn mt-5" onClick={() => { setCat('all'); setEv('all'); setQ(''); }}>Clear filters</button></div>
        )}
      </section>

      {queued.length && ev === 'all' ? (
        <section className="mt-16">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="t-h3">In the catalogue, not yet reviewed</h2>
            <span className="eyebrow">Ordered by research priority</span>
          </div>
          <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
            {queued.map((c) => (
              <li key={c.id} className="flex items-baseline justify-between gap-3 border-t hair py-3 text-sm">
                <span className="min-w-0">
                  <span className="text-ink">{c.name}</span>
                  <span className="text-muted"> · {c.category}</span>
                </span>
                <span className="data shrink-0 text-muted">#{c.priority_rank}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Page>
  );
}

const TALLY_ORDER: Verdict[] = ['supported', 'partly_true', 'not_established', 'contradicted'];

function VerdictTally({ p }: { p: Profile }) {
  return (
    <dl className="grid max-w-xs grid-cols-4 gap-3">
      {TALLY_ORDER.map((v) => {
        const n = p.claims.filter((c) => c.verdict === v).length;
        return (
          <div key={v} className={`flex flex-col ${n ? '' : 'opacity-40'}`}>
            <dt className="order-last mt-1 text-[0.7rem] leading-tight text-muted">{VERDICTS[v].label}</dt>
            <dd className="num display text-2xl leading-none">{n}</dd>
          </div>
        );
      })}
    </dl>
  );
}
