import type { Metadata } from 'next';
import './globals.css';
import { WalletProviders } from '@/components/WalletProviders';
import { WalletModalProvider } from '@/components/WalletModalProvider';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'CryptoDrive',
  description: 'Web3 file storage on Shelby and Aptos testnet',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#030712] text-zinc-100 antialiased selection:bg-emerald-500/30">
        <WalletProviders>
          <WalletModalProvider>
            <Navbar />
            <main className="mx-auto max-w-6xl px-4 py-8 pb-24 sm:px-6 md:pb-8">
              {children}
            </main>
            <BottomNav />
          </WalletModalProvider>
        </WalletProviders>
      </body>
    </html>
  );
}
