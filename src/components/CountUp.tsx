import { useEffect, useRef } from 'react';
import { animate, useInView } from 'framer-motion';
import { prefersReducedMotion } from '../lib/motion';

export const fmt = (n: number) => (n >= 100 ? Math.round(n).toLocaleString('en-US') : n >= 10 ? n.toFixed(0) : n.toFixed(n < 1 ? 2 : 1).replace(/\.0+$/, ''));

/**
 * A number that counts up once when it first comes into view, then simply updates.
 * Width is reserved by rendering the final value invisibly, so nothing shifts while it counts.
 */
export function CountUp({ value, className = '' }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const out = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const from = useRef(0);
  useEffect(() => {
    if (!seen || !out.current) return;
    if (prefersReducedMotion()) {
      out.current.textContent = fmt(value);
      return;
    }
    const controls = animate(from.current, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        from.current = v;
        if (out.current) out.current.textContent = fmt(v);
      },
    });
    return () => controls.stop();
  }, [seen, value]);
  return (
    <span ref={ref} className={`relative inline-grid ${className}`}>
      <span className="invisible col-start-1 row-start-1" aria-hidden>{fmt(value)}</span>
      <span ref={out} className="col-start-1 row-start-1 text-right" aria-hidden>{fmt(0)}</span>
      <span className="sr-only">{fmt(value)}</span>
    </span>
  );
}
