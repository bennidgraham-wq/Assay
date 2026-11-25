// Builds the website's data and the DATABASE tables from the research profiles.
//
//   Inputs:  RESEARCH/profiles/*.json          (one verified profile per supplement)
//            DATABASE/catalog.json              (the full supplement catalogue)
//            RESEARCH/verification/recheck.json (optional: results of the independent citation re-check)
//   Outputs: WEBSITE/public/data.json          (what the site reads)
//            DATABASE/*.json + DATABASE/*.csv   (supplements, claims, studies, food_sources,
//                                               evidence_assessments, claim_studies)
//
// Adding a supplement = drop a new profile JSON into RESEARCH/profiles and run `npm run data`.
// No page needs editing.
//
// Usage: node scripts/build-data.mjs            (PROJECT_DIR defaults to the folder above WEBSITE)
//        PROJECT_DIR=/path/to/project node scripts/build-data.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = process.env.PROJECT_DIR || path.resolve(siteDir, '..');
const P = (...p) => path.join(PROJECT, ...p);
const today = new Date().toISOString().slice(0, 10);

const RATINGS = new Set([1, 2, 3, 4, 5, 'against']);
const VERDICTS = new Set(['supported', 'partly_true', 'not_established', 'contradicted']);
const expectedVerdicts = (r) =>
  r === 'against' ? ['contradicted'] : r >= 4 ? ['supported', 'partly_true'] : r === 3 ? ['partly_true'] : ['not_established'];

const problems = [];
const warn = (where, msg) => problems.push(`${where}: ${msg}`);

const readJSON = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const catalog = readJSON(P('DATABASE', 'catalog.json')).items;

let recheck = {};
const recheckFile = P('RESEARCH', 'verification', 'recheck.json');
if (fs.existsSync(recheckFile)) recheck = readJSON(recheckFile).results ?? {};

const stripPrivate = (o) =>
  Array.isArray(o) ? o.map(stripPrivate) : o && typeof o === 'object'
    ? Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith('_')).map(([k, v]) => [k, stripPrivate(v)]))
    : o;

const profileDir = P('RESEARCH', 'profiles');
const files = fs.existsSync(profileDir) ? fs.readdirSync(profileDir).filter((f) => f.endsWith('.json')).sort() : [];
const profiles = [];

for (const file of files) {
  let p;
  try {
    p = stripPrivate(readJSON(path.join(profileDir, file)));
  } catch (e) {
    warn(file, `not valid JSON (${e.message}); skipped`);
    continue;
  }
  const where = p.id || file;
  // The catalogue is the single source of truth for categories.
  const cat = catalog.find((c) => c.id === p.id);
  if (cat && p.category !== cat.category) { warn(where, `category "${p.category}" normalised to "${cat.category}"`); p.category = cat.category; }
  for (const k of ['id', 'name', 'category', 'summary']) if (!p[k]) warn(where, `missing ${k}`);
  p.sources = Array.isArray(p.sources) ? p.sources : [];
  p.claims = Array.isArray(p.claims) ? p.claims : [];

  // Sources: must have been read, must have an identifier/link, must not have failed the re-check.
  p.sources = p.sources.filter((s) => {
    const r = recheck[`${p.id}:${s.id}`];
    if (r && r.status === 'fail') {
      warn(where, `source ${s.id} removed: failed re-check (${r.note ?? ''})`);
      return false;
    }
    if (!s.verification || !s.verification.read) {
      warn(where, `source ${s.id} removed: no record that it was read`);
      return false;
    }
    if (!s.pmid && !s.doi && !s.url) {
      warn(where, `source ${s.id} removed: no PMID, DOI or URL`);
      return false;
    }
    if (r) s.verification = { ...s.verification, rechecked_on: r.checked_on ?? today, recheck_result: r.status };
    if (s.year != null && !isNaN(Number(s.year))) s.year = Number(s.year);
    return true;
  });
  const ids = new Set(p.sources.map((s) => s.id));

  // Claims: valid rating + verdict, at least one surviving source.
  p.claims = p.claims.filter((c) => {
    if (c.rating != null && !isNaN(Number(c.rating)) && c.rating !== 'against') c.rating = Number(c.rating);
    if (!RATINGS.has(c.rating)) return warn(where, `claim ${c.id} dropped: bad rating ${c.rating}`), false;
    if (!VERDICTS.has(c.verdict)) return warn(where, `claim ${c.id} dropped: bad verdict ${c.verdict}`), false;
    if (!expectedVerdicts(c.rating).includes(c.verdict)) warn(where, `claim ${c.id}: verdict "${c.verdict}" unusual for rating ${c.rating} (kept)`);
    const missing = (c.source_ids ?? []).filter((id) => !ids.has(id));
    if (missing.length) warn(where, `claim ${c.id}: unknown/removed sources ${missing.join(', ')} unlinked`);
    c.source_ids = (c.source_ids ?? []).filter((id) => ids.has(id));
    if (!c.source_ids.length) return warn(where, `claim ${c.id} dropped: no verified source left`), false;
    return true;
  });

  // Food rows must cite a surviving source.
  if (p.food_vs_supplement) {
    const f = p.food_vs_supplement;
    f.foods = (f.foods ?? []).filter((x) => {
      const ok = typeof x.amount === 'number' && x.source_id && ids.has(x.source_id);
      if (!ok) warn(where, `food row "${x.food}" dropped: needs numeric amount and a verified source`);
      return ok;
    });
    if (!f.foods.length) p.food_vs_supplement = null;
  }

  if (!p.claims.length) {
    warn(where, 'profile skipped: no publishable claims');
    continue;
  }
  p.related = (p.related ?? []).filter((r) => r !== p.id);
  profiles.push(p);
}

