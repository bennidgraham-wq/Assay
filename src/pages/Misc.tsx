import { useEffect, useMemo, useState } from 'react';
import type { Index } from '../lib/data';
import { SOURCE_TYPE_LABELS } from '../lib/evidence';
import { href } from '../lib/router';
import { FoodCompare } from '../components/FoodCompare';
import { Page } from '../components/Layout';
import { SearchField } from '../components/Search';
import { SourceItem } from '../components/Sources';
import { PageTitle } from './shared';
import { openSearch } from '../lib/store';

export function FoodPage({ index, id }: { index: Index; id?: string }) {
  const withFood = index.profiles.filter((p) => p.food_vs_supplement?.foods?.length);
  const current = (id && withFood.find((p) => p.id === id)) || withFood[0];
  return (
    <Page>
      <PageTitle kicker="Food vs. Supplements" title="Can you get it from food?">
        What common servings of food provide, set against the doses used in research, in the same units. A food and an isolated supplement are not automatically
        interchangeable, so each comparison explains where they differ.
      </PageTitle>
      {withFood.length ? (
        <>
          <nav className="flex flex-wrap gap-2 border-b hair py-6" aria-label="Choose a nutrient">
            {withFood.map((p) => (
              <a key={p.id} href={href.food(p.id)} className="chip no-underline" aria-pressed={p.id === current?.id}>
                {p.food_vs_supplement!.nutrient}
              </a>
            ))}
          </nav>
          {current ? (
            <section className="mt-10">
              <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
                <h2 className="display text-4xl">{current.food_vs_supplement!.nutrient}</h2>
                <a href={href.supplement(current.id)} className="link text-sm">Full {current.name} review →</a>
              </div>
              <FoodCompare profile={current} />
            </section>
          ) : null}
        </>
      ) : (
        <p className="py-10 text-muted">Food comparisons appear here once supplement reviews with verified food data are published.</p>
      )}
    </Page>
  );
}

export function ResearchPage({ index }: { index: Index }) {
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const types = useMemo(() => [...new Set(index.sources.map((s) => s.source.type))], [index]);
  const t = q.trim().toLowerCase();
  const list = index.sources.filter(
    ({ source, profiles }) =>
      (type === 'all' || source.type === type) &&
      (!t || [source.title, source.authors, source.journal, ...profiles.map((p) => p.name)].some((x) => x?.toLowerCase().includes(t))),
  );
  return (
    <Page>
      <PageTitle kicker="Research library" title="Every source we cite.">
        {index.sources.length} studies, reviews and fact sheets, each opened and read before it was cited. Open a study's details to see who was studied, what was
        found and its limitations.
      </PageTitle>
      <div className="grid gap-4 border-b hair py-6">
        <div className="flex max-w-md items-center gap-3 border-b pb-2" style={{ borderColor: 'var(--ink)' }}>
          <label htmlFor="research-filter" className="eyebrow shrink-0">Filter</label>
          <input id="research-filter" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title, author, journal or supplement" className="min-w-0 flex-1 bg-transparent placeholder:text-muted focus:outline-none" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="chip" aria-pressed={type === 'all'} onClick={() => setType('all')}>All types</button>
          {types.map((ty) => (
            <button key={ty} className="chip" aria-pressed={type === ty} onClick={() => setType(ty)}>{SOURCE_TYPE_LABELS[ty] ?? ty}</button>
          ))}
        </div>
      </div>
      <ol className="mt-2">
        {list.map(({ source, profiles }) => (
          <div key={source.id}>
            <SourceItem s={source} />
            <div className="-mt-2 mb-2 pl-10 text-xs text-muted">
              Cited in {profiles.map((p, i) => (
                <span key={p.id}>{i ? ', ' : ''}<a href={href.supplement(p.id)} className="link">{p.name}</a></span>
              ))}
            </div>
          </div>
        ))}
      </ol>
    </Page>
  );
}

export function SearchPage() {
  useEffect(() => {
    openSearch();
  }, []);
  return (
    <Page>
      <div className="pb-6 pt-12 md:pt-16">
        <div className="kicker">Search</div>
        <h1 className="t-title mt-3">What do you want to know?</h1>
        <p className="mt-3 max-w-prose text-muted">Search by supplement, ingredient, health outcome, claim or study.</p>
        <div className="mt-8 max-w-3xl">
          <SearchField large />
        </div>
      </div>
    </Page>
  );
}
