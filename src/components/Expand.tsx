import { useId, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ease } from '../lib/motion';

/** Animated disclosure: a real button with aria-expanded, height animated with Motion. */
export function Expand({
  summary,
  children,
  open: controlled,
  onOpenChange,
  defaultOpen = false,
  className = '',
  buttonClassName = '',
  icon = 'plus',
}: {
  summary: ReactNode;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  defaultOpen?: boolean;
  className?: string;
  buttonClassName?: string;
  icon?: 'plus' | 'chevron' | 'none';
}) {
  const [inner, setInner] = useState(defaultOpen);
  const open = controlled ?? inner;
  const set = (o: boolean) => (onOpenChange ? onOpenChange(o) : setInner(o));
  const id = useId();
  return (
    <div className={className}>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => set(!open)} className={`group w-full text-left ${buttonClassName}`}>
        {summary}
        {icon !== 'none' ? <ExpandIcon open={open} kind={icon} /> : null}
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={id}
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, transition: { height: { duration: 0.36, ease: ease.out }, opacity: { duration: 0.24, delay: 0.06 } } }}
            exit={{ height: 0, opacity: 0, transition: { height: { duration: 0.24, ease: ease.in }, opacity: { duration: 0.12 } } }}
            style={{ overflow: 'hidden' }}
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function ExpandIcon({ open, kind = 'plus' }: { open: boolean; kind?: 'plus' | 'chevron' }) {
  return (
    <span
      className="pointer-events-none grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-[transform,background-color,border-color] duration-300 group-hover:border-ink"
      style={{ borderColor: 'var(--rule-strong)', transform: open ? `rotate(${kind === 'plus' ? 45 : 180}deg)` : undefined, transitionTimingFunction: 'var(--ease-out)' }}
      aria-hidden
    >
      {kind === 'plus' ? (
        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.4" /></svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.4" fill="none" /></svg>
      )}
    </span>
  );
}
