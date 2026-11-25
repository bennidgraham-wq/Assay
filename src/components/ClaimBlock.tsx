import { useEffect, useState } from 'react';
import type { Claim, Profile } from '../lib/types';
import { FACTOR_LABELS, VERDICTS } from '../lib/evidence';
import { href } from '../lib/router';
import { EvidenceRule, RatingLabel, UncertaintyNote, VerdictTag } from './Evidence';
import { Expand } from './Expand';
import { Refs, SourceList } from './Sources';

/**
 * A claim, explained in layers. The consumer explanation always comes first ("In plain words");
 * the scientific reasoning and the studies sit underneath, one tap away.
 */
export function ClaimDetail({ claim, profile, showSources = false }: { claim: Claim; profile: Profile; showSources?: boolean }) {
  const factors = FACTOR_LABELS.filter(([k]) => claim.factors?.[k]);
  const who = [claim.population, claim.formulation_and_dose].filter(Boolean).join(' ');
  return (
    <div className="space-y-8">
      <section aria-label="In plain words">
        <div className="kicker mb-4">In plain words</div>
        <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
          {claim.what_research_found ? (
            <Block title="What research found" tone="found">
              {claim.what_research_found}
              <Refs profile={profile} ids={claim.source_ids} />
            </Block>
          ) : null}
          {claim.what_research_did_not_establish ? (
            <Block title="What it did not show" tone="gap">
              {claim.what_research_did_not_establish}
            </Block>
          ) : null}
          {who ? <Block title="Who and what was studied">{who}</Block> : null}
          {claim.limitations ? <Block title="Limitations">{claim.limitations}</Block> : null}
        </div>
      </section>

      <UncertaintyNote rating={claim.rating} />

      <section aria-label="The science" className="border-t hair">
        {factors.length ? (
          <Expand
            className="border-b hair"
            buttonClassName="flex min-h-[3.5rem] items-center justify-between gap-4 py-3"
            summary={
              <span>
                <span className="block text-[0.95rem] font-medium">How we reached this rating</span>
                <span className="t-small text-muted">Study quality, consistency, effect size and {factors.length - 3} more factors</span>
              </span>
            }
          >
            <dl className="grid gap-x-8 gap-y-4 pb-6 pt-1 text-[0.95rem] sm:grid-cols-[12rem_1fr]">
              {factors.map(([k, label]) => (
                <div key={k} className="contents">
                  <dt className="eyebrow pt-0.5">{label}</dt>
                  <dd className="leading-relaxed">{claim.factors![k]}</dd>
                </div>
              ))}
            </dl>
          </Expand>
        ) : null}
        {claim.source_ids.length ? (
          showSources ? (
            <div className="pt-6">
              <div className="eyebrow mb-1">Studies behind this rating</div>
              <SourceList profile={profile} ids={claim.source_ids} />
            </div>
          ) : (
            <Expand
              className="border-b hair"
              buttonClassName="flex min-h-[3.5rem] items-center justify-between gap-4 py-3"
              summary={
                <span>
                  <span className="block text-[0.95rem] font-medium">Studies behind this rating</span>
                  <span className="t-small text-muted">
                    <span className="num">{claim.source_ids.length}</span> verified {claim.source_ids.length === 1 ? 'source' : 'sources'}
                  </span>
                </span>
              }
            >
              <div className="pb-4">
                <SourceList profile={profile} ids={claim.source_ids} anchors={false} />
              </div>
            </Expand>
          )
        ) : null}
      </section>
    </div>
  );
}

function Block({ title, children, tone }: { title: string; children: React.ReactNode; tone?: 'found' | 'gap' }) {
  return (
    <div className="min-w-0">
      <div className="eyebrow mb-1.5 flex items-center gap-2">
        {tone ? (
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={tone === 'found' ? { background: 'var(--forest)' } : { boxShadow: 'inset 0 0 0 1.5px var(--rule-strong)' }}
            aria-hidden
          />
        ) : null}
        {title}
      </div>
      <p className="text-[0.98rem] leading-relaxed">{children}</p>
    </div>
  );
}

/**
 * A claim card in a supplement's evidence ledger. Collapsed: the claim, its verdict and the
 * evidence rule. Expanded (animated): the layered explanation. Opens itself when the page
 * is reached through a link to this claim.
 */
export function ClaimRow({ claim, profile, open: initial = false }: { claim: Claim; profile: Profile; open?: boolean }) {
  const [open, setOpen] = useState(initial);
  const anchor = `claim-${claim.id}`;
  useEffect(() => {
    const on = (e: Event) => {
      if ((e as CustomEvent<string>).detail === anchor) setOpen(true);
    };
    window.addEventListener('assay:open-claim', on);
    return () => window.removeEventListener('assay:open-claim', on);
  }, [anchor]);
  const v = VERDICTS[claim.verdict];
  return (
    <article id={anchor} className="border-t hair" style={{ scrollMarginTop: '6rem' }}>
      <Expand
        open={open}
        onOpenChange={setOpen}
        icon="none"
        buttonClassName="relative grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 py-6 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-center sm:gap-x-8"
        summary={
          <>
            <span className="min-w-0">
              <span className="display block text-[1.3rem] leading-snug transition-colors duration-200 group-hover:text-forest-deep sm:text-[1.45rem]">{claim.claim}</span>
              <span className="mt-1.5 block text-[0.95rem] leading-relaxed text-muted">{claim.bottom_line}</span>
            </span>
            <span className="col-start-1 row-start-2 flex flex-wrap items-center gap-x-4 gap-y-2 sm:col-start-2 sm:row-start-1 sm:flex-col sm:items-start sm:gap-2">
              <VerdictTag verdict={claim.verdict} />
              <EvidenceRule rating={claim.rating} />
              <RatingLabel rating={claim.rating} className="text-[0.68rem]" />
            </span>
            <span className="col-start-2 row-span-2 row-start-1 self-start pt-1 sm:col-start-3 sm:row-span-1 sm:self-center sm:pt-0">
              <PlusIcon open={open} />
            </span>
            <span className="sr-only">{open ? 'Hide' : 'Show'} the evidence. Verdict: {v.label}.</span>
          </>
        }
      >
        <div className="pb-10 pt-1 sm:pr-14">
          <ClaimDetail claim={claim} profile={profile} />
          <a href={href.claim(claim.id)} className="btn mt-8">
            Open the full assessment
            <span aria-hidden>→</span>
          </a>
        </div>
      </Expand>
    </article>
  );
}

function PlusIcon({ open }: { open: boolean }) {
  return (
    <span
      className="grid h-9 w-9 place-items-center rounded-full border transition-[transform,border-color,background-color] duration-300 group-hover:border-ink"
      style={{ borderColor: 'var(--rule-strong)', transform: open ? 'rotate(45deg)' : undefined, transitionTimingFunction: 'var(--ease-out)', background: open ? 'var(--stone)' : undefined }}
      aria-hidden
    >
      <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.4" /></svg>
    </span>
  );
}

/** Ask a ClaimRow on this page to open itself (used by in-page links). */
export function openClaim(id: string) {
  window.dispatchEvent(new CustomEvent('assay:open-claim', { detail: `claim-${id}` }));
  requestAnimationFrame(() => document.getElementById(`claim-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}
