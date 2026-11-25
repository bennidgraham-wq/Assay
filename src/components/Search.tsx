import { Fragment, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { search, type Hit, type Index } from '../lib/data';
import { href } from '../lib/router';
import { clearRecent, closeSearch, openSearch, useRecent, useSearchState, type RecentItem } from '../lib/store';
import { t } from '../lib/motion';
import { Dialog } from './Dialog';
import { RatingLabel, VerdictTag } from './Evidence';

/** Topics people actually ask about. Each simply seeds the search. */
export const TOPICS = ['sleep', 'stress', 'muscle', 'energy', 'hair', 'skin', 'immunity', 'heart', 'focus', 'kidney'];

const GROUPS: { kind: Hit['kind']; label: string; max: number }[] = [
  { kind: 'supplement', label: 'Supplements', max: 5 },
  { kind: 'claim', label: 'Claims', max: 7 },
  { kind: 'study', label: 'Research', max: 4 },
  { kind: 'catalog', label: 'In the catalogue, not yet reviewed', max: 4 },
];

const hitHref = (h: Hit) =>
  h.kind === 'supplement' ? href.supplement(h.id) : h.kind === 'claim' ? href.claim(h.id) : h.kind === 'study' ? h.url : undefined;

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/** The search trigger in the hero: looks like a field, opens the overlay. */
export function SearchField({ large = false }: { large?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => openSearch()}
      onKeyDown={(e) => {
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          openSearch(e.key);
        }
      }}
      className={`group flex w-full items-center gap-3 rounded-full border bg-card text-left transition-[box-shadow,transform] duration-200 hover:shadow-[var(--shadow-soft)] active:scale-[0.995] ${large ? 'px-5 py-4 sm:px-6' : 'px-4 py-3'}`}
      style={{ borderColor: 'var(--ink)' }}
      aria-label="Search supplements, ingredients and health claims"
    >
      <SearchGlyph size={large ? 20 : 16} />
      <span className={`min-w-0 flex-1 truncate text-muted ${large ? 'text-base sm:text-lg' : ''}`}>Search a supplement, ingredient, or health claim…</span>
      <span className="hidden items-center gap-1 sm:flex" aria-hidden>
        <span className="kbd">{isMac ? '⌘' : 'Ctrl'}</span>
        <span className="kbd">K</span>
      </span>
    </button>
  );
}

export function SearchGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/** Global keyboard shortcut: ⌘K / Ctrl+K anywhere, or "/" outside a text field. */
export function useSearchShortcut() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.closest('input, textarea, [contenteditable="true"]');
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        openSearch();
      } else if (e.key === '/' && !typing) {
        e.preventDefault();
        openSearch();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}

type Row =
  | { type: 'hit'; hit: Hit }
  | { type: 'recent'; item: RecentItem }
  | { type: 'question'; id: string; title: string; sub: string };

