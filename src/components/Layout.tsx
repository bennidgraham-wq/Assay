import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { openSearch } from '../lib/store';
import { t } from '../lib/motion';
import { Expand } from './Expand';
import { formatDate } from './Evidence';
import { joinNames, type ReviewSummary } from '../lib/data';
import { href, type Route } from '../lib/router';

const NAV: { label: string; to: string; page: Route['page'][] }[] = [
  { label: 'Explore', to: href.explore, page: ['explore', 'supplement'] },
  { label: 'Claims', to: href.claims, page: ['claims', 'claim'] },
  { label: 'Food vs. Supplements', to: href.food(), page: ['food'] },
  { label: 'Research', to: href.research, page: ['research'] },
  { label: 'Method', to: href.method, page: ['method'] },
];

export function Header({ route }: { route: Route }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => setOpen(false), [route]);
  // At the top of the page the header sits flush on the paper. Once the page scrolls it lifts
  // into a floating glass bar, so the reading surface underneath stays visible.
  const floating = scrolled || open;
  return (
    <header className="sticky z-40" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
      <div
        className={`border-b transition-[background-color,border-color,box-shadow] duration-300 ${floating ? 'glass !border-x-0 !border-t-0' : 'border-transparent bg-paper'}`}
        style={floating ? { boxShadow: 'var(--shadow-soft)' } : undefined}
      >
        <div className="gutter">
          <div className="wrap flex h-14 items-center justify-between gap-4">
            <a href={href.home} className="flex items-baseline gap-2.5 no-underline" aria-label="Assay, home">
              <span className="display text-[1.55rem] font-semibold italic leading-none tracking-tight">Assay</span>
              <span className="eyebrow hidden md:inline">Supplement evidence, independently reviewed</span>
            </a>
            <nav className="hidden items-center gap-1 text-[0.92rem] lg:flex" aria-label="Main">
              {NAV.map((n) => {
                const active = n.page.includes(route.page);
                return (
                  <a
                    key={n.label}
                    href={n.to}
                    aria-current={active ? 'page' : undefined}
                    className={`relative rounded-full px-3 py-1.5 no-underline transition-colors duration-200 hover:text-ink ${active ? 'text-ink' : 'text-muted'}`}
                  >
                    {active ? (
                      <motion.span layoutId="nav-active" className="absolute inset-x-3 -bottom-[1px] h-[2px] rounded-full bg-forest" transition={t.spring} aria-hidden />
                    ) : null}
                    {n.label}
                  </a>
                );
              })}
              <button
                type="button"
                onClick={() => openSearch()}
                className="ml-3 inline-flex min-h-[2.25rem] items-center gap-2.5 rounded-full border px-3.5 text-muted transition-colors duration-150 hover:border-ink hover:text-ink"
                style={{ borderColor: 'var(--rule-strong)' }}
              >
                <SearchIcon /> Search <span className="kbd">{isMac() ? '⌘' : 'Ctrl'} K</span>
              </button>
            </nav>
            <div className="flex items-center gap-1 lg:hidden">
              <button type="button" onClick={() => openSearch()} className="grid h-11 w-11 place-items-center rounded-full" aria-label="Search">
                <SearchIcon size={18} />
              </button>
              <button type="button" className="grid h-11 w-11 place-items-center rounded-full" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen((o) => !o)} aria-label="Menu">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
                  <path d={open ? 'M5 5l12 12M17 5L5 17' : 'M3 7h16M3 15h16'} stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </button>
            </div>
          </div>
          <AnimatePresence initial={false}>
            {open ? (
              <motion.nav
                id="mobile-nav"
                className="wrap overflow-hidden lg:hidden"
                aria-label="Main"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1, transition: t.base }}
                exit={{ height: 0, opacity: 0, transition: t.exit }}
              >
                <div className="flex flex-col border-t hair py-2">
                  {NAV.map((n) => (
                    <a key={n.label} href={n.to} aria-current={n.page.includes(route.page) ? 'page' : undefined} className="display py-2.5 text-xl no-underline aria-[current=page]:text-forest-deep">
                      {n.label}
                    </a>
                  ))}
                </div>
              </motion.nav>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export function SearchIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function Footer({ generated, review }: { generated?: string; review?: ReviewSummary }) {
  return (
    <footer className="mt-24 border-t hair bg-stone">
      <div className="gutter">
        <div className="wrap grid gap-10 py-12 md:grid-cols-[1.3fr_1fr]">
          <div className="max-w-prose">
            <p className="display text-2xl italic">Know what you're taking. Understand why. Follow the evidence.</p>
            <p className="mt-4 text-sm text-muted">
              Assay is educational and does not give individual medical advice. Nothing here diagnoses, treats or replaces care
              from a qualified clinician. Talk to one before starting a supplement, especially if you are pregnant,
              breastfeeding, taking medication or managing a health condition.
            </p>
          </div>
          <div className="space-y-3 text-sm text-muted">
            {review ? (
              <p>
                <span className={`block text-[0.8125rem] font-medium ${review.pending ? 'text-clay-deep' : 'text-forest-deep'}`}>About this research</span>
                The research on this site was prepared with AI assistance
                {review.reviewers.length ? (
                  <>
                    {' '}and reviewed by {joinNames(review.reviewers)}
                    {review.latest ? <> ({formatDate(review.latest)})</> : null}
                  </>
                ) : null}
                . Every rating links to the sources it was based on.
                {review.pending ? <> {review.pending} {review.pending === 1 ? 'review is' : 'reviews are'} still drafts and are labelled as such.</> : null}
              </p>
            ) : null}
            <p>No ads. No affiliate links. No supplement sales.</p>
            {generated ? <p className="data">Data build {generated}</p> : null}
          </div>
        </div>
      </div>
    </footer>
  );
}

export function Page({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <main className={`gutter ${className}`}>
      <div className="wrap">{children}</div>
    </main>
  );
}

/** Expandable section for progressive disclosure (animated). */
export function Disclose({ summary, children, defaultOpen = false, className = '' }: { summary: ReactNode; children: ReactNode; defaultOpen?: boolean; className?: string }) {
  return (
    <Expand
      defaultOpen={defaultOpen}
      className={`border-t hair ${className}`}
      buttonClassName="flex min-h-[3.5rem] items-center justify-between gap-4 py-4"
      summary={<span className="min-w-0">{summary}</span>}
    >
      <div className="pb-6">{children}</div>
    </Expand>
  );
}
