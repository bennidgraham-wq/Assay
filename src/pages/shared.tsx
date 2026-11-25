import type { ReactNode } from 'react';
import { href } from '../lib/router';
import { Page } from '../components/Layout';

export function SectionHead({ kicker, title, note, action }: { kicker?: string; title: string; note?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
      <div className="min-w-0 max-w-2xl">
        {kicker ? <div className="kicker mb-2">{kicker}</div> : null}
        <h2 className="t-h2">{title}</h2>
        {note ? <p className="mt-3 max-w-prose text-[0.97rem] leading-relaxed text-muted">{note}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function PageTitle({ kicker, title, children }: { kicker: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="border-b hair pb-10 pt-12 md:pt-16">
      <div className="kicker">{kicker}</div>
      <h1 className="t-title mt-4 max-w-4xl">{title}</h1>
      {children ? <div className="mt-6 max-w-prose text-lg leading-relaxed text-muted">{children}</div> : null}
    </header>
  );
}

export function NotFound({ title, body }: { title: string; body?: string }) {
  return (
    <Page>
      <div className="py-24">
        <h1 className="t-h2">{title}</h1>
        {body ? <p className="mt-4 max-w-prose text-muted">{body}</p> : null}
        <a href={href.explore} className="link mt-6 inline-block">Browse reviewed supplements →</a>
      </div>
    </Page>
  );
}
