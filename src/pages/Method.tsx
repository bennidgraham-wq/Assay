import { useState } from 'react';
import { joinNames, reviewSummary, type Index } from '../lib/data';
import type { Rating } from '../lib/types';
import { FACTOR_LABELS, VERDICTS, scaleFor } from '../lib/evidence';
import { href } from '../lib/router';
import { EvidenceRule, VerdictTag, formatDate } from '../components/Evidence';
import { Page } from '../components/Layout';
import { PageTitle, SectionHead } from './shared';

/** Interactive evidence spectrum: pick a level, see what it means and which claims sit there. */
export function EvidenceScaleExplorer({ index, compact = false }: { index: Index; compact?: boolean }) {
  const [level, setLevel] = useState<Rating>(4);
  const s = scaleFor(level);
  const examples = index.claims.filter((c) => c.claim.rating === level).slice(0, compact ? 3 : 8);
  return (
    <div className="min-w-0">
      <EvidenceRule rating={level} size="lg" onPick={setLevel} active={level} />
      <div className="mt-6 min-h-[11rem]" aria-live="polite">
        <div className="display text-2xl">{s.name}</div>
        <p className="mt-1">{s.meaning}</p>
        <p className="mt-2 text-sm text-muted">{s.pattern}</p>
        {examples.length ? (
          <div className="mt-4">
            <div className="eyebrow mb-1">Claims at this level</div>
            <ul>
              {examples.map(({ claim, profile }) => (
                <li key={claim.id}>
                  <a href={href.claim(claim.id)} className="link text-sm">
                    {profile.name}: {claim.claim}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">No reviewed claims sit at this level yet.</p>
        )}
      </div>
    </div>
  );
}

export function MethodPage({ index }: { index: Index }) {
  const review = reviewSummary(index);
  return (
    <Page>
      <PageTitle kicker="About · Methodology" title="How we read the evidence.">
        Assay is independent. We don't sell supplements, take advertising or use affiliate links. Every rating is traceable to the research behind it.
      </PageTitle>

      <section className="mt-14 grid gap-12 md:grid-cols-[1fr_1.1fr]">
        <div className="max-w-prose space-y-4 text-[1.02rem]">
          <h2 className="display text-3xl">The evidence scale</h2>
          <p>
            Each claim, not each supplement, gets one of six ratings. A supplement can be well established for one outcome and contradicted for another.
            Choose a level on the scale to see what it means and which claims sit there.
          </p>
          <p>
            The most important line on the scale is between <strong>Levels 1–2</strong> (we don't know yet) and <strong>Evidence against</strong> (good
            studies have looked and found no meaningful benefit). We only use Evidence against when the research was large and careful enough that a real
            benefit would probably have shown up.
          </p>
        </div>
        <EvidenceScaleExplorer index={index} />
      </section>

      <section className="mt-20">
        <SectionHead kicker="In plain words" title="Verdicts" note="Each claim's rating also maps to a short verdict, used in Myth vs. Science." />
        <dl className="grid gap-x-10 border-t hair md:grid-cols-2">
          {Object.entries(VERDICTS).map(([k, v]) => (
            <div key={k} className="flex items-start gap-4 border-b hair py-4">
              <dt className="w-36 shrink-0"><VerdictTag verdict={k as keyof typeof VERDICTS} /></dt>
              <dd className="text-[0.97rem]">{v.blurb}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-20">
        <SectionHead kicker="Weighing studies" title="Nine things we check before rating a claim" />
        <ol className="grid gap-x-10 border-t hair md:grid-cols-3">
          {FACTOR_LABELS.map(([k, label], i) => (
            <li key={k} className="border-b hair py-5">
              <span className="data text-muted">{String(i + 1).padStart(2, '0')}</span>
              <div className="display mt-1 text-xl">{label}</div>
              <p className="mt-1 text-sm text-muted">{FACTOR_HELP[k]}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-20 grid gap-12 md:grid-cols-2">
        <div>
          <h2 className="display text-3xl">Which research counts most</h2>
          <ol className="mt-5 space-y-3">
            {[
              'Systematic reviews and meta-analyses of randomised human trials, including Cochrane reviews.',
              'Individual randomised controlled trials in people.',
              'Authoritative summaries such as NIH Office of Dietary Supplements fact sheets.',
              'Other human studies, such as cohort studies. Context only.',
              'Animal and lab studies. These can explain why something might work, but never establish a human benefit on their own.',
            ].map((t, i) => (
              <li key={i} className="grid grid-cols-[2rem_1fr]">
                <span className="data text-muted">{i + 1}</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-muted">Quality matters more than type. A careless meta-analysis doesn't outrank a large, well-run trial.</p>
        </div>
        <div>
          <h2 className="display text-3xl">How we keep citations honest</h2>
          <ul className="mt-5 space-y-3">
            {[
              'Every study is opened and read before it is cited. At minimum, its full abstract.',
              'Titles, authors, years and journals are copied from the record, never remembered.',
              'Findings and numbers are only stated if they appear in what we read.',
              'Each source notes exactly which claim it supports.',
              'A second, independent pass re-opens every reference before publication. Anything that fails is fixed or removed.',
            ].map((t) => (
              <li key={t} className="border-l-2 pl-4" style={{ borderColor: 'var(--forest)' }}>{t}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-20 rounded-[28px] border px-5 py-8 sm:px-10" style={{ borderColor: review.pending ? 'var(--clay)' : 'var(--forest)' }}>
        <div className="kicker">Review status</div>
        <p className="display mt-2 max-w-3xl text-2xl leading-snug">
          The research on this site was prepared with AI assistance, following the rules above.
          {review.reviewers.length ? (
            <>
              {' '}Each claim was then checked against its sources and signed off by {joinNames(review.reviewers)}
              {review.latest ? <> on {formatDate(review.latest)}</> : null}.
            </>
          ) : null}
        </p>
        <p className="mt-3 max-w-prose text-muted">
          {review.pending ? `${review.pending} ${review.pending === 1 ? 'review is' : 'reviews are'} still drafts and are labelled “Draft, pending review” until signed off. ` : ''}
          Corrections are logged with the date, what changed and why. Doses are always described as doses used in research, never as recommendations.
        </p>
      </section>

    </Page>
  );
}

const FACTOR_HELP: Record<string, string> = {
  study_quality: 'Randomised, blinded, placebo-controlled, with few dropouts?',
  consistency: 'Do the studies point the same way?',
  effect_size: 'How big is the difference, and how certain?',
  clinical_significance: "Would a person actually notice it in daily life?",
  sample_size: 'How many people were studied in total?',
  population: 'Were the people studied like the people the claim is aimed at?',
  conflicts_of_interest: 'Who funded and ran the research?',
  reproducibility: 'Have independent groups found the same thing?',
  formulation_dose: 'Was the form and dose studied the same as what is sold?',
};
