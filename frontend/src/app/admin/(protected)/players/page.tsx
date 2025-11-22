"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/apiClient";
import { getAuthHeaders } from "@/lib/adminAuth";
import { useState } from "react";

async function fetchPlayers() {
  const res = await api.get("/players");
  return res.data;
}

async function fetchTeams() {
  const res = await api.get("/teams");
  return res.data;
}

async function createPlayer(payload: any) {
  const res = await api.post("/players", payload, { headers: getAuthHeaders() });
  return res.data;
}

async function updatePlayer(playerId: string, payload: any) {
  const res = await api.patch(`/players/${playerId}`, payload, { headers: getAuthHeaders() });
  return res.data;
}

async function deletePlayer(playerId: string) {
  await api.delete(`/players/${playerId}`, { headers: getAuthHeaders() });
}

export default function AdminPlayersPage() {
  const queryClient = useQueryClient();
  const { data: players } = useQuery({ queryKey: ["admin-players"], queryFn: fetchPlayers });
  const { data: teams } = useQuery({ queryKey: ["admin-teams"], queryFn: fetchTeams });

  const [form, setForm] = useState({
    name: "",
    team: "",
    role: "",
    battingStyle: "",
    bowlingStyle: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);

  function resetForm() {
    setForm({ name: "", team: "", role: "", battingStyle: "", bowlingStyle: "" });
    setEditingPlayerId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (editingPlayerId) {
        await updatePlayer(editingPlayerId, form);
      } else {
        await createPlayer(form);
      }
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["admin-players"] });
    } catch (err: any) {
      setError(err?.response?.data?.message || `Failed to ${editingPlayerId ? "update" : "create"} player`);
    } finally {
      setSaving(false);
    }
  }

  function startEditing(player: any) {
    setForm({
      name: player.name || "",
      team: player.team?._id || "",
      role: player.role || "",
      battingStyle: player.battingStyle || "",
      bowlingStyle: player.bowlingStyle || "",
    });
    setEditingPlayerId(player._id);
    setError(null);
  }

  async function handleDelete(playerId: string) {
    const confirmDelete = window.confirm("Delete this player?");
    if (!confirmDelete) return;
    setSaving(true);
    setError(null);
    try {
      await deletePlayer(playerId);
      await queryClient.invalidateQueries({ queryKey: ["admin-players"] });
      if (editingPlayerId === playerId) {
        resetForm();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to delete player");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 text-xs">
      <h1 className="text-xl font-semibold">Players</h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3"
      >
        <p className="text-sm font-semibold">{editingPlayerId ? "Edit player" : "Add player"}</p>
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
            <label className="mb-1 block text-[11px] text-slate-300">Team</label>
            <select
              value={form.team}
              onChange={(e) => setForm((f) => ({ ...f, team: e.target.value }))}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              required
            >
              <option value="">Select team</option>
              {teams?.map((t: any) => (
                <option key={t._id} value={t._id}>
                  {t.name} ({t.shortCode})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-slate-300">Role</label>
            <input
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              placeholder="Batsman / Bowler / All-rounder"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-slate-300">Batting style</label>
            <input
              value={form.battingStyle}
              onChange={(e) => setForm((f) => ({ ...f, battingStyle: e.target.value }))}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              placeholder="Right-hand bat"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-slate-300">Bowling style</label>
            <input
              value={form.bowlingStyle}
              onChange={(e) => setForm((f) => ({ ...f, bowlingStyle: e.target.value }))}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              placeholder="Right-arm medium"
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
            {saving ? "Saving..." : editingPlayerId ? "Update player" : "Add player"}
          </button>
          {editingPlayerId && (
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
        <p className="mb-2 text-sm font-semibold">Existing players</p>
        <div className="max-h-[400px] space-y-1 overflow-y-auto">
          {players?.map((p: any) => (
            <div
              key={p._id}
              className="flex items-center justify-between rounded-lg bg-slate-950/40 p-2"
            >
              <div>
                <p className="text-sm">{p.name}</p>
                <p className="text-[11px] text-slate-400">
                  {p.role} · {p.team?.shortCode}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startEditing(p)}
                  className="rounded-md bg-slate-800 px-3 py-1 text-[11px] text-slate-100"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(p._id)}
                  className="rounded-md bg-red-500/80 px-3 py-1 text-[11px] font-semibold text-slate-900"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {!players?.length && <p className="text-slate-500">No players yet.</p>}
        </div>
      </div>
    </div>
  );
}
