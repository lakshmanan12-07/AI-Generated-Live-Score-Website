
'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/apiClient';

async function fetchTeam(id: string) {
  const res = await api.get(`/teams/${id}`);
  return res.data;
}

export default function TeamDetailPage() {
  const params = useParams();
  const teamId = params?.teamId as string;
  const { data, isLoading, error } = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => fetchTeam(teamId)
  });

  if (isLoading) return <p className="text-sm text-slate-400">Loading...</p>;
  if (error || !data) return <p className="text-sm text-red-400">Failed to load team.</p>;

  const { team, stats } = data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div>
          <p className="text-xl font-semibold">{team.name}</p>
          <p className="text-xs text-slate-400">{team.shortCode}</p>
        </div>
        {team.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.logoUrl} alt={team.name} className="h-12 w-12 rounded-full object-cover" />
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm">
          <p className="font-semibold">Matches</p>
          <p className="mt-1 text-xs text-slate-300">
            Played: {stats.totalMatches} · Wins: {stats.wins} · Losses: {stats.losses}
          </p>
          <p className="mt-1 text-xs text-emerald-400">Win %: {stats.winPct}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm">
          <p className="font-semibold">Runs</p>
          <p className="mt-1 text-xs text-slate-300">Total: {stats.totalRuns}</p>
          <p className="mt-1 text-xs text-slate-300">Highest: {stats.highestTotal}</p>
          <p className="mt-1 text-xs text-emerald-400">Average: {stats.avgScore}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <p className="mb-2 text-sm font-semibold">Top Batsmen</p>
          <ul className="space-y-1 text-xs">
            {stats.topBatsmen.map((p: any) => (
              <li key={p.player._id} className="flex items-center justify-between">
                <span>{p.player.name}</span>
                <span className="text-slate-400">
                  {p.batting.runs} runs · SR {p.batting.strikeRate}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <p className="mb-2 text-sm font-semibold">Top Bowlers</p>
          <ul className="space-y-1 text-xs">
            {stats.topBowlers.map((p: any) => (
              <li key={p.player._id} className="flex items-center justify-between">
                <span>{p.player.name}</span>
                <span className="text-slate-400">
                  {p.bowling.wickets} wkts · {p.bowling.balls} balls
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
