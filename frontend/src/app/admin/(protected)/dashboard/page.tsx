"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/apiClient";
import { getAuthHeaders } from "@/lib/adminAuth";
import Link from "next/link";

async function fetchMatches() {
  const res = await api.get("/matches", { headers: getAuthHeaders() });
  return res.data;
}

export default function AdminDashboard() {
  const { data: matches, isLoading, error } = useQuery({
    queryKey: ["admin-matches-dashboard"],
    queryFn: fetchMatches,
  });

  return (
    <div className="space-y-4 text-xs">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <p className="text-[11px] text-slate-400">
        Quick overview of matches. Use sidebar to manage teams, players, series & live scoring.
      </p>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold">Matches</p>
          <Link
            href="/admin/matches"
            className="text-[11px] text-emerald-400 hover:underline"
          >
            Manage matches
          </Link>
        </div>
        {isLoading && <p className="text-slate-400">Loading...</p>}
        {error && <p className="text-red-400">Failed to load matches.</p>}
        <div className="space-y-1">
          {matches?.slice(0, 5).map((m: any) => (
            <div
              key={m._id}
              className="flex items-center justify-between rounded-lg bg-slate-950/40 p-2"
            >
              <div>
                <p className="text-sm">
                  {m.teamA.shortCode} vs {m.teamB.shortCode}
                </p>
                <p className="text-[11px] text-slate-400">
                  {m.matchType} · {m.status}
                </p>
              </div>
              <Link
                href={`/admin/match/${m._id}/live`}
                className="rounded-md bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-slate-900"
              >
                Live scoring
              </Link>
            </div>
          ))}
          {!isLoading && !matches?.length && (
            <p className="text-slate-500">No matches yet. Create one from the Matches page.</p>
          )}
        </div>
      </div>
    </div>
  );
}
