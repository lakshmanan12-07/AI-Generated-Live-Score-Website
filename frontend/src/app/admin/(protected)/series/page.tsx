"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/apiClient";
import { getAuthHeaders } from "@/lib/adminAuth";
import { useState } from "react";

async function fetchSeries() {
  const res = await api.get("/series");
  return res.data;
}

async function createSeries(payload: any) {
  const res = await api.post("/series", payload, { headers: getAuthHeaders() });
  return res.data;
}

export default function AdminSeriesPage() {
  const queryClient = useQueryClient();
  const { data: series } = useQuery({ queryKey: ["admin-series"], queryFn: fetchSeries });

  const [form, setForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    description: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await createSeries({
        name: form.name,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        description: form.description || undefined,
      });
      setForm({ name: "", startDate: "", endDate: "", description: "" });
      await queryClient.invalidateQueries({ queryKey: ["admin-series"] });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create series");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 text-xs">
      <h1 className="text-xl font-semibold">Series</h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3"
      >
        <p className="text-sm font-semibold">Add series</p>
        <div className="grid gap-2 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="mb-1 block text-[11px] text-slate-300">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-slate-300">Start date</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-slate-300">End date</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-slate-300">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
            rows={2}
          />
        </div>
        {error && <p className="text-[11px] text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="mt-1 rounded-md bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-slate-900 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Add series"}
        </button>
      </form>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <p className="mb-2 text-sm font-semibold">Existing series</p>
        <div className="space-y-1">
          {series?.map((s: any) => (
            <div
              key={s._id}
              className="flex items-center justify-between rounded-lg bg-slate-950/40 p-2"
            >
              <div>
                <p className="text-sm">{s.name}</p>
                <p className="text-[11px] text-slate-400">
                  {s.startDate
                    ? new Date(s.startDate).toLocaleDateString()
                    : "No dates"}
                  {s.endDate ? " - " + new Date(s.endDate).toLocaleDateString() : ""}
                </p>
              </div>
            </div>
          ))}
          {!series?.length && <p className="text-slate-500">No series yet.</p>}
        </div>
      </div>
    </div>
  );
}
