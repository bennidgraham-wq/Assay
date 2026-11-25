import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ClaimRef, Index } from '../lib/data';
import type { Verdict } from '../lib/types';
import { VERDICTS } from '../lib/evidence';
import { href } from '../lib/router';
import { pushRecent } from '../lib/store';
import { t } from '../lib/motion';
import { ClaimEvidenceExplorer, ReviewNote, EvidenceRule, RatingLabel, VerdictTag } from '../components/Evidence';
import { ClaimDetail } from '../components/ClaimBlock';
import { Page } from '../components/Layout';
import { NotFound, PageTitle } from './shared';

export function ClaimPage({ index, id }: { index: Index; id: string }) {
  const ref = index.claimById.get(id);
  useEffect(() => {
    if (ref) pushRecent({ kind: 'claim', id: ref.claim.id, title: ref.claim.question || ref.claim.claim, sub: ref.profile.name });
  }, [ref]);
  if (!ref) return <NotFound title="Claim not found" />;
  const { claim, profile } = ref;
  const siblings = profile.claims.filter((c) => c.id !== claim.id);
  return (
    <Page>
      <article className="pb-6">
        <header className="border-b hair pb-12 pt-12 md:pt-16">
          <div className="eyebrow flex flex-wrap items-center gap-x-2.5">
            <a href={href.claims} className="no-underline hover:text-ink">Claims</a>
            <span aria-hidden>/</span>
            <a href={href.supplement(profile.id)} className="no-underline hover:text-ink">{profile.name}</a>
          </div>
          <h1 className="t-title mt-4 max-w-[22ch]">{claim.question || claim.claim}</h1>
          {claim.popular_framing ? (
            <p className="mt-6 max-w-prose">
              <span className="eyebrow mr-2">What you hear</span>
              <span className="display text-lg italic text-muted">“{claim.popular_framing}”</span>
            </p>
          ) : null}
        </header>

        {/* Verdict first, in plain words; the evidence instrument beside it. */}
        <section className="grid gap-x-16 gap-y-10 border-b hair py-12 md:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <VerdictTag verdict={claim.verdict} large />
              <ReviewNote profile={profile} />
            </div>
            <p className="display mt-6 text-[1.6rem] leading-snug sm:text-[2rem]">{claim.bottom_line}</p>
            <p className="t-small mt-4 max-w-prose text-muted">{VERDICTS[claim.verdict].blurb}</p>
            {claim.claim !== (claim.question || '') ? <p className="t-small mt-2 text-muted">Claim assessed: {claim.claim}</p> : null}
          </div>
          <div className="md:border-l hair md:pl-8">
            <div className="kicker mb-4">Where the evidence sits</div>
            <ClaimEvidenceExplorer rating={claim.rating} />
            <a href={href.method} className="link mt-4 inline-block text-sm text-muted">How ratings work</a>
          </div>
        </section>

        <section className="py-12">
          <ClaimDetail claim={claim} profile={profile} showSources />
        </section>

        {siblings.length ? (
          <section className="border-t hair pt-10">
            <div className="kicker mb-4">Other claims about {profile.name}</div>
            <ul className="grid gap-x-10 md:grid-cols-2">
              {siblings.map((c) => (
                <li key={c.id} className="border-t hair">
                  <a href={href.claim(c.id)} className="group flex min-h-[3.5rem] items-center justify-between gap-4 py-4 no-underline">
                    <span className="min-w-0 transition-colors group-hover:text-forest-deep">{c.question || c.claim}</span>
                    <VerdictTag verdict={c.verdict} />
                  </a>
                </li>
              ))}
            </ul>
            <a href={href.supplement(profile.id)} className="btn mt-8">Read the full {profile.name} review <span aria-hidden>→</span></a>
          </section>
        ) : null}
      </article>
    </Page>
  );
}

const VERDICT_ORDER: Verdict[] = ['supported', 'partly_true', 'not_established', 'contradicted'];