// Keep only related links that point at published profiles.
const published = new Set(profiles.map((p) => p.id));
for (const p of profiles) p.related = p.related.filter((r) => published.has(r));

// ---------- Website bundle ----------
const generated = today;
const bundle = { generated, catalog, profiles };
fs.mkdirSync(path.join(siteDir, 'public'), { recursive: true });
fs.writeFileSync(path.join(siteDir, 'public', 'data.json'), JSON.stringify(bundle));

// ---------- DATABASE tables (relational shape from PRD 9.2) ----------
const supplements = profiles.map((p) => ({
  id: p.id, name: p.name, category: p.category, aliases: p.aliases ?? [], summary: p.summary,
  description: p.description ?? '', biological_function: p.biological_function ?? '',
  formulations: (p.formulations ?? []).map((f) => f.name), absorption: p.absorption ?? '',
  side_effects: p.side_effects ?? '', interactions: p.interactions ?? '', cautions: p.cautions ?? '',
  upper_limit: p.upper_limit ?? '', research_doses_summary: p.research_doses_summary ?? '',
  review_status: p.review_status ?? 'draft_ai', reviewed_by: p.reviewed_by ?? '', reviewed_on: p.reviewed_on ?? '', last_updated: p.last_updated ?? generated,
}));
const claims = profiles.flatMap((p) => p.claims.map((c) => ({
  id: c.id, supplement_id: p.id, claim: c.claim, question: c.question ?? '', health_outcome: c.outcome ?? '',
  population: c.population ?? '', evidence_rating: c.rating, verdict: c.verdict, scientific_conclusion: c.bottom_line,
  myth_feature: !!c.myth_feature,
})));
const studyMap = new Map();
for (const p of profiles) for (const s of p.sources) {
  const key = s.pmid ? `pmid-${s.pmid}` : s.doi ? `doi-${s.doi.toLowerCase()}` : s.url;
  if (!studyMap.has(key)) studyMap.set(key, {
    id: key, title: s.title, authors: s.authors ?? '', year: s.year ?? '', journal: s.journal ?? '', pmid: s.pmid ?? '',
    doi: s.doi ?? '', url: s.url ?? '', study_type: s.type, sample_size: s.sample_size ?? '', population: s.population ?? '',
    dosage_duration: s.intervention ?? '', findings: s.findings ?? '', limitations: s.limitations ?? '', funding: s.funding ?? '',
    read: s.verification?.read ?? '', checked_on: s.verification?.checked_on ?? '', rechecked_on: s.verification?.rechecked_on ?? '',
  });
}
const studyKey = (p, sid) => {
  const s = p.sources.find((x) => x.id === sid);
  return s.pmid ? `pmid-${s.pmid}` : s.doi ? `doi-${s.doi.toLowerCase()}` : s.url;
};
const claim_studies = profiles.flatMap((p) => p.claims.flatMap((c) => c.source_ids.map((sid) => ({ claim_id: c.id, study_id: studyKey(p, sid) }))));
const evidence_assessments = profiles.flatMap((p) => p.claims.map((c) => ({
  id: `assess-${c.id}`, claim_id: c.id, rating: c.rating, supporting_study_ids: c.source_ids.map((sid) => studyKey(p, sid)),
  assessment_date: p.reviewed_on || p.last_updated || generated, reviewer: p.review_status === 'reviewed' && p.reviewed_by ? p.reviewed_by : 'AI draft (pending review)',
  explanation: [c.what_research_found, c.limitations].filter(Boolean).join(' '),
  ...Object.fromEntries(Object.entries(c.factors ?? {}).map(([k, v]) => [`factor_${k}`, v])),
})));
const food_sources = profiles.flatMap((p) => (p.food_vs_supplement?.foods ?? []).map((f, i) => ({
  id: `${p.id}-food-${i + 1}`, supplement_id: p.id, nutrient: p.food_vs_supplement.nutrient, food: f.food, serving: f.serving,
  amount_per_serving: f.amount, unit: f.unit, source_of_data: studyKey(p, f.source_id),
})));

const toCSV = (rows) => {
  if (!rows.length) return '';
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const esc = (v) => {
    const s = Array.isArray(v) ? v.join('; ') : v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n') + '\n';
};
const tables = { supplements, claims, studies: [...studyMap.values()], claim_studies, evidence_assessments, food_sources };
for (const [name, rows] of Object.entries(tables)) {
  fs.writeFileSync(P('DATABASE', `${name}.json`), JSON.stringify(rows, null, 2) + '\n');
  fs.writeFileSync(P('DATABASE', `${name}.csv`), toCSV(rows));
}
fs.writeFileSync(
  P('DATABASE', 'build-report.txt'),
  [`Data build ${generated}`, `Profiles published: ${profiles.length} of ${files.length}`, `Claims: ${claims.length}`, `Studies: ${studyMap.size}`, `Food rows: ${food_sources.length}`, '', 'Problems:', ...(problems.length ? problems : ['none'])].join('\n') + '\n',
);

console.log(`profiles ${profiles.length}/${files.length} · claims ${claims.length} · studies ${studyMap.size} · food rows ${food_sources.length}`);
if (problems.length) console.log('\n' + problems.map((x) => ' - ' + x).join('\n'));
