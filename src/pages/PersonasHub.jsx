// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { haptics } from '@/components/utils/haptics';
import PullToRefresh from '@/components/mobile/PullToRefresh';
import { CheckCircle2, Loader2, Mic, Plus, RefreshCw, Search, Trash2, XCircle } from 'lucide-react';

function statusChip(status) {
  if (status === 'ready') return { label: 'Ready', className: 'text-emerald-200 border-emerald-400/35 bg-emerald-500/15' };
  if (status === 'failed') return { label: 'Failed', className: 'text-red-200 border-red-400/35 bg-red-500/15' };
  if (status === 'generating') return { label: 'Generating', className: 'text-amber-200 border-amber-400/35 bg-amber-500/15' };
  return { label: 'Validating', className: 'text-sky-200 border-sky-400/35 bg-sky-500/15' };
}

export default function PersonasHubPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: personas = [], isLoading } = useQuery({
    queryKey: ['personas-hub'],
    queryFn: () => base44.entities.Persona.list('-created_date', 150),
  });

  const refreshMutation = useMutation({
    mutationFn: async (persona) => base44.functions.invoke('checkPersonaStatus', { personaId: persona.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas-hub'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (personaId) => base44.functions.invoke('deletePersona', { personaId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas-hub'] });
      toast.success('Persona deleted');
      haptics.success();
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to delete persona');
      haptics.error();
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return personas;
    return personas.filter((persona) => (
      String(persona.name || '').toLowerCase().includes(q)
      || String(persona.status || '').toLowerCase().includes(q)
      || String(persona.description || '').toLowerCase().includes(q)
    ));
  }, [personas, search]);

  const handleRefresh = async () => {
    haptics.selection();
    await queryClient.invalidateQueries({ queryKey: ['personas-hub'] });
  };

  const readyCount = personas.filter((persona) => persona.status === 'ready' && persona.persona_id).length;

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <main className="min-h-screen bg-[#0a0a0f] text-white pb-36">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-5 space-y-4">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-xl md:text-2xl font-extrabold">Personas Hub</h1>
                <p className="text-sm text-white/55">Premium voice persona management and quick track generation routing.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  haptics.medium();
                  navigate('/VoiceStudio');
                }}
                className="min-h-[44px] px-4 rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-200 text-sm font-semibold inline-flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" /> Create Persona
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                <p className="text-xs text-white/45">Total</p>
                <p className="text-lg font-bold">{personas.length}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                <p className="text-xs text-white/45">Ready</p>
                <p className="text-lg font-bold text-emerald-300">{readyCount}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                <p className="text-xs text-white/45">In Progress</p>
                <p className="text-lg font-bold text-sky-300">{personas.filter((p) => p.status !== 'ready' && p.status !== 'failed').length}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                <p className="text-xs text-white/45">Failed</p>
                <p className="text-lg font-bold text-red-300">{personas.filter((p) => p.status === 'failed').length}</p>
              </div>
            </div>

            <div className="relative mt-4">
              <Search className="h-4 w-4 text-white/35 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search personas..."
                className="w-full min-h-[44px] rounded-xl pl-10 pr-3 text-sm bg-white/[0.05] border border-white/15 placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
            {isLoading ? (
              <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-white/45" /></div>
            ) : filtered.length === 0 ? (
              <div className="py-10 text-center">
                <Mic className="h-8 w-8 mx-auto text-white/25 mb-2" />
                <p className="text-sm text-white/50">No personas found.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((persona) => {
                  const chip = statusChip(persona.status);
                  const canRefresh = persona.status !== 'ready' && persona.status !== 'failed';
                  const refreshingThis = refreshMutation.isPending && refreshMutation.variables?.id === persona.id;
                  const deletingThis = deleteMutation.isPending && deleteMutation.variables === persona.id;

                  return (
                    <article key={persona.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg border border-white/15 bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                          {persona.status === 'failed' ? <XCircle className="h-4 w-4 text-red-300" /> : <CheckCircle2 className="h-4 w-4 text-emerald-300" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold truncate">{persona.name || 'Untitled Persona'}</p>
                          <span className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${chip.className}`}>{chip.label}</span>
                          {persona.persona_id && <p className="mt-1 text-[11px] text-white/45 truncate">Suno ID: {persona.persona_id}</p>}
                          {persona.error_message && <p className="mt-1 text-xs text-red-300/85 line-clamp-2">{persona.error_message}</p>}
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/Create?panel=generate&personaId=${encodeURIComponent(persona.id)}`)}
                          disabled={persona.status !== 'ready'}
                          className="min-h-[44px] rounded-lg border border-emerald-500/35 bg-emerald-500/15 text-emerald-200 text-sm font-semibold disabled:opacity-45"
                        >
                          Use in Song
                        </button>

                        <button
                          type="button"
                          onClick={() => refreshMutation.mutate(persona)}
                          disabled={!canRefresh || refreshMutation.isPending}
                          className="min-h-[44px] rounded-lg border border-white/15 bg-white/[0.05] text-white/80 text-sm font-semibold disabled:opacity-45 inline-flex items-center justify-center gap-2"
                        >
                          {refreshingThis ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                          Refresh
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            haptics.medium();
                            deleteMutation.mutate(persona.id);
                          }}
                          disabled={deleteMutation.isPending}
                          className="min-h-[44px] rounded-lg border border-red-500/35 bg-red-500/15 text-red-200 text-sm font-semibold disabled:opacity-45 inline-flex items-center justify-center gap-2"
                        >
                          {deletingThis ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </PullToRefresh>
  );
}
