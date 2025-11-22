"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { clearAdminToken, requireAdmin, setAdminToken } from "@/lib/adminAuth";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("admin@criclive.local");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // If already logged in, go to dashboard
    if (requireAdmin()) {
      router.replace("/admin/dashboard");
    }
  }, []);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "login-required") {
      setError("Please login to access admin panel.");
      clearAdminToken();
    }
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.post("/auth/login", { email, password });
      setAdminToken(res.data.token);
      router.push("/admin/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Login failed");
    }
  }

  return (
    <div className="mx-auto mt-10 max-w-sm rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h1 className="text-lg font-semibold">Admin Login</h1>
      <p className="mt-1 text-xs text-slate-400">
        Seed default admin via <code className="text-emerald-400">POST /api/auth/seed</code> if needed.
      </p>
      <form onSubmit={handleLogin} className="mt-4 space-y-3 text-sm">
        <div>
          <label className="mb-1 block text-xs text-slate-300">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs outline-none focus:border-emerald-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-300">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs outline-none focus:border-emerald-400"
          />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-md bg-emerald-500 py-1 text-xs font-semibold text-slate-900 hover:bg-emerald-400"
        >
          Login
        </button>
      </form>
    </div>
  );
}
