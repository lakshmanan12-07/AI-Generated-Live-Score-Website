
import './globals.css';
import ReactQueryProvider from '@/components/ReactQueryProvider';
import Link from 'next/link';

export const metadata = {
  title: 'Cric Live',
  description: 'Simple cricket live scoring platform'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <ReactQueryProvider>
          <div className="flex min-h-screen flex-col">
            <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur">
              <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
                <Link href="/" className="flex items-center gap-2">
                  <span className="h-8 w-8 rounded-lg bg-emerald-500"></span>
                  <span className="text-xl font-semibold">Cric Live</span>
                </Link>
                <nav className="flex gap-4 text-sm">
                  <Link href="/matches" className="hover:text-emerald-400">
                    Matches
                  </Link>
                  <Link href="/teams" className="hover:text-emerald-400">
                    Teams
                  </Link>
                  <Link href="/players" className="hover:text-emerald-400">
                    Players
                  </Link>
                  <Link href="/stats" className="hover:text-emerald-400">
                    Stats
                  </Link>
                  <Link href="/admin" className="hover:text-emerald-400">
                    Admin
                  </Link>
                </nav>
              </div>
            </header>
            <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-4">{children}</main>
          </div>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
