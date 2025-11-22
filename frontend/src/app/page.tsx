
'use client';

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
  teamA: { _id: string; name: string; shortCode: string; logoUrl?: string };
  teamB: { _id: string; name: string; shortCode: string; logoUrl?: string };
  currentInnings?: { runs: number; wickets: number; overs: number };
}

async function fetchMatchesByStatus(status: MatchStatus) {
  const res = await api.get<Match[]>('/matches', { params: { status } });
  return res.data;
}

function MatchList({ status, title }: { status: MatchStatus; title: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['matches', status],
    queryFn: () => fetchMatchesByStatus(status)
  });

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Link href={`/matches?status=${status}`} className="text-xs text-emerald-400 hover:underline">
          View all
        </Link>
      </div>
      {isLoading && <p className="text-sm text-slate-400">Loading...</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {data?.map((m) => (
          <Link
            key={m._id}
            href={`/match/${m._id}`}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 hover:border-emerald-500/60"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-1 flex-col text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-emerald-400">{m.matchType}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      m.status === 'LIVE'
                        ? 'bg-red-500/20 text-red-400'
                        : m.status === 'UPCOMING'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-slate-700 text-slate-200'
                    }`}
                  >
                    {m.status}
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>{m.teamA.shortCode}</span>
                    <span className="text-xs text-slate-300">
                      {m.currentInnings && m.status === 'LIVE'
                        ? `${m.currentInnings.runs}/${m.currentInnings.wickets} (${m.currentInnings.overs.toFixed?.(1) ?? m.currentInnings.overs} ov)`
                        : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{m.teamB.shortCode}</span>
                    <span className="text-xs text-slate-500">
                      {new Date(m.startDateTime).toLocaleString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: 'short'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">{m.venue}</p>
          </Link>
        ))}
        {!isLoading && !data?.length && <p className="text-xs text-slate-500">No matches.</p>}
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Cricket Live Scores</h1>
      <MatchList status="LIVE" title="Live Matches" />
      <MatchList status="UPCOMING" title="Upcoming Matches" />
      <MatchList status="COMPLETED" title="Recent Matches" />
    </div>
  );
}