export function SearchOverlay({ index }: { index: Index }) {
  const { open, query: seed } = useSearchState();
  const recent = useRecent();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const uid = useId();

  useEffect(() => {
    if (open) {
      setQ(seed);
      setActive(0);
    }
  }, [open, seed]);

  const hits = useMemo(() => search(index, q), [index, q]);
  const questions = useMemo(
    () =>
      index.claims
        .filter((c) => c.claim.myth_feature && c.claim.question)
        .sort((a, b) => b.claim.source_ids.length - a.claim.source_ids.length)
        .slice(0, 5),
    [index],
  );
  const searching = q.trim().length > 1;

  // Flatten what is shown into one keyboard-navigable list.
  const sections: { label: string; rows: Row[]; action?: ReactNode }[] = useMemo(() => {
    if (searching) {
      return GROUPS.map((g) => ({ label: g.label, rows: hits.filter((h) => h.kind === g.kind).slice(0, g.max).map((hit) => ({ type: 'hit' as const, hit })) })).filter(
        (s) => s.rows.length,
      );
    }
    const out: { label: string; rows: Row[]; action?: ReactNode }[] = [];
    if (recent.length)
      out.push({
        label: 'Recently viewed',
        rows: recent.map((item) => ({ type: 'recent' as const, item })),
        action: (
          <button type="button" className="text-xs text-muted hover:text-ink" onClick={() => clearRecent()}>
            Clear
          </button>
        ),
      });
    out.push({
      label: 'People often ask',
      rows: questions.map((c) => ({ type: 'question' as const, id: c.claim.id, title: c.claim.question!, sub: c.profile.name })),
    });
    return out;
  }, [searching, hits, recent, questions]);
  const flat = sections.flatMap((s) => s.rows);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-row="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const go = (row: Row | undefined) => {
    if (!row) return;
    const el = list.current?.querySelector<HTMLAnchorElement>(`[data-row="${flat.indexOf(row)}"] a`);
    el?.click();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(flat.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(flat[active]);
    }
  };

  const terms = q.toLowerCase().split(/\s+/).filter((x) => x.length > 1);
  let n = -1;

  return (
    <Dialog open={open} onClose={closeSearch} label="Search" initialFocus={input as React.RefObject<HTMLElement>}>
      <div className="flex items-center gap-3 border-b px-5 py-4" style={{ borderColor: 'var(--glass-line)' }}>
        <SearchGlyph size={20} />
        <input
          ref={input}
          id="search-overlay-input"
          type="search"
          role="combobox"
          aria-expanded="true"
          aria-controls={`${uid}-list`}
          aria-activedescendant={flat.length ? `${uid}-opt-${active}` : undefined}
          aria-autocomplete="list"
          aria-label="Search supplements, ingredients, claims and research"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search a supplement, ingredient, or health claim…"
          className="min-w-0 flex-1 bg-transparent text-lg placeholder:text-muted focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          autoComplete="off"
          spellCheck={false}
        />
        <button type="button" onClick={closeSearch} className="btn-quiet -mr-2" aria-label="Close search">
          <span className="kbd hidden sm:inline-flex">Esc</span>
          <span className="sm:hidden">Close</span>
        </button>
      </div>

      {!searching ? (
        <div className="flex flex-wrap items-center gap-2 px-5 pb-1 pt-4">
          <span className="eyebrow mr-1">Topics</span>
          {TOPICS.map((tp) => (
            <button key={tp} type="button" className="chip" onClick={() => { setQ(tp); input.current?.focus(); }}>
              {tp}
            </button>
          ))}
        </div>
      ) : null}

      <div ref={list} id={`${uid}-list`} role="listbox" aria-label="Results" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3 pt-2">
        {searching && !hits.length ? (
          <div className="px-4 py-10 text-center">
            <p className="t-h3">Nothing matches “{q}” yet.</p>
            <p className="t-small mt-2 text-muted">Try a supplement (magnesium), an outcome (sleep) or a food (salmon).</p>
          </div>
        ) : (
          sections.map((s) => (
            <div key={s.label} role="group" aria-label={s.label} className="mb-1">
              <div className="flex items-center justify-between px-3 pb-1 pt-3">
                <span className="eyebrow">{s.label}</span>
                {s.action}
              </div>
              {s.rows.map((row) => {
                n++;
                const i = n;
                return (
                  <div key={i} data-row={i} id={`${uid}-opt-${i}`} role="option" aria-selected={i === active} onMouseMove={() => setActive(i)}>
                    <RowView row={row} index={index} active={i === active} terms={terms} />
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      <div className="hidden items-center gap-4 border-t px-5 py-2.5 text-xs text-muted sm:flex" style={{ borderColor: 'var(--glass-line)' }}>
        <span className="flex items-center gap-1"><span className="kbd">↑</span><span className="kbd">↓</span> move</span>
        <span className="flex items-center gap-1"><span className="kbd">↵</span> open</span>
        <span className="flex items-center gap-1"><span className="kbd">Esc</span> close</span>
      </div>
    </Dialog>
  );
}

function RowView({ row, index, active, terms }: { row: Row; index: Index; active: boolean; terms: string[] }) {
  let to: string | undefined;
  let title: string;
  let sub: string;
  let tail: ReactNode = null;
  let kind = '';
  if (row.type === 'hit') {
    const h = row.hit;
    to = hitHref(h);
    title = h.title;
    sub = h.detail;
    const c = h.kind === 'claim' ? index.claimById.get(h.id) : undefined;
    if (c) {
      sub = `${c.profile.name} · ${h.detail}`;
      tail = (
        <span className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
          <VerdictTag verdict={c.claim.verdict} />
          <RatingLabel rating={c.claim.rating} />
        </span>
      );
    }
    if (h.kind === 'study') kind = 'Opens the study';
  } else if (row.type === 'recent') {
    to = row.item.kind === 'supplement' ? href.supplement(row.item.id) : href.claim(row.item.id);
    title = row.item.title;
    sub = row.item.sub ?? (row.item.kind === 'supplement' ? 'Supplement' : 'Claim');
  } else {
    to = href.claim(row.id);
    title = row.title;
    sub = row.sub;
  }
  const external = to?.startsWith('http');
  const inner = (
    <div className="relative flex items-start justify-between gap-4 rounded-xl px-3 py-2.5">
      {active ? (
        <motion.span layoutId="search-active" className="absolute inset-0 rounded-xl" style={{ background: 'color-mix(in srgb, var(--ink) 7%, transparent)' }} transition={t.quick} />
      ) : null}
      <div className="relative min-w-0">
        <div className={row.type === 'hit' && row.hit.kind === 'study' ? 't-small text-ink' : 'display text-[1.12rem] leading-snug'}>
          <Highlight text={title} terms={terms} />
        </div>
        <div className="line-clamp-1 text-sm text-muted">{sub}{kind ? ` · ${kind} ↗` : ''}</div>
      </div>
      <span className="relative">{tail}</span>
    </div>
  );
  if (!to) return <div className="opacity-70">{inner}</div>;
  return (
    <a
      href={to}
      tabIndex={-1}
      className="block no-underline"
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      onClick={() => closeSearch()}
    >
      {inner}
    </a>
  );
}

function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length) return <>{text}</>;
  const re = new RegExp(`(${terms.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'ig');
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-sm bg-transparent text-forest-deep underline decoration-forest/50 decoration-2 underline-offset-[3px]">
            {p}
          </mark>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}
