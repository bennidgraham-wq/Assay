import { useEffect, useRef, useState, type RefObject } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { t } from '../lib/motion';

export interface NavSection {
  id: string;
  label: string;
}

/** Which section is being read: the last one whose top has passed a line 30% down the viewport. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const line = window.innerHeight * 0.3;
        let current = ids[0];
        for (const id of ids) {
          const el = document.getElementById(id);
          if (el && el.getBoundingClientRect().top <= line) current = id;
        }
        setActive(current);
      });
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
    };
  }, [ids.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps
  return active;
}

function go(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  // Move focus for keyboard and screen-reader users without a second jump.
  el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
}

/**
 * Editorial section navigation for long reviews.
 * Wide screens: a quiet rail beside the text with a reading-progress line.
 * Phones and tablets: a slim sticky strip under the header that scrolls sideways.
 */
export function SectionNav({ sections, target }: { sections: NavSection[]; target: RefObject<HTMLElement> }) {
  const active = useActiveSection(sections.map((s) => s.id));
  const { scrollYProgress } = useScroll({ target, offset: ['start 0.3', 'end end'] });
  const progress = useSpring(scrollYProgress, { stiffness: 260, damping: 40, restDelta: 0.001 });
  const strip = useRef<HTMLDivElement>(null);

  // Keep the active item visible in the phone strip.
  useEffect(() => {
    const el = strip.current?.querySelector<HTMLElement>(`[data-id="${active}"]`);
    if (el && strip.current) {
      const box = strip.current;
      const left = el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2;
      box.scrollTo({ left, behavior: 'smooth' });
    }
  }, [active]);

  return (
    <>
      {/* Rail (lg+) */}
      <nav aria-label="On this page" className="sticky top-24 hidden self-start lg:block">
        <div className="eyebrow mb-3">On this page</div>
        <div className="relative pl-4">
          <span className="absolute bottom-0 left-0 top-0 w-px" style={{ background: 'var(--rule)' }} aria-hidden />
          <motion.span className="absolute left-0 top-0 h-full w-px origin-top bg-forest" style={{ scaleY: progress }} aria-hidden />
          <ul className="space-y-0.5">
            {sections.map((s) => {
              const on = s.id === active;
              return (
                <li key={s.id} className="relative">
                  {on ? <motion.span layoutId="rail-dot" className="absolute -left-[1.155rem] top-[0.7rem] h-[7px] w-[7px] rounded-full bg-forest" transition={t.spring} aria-hidden /> : null}
                  <a
                    href={`#${s.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      go(s.id);
                    }}
                    aria-current={on ? 'location' : undefined}
                    className={`block py-1.5 text-[0.9rem] no-underline transition-colors duration-200 hover:text-ink ${on ? 'font-medium text-ink' : 'text-muted'}`}
                  >
                    {s.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Strip (< lg) */}
      <div className="sticky z-30 -mx-4 lg:hidden" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 3.5rem)' }}>
        <nav aria-label="On this page" className="glass !rounded-none !border-x-0 !border-t-0" style={{ boxShadow: 'none' }}>
          <div ref={strip} className="no-scrollbar flex gap-1 overflow-x-auto px-3 py-1.5">
            {sections.map((s) => {
              const on = s.id === active;
              return (
                <a
                  key={s.id}
                  data-id={s.id}
                  href={`#${s.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    go(s.id);
                  }}
                  aria-current={on ? 'location' : undefined}
                  className={`relative shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-sm no-underline transition-colors duration-200 ${on ? 'text-paper' : 'text-muted'}`}
                >
                  {on ? <motion.span layoutId="strip-pill" className="absolute inset-0 rounded-full bg-ink" transition={t.spring} aria-hidden /> : null}
                  <span className="relative">{s.label}</span>
                </a>
              );
            })}
          </div>
          <motion.div className="h-[2px] origin-left bg-forest" style={{ scaleX: progress }} aria-hidden />
        </nav>
      </div>
    </>
  );
}
