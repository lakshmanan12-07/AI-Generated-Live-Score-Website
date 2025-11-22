
'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/apiClient';
import { useMatchSocket } from '@/lib/useMatchSocket';
import { notFound, useParams } from 'next/navigation';
import { useState } from 'react';

interface ScorecardBatting {
  player: { _id: string; name: string };
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  dismissalType?: string;
  strikeRate: number;
}

interface ScorecardBowling {
  player: { _id: string; name: string };
  runsConceded: number;
  balls: number;
  wickets: number;
  overs: string;
  economy: number;
}

interface OverSummary {
  overNumber: number;
  bowler?: { _id: string; name: string };
  runs: number;
  wickets: number;
  balls?: { ballInOver: number; runs: number; isWicket: boolean; dismissalType?: string }[];
}

interface Innings {
  _id: string;
  battingTeam: { _id: string; name: string; shortCode: string };
  bowlingTeam: { _id: string; name: string; shortCode: string };
  runs: number;
  wickets: number;
  overs: number;
  runRate: number;
  fallOfWickets: {
    wicketNumber: number;
    dismissedBatsman: { _id: string; name: string };
    scoreAtDismissal: number;
    over: number;
  }[];
}

interface MatchDetailResponse {
  match: any;
  innings: Innings[];
  scorecards: {
    innings: Innings;
    batting: ScorecardBatting[];
    bowling: ScorecardBowling[];
    oversSummary: OverSummary[];
  }[];
}

async function fetchMatch(matchId: string) {
  const res = await api.get<MatchDetailResponse>(`/matches/${matchId}`);
  return res.data;
}

const tabs = ['Live', 'Scorecard', 'Overs', 'Info'] as const;
type Tab = (typeof tabs)[number];

