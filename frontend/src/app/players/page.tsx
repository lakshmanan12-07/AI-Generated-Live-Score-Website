
'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/apiClient';
import Link from 'next/link';

async function fetchPlayers() {
  const res = await api.get('/players');
  return res.data;
}

export default function PlayersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['players'],
    queryFn: fetchPlayers
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Players</h1>
      {isLoading && <p className="text-sm text-slate-400">Loading...</p>}
      <div className="grid gap-3 md:grid-cols-3">
        {data?.map((p: any) => (
          <Link
            key={p._id}
            href={`/player/${p._id}`}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 hover:border-emerald-500/60"
          >
            <p className="text-sm font-semibold">{p.name}</p>
            <p className="text-xs text-slate-400">
              {p.role} · {p.team?.shortCode || ''}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
