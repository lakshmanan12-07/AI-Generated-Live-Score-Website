
'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/apiClient';
import Link from 'next/link';

interface Team {
  _id: string;
  name: string;
  shortCode: string;
  logoUrl?: string;
}

async function fetchTeams() {
  const res = await api.get<Team[]>('/teams');
  return res.data;
}

export default function TeamsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: fetchTeams
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Teams</h1>
      {isLoading && <p className="text-sm text-slate-400">Loading...</p>}
      <div className="grid gap-3 md:grid-cols-3">
        {data?.map((t) => (
          <Link
            key={t._id}
            href={`/team/${t._id}`}
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-3 hover:border-emerald-500/60"
          >
            <div>
              <p className="text-sm font-semibold">{t.name}</p>
              <p className="text-xs text-slate-400">{t.shortCode}</p>
            </div>
            {t.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.logoUrl} alt={t.name} className="h-8 w-8 rounded-full object-cover" />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
