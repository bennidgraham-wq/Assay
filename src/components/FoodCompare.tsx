import { useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Profile } from '../lib/types';
import { ease, t } from '../lib/motion';
import { CountUp, fmt } from './CountUp';
import { Refs } from './Sources';

type View = 'food' | 'supplement';

/**
 * Food vs. supplement. Two views on one honest scale and in one unit: what common servings of
 * food provide, and the doses used in research. Where the research dose dwarfs food, it is stated
 * as a multiple rather than squashing every food bar to nothing.
 */
export function FoodCompare({ profile, compact = false }: { profile: Profile; compact?: boolean }) {
  const f = profile.food_vs_supplement;
  const [view, setView] = useState<View>('food');
  const uid = useId();
  if (!f || !f.foods?.length) return null;

  // Foods may state a more specific unit (e.g. "g EPA + DHA" where doses are in g of fish oil).
  // They are charted, but research doses are only placed beside them when the units match exactly.
  const base = f.unit;
  const unitOf = (u: string) => u.split(' ')[0];
  const foodUnit = f.foods.find((x) => unitOf(x.unit) === unitOf(base))?.unit ?? base;
  const unit = foodUnit;
  const foods = f.foods
    .filter((x) => x.unit === foodUnit && typeof x.amount === 'number')
    .sort((a, b) => (b.amount_high ?? b.amount) - (a.amount_high ?? a.amount))
    .slice(0, compact ? 5 : 12);
  if (!foods.length) return null;
  const rd = f.research_doses && f.research_doses.unit === unit && f.research_doses.low ? f.research_doses : null;
  const rdNote = f.research_doses?.note;
  const ri = f.reference_intake && f.reference_intake.unit === unit && f.reference_intake.amount ? f.reference_intake : null;
  const topFood = Math.max(...foods.map((x) => x.amount_high ?? x.amount), 0);
  const richest = foods[0];
  const foodMax = Math.max(topFood, ri?.amount ?? 0) || 1;
  const doseOnScale = !!rd?.low && rd.low <= foodMax * 4;
  const max = Math.max(foodMax, doseOnScale ? rd?.low ?? 0 : 0);
  const frac = (v: number) => Math.min(1, Math.max(0.008, v / max));
  const supMax = Math.max(rd?.high ?? 0, rd?.low ?? 0, ri?.amount ?? 0, topFood) || 1;
  const sfrac = (v: number) => Math.min(1, Math.max(0.008, v / supMax));
  const servingsFor = (amount: number) => (rd?.low && amount > 0 ? rd.low / amount : null);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="relative inline-flex rounded-full border p-1" style={{ borderColor: 'var(--rule-strong)' }} role="tablist" aria-label="Compare food and supplements">
          {(
            [
              ['food', 'From food'],
              ['supplement', 'From supplements'],
            ] as [View, string][]
          ).map(([v, label]) => (
            <button
              key={v}
              id={`${uid}-tab-${v}`}
              role="tab"
              aria-selected={view === v}
              aria-controls={`${uid}-panel`}
              onClick={() => setView(v)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  const next = view === 'food' ? 'supplement' : 'food';
                  setView(next);
                  document.getElementById(`${uid}-tab-${next}`)?.focus();
                }
              }}
              tabIndex={view === v ? 0 : -1}
              className={`relative min-h-[2.5rem] rounded-full px-4 text-sm font-medium transition-colors duration-200 ${view === v ? 'text-paper' : 'text-muted hover:text-ink'}`}
            >
              {view === v ? <motion.span layoutId={`${uid}-thumb`} className="absolute inset-0 rounded-full bg-ink" transition={t.spring} aria-hidden /> : null}
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>
        <span className="text-sm text-muted">
          Amounts in <span className="data">{unit}</span>
        </span>
      </div>

      <div id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-tab-${view}`} className="relative">
        <AnimatePresence mode="wait" initial={false}>
          {view === 'food' ? (
            <motion.div key="food" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0, transition: t.base }} exit={{ opacity: 0, x: -6, transition: t.exit }} className="mt-7">
              {/* Column heads */}
              <div className="mb-2 grid grid-cols-[minmax(0,15rem)_minmax(0,1fr)_6.5rem_7.5rem] items-end gap-4 max-sm:hidden">
                <span className="eyebrow">Food, typical serving</span>
                <span className="eyebrow">Amount per serving</span>
                <span className="eyebrow text-right">{unit}</span>
                {rd ? <span className="eyebrow text-right">Servings to reach the lowest studied dose</span> : <span />}
              </div>
              <ul className="border-t hair">
                {foods.map((x, i) => {
                  const servings = servingsFor(x.amount);
                  return (
                    <li key={x.food} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 border-b hair py-3 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_6.5rem_7.5rem] sm:items-center">
                      <div className="min-w-0 text-[0.95rem]">
                        <span>{x.food}</span>
                        <span className="text-muted">, {x.serving}</span>
                        <Refs profile={profile} ids={x.source_id ? [x.source_id] : []} />
                      </div>
                      <div className="relative col-span-2 row-start-2 h-2.5 sm:col-span-1 sm:row-start-auto">
                        <div className="absolute inset-0 rounded-full" style={{ background: 'var(--stone)' }} />
                        <Bar from={0} to={frac(x.amount)} color="var(--forest)" delay={i * 0.04} />
                        {x.amount_high && x.amount_high > x.amount ? <Bar from={frac(x.amount)} to={frac(x.amount_high)} color="color-mix(in srgb, var(--forest) 40%, transparent)" delay={i * 0.04 + 0.2} /> : null}
                        {ri ? <Tick at={frac(ri.amount!)} color="var(--ink)" dashed /> : null}
                        {doseOnScale ? <Tick at={frac(rd!.low!)} color="var(--clay)" /> : null}
                      </div>
                      <div className="data col-start-2 row-start-1 text-right text-[0.82rem] sm:col-start-auto sm:row-start-auto">
                        <CountUp value={x.amount} />
                        {x.amount_high && x.amount_high !== x.amount ? <>–{fmt(x.amount_high)}</> : null}
                        <span className="text-muted sm:hidden"> {unit}</span>
                      </div>
                      {rd ? (
                        <div className="col-span-2 hidden text-right text-[0.82rem] text-muted sm:col-span-1 sm:block">
                          {servings != null ? <span className="data">{servings < 1 ? '< 1' : servings > 999 ? '1,000+' : `≈ ${fmt(Math.ceil(servings * 10) / 10)}`}</span> : null}
                        </div>
                      ) : (
                        <span className="hidden sm:block" />
                      )}
                    </li>
                  );
                })}
              </ul>

              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[0.8125rem] text-muted">
                {ri ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-3 w-0 border-l-2 border-dashed" style={{ borderColor: 'var(--ink)' }} aria-hidden />
                    {ri.label || 'Reference intake'}: <span className="data text-ink">{fmt(ri.amount!)} {unit}</span>
                    <Refs profile={profile} ids={ri.source_id ? [ri.source_id] : []} />
                  </span>
                ) : null}
                {doseOnScale ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-3 w-[2px] bg-clay" aria-hidden />
                    Lowest daily dose in the research we cite: <span className="data text-ink">{fmt(rd!.low!)} {unit}</span>
                  </span>
                ) : null}
              </div>

              {rd && !doseOnScale && topFood ? (
                <Callout tone="clay" title="Off this scale">
                  The lowest daily dose used in the research we cite is <span className="data">{fmt(rd.low!)} {unit}</span>, about{' '}
                  <strong className="num">{Math.round(rd.low! / topFood).toLocaleString('en-US')}×</strong> the richest serving above ({richest.food.toLowerCase()}).
                </Callout>
              ) : null}
              {!rd && f.research_doses?.low && f.research_doses.unit !== unit ? (
                <Callout tone="clay" title="Different units">
                  Foods are listed in {unit}, but the research doses are recorded in {f.research_doses.unit}, so we don't put them on the same scale.
                  {rdNote ? <> {rdNote}</> : null}
                  <Refs profile={profile} ids={f.research_doses?.source_ids} />
                </Callout>
              ) : null}
              {rd && richest.amount > 0 && (
                <p className="mt-3 text-[0.8125rem] text-muted sm:hidden">
                  The lowest studied dose, <span className="data">{fmt(rd.low!)} {unit}</span>, equals about{' '}
                  <span className="data">{fmt(Math.ceil((rd.low! / richest.amount) * 10) / 10)}</span> servings of {richest.food.toLowerCase()}.
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div key="supp" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0, transition: t.base }} exit={{ opacity: 0, x: 6, transition: t.exit }} className="mt-7 space-y-6">
              {rd ? (
                <Meter
                  label="Daily doses used in research"
                  value={
                    <>
                      <CountUp value={rd.low!} />
                      {rd.high != null && rd.high !== rd.low ? <>–<CountUp value={rd.high} /></> : null} {unit}
                    </>
                  }
                  from={rd.low && rd.high && rd.high !== rd.low ? sfrac(rd.low) : 0}
                  to={sfrac(rd.high ?? rd.low!)}
                  color="var(--clay)"
                  note={rd.note ? <>{rd.note}<Refs profile={profile} ids={f.research_doses?.source_ids} /></> : null}
                />
              ) : (
                <div>
                  <p className="text-[0.95rem]">We haven't recorded a research dose range in {unit} for this comparison.</p>
                  {rdNote ? <p className="t-small mt-2 text-muted">{rdNote}<Refs profile={profile} ids={f.research_doses?.source_ids} /></p> : null}
                </div>
              )}
              {ri ? (
                <Meter
                  label={ri.label || 'Reference intake'}
                  value={<><CountUp value={ri.amount!} /> {unit}</>}
                  from={0}
                  to={sfrac(ri.amount!)}
                  color="var(--ink)"
                  note={<>Recommended intake from all sources, not a supplement dose.<Refs profile={profile} ids={ri.source_id ? [ri.source_id] : []} /></>}
                />
              ) : null}
              {richest ? (
                <Meter
                  label={`Richest food serving listed: ${richest.food.toLowerCase()}, ${richest.serving}`}
                  value={<><CountUp value={richest.amount_high ?? richest.amount} /> {unit}</>}
                  from={0}
                  to={sfrac(richest.amount_high ?? richest.amount)}
                  color="var(--forest)"
                />
              ) : null}
              {f.when_supplement_may_help ? (
                <Callout tone="forest" title="When a supplement may make sense">
                  {f.when_supplement_may_help}
                </Callout>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!compact && (f.comparison_note || f.food_advantages) ? (
        <div className="mt-10 grid gap-x-10 gap-y-6 border-t hair pt-6 md:grid-cols-2">
          {f.comparison_note ? (
            <div>
              <h4 className="mb-1.5 font-medium">Not directly equivalent</h4>
              <p className="text-[0.95rem] leading-relaxed text-muted">{f.comparison_note}</p>
            </div>
          ) : null}
          {f.food_advantages ? (
            <div>
              <h4 className="mb-1.5 font-medium">What food adds</h4>
              <p className="text-[0.95rem] leading-relaxed text-muted">{f.food_advantages}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** A bar segment drawn with transform only (no width animation, no layout shift). */
function Bar({ from, to, color, delay = 0 }: { from: number; to: number; color: string; delay?: number }) {
  return (
    <motion.div
      className="absolute inset-y-0 origin-left rounded-full"
      style={{ left: `${from * 100}%`, width: `${Math.max(0, to - from) * 100}%`, minWidth: 3, background: color }}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: ease.out, delay }}
    />
  );
}

function Tick({ at, color, dashed = false }: { at: number; color: string; dashed?: boolean }) {
  return (
    <span
      className="absolute -bottom-1 -top-1 w-0"
      style={{ left: `${at * 100}%`, borderLeft: `2px ${dashed ? 'dashed' : 'solid'} ${color}` }}
      aria-hidden
    />
  );
}

function Meter({ label, value, from, to, color, note }: { label: string; value: React.ReactNode; from: number; to: number; color: string; note?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 text-[0.95rem]">
        <span className="min-w-0">{label}</span>
        <span className="data shrink-0 text-[0.82rem]">{value}</span>
      </div>
      <div className="relative mt-2 h-2.5">
        <div className="absolute inset-0 rounded-full" style={{ background: 'var(--stone)' }} />
        <Bar from={from} to={to} color={color} />
      </div>
      {note ? <p className="t-small mt-2 text-muted">{note}</p> : null}
    </div>
  );
}

function Callout({ tone, title, children }: { tone: 'clay' | 'forest'; title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-xl border-l-[3px] px-5 py-4" style={{ borderColor: `var(--${tone})`, background: `color-mix(in srgb, var(--${tone}) 7%, var(--paper))` }}>
      <div className={`mb-1 text-[0.8125rem] font-medium ${tone === 'clay' ? 'text-clay-deep' : 'text-forest-deep'}`}>{title}</div>
      <p className="text-[0.95rem] leading-relaxed">{children}</p>
    </div>
  );
}
