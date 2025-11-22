"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/apiClient";
import { getAuthHeaders } from "@/lib/adminAuth";
import { useState } from "react";

async function fetchTeams() {
  const res = await api.get("/teams");
  return res.data;
}

async function createTeam(payload: { name: string; shortCode: string; logoUrl?: string }) {
  const res = await api.post("/teams", payload, { headers: getAuthHeaders() });
  return res.data;
}

export default function AdminTeamsPage() {
  const queryClient = useQueryClient();
  const { data: teams, isLoading } = useQuery({
    queryKey: ["admin-teams"],
    queryFn: fetchTeams,
  });

  const [form, setForm] = useState({ name: "", shortCode: "", logoUrl: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await createTeam({
        name: form.name,
        shortCode: form.shortCode.toUpperCase(),
        logoUrl: form.logoUrl || undefined,
      });
      setForm({ name: "", shortCode: "", logoUrl: "" });
      await queryClient.invalidateQueries({ queryKey: ["admin-teams"] });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create team");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 text-xs">
      <h1 className="text-xl font-semibold">Teams</h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3"
      >
        <p className="text-sm font-semibold">Add team</p>
        <div className="grid gap-2 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-[11px] text-slate-300">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-slate-300">Short code</label>
            <input
              value={form.shortCode}
              onChange={(e) => setForm((f) => ({ ...f, shortCode: e.target.value }))}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              placeholder="IND"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-slate-300">Logo URL (optional)</label>
            <input
              value={form.logoUrl}
              onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              placeholder="https://..."
            />
          </div>
        </div>
        {error && <p className="text-[11px] text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="mt-1 rounded-md bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-slate-900 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Add team"}
        </button>
      </form>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <p className="mb-2 text-sm font-semibold">Existing teams</p>
        {isLoading && <p className="text-slate-400">Loading...</p>}
        <div className="space-y-1">
          {teams?.map((t: any) => (
            <div
              key={t._id}
              className="flex items-center justify-between rounded-lg bg-slate-950/40 p-2"
            >
              <div>
                <p className="text-sm">{t.name}</p>
                <p className="text-[11px] text-slate-400">{t.shortCode}</p>
              </div>
            </div>
          ))}
          {!isLoading && !teams?.length && (
            <p className="text-slate-500">No teams yet. Create one above.</p>
          )}
        </div>
      </div>
    </div>
  );
}
