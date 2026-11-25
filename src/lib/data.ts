import { useEffect, useState } from 'react';
import type { CatalogItem, Claim, DataBundle, Profile, Source } from './types';
import { ratingValue } from './evidence';

export interface ClaimRef {
  claim: Claim;
  profile: Profile;
}

export interface SourceRef {
  source: Source;
  profiles: Profile[];
}

export interface Index {
  bundle: DataBundle;
  profiles: Profile[];
  byId: Map<string, Profile>;
  catalog: CatalogItem[];
  catalogById: Map<string, CatalogItem>;
  claims: ClaimRef[];
  claimById: Map<string, ClaimRef>;
  sources: SourceRef[];
}

export function buildIndex(bundle: DataBundle): Index {
  const profiles = [...bundle.profiles].sort((a, b) => a.name.localeCompare(b.name));
  const byId = new Map(profiles.map((p) => [p.id, p]));
  const catalog = [...bundle.catalog].sort((a, b) => (a.priority_rank ?? 999) - (b.priority_rank ?? 999));
  const catalogById = new Map(catalog.map((c) => [c.id, c]));
  const claims: ClaimRef[] = profiles.flatMap((profile) => profile.claims.map((claim) => ({ claim, profile })));
  const claimById = new Map(claims.map((c) => [c.claim.id, c]));
  const sourceMap = new Map<string, SourceRef>();
  for (const p of profiles) {
    for (const s of p.sources) {
      const key = s.pmid ? `pmid-${s.pmid}` : s.doi ? `doi-${s.doi.toLowerCase()}` : s.url ?? s.id;
      const existing = sourceMap.get(key);
      if (existing) {
        if (!existing.profiles.includes(p)) existing.profiles.push(p);
      } else sourceMap.set(key, { source: s, profiles: [p] });
    }
  }
  const sources = [...sourceMap.values()].sort((a, b) => Number(b.source.year ?? 0) - Number(a.source.year ?? 0));
  return { bundle, profiles, byId, catalog, catalogById, claims, claimById, sources };
}

export function useData() {
  const [state, setState] = useState<{ index?: Index; error?: string }>({});
  useEffect(() => {
    fetch('data.json')
      .then((r) => {
        if (!r.ok) throw new Error(`data.json returned ${r.status}`);
        return r.json();
      })
      .then((bundle: DataBundle) => setState({ index: buildIndex(bundle) }))
      .catch((e) => setState({ error: String(e.message ?? e) }));
  }, []);
  return state;
}

/** Strongest rating among a supplement's claims (used for "filter by evidence"). */
export const strongestRating = (p: Profile) => Math.max(0, ...p.claims.map((c) => ratingValue(c.rating)));

export const sourceById = (p: Profile, id: string) => p.sources.find((s) => s.id === id);

export const sourceLink = (s: Source) =>
  s.url || (s.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${s.pmid}/` : s.doi ? `https://doi.org/${s.doi}` : undefined);

// ---------- Search ----------

export type Hit =
  | { kind: 'supplement'; id: string; title: string; detail: string; score: number }
  | { kind: 'claim'; id: string; title: string; detail: string; score: number }
  | { kind: 'catalog'; id: string; title: string; detail: string; score: number }
  | { kind: 'study'; id: string; title: string; detail: string; score: number; url?: string };

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

function scoreText(q: string[], fields: [string | undefined, number][]) {
  let total = 0;
  for (const term of q) {
    let best = 0;
    for (const [f, w] of fields) {
      if (!f) continue;
      const t = norm(f);
      if (t === term) best = Math.max(best, w * 3);
      else if (t.startsWith(term) || t.includes(' ' + term)) best = Math.max(best, w * 2);
      else if (t.includes(term)) best = Math.max(best, w);
    }
    if (best === 0) return 0; // every term must match somewhere
    total += best;
  }
  return total;
}

const STOP = new Set(['does', 'do', 'is', 'it', 'the', 'a', 'an', 'for', 'and', 'of', 'to', 'can', 'help', 'with', 'my', 'me', 'what', 'about', 'really', 'work', 'actually']);

export function search(index: Index, raw: string): Hit[] {
  const q = norm(raw)
    .replace(/[^a-z0-9\- ]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
  if (!q.length) return [];
  const hits: Hit[] = [];
  for (const p of index.profiles) {
    const foods = p.food_vs_supplement?.foods.map((f) => f.food).join(' ');
    const s = scoreText(q, [
      [p.name, 10],
      [(p.aliases ?? []).join(' '), 6],
      [(p.formulations ?? []).map((f) => f.name).join(' '), 5],
      [(p.outcomes ?? []).join(' '), 5],
      [p.category, 3],
      [p.claims.map((c) => `${c.claim} ${c.outcome ?? ''}`).join(' '), 3],
      [foods, 2],
      [p.summary, 1],
    ]);
    if (s) hits.push({ kind: 'supplement', id: p.id, title: p.name, detail: p.summary, score: s + 5 });
  }
  for (const { claim, profile } of index.claims) {
    const s = scoreText(q, [
      [claim.claim, 6],
      [claim.question, 6],
      [claim.outcome, 5],
      [profile.name, 5],
      [(profile.aliases ?? []).join(' '), 2],
      [claim.popular_framing, 2],
    ]);
    if (s) hits.push({ kind: 'claim', id: claim.id, title: claim.question || claim.claim, detail: claim.bottom_line, score: s });
  }
  for (const c of index.catalog) {
    if (index.byId.has(c.id)) continue;
    const s = scoreText(q, [
      [c.name, 8],
      [(c.aliases ?? []).join(' '), 5],
      [(c.outcomes ?? []).join(' '), 3],
      [(c.common_claims ?? []).join(' '), 2],
    ]);
    if (s) hits.push({ kind: 'catalog', id: c.id, title: c.name, detail: `${c.category} · Not yet reviewed`, score: s - 2 });
  }
  for (const { source, profiles } of index.sources) {
    const s = scoreText(q, [
      [source.title, 3],
      [profiles.map((p) => p.name).join(' '), 2],
      [source.journal, 1],
      [source.authors, 1],
    ]);
    if (s)
      hits.push({
        kind: 'study',
        id: source.id,
        title: source.title,
        detail: [source.authors?.split(',')[0], source.journal, source.year].filter(Boolean).join(' · '),
        score: s - 4,
        url: sourceLink(source),
      });
  }
  return hits.sort((a, b) => b.score - a.score);
}

/** Who signed off the published reviews, and how many are still drafts. Drives the footer and Method page. */
export function reviewSummary(index: Index) {
  const reviewed = index.profiles.filter((p) => p.review_status === 'reviewed' && p.reviewed_by);
  const reviewers = [...new Set(reviewed.map((p) => p.reviewed_by!))];
  const latest = reviewed.map((p) => p.reviewed_on ?? '').sort().pop() || undefined;
  return { reviewers, latest, pending: index.profiles.length - reviewed.length, total: index.profiles.length };
}
export type ReviewSummary = ReturnType<typeof reviewSummary>;

export const joinNames = (names: string[]) =>
  names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
