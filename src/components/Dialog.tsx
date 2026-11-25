import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { t } from '../lib/motion';

/**
 * Accessible floating layer used by search and the compare drawer: scrim, focus trap,
 * Escape to close, scroll lock, and focus returned to whatever opened it.
 * variant "center" = command palette near the top; "drawer" = slides from the right
 * (a bottom sheet on phones).
 */
export function Dialog({
  open,
  onClose,
  label,
  variant = 'center',
  initialFocus,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  variant?: 'center' | 'drawer';
  initialFocus?: React.RefObject<HTMLElement>;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement as HTMLElement | null;
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    const sbw = window.innerWidth - html.clientWidth;
    html.style.overflow = 'hidden';
    if (sbw > 0) html.style.paddingRight = `${sbw}px`;
    const focusFirst = () => {
      const el = initialFocus?.current ?? panel.current?.querySelector<HTMLElement>('input, button, [href], [tabindex]:not([tabindex="-1"])');
      el?.focus({ preventScroll: true });
    };
    const raf = requestAnimationFrame(focusFirst);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Tab' && panel.current) {
        const items = [...panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])')].filter(
          (el) => el.offsetParent !== null,
        );
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      html.style.overflow = prevOverflow;
      html.style.paddingRight = '';
      opener.current?.focus?.({ preventScroll: true });
    };
  }, [open, onClose, initialFocus]);

  const drawer = variant === 'drawer';
  const wide = typeof window !== 'undefined' && window.matchMedia?.('(min-width: 640px)').matches;
  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[70]" role="presentation">
          <motion.div
            className="absolute inset-0"
            style={{ background: 'var(--scrim)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: t.base }}
            exit={{ opacity: 0, transition: t.exit }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className={
              drawer
                ? 'glass glass-edge absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-[22px] sm:inset-y-3 sm:left-auto sm:right-3 sm:max-h-none sm:w-[min(46rem,calc(100vw-1.5rem))] sm:rounded-[22px]'
                : 'glass glass-edge absolute left-1/2 top-[max(12px,env(safe-area-inset-top,0px))] flex max-h-[min(42rem,calc(100dvh-24px))] w-[min(46rem,calc(100vw-24px))] flex-col rounded-[22px] sm:top-[9vh]'
            }
            initial={drawer ? (wide ? { opacity: 0, x: 48 } : { opacity: 0, y: 64 }) : { opacity: 0, y: -10, scale: 0.985 }}
            animate={drawer ? { opacity: 1, x: 0, y: 0, transition: t.softSpring } : { opacity: 1, y: 0, scale: 1, transition: t.spring }}
            exit={drawer ? (wide ? { opacity: 0, x: 32, transition: t.exit } : { opacity: 0, y: 48, transition: t.exit }) : { opacity: 0, y: -6, scale: 0.99, transition: t.exit }}
            style={drawer ? undefined : { x: '-50%' }}
          >
            {children}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
