import { useMemo, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Profile, Source } from '../lib/types';
import { SOURCE_TYPE_LABELS } from '../lib/evidence';
import { t } from '../lib/motion';
import { SourceCitation, sourceNumber } from './Sources';

type Kind = 'review' | 'trial' | 'observational' | 'agency' | 'lab';
const KIND_OF: Record<string, Kind> = {
  'meta-analysis': 'review',
  'systematic-review': 'review',
  rct: 'trial',
  cohort: 'observational',
  'other-human': 'observational',
  'fact-sheet': 'agency',
  guideline: 'agency',
  'animal-lab': 'lab',
};
const KINDS: { kind: Kind; label: string }[] = [
  { kind: 'review', label: 'Reviews and meta-analyses' },
  { kind: 'trial', label: 'Randomised trials' },
  { kind: 'observational', label: 'Other human studies' },
  { kind: 'agency', label: 'Agency guidance' },
  { kind: 'lab', label: 'Animal or lab' },
];

/** Marker shapes are distinct without colour, so the legend still works for colour-blind readers. */
function Marker({ kind, size = 11, active = false }: { kind: Kind; size?: number; active?: boolean }) {
  const s = size;
  const stroke = active ? 'var(--ink)' : 'var(--forest-deep)';
  const common = { stroke, strokeWidth: 1.4 } as const;
  return (
    <svg width={s} height={s} viewBox="0 0 12 12" aria-hidden className="block">
      {kind === 'review' ? <circle cx="6" cy="6" r="5" fill="var(--forest)" {...common} /> : null}
      {kind === 'trial' ? <circle cx="6" cy="6" r="4.6" fill="var(--paper)" {...common} /> : null}
      {kind === 'observational' ? <rect x="1.5" y="1.5" width="9" height="9" fill="var(--paper)" {...common} /> : null}
      {kind === 'agency' ? <path d="M6 0.8L11.2 6 6 11.2 0.8 6Z" fill="var(--stone)" {...common} /> : null}
      {kind === 'lab' ? <path d="M6 1.2L11 10.5H1Z" fill="var(--paper)" {...common} /> : null}
    </svg>
  );
}

const yearOf = (s: Source) => {
  const y = Number(String(s.year ?? '').slice(0, 4));
  return Number.isFinite(y) && y > 1900 ? y : null;
};

/**
 * The research behind a supplement, laid out in time. Each mark is one cited source, shaped by
 * study type and stacked by year. Choosing a mark opens what it studied and its limitations.
 * Arrow keys move between studies.
 */