export function ClaimsPage({ index }: { index: Index }) {
  const [verdict, setVerdict] = useState<Verdict | 'all'>('all');
  const [topic, setTopic] = useState<string>('all');
  const [q, setQ] = useState('');
  const [revealAll, setRevealAll] = useState(false);
  const topics = useMemo(() => {
    const seen = new Map<string, number>();
    for (const c of index.claims) {
      const k = c.profile.category;
      seen.set(k, (seen.get(k) ?? 0) + 1);
    }
    return [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  }, [index]);
  const term = q.trim().toLowerCase();
  const base = useMemo(
    () =>
      [...index.claims]
        .sort((a, b) => Number(!!b.claim.myth_feature) - Number(!!a.claim.myth_feature) || a.profile.name.localeCompare(b.profile.name))
        .filter(
          (c) =>
            (topic === 'all' || c.profile.category === topic) &&
            (!term || [c.claim.claim, c.claim.question, c.claim.outcome, c.claim.popular_framing, c.profile.name].some((x) => x?.toLowerCase().includes(term))),
        ),
    [index, topic, term],
  );
  const list = verdict === 'all' ? base : base.filter((c) => c.claim.verdict === verdict);
  const counts = Object.fromEntries(VERDICT_ORDER.map((v) => [v, base.filter((c) => c.claim.verdict === v).length]));

  return (
    <Page>
      <PageTitle kicker="Myth vs. science" title="Popular claims, checked against the research.">
        Guess first, then reveal what the studies show. “Not established” means the research isn't there yet. It doesn't mean the claim is false.
      </PageTitle>
      <div className="sticky z-20 -mx-4 border-b hair px-4 py-3 md:mx-0 md:px-0" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 3.5rem)', background: 'color-mix(in srgb, var(--paper) 94%, transparent)' }}>
        <div className="flex flex-wrap items-center gap-2">
          <button className="chip" aria-pressed={verdict === 'all'} onClick={() => setVerdict('all')}>
            All <span className="data opacity-70">{base.length}</span>
          </button>
          {VERDICT_ORDER.map((v) => (
            <button key={v} className="chip" aria-pressed={verdict === v} onClick={() => setVerdict(v)}>
              {VERDICTS[v].label} <span className="data opacity-70">{counts[v]}</span>
            </button>
          ))}
          <button className="chip sm:ml-auto" aria-pressed={revealAll} onClick={() => setRevealAll((r) => !r)}>
            {revealAll ? 'Hide verdicts' : 'Reveal all'}
          </button>
        </div>
      </div>
      <div className="grid gap-4 border-b hair py-5 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:items-center">
        <div className="flex items-center gap-3 border-b pb-2" style={{ borderColor: 'var(--ink)' }}>
          <label htmlFor="claims-filter" className="eyebrow shrink-0">Find</label>
          <input id="claims-filter" value={q} onChange={(e) => setQ(e.target.value)} placeholder="A claim, outcome or supplement" className="min-h-[2.25rem] min-w-0 flex-1 bg-transparent placeholder:text-muted focus:outline-none" />
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0" aria-label="Topic">
          <button className="chip shrink-0" aria-pressed={topic === 'all'} onClick={() => setTopic('all')}>Every topic</button>
          {topics.map((tp) => (
            <button key={tp} className="chip shrink-0" aria-pressed={topic === tp} onClick={() => setTopic(tp)}>{tp}</button>
          ))}
        </div>
      </div>
      {list.length ? (
        <motion.ul layout className="grid gap-x-12 md:grid-cols-2">
          <AnimatePresence initial={false} mode="popLayout">
            {list.map((c) => (
              <motion.li
                key={c.claim.id}
                layout="position"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, transition: t.base }}
                exit={{ opacity: 0, transition: t.exit }}
                className="border-b hair"
              >
                <MythCard refd={c} revealed={revealAll} />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      ) : (
        <div className="py-16">
          <p className="t-h3">No claims match those filters.</p>
          <button
            className="btn mt-5"
            onClick={() => {
              setVerdict('all');
              setTopic('all');
              setQ('');
            }}
          >
            Clear filters
          </button>
        </div>
      )}
    </Page>
  );
}

/** A myth card: read the claim, guess, then reveal. The verdict slides in where the button was. */
export function MythCard({ refd, revealed = false }: { refd: ClaimRef; revealed?: boolean }) {
  const [open, setOpen] = useState(revealed);
  useEffect(() => setOpen(revealed), [revealed]);
  const { claim, profile } = refd;
  return (
    <div className="py-7">
      <div className="eyebrow mb-2">
        <a href={href.supplement(profile.id)} className="no-underline hover:text-ink">{profile.name}</a>
      </div>
      <h3 className="t-h3">{claim.question || claim.claim}</h3>
      {claim.popular_framing ? <p className="display mt-1.5 italic text-muted">“{claim.popular_framing}”</p> : null}
      <div className="relative mt-5 min-h-[2.75rem]">
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.div key="verdict" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: t.slow }} exit={{ opacity: 0, transition: t.exit }}>
              <div className="flex flex-wrap items-center gap-3">
                <VerdictTag verdict={claim.verdict} />
                <EvidenceRule rating={claim.rating} />
                <RatingLabel rating={claim.rating} className="text-[0.68rem]" />
              </div>
              <p className="mt-3 text-[0.97rem] leading-relaxed">{claim.bottom_line}</p>
              <a href={href.claim(claim.id)} className="link mt-3 inline-block text-sm text-forest-deep">What the research found →</a>
            </motion.div>
          ) : (
            <motion.button key="btn" type="button" onClick={() => setOpen(true)} className="btn" exit={{ opacity: 0, scale: 0.97, transition: t.exit }}>
              Reveal the verdict
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
