import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { WalletProviders } from '@/components/WalletProviders';
import { WalletModalProvider } from '@/components/WalletModalProvider';
import { ClarityProvider } from '@/components/providers/ClarityProvider';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { AnalyticsProvider } from '@/components/AnalyticsProvider';

export const metadata: Metadata = {
  title: 'CryptoDrive',
  description: 'Web3 file storage on Shelby and Aptos testnet',
};

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#030712] text-zinc-100 antialiased selection:bg-emerald-500/30">
        {GA_ID ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', {
                  page_path: window.location.pathname,
                });
              `}
            </Script>
          </>
        ) : null}
        <WalletProviders>
          <WalletModalProvider>
            <ClarityProvider>
            <AnalyticsProvider>
              <Navbar />
              <main className="mx-auto max-w-6xl px-4 py-8 pb-24 sm:px-6 md:pb-8">
                {children}
              </main>
              <BottomNav />
            </AnalyticsProvider>
            </ClarityProvider>
          </WalletModalProvider>
        </WalletProviders>
      </body>
    </html>
  );
}
