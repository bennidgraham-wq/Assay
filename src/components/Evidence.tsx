import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Rating, Verdict } from '../lib/types';
import { SCALE, VERDICTS, scaleFor } from '../lib/evidence';
import { ease, t } from '../lib/motion';

// Thin evidence (levels 1–2) is hatched, so it never reads as a solid "yes" or a solid "no".
const HATCH = 'repeating-linear-gradient(135deg, var(--ev-weak) 0 2px, transparent 2px 5px)';

function fill(cell: Rating, rating: Rating): string | null {
  if (rating === 'against') return cell === 'against' ? 'var(--clay)' : null;
  if (cell === 'against' || cell > rating) return null;
  if (rating >= 4) return 'var(--forest)';
  if (rating === 3) return 'color-mix(in srgb, var(--forest) 62%, var(--paper))';
  return HATCH;
}

/**
 * The evidence rule: the platform's signature instrument. Six cells read left to right,
 * from "Evidence against" (set apart by a gap) through levels 1–5. Filled cells show how far
 * the evidence reaches. The large instrument draws itself in once when it comes into view; the
 * small inline version is static (it appears dozens of times per page).
 */
export function EvidenceRule({
  rating,
  size = 'sm',
  onPick,
  active,
}: {
  rating: Rating;
  size?: 'sm' | 'lg';
  onPick?: (r: Rating) => void;
  active?: Rating;
}) {
  const s = scaleFor(rating);
  const lg = size === 'lg';
  return (
    <div className={lg ? 'w-full' : 'inline-flex items-center'} role={onPick ? 'radiogroup' : 'img'} aria-label={onPick ? 'Evidence levels' : `Evidence: ${s.name}`}>
      <div className={`grid grid-cols-[1fr_0.35fr_repeat(5,1fr)] ${lg ? 'gap-1.5' : 'w-[6rem] gap-[3px]'}`}>
        {SCALE.map((cell, i) => {
          const f = fill(cell.rating, rating);
          const isMark = cell.rating === rating;
          const box = (
            <span
              className={`relative block overflow-hidden ${lg ? 'h-3.5 rounded-[3px]' : 'h-2 rounded-[2px]'}`}
              style={{ boxShadow: `inset 0 0 0 1px ${isMark ? 'var(--ink)' : 'var(--rule-strong)'}` }}
            >
              {f && !lg ? <span className="absolute inset-0" style={{ background: f }} /> : null}
              {f && lg ? (
                <motion.span
                  className="absolute inset-0 origin-left"
                  style={{ background: f }}
                  initial={{ scaleX: 0.001 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true, margin: '0px 0px -10% 0px' }}
                  transition={{ duration: 0.42, ease: ease.out, delay: Math.max(0, i - 1) * 0.06 }}
                />
              ) : null}
              {cell.rating === 'against' && rating === 'against' && lg ? (
                <span className="absolute inset-0 grid place-items-center text-[0.6rem] leading-none text-paper" aria-hidden>✕</span>
              ) : null}
            </span>
          );
          const spacer = i === 0 ? <span key="gap" aria-hidden /> : null;
          return onPick ? (
            <FragmentWithGap key={String(cell.rating)} gap={spacer}>
              <button
                type="button"
                role="radio"
                aria-checked={active === cell.rating}
                className="group relative -my-3 cursor-pointer py-3"
                onClick={() => onPick(cell.rating)}
                aria-label={cell.name}
              >
                {box}
                <span
                  className="absolute -bottom-0.5 left-0 right-0 mx-auto h-0.5 w-0 rounded-full bg-ink transition-[width] duration-200 group-hover:w-1/2"
                  style={active === cell.rating ? { width: '100%' } : undefined}
                  aria-hidden
                />
              </button>
            </FragmentWithGap>
          ) : (
            <FragmentWithGap key={String(cell.rating)} gap={spacer}>
              {box}
            </FragmentWithGap>
          );
        })}
      </div>
      {lg ? (
        <div className="mt-2.5 grid grid-cols-[1fr_0.35fr_repeat(5,1fr)] gap-1.5">
          {SCALE.map((cell, i) => (
            <FragmentWithGap key={String(cell.rating)} gap={i === 0 ? <span aria-hidden /> : null}>
              <span className={`data ${cell.rating === rating || cell.rating === active ? 'font-medium text-ink' : 'text-muted'}`}>{cell.short}</span>
            </FragmentWithGap>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FragmentWithGap({ gap, children }: { gap: React.ReactNode; children: React.ReactNode }) {
  return (
    <>
      {children}
      {gap}
    </>
  );
}

export function RatingLabel({ rating, className = '' }: { rating: Rating; className?: string }) {
  const s = scaleFor(rating);
  return (
    <span className={`data whitespace-nowrap ${className}`} style={{ color: rating === 'against' ? 'var(--clay-deep)' : rating >= 4 ? 'var(--forest-deep)' : 'var(--muted)' }}>
      {rating === 'against' ? '✕' : `L${rating}`} · {s.name}
    </span>
  );
}

const toneStyle: Record<string, React.CSSProperties> = {
  yes: { background: 'var(--forest)', color: 'var(--paper)', borderColor: 'var(--forest)' },
  part: { background: 'transparent', color: 'var(--forest-deep)', borderColor: 'var(--forest)' },
  unknown: { background: 'transparent', color: 'var(--muted)', borderColor: 'var(--rule-strong)', borderStyle: 'dashed' },
  no: { background: 'var(--clay)', color: 'var(--paper)', borderColor: 'var(--clay)' },
};

export function VerdictTag({ verdict, large = false }: { verdict: Verdict; large?: boolean }) {
  const v = VERDICTS[verdict] ?? VERDICTS.not_established;
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border font-medium ${large ? 'px-3.5 py-1 text-sm' : 'px-2.5 py-0.5 text-xs'}`}
      style={toneStyle[v.tone]}
    >
      {v.label}
    </span>
  );
}

/**
 * Explains the most misunderstood distinction on the site, in context: is this claim
 * unproven (we don't know yet) or contradicted (we looked, and it doesn't work)?
 */
export function UncertaintyNote({ rating }: { rating: Rating }) {
  if (rating !== 'against' && rating > 2) return null;
  const against = rating === 'against';
  return (
    <div className="grid gap-4 rounded-2xl border p-4 sm:grid-cols-2 sm:p-5" style={{ borderColor: 'var(--rule)' }}>
      {[
        { on: !against, title: 'Not enough research', body: 'Studies are missing, small or mixed. The claim could still turn out true or false.', swatch: HATCH, line: 'var(--rule-strong)' },
        { on: against, title: 'Evidence against', body: 'Good-sized, careful studies have tested it and found no meaningful benefit.', swatch: 'var(--clay)', line: 'var(--clay)' },
      ].map((b) => (
        <div key={b.title} className={`flex gap-3 ${b.on ? '' : 'opacity-45'}`}>
          <span className="mt-1 h-3 w-6 shrink-0 rounded-[3px]" style={{ background: b.swatch, boxShadow: `inset 0 0 0 1px ${b.line}` }} aria-hidden />
          <div>
            <div className="text-sm font-medium">
              {b.title}
              {b.on ? <span className="ml-2 text-xs font-normal text-muted">This claim</span> : null}
            </div>
            <p className="t-small mt-0.5 text-muted">{b.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export const formatDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

/** Review status, read from the data: "Reviewed by …" once signed off, otherwise a draft label. */
export function ReviewNote({ profile, className = '' }: { profile: { review_status?: string; reviewed_by?: string; reviewed_on?: string }; className?: string }) {
  if (profile.review_status === 'reviewed' && profile.reviewed_by) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-medium text-forest-deep ${className}`}>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
          <circle cx="6" cy="6" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.1" />
          <path d="M3.6 6.1l1.6 1.6 3.2-3.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
        </svg>
        <span>
          Reviewed by {profile.reviewed_by}
          {profile.reviewed_on ? <span className="font-normal text-muted">, {formatDate(profile.reviewed_on)}</span> : null}
        </span>
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium text-clay-deep ${className}`}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-clay" aria-hidden />
      Draft, pending review
    </span>
  );
}

/**
 * Claim-specific evidence explorer. The claim's own level is marked; choosing any other level
 * shows what it means and what research would have to show for the claim to sit there.
 */
export function ClaimEvidenceExplorer({ rating }: { rating: Rating }) {
  const [picked, setPicked] = useState<Rating>(rating);
  const s = scaleFor(picked);
  const own = picked === rating;
  const dir = ratingNum(picked) > ratingNum(rating) ? 'stronger' : 'weaker';
  return (
    <div className="min-w-0">
      <EvidenceRule rating={rating} size="lg" onPick={setPicked} active={picked} />
      <div className="relative mt-5 min-h-[8.5rem]" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={String(picked)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: t.base }} exit={{ opacity: 0, y: -4, transition: t.exit }}>
            <div className="flex flex-wrap items-baseline gap-x-3">
              <RatingLabel rating={picked} />
              <span className="text-xs text-muted">{own ? 'This claim' : `A ${dir} rating`}</span>
            </div>
            <p className="mt-2 text-[0.97rem] leading-relaxed">{s.meaning}</p>
            <p className="t-small mt-2 text-muted">
              {own ? 'Typical evidence at this level: ' : 'For this rating the research would need: '}
              {s.pattern.charAt(0).toLowerCase() + s.pattern.slice(1)}
            </p>
            {!own ? (
              <button type="button" onClick={() => setPicked(rating)} className="link mt-3 text-sm text-forest-deep">
                Back to this claim's rating
              </button>
            ) : (
              <p className="t-small mt-3 text-muted">Tap another level to compare.</p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

const ratingNum = (r: Rating) => (r === 'against' ? 0 : r);
