
'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/apiClient';
import Link from 'next/link';

type MatchStatus = 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'ABANDONED';

interface Match {
  _id: string;
  matchType: string;
  venue: string;
  startDateTime: string;
  status: MatchStatus;
  teamA: { _id: string; name: string; shortCode: string };
  teamB: { _id: string; name: string; shortCode: string };
}

async function fetchMatches(status?: string | null) {
  const res = await api.get<Match[]>('/matches', {
    params: status ? { status } : {}
  });
  return res.data;
}

const tabs: { label: string; value?: MatchStatus }[] = [
  { label: 'All' },
  { label: 'Live', value: 'LIVE' },
  { label: 'Upcoming', value: 'UPCOMING' },
  { label: 'Completed', value: 'COMPLETED' }
];

export default function MatchesPage() {
  const params = useSearchParams();
  const status = params.get('status') as MatchStatus | null;
  const { data, isLoading } = useQuery({
    queryKey: ['matches', status],
    queryFn: () => fetchMatches(status)
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Matches</h1>
      <div className="flex gap-2 text-xs">
        {tabs.map((tab) => {
          const active = (tab.value || null) === status;
          const href = tab.value ? `/matches?status=${tab.value}` : '/matches';
          return (
            <Link
              key={tab.label}
              href={href}
              className={`rounded-full px-3 py-1 ${
                active ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800 text-slate-100'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      {isLoading && <p className="text-sm text-slate-400">Loading...</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {data?.map((m) => (
          <Link
            key={m._id}
            href={`/match/${m._id}`}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 hover:border-emerald-500/60"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="uppercase tracking-wide text-emerald-400">{m.matchType}</span>
              <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px]">{m.status}</span>
            </div>
            <div className="mt-2 text-sm">
              <p>
                {m.teamA.shortCode} vs {m.teamB.shortCode}
              </p>
              <p className="text-[11px] text-slate-400">
                {m.venue} ·{' '}
                {new Date(m.startDateTime).toLocaleString(undefined, {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
