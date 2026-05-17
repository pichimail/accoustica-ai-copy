// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { haptics } from '@/components/utils/haptics';
import PullToRefresh from '@/components/mobile/PullToRefresh';
import {
  CheckCircle2,
  Circle,
  Loader2,
  Mic,
  Music2,
  Pause,
  Play,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';

const POLL_INTERVAL_MS = 7000;

function statusMeta(status) {
  if (status === 'ready') return { label: 'Ready', color: 'text-emerald-300', Icon: CheckCircle2 };
  if (status === 'failed') return { label: 'Failed', color: 'text-red-300', Icon: XCircle };
  if (status === 'generating') return { label: 'Generating', color: 'text-amber-300', Icon: Loader2 };
  if (status === 'validating') return { label: 'Validating', color: 'text-sky-300', Icon: Loader2 };
  return { label: 'Pending', color: 'text-white/60', Icon: Circle };
}

export default function VoiceStudioPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [personaName, setPersonaName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [levels, setLevels] = useState(() => Array.from({ length: 28 }, () => 0.12));

  const fileInputRef = useRef(null);
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);

  const { data: personas = [], isLoading } = useQuery({
    queryKey: ['voice-personas'],
    queryFn: () => base44.entities.Persona.list('-created_date', 100),
  });

  const readyPersonas = useMemo(
    () => personas.filter((p) => p.status === 'ready' && p.persona_id),
    [personas]
  );

  useEffect(() => {
    const pending = personas.filter((p) => p.task_id && p.status !== 'ready' && p.status !== 'failed');
    if (pending.length === 0) return;

    const timer = setInterval(async () => {
      await Promise.allSettled(
        pending.map((persona) =>
          base44.functions.invoke('checkPersonaStatus', {
            personaId: persona.id,
            kieTaskId: persona.task_id,
          })
        )
      );
      queryClient.invalidateQueries({ queryKey: ['voice-personas'] });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [personas, queryClient]);

  useEffect(() => {
    return () => {
      stopRecordingTracks();
      stopVisualizer();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const stopRecordingTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const stopVisualizer = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    setLevels(Array.from({ length: 28 }, () => 0.12));
  };

  const startVisualizer = async (stream) => {
    stopVisualizer();
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const audioCtx = new AudioCtx();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);

    audioCtxRef.current = audioCtx;
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const barCount = 28;

    const tick = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteTimeDomainData(data);

      const chunkSize = Math.floor(data.length / barCount);
      const next = new Array(barCount).fill(0.12).map((_, index) => {
        const start = index * chunkSize;
        const end = start + chunkSize;
        let sum = 0;
        for (let i = start; i < end; i++) {
          const centered = (data[i] - 128) / 128;
          sum += Math.abs(centered);
        }
        const avg = sum / chunkSize;
        return Math.min(1, Math.max(0.08, avg * 2.8));
      });

      setLevels(next);
      rafRef.current = requestAnimationFrame(tick);
    };

    tick();
  };

  const handleSelectUpload = (file) => {
    if (!file) return;

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const nextUrl = URL.createObjectURL(file);

    setSelectedFile(file);
    setPreviewUrl(nextUrl);
    setIsPlayingPreview(false);
  };

  const startRecording = async () => {
    try {
      haptics.medium();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      streamRef.current = stream;
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size > 0) {
          const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
          handleSelectUpload(file);
        }
        stopRecordingTracks();
        stopVisualizer();
      };

      await startVisualizer(stream);
      recorder.start();
      setIsRecording(true);
      toast.success('Recording started');
    } catch (error) {
      toast.error(error?.message || 'Microphone access failed');
      stopRecordingTracks();
      stopVisualizer();
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    haptics.light();
    mediaRecorderRef.current.stop();
    setIsRecording(false);
    toast.success('Recording saved');
  };

  const retake = () => {
    haptics.light();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl('');
    setIsPlayingPreview(false);
  };

  const togglePreviewPlayback = async () => {
    if (!audioRef.current) return;

    if (isPlayingPreview) {
      audioRef.current.pause();
      setIsPlayingPreview(false);
      return;
    }

    try {
      await audioRef.current.play();
      setIsPlayingPreview(true);
    } catch {
      toast.error('Unable to play preview');
    }
  };

  const handleCreatePersona = async () => {
    if (!personaName.trim()) {
      toast.error('Enter a persona name');
      return;
    }

    if (!selectedFile && !previewUrl) {
      toast.error('Record or upload a voice sample');
      return;
    }

    setIsSubmitting(true);
    haptics.medium();

    try {
      let result;

      try {
        result = await base44.functions.invoke('initiateVoiceProcess', {
          file: selectedFile,
          personaName: personaName.trim(),
        });
      } catch {
        const uploaded = await base44.integrations.Core.UploadFile({ file: selectedFile });
        const audioUrl = uploaded?.file_url || uploaded?.file_uri;
        result = await base44.functions.invoke('initiateVoiceProcess', {
          audioUrl,
          personaName: personaName.trim(),
        });
      }

      if (!result?.data?.success) {
        throw new Error(result?.data?.error || 'Failed to create persona task');
      }

      toast.success('Persona processing started');
      haptics.success();
      retake();
      setPersonaName('');
      queryClient.invalidateQueries({ queryKey: ['voice-personas'] });
    } catch (error) {
      toast.error(error?.message || 'Failed to start persona creation');
      haptics.error();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePersona = async (personaId) => {
    try {
      haptics.medium();
      await base44.functions.invoke('deletePersona', { personaId });
      queryClient.invalidateQueries({ queryKey: ['voice-personas'] });
      toast.success('Persona deleted');
    } catch (error) {
      toast.error(error?.message || 'Failed to delete persona');
    }
  };

  const refreshPersonas = async () => {
    haptics.selection();
    await queryClient.invalidateQueries({ queryKey: ['voice-personas'] });
  };

  return (
    <PullToRefresh onRefresh={refreshPersonas}>
      <div className="min-h-screen bg-[#0a0a0f] text-white pb-36">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-5 space-y-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                <Mic className="h-5 w-5 text-emerald-300" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold">Voice Studio</h1>
                <p className="text-sm text-white/55">Record or upload a voice, then generate a reusable singing persona.</p>
              </div>
            </div>

            <div className="mt-4">
              <label className="text-sm text-white/70">Persona Name</label>
              <input
                value={personaName}
                onChange={(event) => setPersonaName(event.target.value)}
                placeholder="e.g. Neo Soul Narrator"
                className="mt-2 w-full h-11 rounded-xl px-3 text-sm bg-white/[0.05] border border-white/15 placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-3">
              <div className="flex items-end gap-1 h-14">
                {levels.map((level, idx) => (
                  <div
                    key={idx}
                    className="flex-1 rounded-full transition-all duration-75"
                    style={{
                      height: `${Math.max(10, level * 56)}px`,
                      background: isRecording
                        ? 'linear-gradient(180deg, rgba(16,185,129,0.9), rgba(5,150,105,0.65))'
                        : 'rgba(255,255,255,0.2)',
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={startRecording}
                disabled={isRecording || isSubmitting}
                className="min-h-[44px] rounded-xl border border-emerald-500/35 bg-emerald-500/15 text-emerald-300 text-sm font-semibold px-3 disabled:opacity-45"
              >
                Start Recording
              </button>
              <button
                type="button"
                onClick={stopRecording}
                disabled={!isRecording || isSubmitting}
                className="min-h-[44px] rounded-xl border border-red-500/40 bg-red-500/15 text-red-300 text-sm font-semibold px-3 disabled:opacity-45"
              >
                Stop Recording
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isRecording || isSubmitting}
                className="min-h-[44px] rounded-xl border border-white/15 bg-white/[0.05] text-white/85 text-sm font-semibold px-3 inline-flex items-center justify-center gap-2 disabled:opacity-45"
              >
                <Upload className="h-4 w-4" /> Upload
              </button>
              <button
                type="button"
                onClick={togglePreviewPlayback}
                disabled={!previewUrl || isSubmitting}
                className="min-h-[44px] rounded-xl border border-white/15 bg-white/[0.05] text-white/85 text-sm font-semibold px-3 inline-flex items-center justify-center gap-2 disabled:opacity-45"
              >
                {isPlayingPreview ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} Play Preview
              </button>
              <button
                type="button"
                onClick={retake}
                disabled={!previewUrl || isSubmitting}
                className="min-h-[44px] rounded-xl border border-white/15 bg-white/[0.05] text-white/85 text-sm font-semibold px-3 disabled:opacity-45"
              >
                Retake
              </button>
            </div>

            {selectedFile && (
              <p className="mt-3 text-xs text-white/55 truncate">Selected: {selectedFile.name}</p>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(event) => handleSelectUpload(event.target.files?.[0])}
            />

            {previewUrl && (
              <audio
                ref={audioRef}
                src={previewUrl}
                className="hidden"
                onEnded={() => setIsPlayingPreview(false)}
                onPause={() => setIsPlayingPreview(false)}
                onPlay={() => setIsPlayingPreview(true)}
              />
            )}

            <button
              type="button"
              onClick={handleCreatePersona}
              disabled={isSubmitting || !personaName.trim() || !selectedFile}
              className="mt-4 w-full min-h-[44px] rounded-xl bg-emerald-500 text-black font-extrabold text-sm disabled:opacity-45 inline-flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Music2 className="h-4 w-4" />}
              {isSubmitting ? 'Creating Persona...' : 'Create Persona'}
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold">Your Personas</h2>
              <span className="text-xs text-white/50">Ready: {readyPersonas.length}</span>
            </div>

            {isLoading ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-white/40" />
              </div>
            ) : personas.length === 0 ? (
              <p className="text-sm text-white/50 py-6 text-center">No personas yet</p>
            ) : (
              <div className="space-y-2">
                {personas.map((persona) => {
                  const meta = statusMeta(persona.status);
                  const isBusy = persona.status === 'validating' || persona.status === 'generating' || persona.status === 'pending';

                  return (
                    <div
                      key={persona.id}
                      className="rounded-xl border border-white/10 bg-black/20 p-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg border border-white/15 bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                          <meta.Icon className={`h-4 w-4 ${meta.color} ${isBusy ? 'animate-spin' : ''}`} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{persona.name}</p>
                          <p className={`text-xs ${meta.color}`}>{meta.label}</p>
                          {persona.error_message && (
                            <p className="text-xs text-red-300/85 mt-1 line-clamp-2">{persona.error_message}</p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeletePersona(persona.id)}
                          className="min-h-[44px] min-w-[44px] rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 inline-flex items-center justify-center"
                          aria-label={`Delete ${persona.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/Create?panel=generate&personaId=${encodeURIComponent(persona.id)}`)}
                          disabled={persona.status !== 'ready'}
                          className="min-h-[44px] rounded-lg border border-emerald-500/35 bg-emerald-500/15 text-emerald-300 text-sm font-semibold disabled:opacity-45"
                        >
                          Use in Song
                        </button>
                        {persona.status !== 'ready' && persona.status !== 'failed' ? (
                          <button
                            type="button"
                            onClick={async () => {
                              await base44.functions.invoke('checkPersonaStatus', { personaId: persona.id, kieTaskId: persona.task_id });
                              queryClient.invalidateQueries({ queryKey: ['voice-personas'] });
                            }}
                            className="min-h-[44px] rounded-lg border border-white/15 bg-white/[0.05] text-white/80 text-sm font-semibold"
                          >
                            Refresh Status
                          </button>
                        ) : (
                          <div className="min-h-[44px] rounded-lg border border-white/10 bg-white/[0.03] text-white/45 text-sm flex items-center justify-center">
                            {persona.status === 'ready' ? 'Linked to music generation' : 'Fix and retry'}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </PullToRefresh>
  );
}
