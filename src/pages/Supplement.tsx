import { useEffect, useMemo, useRef, useState } from 'react';
import type { Index } from '../lib/data';
import { ratingValue } from '../lib/evidence';
import { href } from '../lib/router';
import { pushRecent } from '../lib/store';
import { ReviewNote, EvidenceRule, formatDate } from '../components/Evidence';
import { ClaimRow, openClaim } from '../components/ClaimBlock';
import { CompareToggle } from '../components/Compare';
import { Expand } from '../components/Expand';
import { FoodCompare } from '../components/FoodCompare';
import { Page } from '../components/Layout';
import { SectionNav, type NavSection } from '../components/SectionNav';
import { SourceList } from '../components/Sources';
import { ResearchTimeline } from '../components/Timeline';
import { NotFound, SectionHead } from './shared';

export function SupplementPage({ index, id }: { index: Index; id: string }) {
  const p = index.byId.get(id);
  const body = useRef<HTMLDivElement>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  useEffect(() => {
    if (p) pushRecent({ kind: 'supplement', id: p.id, title: p.name, sub: p.category });
  }, [p]);
  useEffect(() => {
    const on = (e: Event) => {
      if ((e as CustomEvent<string>).detail === id) setSourcesOpen(true);
    };
    window.addEventListener('assay:open-sources', on);
    return () => window.removeEventListener('assay:open-sources', on);
  }, [id]);

  const claims = useMemo(() => (p ? [...p.claims].sort((a, b) => ratingValue(b.rating) - ratingValue(a.rating)) : []), [p]);

  if (!p) {
    const c = index.catalogById.get(id);
    return <NotFound title={c ? `${c.name} hasn't been reviewed yet` : 'Supplement not found'} body={c ? 'It is in our catalogue and queued for research. Reviews are only published once every claim is traced to sources.' : undefined} />;
  }
  const related = (p.related ?? []).map((r) => index.byId.get(r)).filter(Boolean);
  const safetyItems: [string, string | undefined][] = [
    ['Side effects', p.side_effects],
    ['Interactions', p.interactions],
    ['Be cautious if', p.cautions],
    ['Upper limit', p.upper_limit],
    ['Doses used in research', p.research_doses_summary],
  ];
  const hasFood = !!p.food_vs_supplement?.foods?.length;
  const hasAbout = !!(p.description || p.biological_function || p.formulations?.length || p.absorption);
  const dated = p.sources.filter((s) => s.year).length;
  const sections: NavSection[] = [
    { id: 'evidence', label: 'The evidence' },
    ...(hasAbout ? [{ id: 'about', label: 'What it is' }] : []),
    ...(hasFood ? [{ id: 'food', label: 'Food or supplement' }] : []),
    { id: 'safety', label: 'Safety' },
    ...(dated >= 3 ? [{ id: 'timeline', label: 'Research over time' }] : []),
    { id: 'sources', label: 'Sources' },
  ];
  const reviews = p.sources.filter((s) => ['meta-analysis', 'systematic-review'].includes(s.type)).length;
  const trials = p.sources.filter((s) => s.type === 'rct').length;
  const agency = p.sources.filter((s) => ['fact-sheet', 'guideline'].includes(s.type)).length;

  return (
    <Page>
      <article>
        {/* Masthead */}
        <header className="grid gap-10 border-b hair pb-12 pt-10 md:grid-cols-[minmax(0,1fr)_19rem] md:pt-16">
          <div className="min-w-0">
            <div className="eyebrow flex flex-wrap items-center gap-x-2.5">
              <a href={href.explore} className="no-underline hover:text-ink">Explore</a>
              <span aria-hidden>/</span>
              <span>{p.category}</span>
            </div>
            <h1 className="t-title mt-4" style={{ viewTransitionName: `sup-${p.id}` } as React.CSSProperties}>
              {p.name}
            </h1>
            {p.aliases?.length ? <p className="mt-3 text-sm text-muted">Also called {p.aliases.join(', ')}</p> : null}
            <p className="t-lede mt-8 max-w-[34ch]">{p.summary}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <CompareToggle id={p.id} name={p.name} />
              <ReviewNote profile={p} />
              {p.last_updated && p.review_status !== 'reviewed' ? <span className="eyebrow">Updated <span className="num">{formatDate(p.last_updated)}</span></span> : null}
            </div>
          </div>
          <aside className="self-end md:border-l hair md:pl-7">
            <div className="kicker mb-3">Evidence at a glance</div>
            <ul className="divide-y" style={{ borderColor: 'var(--rule)' }}>
              {claims.map((c) => (
                <li key={c.id} style={{ borderColor: 'var(--rule)' }}>
                  <a
                    href={`#claim-${c.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      openClaim(c.id);
                    }}
                    className="group flex min-h-[2.75rem] items-center justify-between gap-3 py-1.5 text-sm no-underline"
                  >
                    <span className="min-w-0 truncate transition-colors group-hover:text-forest-deep">{c.outcome || c.claim}</span>
                    <EvidenceRule rating={c.rating} />
                  </a>
                </li>
              ))}
            </ul>
          </aside>
        </header>

        {/* Safety strip: always visible near the top */}
        {p.cautions || p.interactions || p.upper_limit ? (
          <div className="mt-6 flex flex-col gap-1 rounded-xl border-l-[3px] px-5 py-4 text-[0.95rem] sm:flex-row sm:items-baseline sm:gap-5" style={{ borderColor: 'var(--clay)', background: 'color-mix(in srgb, var(--clay) 7%, var(--paper))' }}>
            <span className="shrink-0 text-[0.8125rem] font-medium text-clay-deep">Safety first</span>
            <span className="min-w-0">
              {[p.upper_limit && `Upper limit: ${p.upper_limit}`, p.cautions].filter(Boolean).join(' ')}{' '}
              <a
                href="#safety"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('safety')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="link whitespace-nowrap text-clay-deep"
              >
                Full safety notes
              </a>
            </span>
          </div>
        ) : null}

        <div ref={body} className="mt-6 grid gap-x-14 lg:mt-14 lg:grid-cols-[11.5rem_minmax(0,1fr)]">
          <SectionNav sections={sections} target={body} />

          <div className="min-w-0">
            {/* Evidence ledger */}
            <section id="evidence" className="scroll-mt-28 pt-8 lg:pt-0">
              <SectionHead kicker="The evidence" title="Claim by claim" note="Each claim is rated on its own. Open one to see what the research found, what it didn't, and why it earned its rating." />
              <div className="border-b hair">
                {claims.map((c) => (
                  <ClaimRow key={c.id} claim={c} profile={p} />
                ))}
              </div>
            </section>

            {hasAbout ? (
              <section id="about" className="mt-20 scroll-mt-28">
                <SectionHead kicker="Background" title="What it is, and the forms it comes in" />
                {p.description || p.biological_function ? (
                  <div className="grid gap-10 md:grid-cols-2">
                    {p.description ? (
                      <div>
                        <h3 className="eyebrow mb-2">What it is</h3>
                        <p className="text-[1.05rem] leading-relaxed">{p.description}</p>
                      </div>
                    ) : null}
                    {p.biological_function ? (
                      <div>
                        <h3 className="eyebrow mb-2">What it does in the body</h3>
                        <p className="text-[1.05rem] leading-relaxed">{p.biological_function}</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {p.formulations?.length ? (
                  <div className="mt-12">
                    <h3 className="t-h3 mb-4">Not all forms are interchangeable</h3>
                    <dl className="grid gap-x-10 border-t hair md:grid-cols-2">
                      {p.formulations.map((f) => (
                        <div key={f.name} className="border-b hair py-4">
                          <dt className="font-medium">{f.name}</dt>
                          {f.notes ? <dd className="mt-1 text-[0.95rem] leading-relaxed text-muted">{f.notes}</dd> : null}
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : null}
                {p.absorption ? (
                  <p className="mt-6 max-w-prose text-[0.97rem] leading-relaxed">
                    <span className="mr-2 font-medium">Absorption.</span>
                    {p.absorption}
                  </p>
                ) : null}
              </section>
            ) : null}

            {hasFood ? (
              <section id="food" className="mt-20 scroll-mt-28">
                <SectionHead kicker="The source" title="Food or supplement?" note="What typical servings of food provide, in the same units as the doses used in research." />
                <FoodCompare profile={p} />
              </section>
            ) : null}

            <section id="safety" className="mt-20 scroll-mt-28">
              <SectionHead kicker="Safety" title="Risks, interactions and limits" />
              <dl className="grid border-t hair md:grid-cols-[13rem_minmax(0,1fr)]">
                {safetyItems
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="eyebrow border-b-0 pb-1 pt-4 md:border-b hair md:py-4">{k}</dt>
                      <dd className="border-b hair pb-4 text-[0.97rem] leading-relaxed md:py-4">{v}</dd>
                    </div>
                  ))}
              </dl>
            </section>

            {dated >= 3 ? (
              <section id="timeline" className="mt-20 scroll-mt-28">
                <SectionHead kicker="Research over time" title="How the evidence built up" note="Every source cited in this review, by year of publication. Choose a mark to see what it studied and its limitations." />
                <ResearchTimeline profile={p} />
              </section>
            ) : null}

            <section id="sources" className="mt-20 scroll-mt-28">
              <SectionHead kicker="References" title="Sources" note="Every source was opened and read before it was cited." />
              <Expand
                open={sourcesOpen}
                onOpenChange={setSourcesOpen}
                className="border-y hair"
                buttonClassName="flex min-h-[4rem] items-center justify-between gap-4 py-4"
                summary={
                  <span className="min-w-0">
                    <span className="t-h3 block">
                      <span className="num">{p.sources.length}</span> sources
                    </span>
                    <span className="data mt-1 block text-muted">
                      {reviews} reviews · {trials} trials · {agency} agency sources
                    </span>
                  </span>
                }
              >
                <SourceList profile={p} />
              </Expand>
            </section>

            {related.length ? (
              <section className="mt-16">
                <div className="kicker mb-3">Related reviews</div>
                <div className="flex flex-wrap gap-2">
                  {related.map((r) => (
                    <a key={r!.id} href={href.supplement(r!.id)} className="chip no-underline">
                      {r!.name}
                    </a>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </article>
    </Page>
  );
}