export function ResearchTimeline({ profile }: { profile: Profile }) {
  const items = useMemo(
    () =>
      profile.sources
        .map((s) => ({ s, year: yearOf(s), kind: KIND_OF[s.type] ?? 'observational' }))
        .filter((x): x is { s: Source; year: number; kind: Kind } => x.year !== null)
        .sort((a, b) => a.year - b.year || a.s.title.localeCompare(b.s.title)),
    [profile],
  );
  const [sel, setSel] = useState(() => Math.max(0, items.length - 1));
  if (items.length < 3) return null;

  const min = Math.min(...items.map((i) => i.year));
  const max = Math.max(...items.map((i) => i.year));
  const span = Math.max(1, max - min);
  const stackIndex = new Map<number, number>();
  const placed = items.map((it) => {
    const k = stackIndex.get(it.year) ?? 0;
    stackIndex.set(it.year, k + 1);
    return { ...it, left: ((it.year - min) / span) * 100, stack: k };
  });
  const tallest = Math.max(...stackIndex.values());
  const ticks = decadeTicks(min, max);
  const current = placed[sel];
  const claimsCiting = profile.claims.filter((c) => c.source_ids.includes(current.s.id));
  const present = KINDS.filter((k) => items.some((i) => i.kind === k.kind));

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = Math.min(items.length - 1, Math.max(0, sel + (e.key === 'ArrowRight' ? 1 : -1)));
      setSel(next);
      requestAnimationFrame(() => document.getElementById(`tl-${profile.id}-${next}`)?.focus());
    }
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-x-5 gap-y-2" aria-label="Legend">
        {present.map((k) => (
          <span key={k.kind} className="inline-flex items-center gap-2 text-sm text-muted">
            <Marker kind={k.kind} /> {k.label}
          </span>
        ))}
      </div>

      <div className="relative mx-1.5" style={{ height: `${tallest * 15 + 34}px` }} role="listbox" aria-label={`${items.length} sources by year of publication`} onKeyDown={onKey}>
        <div className="absolute inset-x-0 bottom-6 h-px" style={{ background: 'var(--rule-strong)' }} aria-hidden />
        {ticks.map((y) => (
          <span key={y} className="data absolute bottom-0 text-muted" style={{ left: `${((y - min) / span) * 100}%`, transform: `translateX(${y === min ? '-0.4rem' : y === max ? 'calc(-100% + 0.4rem)' : '-50%'})` }} aria-hidden>
            {y}
          </span>
        ))}
        {placed.map((p, i) => (
          <button
            key={p.s.id}
            id={`tl-${profile.id}-${i}`}
            type="button"
            role="option"
            aria-selected={i === sel}
            tabIndex={i === sel ? 0 : -1}
            onClick={() => setSel(i)}
            aria-label={`${p.year}, ${SOURCE_TYPE_LABELS[p.s.type] ?? p.s.type}: ${p.s.title}`}
            className="group absolute grid h-[22px] w-[22px] -translate-x-1/2 place-items-center rounded-full"
            style={{ left: `${p.left}%`, bottom: `${30 + p.stack * 15 - 5}px` }}
          >
            <span className={`transition-transform duration-200 group-hover:scale-125 ${i === sel ? 'scale-[1.35]' : ''}`}>
              <Marker kind={p.kind} active={i === sel} />
            </span>
            {i === sel ? <motion.span layoutId={`tl-ring-${profile.id}`} className="absolute inset-0 rounded-full border border-ink" transition={t.spring} aria-hidden /> : null}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 border-t hair pt-6 md:grid-cols-[9rem_minmax(0,1fr)]">
        <div className="flex items-center gap-3 md:block">
          <div className="t-h2 num leading-none">{current.year}</div>
          <div className="text-sm text-muted md:mt-2">
            <span className="num">{sel + 1}</span> of <span className="num">{items.length}</span>
          </div>
          <div className="ml-auto flex gap-1 md:ml-0 md:mt-3">
            <StepButton dir={-1} disabled={sel === 0} onClick={() => setSel(sel - 1)} />
            <StepButton dir={1} disabled={sel === items.length - 1} onClick={() => setSel(sel + 1)} />
          </div>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={current.s.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0, transition: t.base }} exit={{ opacity: 0, x: -6, transition: t.exit }} className="min-w-0" aria-live="polite">
            <div className="flex flex-wrap items-center gap-2 text-[0.8125rem] font-medium text-forest-deep">
              <Marker kind={current.kind} /> {SOURCE_TYPE_LABELS[current.s.type] ?? current.s.type}
              <span className="data font-normal text-muted">[{sourceNumber(profile, current.s.id)}]</span>
            </div>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">
              <SourceCitation s={current.s} />
            </p>
            <dl className="mt-4 grid gap-x-6 gap-y-2.5 text-[0.95rem] sm:grid-cols-[8.5rem_minmax(0,1fr)]">
              {(
                [
                  ['Participants', current.s.sample_size],
                  ['Population', current.s.population],
                  ['What was tested', current.s.intervention],
                  ['What it found', current.s.findings],
                  ['Limitations', current.s.limitations],
                ] as [string, string | undefined][]
              )
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="eyebrow pt-0.5">{k}</dt>
                    <dd className="leading-relaxed">{v}</dd>
                  </div>
                ))}
            </dl>
            {claimsCiting.length ? (
              <p className="t-small mt-4 text-muted">
                Used for: {claimsCiting.map((c) => c.outcome || c.claim).join(' · ')}
              </p>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function StepButton({ dir, disabled, onClick }: { dir: 1 | -1; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={dir < 0 ? 'Earlier study' : 'Later study'}
      className="grid h-10 w-10 place-items-center rounded-full border transition-colors duration-150 hover:border-ink disabled:opacity-30 disabled:hover:border-[var(--rule-strong)]"
      style={{ borderColor: 'var(--rule-strong)' }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden style={{ transform: dir < 0 ? 'scaleX(-1)' : undefined }}>
        <path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </svg>
    </button>
  );
}

function decadeTicks(min: number, max: number) {
  const span = max - min;
  const step = span > 30 ? 10 : span > 12 ? 5 : span > 5 ? 2 : 1;
  const out = [min];
  for (let y = Math.ceil((min + 1) / step) * step; y < max; y += step) if (y - min >= step * 0.6 && max - y >= step * 0.6) out.push(y);
  if (max !== min) out.push(max);
  return out;
}
