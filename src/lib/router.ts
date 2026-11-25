import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { prefersReducedMotion } from './motion';

// Hash routes are plain names (the hosting frame only passes "#name"):
//   #home  #explore  #claims  #food  #research  #method  #search
//   #s-<supplementId>   #c-<claimId>   #food-<supplementId>
export type Route =
  | { page: 'home' }
  | { page: 'explore' }
  | { page: 'claims' }
  | { page: 'food'; id?: string }
  | { page: 'research' }
  | { page: 'method' }
  | { page: 'search' }
  | { page: 'supplement'; id: string }
  | { page: 'claim'; id: string };

export function parse(hash: string): Route {
  const h = decodeURIComponent(hash.replace(/^#/, ''));
  if (h.startsWith('s-')) return { page: 'supplement', id: h.slice(2) };
  if (h.startsWith('c-')) return { page: 'claim', id: h.slice(2) };
  if (h.startsWith('food-')) return { page: 'food', id: h.slice(5) };
  switch (h) {
    case 'explore':
    case 'claims':
    case 'research':
    case 'method':
    case 'search':
      return { page: h };
    case 'food':
      return { page: 'food' };
    default:
      return { page: 'home' };
  }
}

export const href = {
  home: '#home',
  explore: '#explore',
  claims: '#claims',
  food: (id?: string) => (id ? `#food-${id}` : '#food'),
  research: '#research',
  method: '#method',
  search: '#search',
  supplement: (id: string) => `#s-${id}`,
  claim: (id: string) => `#c-${id}`,
};

export function useRoute() {
  const [route, setRoute] = useState<Route>(() => parse(location.hash));
  useEffect(() => {
    const on = () => {
      const next = parse(location.hash);
      const apply = () => {
        flushSync(() => setRoute(next));
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      };
      // Page transitions: a short cross-fade, with the supplement's name carried from the list
      // to its page (shared element). Progressive enhancement; skipped under reduced motion.
      const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
      if (doc.startViewTransition && !prefersReducedMotion()) doc.startViewTransition(apply);
      else apply();
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
