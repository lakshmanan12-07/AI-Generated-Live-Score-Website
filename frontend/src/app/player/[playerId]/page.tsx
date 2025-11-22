
'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/apiClient';

async function fetchPlayer(id: string) {
  const res = await api.get(`/players/${id}`);
  return res.data;
}

export default function PlayerDetailPage() {
  const params = useParams();
  const playerId = params?.playerId as string;
  const { data, isLoading, error } = useQuery({
    queryKey: ['player', playerId],
    queryFn: () => fetchPlayer(playerId)
  });

  if (isLoading) return <p className="text-sm text-slate-400">Loading...</p>;
  if (error || !data) return <p className="text-sm text-red-400">Failed to load player.</p>;

  const { player, stats } = data;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <p className="text-xl font-semibold">{player.name}</p>
        <p className="text-xs text-slate-400">
          {player.role} · {player.team?.name}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          Batting: {player.battingStyle || '—'} · Bowling: {player.bowlingStyle || '—'}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3 text-xs">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <p className="font-semibold">Batting</p>
          <p className="mt-1 text-slate-300">Matches: {stats.matchesPlayed}</p>
          <p>Total runs: {stats.totalRuns}</p>
          <p>Balls faced: {stats.ballsFaced}</p>
          <p>Average: {stats.battingAverage}</p>
          <p>Strike rate: {stats.strikeRate}</p>
          <p>50s: {stats.fifties}</p>
          <p>100s: {stats.hundreds}</p>
          <p>Ducks: {stats.ducks}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <p className="font-semibold">Bowling</p>
          <p className="mt-1 text-slate-300">Wickets: {stats.totalWickets}</p>
          <p>Best: {stats.bestBowling}</p>
          <p>Economy: {stats.economyRate}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <p className="font-semibold">Over-wise batting</p>
          <div className="mt-1 max-h-40 overflow-y-auto space-y-1">
            {stats.overWiseBatting.map((o: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between">
                <span>Over {o.overNumber}</span>
                <span className="text-slate-400">
                  {o.runs} runs · {o.boundaries}x4/6
                </span>
              </div>
            ))}
            {!stats.overWiseBatting.length && (
              <p className="text-xs text-slate-500">No batting data yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
