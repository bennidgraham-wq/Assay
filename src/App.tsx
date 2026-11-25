import { reviewSummary, useData } from './lib/data';
import { useRoute } from './lib/router';
import { Footer, Header } from './components/Layout';
import { HomePage } from './pages/Home';
import { ExplorePage } from './pages/Explore';
import { SupplementPage } from './pages/Supplement';
import { ClaimPage, ClaimsPage } from './pages/Claims';
import { MethodPage } from './pages/Method';
import { FoodPage, ResearchPage, SearchPage } from './pages/Misc';
import { SearchOverlay, useSearchShortcut } from './components/Search';
import { closeSearch, setCompareOpen } from './lib/store';
import { useEffect } from 'react';
import { CompareDock } from './components/Compare';

export default function App() {
  const route = useRoute();
  const { index, error } = useData();
  useSearchShortcut();
  // Floating layers never outlive the page they were opened on (e.g. after Back).
  const routeKey = route.page + ('id' in route ? route.id ?? '' : '');
  useEffect(() => {
    if (route.page !== 'search') closeSearch();
    setCompareOpen(false);
  }, [routeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  let body: React.ReactNode;
  if (error) body = <Status text={`The research data couldn't be loaded (${error}).`} />;
  else if (!index) body = <Status text="Loading the evidence…" />;
  else {
    switch (route.page) {
      case 'explore': body = <ExplorePage index={index} />; break;
      case 'supplement': body = <SupplementPage index={index} id={route.id} />; break;
      case 'claims': body = <ClaimsPage index={index} />; break;
      case 'claim': body = <ClaimPage index={index} id={route.id} />; break;
      case 'food': body = <FoodPage index={index} id={route.id} />; break;
      case 'research': body = <ResearchPage index={index} />; break;
      case 'method': body = <MethodPage index={index} />; break;
      case 'search': body = <SearchPage />; break;
      default: body = <HomePage index={index} />;
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-paper focus:px-3 focus:py-2">Skip to content</a>
      <Header route={route} />
      <div id="main" className="flex-1" key={route.page + ('id' in route ? route.id ?? '' : '')}>
        {body}
      </div>
      <Footer generated={index?.bundle.generated} review={index ? reviewSummary(index) : undefined} />
      {index ? <SearchOverlay index={index} /> : null}
      {index ? <CompareDock index={index} /> : null}
    </div>
  );
}

function Status({ text }: { text: string }) {
  return (
    <div className="gutter">
      <p className="wrap display py-32 text-2xl text-muted">{text}</p>
    </div>
  );
}
