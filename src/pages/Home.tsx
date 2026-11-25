import { useMemo } from 'react';
import { sourceLink, type Index } from '../lib/data';
import { ratingValue } from '../lib/evidence';
import { href } from '../lib/router';
import { SearchField } from '../components/Search';
import { openSearch } from '../lib/store';
import { EvidenceRule, RatingLabel, VerdictTag } from '../components/Evidence';
import { MythCard } from './Claims';
import { SectionHead } from './shared';
import { EvidenceScaleExplorer } from './Method';

// Consumer questions, phrased the way people ask them. Each maps to a search.
const QUESTIONS = ['sleep', 'stress', 'muscle strength', 'energy', 'hair', 'immunity', 'heart health', 'focus'];

export function HomePage({ index }: { index: Index }) {
  // "Most misunderstood": featured claims where the popular framing outruns the evidence.
  const misunderstood = useMemo(
    () =>
      index.claims
        .filter((c) => c.claim.myth_feature && (c.claim.verdict === 'contradicted' || c.claim.verdict === 'not_established' || c.claim.verdict === 'partly_true'))
        .sort((a, b) => ratingValue(a.claim.rating) - ratingValue(b.claim.rating))
        .slice(0, 4),
    [index],
  );
  // "Is it worth taking?": each reviewed supplement, with its strongest and weakest claim.
  const worth = useMemo(
    () =>
      index.profiles.slice(0, 12).map((p) => {
        const sorted = [...p.claims].sort((a, b) => ratingValue(b.rating) - ratingValue(a.rating));
        return { p, best: sorted[0], worst: sorted[sorted.length - 1] };
      }),
    [index],
  );
  // Hero specimen: the best-documented popular claim that research contradicts.
  const specimen = useMemo(
    () =>
      [...index.claims]
        .filter((c) => c.claim.myth_feature)
        .sort((a, b) => Number(b.claim.verdict === 'contradicted') - Number(a.claim.verdict === 'contradicted') || b.claim.source_ids.length - a.claim.source_ids.length)[0],
    [index],
  );
  const recent = index.sources.filter((s) => s.source.type !== 'fact-sheet').slice(0, 5);
  const catCounts = useMemo(() => {
    const m = new Map<string, { reviewed: number; total: number }>();
    for (const c of index.catalog) {
      const e = m.get(c.category) ?? { reviewed: 0, total: 0 };
      e.total++;
      if (index.byId.has(c.id)) e.reviewed++;
      m.set(c.category, e);
    }
    return [...m.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [index]);

  return (
    <main>
      {/* Hero: the question, and the search that answers it */}
      <section className="gutter border-b hair">
        <div className="wrap grid gap-12 pb-14 pt-14 sm:pt-20 md:pb-20 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
          <div className="min-w-0">
          <div className="kicker">Independent. No ads. No affiliate links.</div>
          <h1 className="t-hero mt-5 max-w-[14ch]">
            Before you take it, <em className="font-normal text-forest-deep">know what it does.</em>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted sm:text-xl">
            An independent guide to supplements, scientific evidence, and what your body actually needs.
          </p>
          <div className="mt-9 max-w-2xl">
            <SearchField large />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm text-muted">People ask about</span>
            {QUESTIONS.map((q) => (
              <button key={q} type="button" onClick={() => openSearch(q)} className="chip">
                {q}
              </button>
            ))}
          </div>
          <div className="mt-10 grid max-w-3xl gap-px overflow-hidden border-y hair sm:grid-cols-3">
            {[
              ['Explore supplements', href.explore, `${index.profiles.length} reviewed, claim by claim`],
              ['Investigate a claim', href.claims, `${index.claims.length} popular claims checked`],
              ['Compare food vs. supplements', href.food(), 'Same units, honest comparisons'],
            ].map(([label, to, note]) => (
              <a key={label} href={to} className="group py-4 no-underline sm:pr-6">
                <div className="display text-xl transition-colors group-hover:text-forest-deep">{label} <span className="inline-block transition-transform duration-200 group-hover:translate-x-1" aria-hidden>→</span></div>
                <div className="text-sm text-muted">{note}</div>
              </a>
            ))}
          </div>
          </div>
          {specimen ? (
            <aside className="border-t hair pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <div className="kicker">One claim, examined</div>
              <a href={href.claim(specimen.claim.id)} className="group mt-3 block no-underline">
                <p className="display text-[1.65rem] leading-tight group-hover:text-forest-deep">{specimen.claim.question || specimen.claim.claim}</p>
                {specimen.claim.popular_framing ? <p className="display mt-2 italic text-muted">“{specimen.claim.popular_framing}”</p> : null}
              </a>
              <div className="mt-6">
                <EvidenceRule rating={specimen.claim.rating} size="lg" />
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <VerdictTag verdict={specimen.claim.verdict} />
                <RatingLabel rating={specimen.claim.rating} className="text-[0.65rem]" />
              </div>
              <p className="mt-3 text-[0.95rem]">{specimen.claim.bottom_line}</p>
              <a href={href.claim(specimen.claim.id)} className="link mt-3 inline-block text-sm text-forest-deep">
                {specimen.claim.source_ids.length} sources, read and checked →
              </a>
            </aside>
          ) : null}
        </div>
      </section>

      <div className="gutter">
        <div className="wrap">
          {/* A. The most misunderstood */}
          {misunderstood.length ? (
            <section className="mt-20">
              <SectionHead kicker="The reality" title="The most misunderstood" note="Popular claims where the marketing runs ahead of the research. Guess first, then reveal." action={<a href={href.claims} className="link text-sm">All claims →</a>} />
              <ul className="grid gap-x-12 border-t hair md:grid-cols-2">
                {misunderstood.map((c) => (
                  <li key={c.claim.id} className="border-b hair">
                    <MythCard refd={c} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* C. Is it worth taking? */}
          <section className="mt-24">
            <SectionHead kicker="The evidence" title="Is it worth taking?" note="The strongest and weakest claim for each supplement we've reviewed. Ratings belong to claims, never to a whole supplement." />
            <ul className="border-t hair">
              {worth.map(({ p, best, worst }) => (
                <li key={p.id} className="border-b hair">
                  <a href={href.supplement(p.id)} className="group grid gap-3 py-5 no-underline md:grid-cols-[13rem_1fr_1fr] md:gap-8">
                    <div className="display text-2xl leading-tight group-hover:text-forest-deep">{p.name}</div>
                    {best ? <ClaimMini label="Best supported" claim={best} /> : null}
                    {worst && worst !== best ? <ClaimMini label="Least supported" claim={worst} /> : <span />}
                  </a>
                </li>
              ))}
            </ul>
            {index.profiles.length > 12 ? (
              <a href={href.explore} className="link mt-5 inline-block text-sm">See all {index.profiles.length} reviewed supplements →</a>
            ) : null}
          </section>

          {/* E. Methodology: the evidence scale, interactive */}
          <section className="mt-24 grid gap-10 rounded-[28px] bg-stone px-5 py-10 sm:px-10 md:grid-cols-[1fr_1.2fr] md:py-14">
            <div>
              <div className="kicker">Our method</div>
              <h2 className="t-h2 mt-2">Six grades of evidence. One claim at a time.</h2>
              <p className="mt-4 text-muted">
                We rate each claim against human research: systematic reviews and randomised trials first, with study quality, consistency, effect size,
                population and funding all weighed. “Not enough research” and “research says no” are different answers, and we keep them apart.
              </p>
              <a href={href.method} className="link mt-5 inline-block">Read the full methodology →</a>
            </div>
            <EvidenceScaleExplorer index={index} compact />
          </section>

          {/* B. Under the microscope */}
          {recent.length ? (
            <section className="mt-24">
              <SectionHead kicker="Under the microscope" title="Recent research we've read" action={<a href={href.research} className="link text-sm">Research library →</a>} />
              <ul className="border-t hair">
                {recent.map(({ source, profiles }) => (
                  <li key={source.id} className="grid gap-1 border-b hair py-4 md:grid-cols-[6rem_1fr_12rem] md:gap-6">
                    <span className="data text-muted">{source.year}</span>
                    {sourceLink(source) ? (
                      <a href={sourceLink(source)} target="_blank" rel="noreferrer" className="min-w-0 no-underline"><span className="link">{source.title}</span><span className="sr-only"> (opens in a new tab)</span></a>
                    ) : (
                      <span className="min-w-0">{source.title}</span>
                    )}
                    <span className="text-sm text-muted md:text-right">{profiles.map((p) => p.name).join(', ')}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* D. Explore by category */}
          <section className="mt-24">
            <SectionHead kicker="Browse" title="Explore by category" />
            <ul className="grid grid-cols-2 gap-x-8 border-t hair md:grid-cols-4">
              {catCounts.map(([cat, n]) => (
                <li key={cat} className="border-b hair py-5">
                  <a href={href.explore} onClick={() => sessionStorageSet('assay-cat', cat)} className="group block no-underline">
                    <div className="display text-xl group-hover:text-forest-deep">{cat}</div>
                    <div className="data mt-1 text-muted">
                      {n.reviewed} reviewed · {n.total} catalogued
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}

function ClaimMini({ label, claim }: { label: string; claim: import('../lib/types').Claim }) {
  return (
    <div className="min-w-0">
      <div className="eyebrow mb-1">{label}</div>
      <div className="text-[0.95rem] leading-snug">{claim.claim}</div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <VerdictTag verdict={claim.verdict} />
        <EvidenceRule rating={claim.rating} />
        <RatingLabel rating={claim.rating} className="text-[0.62rem]" />
      </div>
    </div>
  );
}

export function sessionStorageSet(k: string, v: string) {
  try {
    sessionStorage.setItem(k, v);
  } catch {
    /* storage unavailable: search page simply opens empty */
  }
}
export function sessionStorageTake(k: string) {
  try {
    const v = sessionStorage.getItem(k);
    sessionStorage.removeItem(k);
    return v ?? '';
  } catch {
    return '';
  }
}
