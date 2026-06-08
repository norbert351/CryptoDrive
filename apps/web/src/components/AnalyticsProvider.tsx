'use client';

import { useEffect, useRef, type PropsWithChildren } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackPageView } from '@/lib/analytics';

export function AnalyticsProvider({ children }: PropsWithChildren) {
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

  return <>{children}</>;
}
