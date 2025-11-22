"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/apiClient";
import { getAuthHeaders } from "@/lib/adminAuth";
import { useState } from "react";
import Link from "next/link";

async function fetchMatches() {
  const res = await api.get("/matches");
  return res.data;
}
async function fetchTeams() {
  const res = await api.get("/teams");
  return res.data;
}
async function fetchSeries() {
  const res = await api.get("/series");
  return res.data;
}

async function createMatch(payload: any) {
  const res = await api.post("/matches", payload, { headers: getAuthHeaders() });
  return res.data;
}

async function updateMatch(matchId: string, payload: any) {
  const res = await api.patch(`/matches/${matchId}`, payload, { headers: getAuthHeaders() });
  return res.data;
}

async function deleteMatch(matchId: string) {
  await api.delete(`/matches/${matchId}`, { headers: getAuthHeaders() });
}

export default function AdminMatchesPage() {
  const queryClient = useQueryClient();
  const { data: matches } = useQuery({ queryKey: ["admin-matches"], queryFn: fetchMatches });
  const { data: teams } = useQuery({ queryKey: ["admin-teams"], queryFn: fetchTeams });
  const { data: series } = useQuery({ queryKey: ["admin-series"], queryFn: fetchSeries });

  const [form, setForm] = useState({
    series: "",
    teamA: "",
    teamB: "",
    matchType: "T20",
    venue: "",
    startDateTime: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);

  function resetForm() {
    setForm({
      series: "",
      teamA: "",
      teamB: "",
      matchType: "T20",
      venue: "",
      startDateTime: "",
    });
    setEditingMatchId(null);
  }

  function hydrateForm(match: any) {
    setForm({
      series: match.series?._id || "",
      teamA: match.teamA?._id || "",
      teamB: match.teamB?._id || "",
      matchType: match.matchType || "T20",
      venue: match.venue || "",
      startDateTime: match.startDateTime
        ? new Date(match.startDateTime).toISOString().slice(0, 16)
        : "",
    });
    setEditingMatchId(match._id);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        ...form,
        series: form.series || undefined,
        teamA: form.teamA,
        teamB: form.teamB,
        startDateTime: form.startDateTime ? new Date(form.startDateTime) : undefined,
      };
      if (editingMatchId) {
        await updateMatch(editingMatchId, payload);
      } else {
        await createMatch(payload);
      }
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
    } catch (err: any) {
      setError(err?.response?.data?.message || `Failed to ${editingMatchId ? "update" : "create"} match`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(match: any) {
    if (match.status === "COMPLETED") return;
    const confirmDelete = window.confirm("Delete this match?");
    if (!confirmDelete) return;
    setSaving(true);
    setError(null);
    try {
      await deleteMatch(match._id);
      if (editingMatchId === match._id) {
        resetForm();
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to delete match");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 text-xs">
      <h1 className="text-xl font-semibold">Matches</h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3"
      >
        <p className="text-sm font-semibold">{editingMatchId ? "Edit match" : "Create match"}</p>
        <div className="grid gap-2 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-[11px] text-slate-300">Series (optional)</label>
            <select
              value={form.series}
              onChange={(e) => setForm((f) => ({ ...f, series: e.target.value }))}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
            >
              <option value="">Standalone</option>
              {series?.map((s: any) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-slate-300">Team A</label>
            <select
              value={form.teamA}
              onChange={(e) => setForm((f) => ({ ...f, teamA: e.target.value }))}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              required
            >
              <option value="">Select</option>
              {teams?.map((t: any) => (
                <option key={t._id} value={t._id}>
                  {t.name} ({t.shortCode})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-slate-300">Team B</label>
            <select
              value={form.teamB}
              onChange={(e) => setForm((f) => ({ ...f, teamB: e.target.value }))}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              required
            >
              <option value="">Select</option>
              {teams?.map((t: any) => (
                <option key={t._id} value={t._id}>
                  {t.name} ({t.shortCode})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-slate-300">Match type</label>
            <input
              value={form.matchType}
              onChange={(e) => setForm((f) => ({ ...f, matchType: e.target.value }))}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              placeholder="T20 / ODI / Test"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-slate-300">Venue</label>
            <input
              value={form.venue}
              onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-slate-300">Start datetime</label>
            <input
              type="datetime-local"
              value={form.startDateTime}
              onChange={(e) => setForm((f) => ({ ...f, startDateTime: e.target.value }))}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              required
            />
          </div>
        </div>
        {error && <p className="text-[11px] text-red-400">{error}</p>}
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={saving}
            className="mt-1 rounded-md bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-slate-900 disabled:opacity-60"
          >
            {saving ? "Saving..." : editingMatchId ? "Update match" : "Create match"}
          </button>
          {editingMatchId && (
            <button
              type="button"
              onClick={resetForm}
              className="mt-1 rounded-md bg-slate-800 px-3 py-1 text-[11px] text-slate-100"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <p className="mb-2 text-sm font-semibold">Matches</p>
        <div className="space-y-1">
          {matches?.map((m: any) => (
            <div
              key={m._id}
              className="flex flex-col gap-2 rounded-lg bg-slate-950/40 p-2 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-sm">
                  {m.teamA.shortCode} vs {m.teamB.shortCode}
                </p>
                <p className="text-[11px] text-slate-400">
                  {m.matchType} · {m.status}
                </p>
                {m.resultSummary && (
                  <p className="text-[11px] text-emerald-400">{m.resultSummary}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/admin/match/${m._id}/live`}
                  className="rounded-md bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-slate-900"
                >
                  Live scoring
                </Link>
                <Link
                  href={`/match/${m._id}`}
                  className="rounded-md bg-slate-800 px-3 py-1 text-[11px] text-slate-100 hover:bg-slate-700"
                >
                  View public
                </Link>
                {m.status !== "COMPLETED" && (
                  <>
                    <button
                      type="button"
                      onClick={() => hydrateForm(m)}
                      className="rounded-md bg-slate-800 px-3 py-1 text-[11px] text-slate-100"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(m)}
                      className="rounded-md bg-red-500/80 px-3 py-1 text-[11px] font-semibold text-slate-900"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {!matches?.length && <p className="text-slate-500">No matches yet.</p>}
        </div>
      </div>
    </div>
  );
}
