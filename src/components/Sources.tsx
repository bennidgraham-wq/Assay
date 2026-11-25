import type { Profile, Source } from '../lib/types';
import { SOURCE_TYPE_LABELS } from '../lib/evidence';
import { sourceLink } from '../lib/data';
import { Expand } from './Expand';

export const sourceNumber = (p: Profile, id: string) => p.sources.findIndex((s) => s.id === id) + 1;

/** Ask the page's reference list to open (it may be collapsed), then bring a reference into view. */
export function revealRef(profileId: string, n: number) {
  const id = `ref-${profileId}-${n}`;
  const go = () => {
    const el = document.getElementById(id);
    if (!el) return false;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.animate?.([{ backgroundColor: 'color-mix(in srgb, var(--forest) 16%, transparent)' }, { backgroundColor: 'transparent' }], { duration: 1600, easing: 'ease-out' });
    return true;
  };
  if (go()) return;
  window.dispatchEvent(new CustomEvent('assay:open-sources', { detail: profileId }));
  // Give the list a frame to mount; if it still isn't on this page, go to the profile.
  setTimeout(() => {
    if (!go()) location.hash = `s-${profileId}`;
  }, 60);
}

/** Superscript reference markers, journal style: [2, 5] */
export function Refs({ profile, ids }: { profile: Profile; ids?: string[] }) {
  const nums = (ids ?? []).map((id) => sourceNumber(profile, id)).filter((n) => n > 0);
  if (!nums.length) return null;
  return (
    <sup className="data ml-0.5 text-[0.68rem] text-forest-deep">
      [
      {nums.map((n, i) => (
        <span key={n}>
          {i ? ', ' : ''}
          <a
            href={`#s-${profile.id}`}
            aria-label={`Reference ${n}`}
            onClick={(e) => {
              e.preventDefault();
              revealRef(profile.id, n);
            }}
            className="no-underline hover:underline"
          >
            {n}
          </a>
        </span>
      ))}
      ]
    </sup>
  );
}

export function SourceCitation({ s }: { s: Source }) {
  const link = sourceLink(s);
  const title = s.title.replace(/\.\s*$/, '');
  return (
    <span>
      {s.authors ? <span>{s.authors} </span> : null}
      {s.year ? <span className="num">({s.year}). </span> : null}
      {link ? (
        <a href={link} target="_blank" rel="noreferrer" className="link text-ink">
          {title}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : (
        <span className="text-ink">{title}</span>
      )}
      {s.journal ? <em>. {s.journal}</em> : null}
      {s.pmid ? <span className="data whitespace-nowrap text-[0.72rem]"> · PMID {s.pmid}</span> : null}
      {s.doi ? <span className="data break-all text-[0.72rem]"> · doi:{s.doi}</span> : null}
    </span>
  );
}

const DETAIL_ROWS: [keyof Source, string][] = [
  ['cited_for', 'Cited for'],
  ['sample_size', 'Participants'],
  ['population', 'Population'],
  ['intervention', 'Intervention'],
  ['findings', 'Findings'],
  ['limitations', 'Limitations'],
  ['funding', 'Funding'],
];

export function SourceItem({ s, n, anchor }: { s: Source; n?: number; anchor?: string }) {
  const rows = DETAIL_ROWS.filter(([k]) => s[k]);
  const type = SOURCE_TYPE_LABELS[s.type] ?? s.type;
  return (
    <li id={anchor} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-2 border-t hair py-5 first:border-t-0" style={{ scrollMarginTop: '6rem' }}>
      <span className="data pt-0.5 text-muted">{n ?? ''}</span>
      <div className="min-w-0 text-[0.95rem] leading-relaxed text-muted">
        <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[0.8125rem] font-medium text-forest-deep">{type}</span>
          {s.verification?.read && s.verification.read !== s.type ? (
            <span className="eyebrow">We read the {s.verification.read}{s.verification.rechecked_on ? ', re-checked' : ''}</span>
          ) : s.verification?.rechecked_on ? (
            <span className="eyebrow">Re-checked against PubMed</span>
          ) : null}
        </div>
        <SourceCitation s={s} />
        {rows.length ? (
          <Expand
            className="mt-2"
            icon="none"
            buttonClassName="inline-flex w-auto min-h-[2.25rem] items-center gap-1.5 text-sm text-forest-deep"
            summary={<StudySummary />}
          >
            <dl className="mt-2 grid gap-x-6 gap-y-2.5 border-l-2 pl-4 text-sm sm:grid-cols-[8.5rem_minmax(0,1fr)]" style={{ borderColor: 'var(--rule)' }}>
              {rows.map(([k, label]) => (
                <div key={k} className="contents">
                  <dt className="eyebrow pt-0.5">{label}</dt>
                  <dd className="leading-relaxed text-ink">{String(s[k])}</dd>
                </div>
              ))}
            </dl>
          </Expand>
        ) : null}
      </div>
    </li>
  );
}

function StudySummary() {
  return (
    <>
      <span className="group-aria-expanded:hidden">Study details</span>
      <span className="hidden group-aria-expanded:inline">Hide details</span>
      <svg width="10" height="10" viewBox="0 0 12 12" className="transition-transform duration-300 group-aria-expanded:rotate-180" aria-hidden>
        <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </svg>
    </>
  );
}

export function SourceList({ profile, ids, anchors = true }: { profile: Profile; ids?: string[]; anchors?: boolean }) {
  const list = ids ? profile.sources.filter((s) => ids.includes(s.id)) : profile.sources;
  return (
    <ol>
      {list.map((s) => {
        const n = sourceNumber(profile, s.id);
        return <SourceItem key={s.id} s={s} n={n} anchor={anchors ? `ref-${profile.id}-${n}` : undefined} />;
      })}
    </ol>
  );
}
