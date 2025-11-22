
'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/apiClient';

async function fetchBatting() {
  const res = await api.get('/stats/batting');
  return res.data;
}
async function fetchBowling() {
  const res = await api.get('/stats/bowling');
  return res.data;
}
async function fetchTeams() {
  const res = await api.get('/stats/teams');
  return res.data;
}

export default function StatsPage() {
  const { data: batting } = useQuery({ queryKey: ['stats-batting'], queryFn: fetchBatting });
  const { data: bowling } = useQuery({ queryKey: ['stats-bowling'], queryFn: fetchBowling });
  const { data: teams } = useQuery({ queryKey: ['stats-teams'], queryFn: fetchTeams });

  return (
    <div className="space-y-4 text-xs">
      <h1 className="text-xl font-semibold">Leaderboards</h1>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <p className="mb-2 text-sm font-semibold">Top Batsmen (Runs)</p>
          <div className="max-h-72 overflow-y-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-slate-900">
                <tr className="text-left">
                  <th className="px-2 py-1">Player</th>
                  <th className="px-2 py-1 text-right">R</th>
                  <th className="px-2 py-1 text-right">B</th>
                  <th className="px-2 py-1 text-right">SR</th>
                  <th className="px-2 py-1 text-right">Avg</th>
                </tr>
              </thead>
              <tbody>
                {batting?.map((b: any) => (
                  <tr key={b.playerId} className="border-t border-slate-800">
                    <td className="px-2 py-1">{b.playerName}</td>
                    <td className="px-2 py-1 text-right">{b.runs}</td>
                    <td className="px-2 py-1 text-right">{b.balls}</td>
                    <td className="px-2 py-1 text-right">{b.strikeRate}</td>
                    <td className="px-2 py-1 text-right">{b.average}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <p className="mb-2 text-sm font-semibold">Top Bowlers (Wickets)</p>
          <div className="max-h-72 overflow-y-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-slate-900">
                <tr className="text-left">
                  <th className="px-2 py-1">Player</th>
                  <th className="px-2 py-1 text-right">Wkts</th>
                  <th className="px-2 py-1 text-right">Runs</th>
                  <th className="px-2 py-1 text-right">Balls</th>
                  <th className="px-2 py-1 text-right">Econ</th>
                </tr>
              </thead>
              <tbody>
                {bowling?.map((b: any) => (
                  <tr key={b.playerId} className="border-t border-slate-800">
                    <td className="px-2 py-1">{b.playerName}</td>
                    <td className="px-2 py-1 text-right">{b.wickets}</td>
                    <td className="px-2 py-1 text-right">{b.runsConceded}</td>
                    <td className="px-2 py-1 text-right">{b.balls}</td>
                    <td className="px-2 py-1 text-right">{b.economy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 md:col-span-2">
          <p className="mb-2 text-sm font-semibold">Team Standings</p>
          <div className="max-h-72 overflow-y-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-slate-900">
                <tr className="text-left">
                  <th className="px-2 py-1">Team</th>
                  <th className="px-2 py-1 text-right">P</th>
                  <th className="px-2 py-1 text-right">W</th>
                  <th className="px-2 py-1 text-right">L</th>
                  <th className="px-2 py-1 text-right">Pts</th>
                  <th className="px-2 py-1 text-right">Win %</th>
                </tr>
              </thead>
              <tbody>
                {teams?.map((t: any) => (
                  <tr key={t.teamId} className="border-t border-slate-800">
                    <td className="px-2 py-1">{t.name}</td>
                    <td className="px-2 py-1 text-right">{t.totalMatches}</td>
                    <td className="px-2 py-1 text-right">{t.wins}</td>
                    <td className="px-2 py-1 text-right">{t.losses}</td>
                    <td className="px-2 py-1 text-right">{t.points}</td>
                    <td className="px-2 py-1 text-right">{t.winPct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
