'use client';

import { Suspense, useEffect, useRef, type PropsWithChildren } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackPageView } from '@/lib/analytics';

function AnalyticsPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialised = useRef(false);

  const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');

  useEffect(() => {
    if (!initialised.current) {
      initialised.current = true;
      trackPageView(url);
      return;
    }
    trackPageView(url);
  }, [url]);

  return null;
}

export function AnalyticsProvider({ children }: PropsWithChildren) {
  return (
    <Suspense fallback={null}>
      <AnalyticsPageView />
      {children}
    </Suspense>
  );
}
