import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { WalletProviders } from '@/components/WalletProviders';
import { WalletModalProvider } from '@/components/WalletModalProvider';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { AnalyticsProvider } from '@/components/AnalyticsProvider';

export const metadata: Metadata = {
  title: 'CryptoDrive',
  description: 'Web3 file storage on Shelby and Aptos testnet',
};

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

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
        {CLARITY_ID ? (
          <Script id="clarity-init" strategy="afterInteractive">
            {`
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window,document,"clarity","script","${CLARITY_ID}");
            `}
          </Script>
        ) : null}
        <WalletProviders>
          <WalletModalProvider>
            <AnalyticsProvider>
              <Navbar />
              <main className="mx-auto max-w-6xl px-4 py-8 pb-24 sm:px-6 md:pb-8">
                {children}
              </main>
              <BottomNav />
            </AnalyticsProvider>
          </WalletModalProvider>
        </WalletProviders>
      </body>
    </html>
  );
}
