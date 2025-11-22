"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { clearAdminToken, requireAdmin } from "@/lib/adminAuth";

export default function AdminProtectedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!requireAdmin()) {
      router.replace("/admin?error=login-required");
    }
  }, []);

  const navItems = [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/teams", label: "Teams" },
    { href: "/admin/players", label: "Players" },
    { href: "/admin/series", label: "Series" },
    { href: "/admin/matches", label: "Matches" },
  ];

  function logout() {
    clearAdminToken();
    router.replace("/admin");
  }

  return (
    <div className="flex min-h-[calc(100vh-56px)] gap-4 py-4">
      <aside className="w-52 shrink-0 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs">
        <p className="mb-3 text-[11px] font-semibold text-slate-300">Admin Panel</p>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-2 py-1 ${
                  active ? "bg-emerald-500 text-slate-900" : "text-slate-100 hover:bg-slate-800"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={logout}
          className="mt-4 w-full rounded-md bg-slate-800 px-2 py-1 text-[11px] text-slate-100 hover:bg-slate-700"
        >
          Logout
        </button>
      </aside>
      <section className="flex-1">{children}</section>
    </div>
  );
}