export default function MatchDetailPage() {
  const params = useParams();
  const matchId = params?.matchId as string;
  const [tab, setTab] = useState<Tab>('Live');
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['match', matchId],
    queryFn: () => fetchMatch(matchId)
  });

  useMatchSocket(matchId, {
    onScoreUpdated: (payload) => {
      queryClient.setQueryData(['match', matchId], (old: any) => {
        if (!old) return old;
        const newInnings = old.innings.map((inn: any) =>
          inn._id === payload.innings._id ? payload.innings : inn
        );
        return { ...old, innings: newInnings };
      });
      queryClient.invalidateQueries({ queryKey: ['match', matchId] });
    },
    onOverUpdated: (payload) => {
      queryClient.invalidateQueries({ queryKey: ['match', matchId] });
    }
  });

  if (error) {
    return <p className="text-sm text-red-400">Failed to load match.</p>;
  }

  if (isLoading || !data) {
    return <p className="text-sm text-slate-400">Loading...</p>;
  }

  const { match, innings, scorecards } = data;

  const current = scorecards[0];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-emerald-400">
              {match.series?.name || 'Standalone match'}
            </p>
            <p className="text-lg font-semibold">
              {match.teamA.shortCode} vs {match.teamB.shortCode}
            </p>
            <p className="text-xs text-slate-400">{match.venue}</p>
            <p className="mt-1 text-[11px] text-slate-400">
              {new Date(match.startDateTime).toLocaleString()}
            </p>
          </div>
          <div className="text-right text-xs">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                match.status === 'LIVE'
                  ? 'bg-red-500/20 text-red-400'
                  : match.status === 'UPCOMING'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-slate-700 text-slate-200'
              }`}
            >
              {match.status}
            </span>
            {match.tossWinner && (
              <p className="mt-2 text-[11px] text-slate-300">
                Toss: {match.tossWinner.name} chose to {match.tossDecision?.toLowerCase()}
              </p>
            )}
            {match.resultSummary && (
              <p className="mt-1 text-[11px] text-emerald-400">{match.resultSummary}</p>
            )}
          </div>
        </div>
        {current && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {scorecards.map((sc) => (
              <div key={sc.innings._id} className="rounded-lg bg-slate-950/40 p-3 text-sm">
                <p className="font-semibold">
                  {sc.innings.battingTeam.shortCode} - {sc.innings.runs}/{sc.innings.wickets}{' '}
                  <span className="text-xs text-slate-400">
                    ({sc.innings.overs.toFixed(1)} ov) RR {sc.innings.runRate.toFixed(2)}
                  </span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 text-xs">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1 ${
              tab === t ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800 text-slate-100'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Scorecard' && (
        <div className="space-y-4">
          {scorecards.map((sc) => (
            <div key={sc.innings._id} className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <p className="text-sm font-semibold">
                {sc.innings.battingTeam.name} Innings{' '}
                <span className="text-xs text-slate-400">
                  {sc.innings.runs}/{sc.innings.wickets} ({sc.innings.overs.toFixed(1)} ov)
                </span>
              </p>
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-300">Batting</p>
                <div className="overflow-x-auto text-xs">
                  <table className="min-w-full border-collapse">
                    <thead className="bg-slate-900">
                      <tr className="text-left">
                        <th className="px-2 py-1">Batsman</th>
                        <th className="px-2 py-1 text-right">R</th>
                        <th className="px-2 py-1 text-right">B</th>
                        <th className="px-2 py-1 text-right">4s</th>
                        <th className="px-2 py-1 text-right">6s</th>
                        <th className="px-2 py-1 text-right">SR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sc.batting.map((b) => (
                        <tr key={b.player._id} className="border-t border-slate-800">
                          <td className="px-2 py-1">
                            {b.player.name}{' '}
                            <span className="text-[10px] text-slate-400">
                              {b.isOut ? b.dismissalType || 'out' : 'not out'}
                            </span>
                          </td>
                          <td className="px-2 py-1 text-right">{b.runs}</td>
                          <td className="px-2 py-1 text-right">{b.balls}</td>
                          <td className="px-2 py-1 text-right">{b.fours}</td>
                          <td className="px-2 py-1 text-right">{b.sixes}</td>
                          <td className="px-2 py-1 text-right">{b.strikeRate.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-300">Bowling</p>
                <div className="overflow-x-auto text-xs">
                  <table className="min-w-full border-collapse">
                    <thead className="bg-slate-900">
                      <tr className="text-left">
                        <th className="px-2 py-1">Bowler</th>
                        <th className="px-2 py-1 text-right">O</th>
                        <th className="px-2 py-1 text-right">R</th>
                        <th className="px-2 py-1 text-right">W</th>
                        <th className="px-2 py-1 text-right">Econ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sc.bowling.map((b) => (
                        <tr key={b.player._id} className="border-t border-slate-800">
                          <td className="px-2 py-1">{b.player.name}</td>
                          <td className="px-2 py-1 text-right">{b.overs}</td>
                          <td className="px-2 py-1 text-right">{b.runsConceded}</td>
                          <td className="px-2 py-1 text-right">{b.wickets}</td>
                          <td className="px-2 py-1 text-right">{b.economy.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs font-semibold text-slate-300">Fall of wickets</p>
                <div className="text-[11px] text-slate-300">
                  {sc.innings.fallOfWickets.map((f) => (
                    <span key={f.wicketNumber} className="mr-2">
                      {f.scoreAtDismissal}/{f.wicketNumber} ({f.dismissedBatsman.name}, {f.over} ov)
                    </span>
                  ))}
                  {!sc.innings.fallOfWickets.length && <span>No wickets yet.</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Overs' && current && (
        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <p className="text-sm font-semibold">Over summary</p>
          <div className="overflow-x-auto text-xs">
            <table className="min-w-full border-collapse">
              <thead className="bg-slate-900">
                <tr className="text-left">
                  <th className="px-2 py-1">Over</th>
                  <th className="px-2 py-1">Runs</th>
                  <th className="px-2 py-1">Wkts</th>
                  <th className="px-2 py-1">Balls</th>
                </tr>
              </thead>
              <tbody>
                {current.oversSummary.map((o) => (
                  <tr key={o.overNumber} className="border-t border-slate-800">
                    <td className="px-2 py-1">{o.overNumber}</td>
                    <td className="px-2 py-1">{o.runs}</td>
                    <td className="px-2 py-1">{o.wickets}</td>
                    <td className="px-2 py-1">
                      {o.balls
                        ?.sort((a, b) => a.ballInOver - b.ballInOver)
                        .map((b) => `${b.runs}${b.isWicket ? ' W' : ''}`)
                        .join(' | ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Info' && (
        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm">
          <p>Match type: {match.matchType}</p>
          <p>Venue: {match.venue}</p>
          <p>Starts: {new Date(match.startDateTime).toLocaleString()}</p>
        </div>
      )}

      {tab === 'Live' && (
        <p className="text-sm text-slate-300">
          Live view mirrors scorecard with real-time updates. Switch to <span className="font-semibold">Scorecard</span>{' '}
          or <span className="font-semibold">Overs</span> to inspect details.
        </p>
      )}
    </div>
  );
}
