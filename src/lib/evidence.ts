import type { Rating, Verdict, Claim } from './types';

// The evidence scale from RESEARCH/METHODOLOGY.md, section 3. Single source of truth for the UI.
export const SCALE: { rating: Rating; short: string; name: string; meaning: string; pattern: string }[] = [
  {
    rating: 'against',
    short: '✕',
    name: 'Evidence against',
    meaning: 'Good research has looked, and it finds no meaningful benefit (or finds harm).',
    pattern: 'Adequately powered trials or meta-analyses consistently show no clinically meaningful effect, or show harm.',
  },
  {
    rating: 1,
    short: '1',
    name: 'Unsupported',
    meaning: "There isn't enough human research to say.",
    pattern: 'No meaningful human trials. Only animal, lab or anecdotal evidence.',
  },
  {
    rating: 2,
    short: '2',
    name: 'Limited',
    meaning: 'There is some human data, but it is too weak or mixed to draw conclusions.',
    pattern: 'Very small or low-quality trials, observational data only, or conflicting results.',
  },
  {
    rating: 3,
    short: '3',
    name: 'Promising',
    meaning: "Some good human research points this way, but it isn't settled.",
    pattern: 'A few positive trials that are small, short or partly inconsistent; or a low-certainty meta-analysis.',
  },
  {
    rating: 4,
    short: '4',
    name: 'Strong evidence',
    meaning: 'Substantial human research supports it, with some caveats.',
    pattern: 'Several trials or a meta-analysis showing a meaningful effect, with some limitations.',
  },
  {
    rating: 5,
    short: '5',
    name: 'Well established',
    meaning: "Consistent, high-quality research supports it. We'd be surprised if this changed.",
    pattern: 'Multiple high-quality meta-analyses or many large trials, consistent and independently replicated.',
  },
];

export const scaleFor = (r: Rating) => SCALE.find((s) => s.rating === r) ?? SCALE[1];

export const VERDICTS: Record<Verdict, { label: string; tone: 'yes' | 'part' | 'unknown' | 'no'; blurb: string }> = {
  supported: { label: 'Supported', tone: 'yes', blurb: 'Strong human evidence supports the claim as usually stated.' },
  partly_true: { label: 'Partly true', tone: 'part', blurb: 'True only in part, or only for some people, forms or doses.' },
  not_established: { label: 'Not established', tone: 'unknown', blurb: "There isn't enough good research to say. That is not the same as false." },
  contradicted: { label: 'Contradicted', tone: 'no', blurb: 'Good research has tested it and finds no meaningful benefit.' },
};

/** Numeric sort key: higher = stronger support. 'against' sorts below 1. */
export const ratingValue = (r: Rating) => (r === 'against' ? 0 : r);

export const FACTOR_LABELS: [keyof NonNullable<Claim['factors']>, string][] = [
  ['study_quality', 'Study quality'],
  ['consistency', 'Consistency'],
  ['effect_size', 'Effect size'],
  ['clinical_significance', 'Clinical significance'],
  ['sample_size', 'Sample size'],
  ['population', 'Population'],
  ['conflicts_of_interest', 'Conflicts of interest'],
  ['reproducibility', 'Reproducibility'],
  ['formulation_dose', 'Formulation & dose'],
];

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  'meta-analysis': 'Meta-analysis',
  'systematic-review': 'Systematic review',
  rct: 'Randomised trial',
  cohort: 'Cohort study',
  'other-human': 'Human study',
  'animal-lab': 'Animal / lab',
  'fact-sheet': 'Fact sheet',
  guideline: 'Guideline',
};

export const CATEGORIES = [
  'Vitamins',
  'Minerals',
  'Amino acids',
  'Fatty acids',
  'Herbal supplements',
  'Adaptogens',
  'Sports performance',
  'Other compounds',
];
