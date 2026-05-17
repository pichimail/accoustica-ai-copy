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
  RefreshCw,
  Trash2,
  Upload,
  Volume2,
  XCircle,
} from 'lucide-react';

const POLL_INTERVAL_MS = 7000;

const LANGUAGE_OPTIONS = [
  { label: 'English', value: 'en', ttsLang: 'en-US', note: 'Standard English phrase.' },
  { label: 'Hindi', value: 'hi', ttsLang: 'hi-IN', note: 'Phrase generated for Hindi reading.' },
  { label: 'Tamil', value: 'ta', ttsLang: 'ta-IN', note: 'Phrase generated for Tamil reading.' },
  { label: 'Telugu', value: 'te', ttsLang: 'te-IN', note: 'Phrase generated for Telugu reading.' },
  { label: 'Tinglish (Telugu+English)', value: 'tinglish', ttsLang: 'en-IN', note: 'Uses English phrase format for mixed pronunciation.' },
];

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
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [sourceFile, setSourceFile] = useState(null);
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState('');
  const [verificationFile, setVerificationFile] = useState(null);
  const [verificationPreviewUrl, setVerificationPreviewUrl] = useState('');
  const [isSubmittingSource, setIsSubmittingSource] = useState(false);
  const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTarget, setRecordingTarget] = useState(null);
  const [isPlayingSourcePreview, setIsPlayingSourcePreview] = useState(false);
  const [isPlayingVerificationPreview, setIsPlayingVerificationPreview] = useState(false);
  const [activeVerificationPersonaId, setActiveVerificationPersonaId] = useState(null);
  const [levels, setLevels] = useState(() => Array.from({ length: 28 }, () => 0.12));

  const sourceInputRef = useRef(null);
  const verificationInputRef = useRef(null);
  const sourceAudioRef = useRef(null);
  const verificationAudioRef = useRef(null);
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

  const pendingVerificationPersonas = useMemo(
    () => personas.filter((p) => p.status === 'validating' && p.verification_phrase),
    [personas]
  );

  const activeVerificationPersona = useMemo(
    () => personas.find((p) => p.id === activeVerificationPersonaId) || null,
    [personas, activeVerificationPersonaId]
  );

  useEffect(() => {
    if (!activeVerificationPersonaId && pendingVerificationPersonas.length > 0) {
      setActiveVerificationPersonaId(pendingVerificationPersonas[0].id);
    }
    if (
      activeVerificationPersonaId &&
      !personas.some((p) => p.id === activeVerificationPersonaId)
    ) {
      setActiveVerificationPersonaId(pendingVerificationPersonas[0]?.id || null);
    }
  }, [activeVerificationPersonaId, pendingVerificationPersonas, personas]);

  useEffect(() => {
    const pending = personas.filter((p) => p.task_id && p.status !== 'ready' && p.status !== 'failed');
    if (pending.length === 0) return;

    const timer = setInterval(async () => {
      await Promise.allSettled(
        pending.map((persona) =>
          base44.functions.invoke('checkPersonaStatus', {
            personaId: persona.id,
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
      window.speechSynthesis?.cancel();
      if (sourcePreviewUrl) URL.revokeObjectURL(sourcePreviewUrl);
      if (verificationPreviewUrl) URL.revokeObjectURL(verificationPreviewUrl);
    };
  }, [sourcePreviewUrl, verificationPreviewUrl]);

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

  const setPreviewFile = (file, target) => {
    if (!file) return;

    if (target === 'source') {
      if (sourcePreviewUrl) URL.revokeObjectURL(sourcePreviewUrl);
      setSourceFile(file);
      setSourcePreviewUrl(URL.createObjectURL(file));
      setIsPlayingSourcePreview(false);
      return;
    }

    if (verificationPreviewUrl) URL.revokeObjectURL(verificationPreviewUrl);
    setVerificationFile(file);
    setVerificationPreviewUrl(URL.createObjectURL(file));
    setIsPlayingVerificationPreview(false);
  };

  const startRecording = async (target) => {
    try {
      haptics.medium();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      streamRef.current = stream;
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      setRecordingTarget(target);

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size > 0) {
          const file = new File([blob], `${target}-voice-${Date.now()}.webm`, { type: 'audio/webm' });
          setPreviewFile(file, target);
        }
        stopRecordingTracks();
        stopVisualizer();
        setRecordingTarget(null);
      };

      await startVisualizer(stream);
      recorder.start();
      setIsRecording(true);
      toast.success(target === 'verification' ? 'Phrase recording started' : 'Source recording started');
    } catch (error) {
      toast.error(error?.message || 'Microphone access failed');
      stopRecordingTracks();
      stopVisualizer();
      setIsRecording(false);
      setRecordingTarget(null);
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    haptics.light();
    mediaRecorderRef.current.stop();
    setIsRecording(false);
    toast.success('Recording saved');
  };

  const retakeSource = () => {
    haptics.light();
    if (sourcePreviewUrl) URL.revokeObjectURL(sourcePreviewUrl);
    setSourceFile(null);
    setSourcePreviewUrl('');
    setIsPlayingSourcePreview(false);
  };

  const retakeVerification = () => {
    haptics.light();
    if (verificationPreviewUrl) URL.revokeObjectURL(verificationPreviewUrl);
    setVerificationFile(null);
    setVerificationPreviewUrl('');
    setIsPlayingVerificationPreview(false);
  };

  const togglePreviewPlayback = async (target) => {
    const isSource = target === 'source';
    const audio = isSource ? sourceAudioRef.current : verificationAudioRef.current;
    if (!audio) return;

    if (isSource ? isPlayingSourcePreview : isPlayingVerificationPreview) {
      audio.pause();
      if (isSource) setIsPlayingSourcePreview(false);
      else setIsPlayingVerificationPreview(false);
      return;
    }

    try {
      await audio.play();
      if (isSource) setIsPlayingSourcePreview(true);
      else setIsPlayingVerificationPreview(true);
    } catch {
      toast.error('Unable to play preview');
    }
  };

  const handleCreatePersona = async () => {
    if (!personaName.trim()) {
      toast.error('Enter a persona name');
      return;
    }

    if (!sourceFile) {
      toast.error('Record or upload a source voice sample');
      return;
    }

    setIsSubmittingSource(true);
    haptics.medium();

    try {
      let result;

      try {
        result = await base44.functions.invoke('initiateVoiceProcess', {
          file: sourceFile,
          personaName: personaName.trim(),
          language: selectedLanguage,
        });
      } catch {
        const uploaded = await base44.integrations.Core.UploadFile({ file: sourceFile });
        const audioUrl = uploaded?.file_url || uploaded?.file_uri;
        result = await base44.functions.invoke('initiateVoiceProcess', {
          audioUrl,
          personaName: personaName.trim(),
          language: selectedLanguage,
        });
      }

      if (!result?.data?.success) {
        throw new Error(result?.data?.error || 'Failed to create persona task');
      }

      toast.success('Validation phrase request started');
      haptics.success();
      retakeSource();
      setPersonaName('');
      queryClient.invalidateQueries({ queryKey: ['voice-personas'] });
    } catch (error) {
      toast.error(error?.message || 'Failed to start persona creation');
      haptics.error();
    } finally {
      setIsSubmittingSource(false);
    }
  };

  const submitVerification = async () => {
    if (!activeVerificationPersona?.id) {
      toast.error('Select a persona waiting for phrase verification');
      return;
    }

    if (!verificationFile) {
      toast.error('Record or upload phrase reading audio');
      return;
    }

    setIsSubmittingVerification(true);
    haptics.medium();

    try {
      let result;

      try {
        result = await base44.functions.invoke('submitPersonaVerification', {
          personaId: activeVerificationPersona.id,
          file: verificationFile,
        });
      } catch {
        const uploaded = await base44.integrations.Core.UploadFile({ file: verificationFile });
        const audioUrl = uploaded?.file_url || uploaded?.file_uri;
        result = await base44.functions.invoke('submitPersonaVerification', {
          personaId: activeVerificationPersona.id,
          audioUrl,
        });
      }

      if (!result?.data?.success) {
        throw new Error(result?.data?.error || 'Failed to submit phrase verification recording');
      }

      toast.success('Verification recording submitted');
      haptics.success();
      retakeVerification();
      queryClient.invalidateQueries({ queryKey: ['voice-personas'] });
    } catch (error) {
      toast.error(error?.message || 'Failed to submit verification recording');
      haptics.error();
    } finally {
      setIsSubmittingVerification(false);
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

  const playVerificationPhrase = () => {
    const phrase = activeVerificationPersona?.verification_phrase?.trim();
    if (!phrase) {
      toast.error('No phrase available yet. Refresh status.');
      return;
    }

    const langOption = LANGUAGE_OPTIONS.find((item) => item.value === (activeVerificationPersona.validation_language || selectedLanguage));
    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.lang = langOption?.ttsLang || 'en-US';
    utterance.rate = 0.95;
    utterance.pitch = 1;

    window.speechSynthesis?.cancel();
    window.speechSynthesis?.speak(utterance);
    haptics.selection();
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
                <p className="text-sm text-white/55">Step 1: upload/record your source voice. Step 2: read the validation phrase and submit verification audio.</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-white/70">Persona Name</label>
                <input
                  value={personaName}
                  onChange={(event) => setPersonaName(event.target.value)}
                  placeholder="e.g. Neo Soul Narrator"
                  className="mt-2 w-full h-11 rounded-xl px-3 text-sm bg-white/[0.05] border border-white/15 placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
              </div>
              <div>
                <label className="text-sm text-white/70">Phrase Language</label>
                <select
                  value={selectedLanguage}
                  onChange={(event) => setSelectedLanguage(event.target.value)}
                  className="mt-2 w-full h-11 rounded-xl px-3 text-sm bg-white/[0.05] border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-[#0a0a0f]">
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-white/50">{LANGUAGE_OPTIONS.find((o) => o.value === selectedLanguage)?.note}</p>
              </div>
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
                onClick={() => startRecording('source')}
                disabled={isRecording || isSubmittingSource}
                className="min-h-[44px] rounded-xl border border-emerald-500/35 bg-emerald-500/15 text-emerald-300 text-sm font-semibold px-3 disabled:opacity-45"
              >
                Start Source Rec
              </button>
              <button
                type="button"
                onClick={stopRecording}
                disabled={!isRecording || recordingTarget !== 'source' || isSubmittingSource}
                className="min-h-[44px] rounded-xl border border-red-500/40 bg-red-500/15 text-red-300 text-sm font-semibold px-3 disabled:opacity-45"
              >
                Stop
              </button>
              <button
                type="button"
                onClick={() => sourceInputRef.current?.click()}
                disabled={isRecording || isSubmittingSource}
                className="min-h-[44px] rounded-xl border border-white/15 bg-white/[0.05] text-white/85 text-sm font-semibold px-3 inline-flex items-center justify-center gap-2 disabled:opacity-45"
              >
                <Upload className="h-4 w-4" /> Upload
              </button>
              <button
                type="button"
                onClick={() => togglePreviewPlayback('source')}
                disabled={!sourcePreviewUrl || isSubmittingSource}
                className="min-h-[44px] rounded-xl border border-white/15 bg-white/[0.05] text-white/85 text-sm font-semibold px-3 inline-flex items-center justify-center gap-2 disabled:opacity-45"
              >
                {isPlayingSourcePreview ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} Preview
              </button>
              <button
                type="button"
                onClick={retakeSource}
                disabled={!sourcePreviewUrl || isSubmittingSource}
                className="min-h-[44px] rounded-xl border border-white/15 bg-white/[0.05] text-white/85 text-sm font-semibold px-3 disabled:opacity-45"
              >
                Retake
              </button>
            </div>

            {sourceFile && (
              <p className="mt-3 text-xs text-white/55 truncate">Source: {sourceFile.name}</p>
            )}

            <input
              ref={sourceInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(event) => setPreviewFile(event.target.files?.[0], 'source')}
            />

            {sourcePreviewUrl && (
              <audio
                ref={sourceAudioRef}
                src={sourcePreviewUrl}
                className="hidden"
                onEnded={() => setIsPlayingSourcePreview(false)}
                onPause={() => setIsPlayingSourcePreview(false)}
                onPlay={() => setIsPlayingSourcePreview(true)}
              />
            )}

            <button
              type="button"
              onClick={handleCreatePersona}
              disabled={isSubmittingSource || !personaName.trim() || !sourceFile}
              className="mt-4 w-full min-h-[44px] rounded-xl bg-emerald-500 text-black font-extrabold text-sm disabled:opacity-45 inline-flex items-center justify-center gap-2"
            >
              {isSubmittingSource ? <Loader2 className="h-4 w-4 animate-spin" /> : <Music2 className="h-4 w-4" />}
              {isSubmittingSource ? 'Submitting Source...' : 'Create Persona & Get Phrase'}
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold">Step 2: Read Phrase Verification</h2>
              <span className="text-xs text-white/50">Awaiting: {pendingVerificationPersonas.length}</span>
            </div>

            {pendingVerificationPersonas.length === 0 ? (
              <p className="text-sm text-white/50">No personas are waiting for phrase verification yet.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  {pendingVerificationPersonas.map((persona) => (
                    <button
                      key={persona.id}
                      type="button"
                      onClick={() => {
                        setActiveVerificationPersonaId(persona.id);
                        haptics.selection();
                      }}
                      className={`min-h-[44px] rounded-xl border px-3 text-sm text-left ${activeVerificationPersonaId === persona.id ? 'border-emerald-400/60 bg-emerald-500/12 text-emerald-200' : 'border-white/15 bg-white/[0.04] text-white/80'}`}
                    >
                      <div className="font-semibold truncate">{persona.name}</div>
                      <div className="text-xs text-white/55 truncate">{persona.validation_language || 'en'}</div>
                    </button>
                  ))}
                </div>

                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3">
                  <p className="text-xs text-emerald-200/80 uppercase tracking-wider font-semibold">Verification Phrase</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/90">
                    {activeVerificationPersona?.verification_phrase || 'Phrase not ready yet. Tap refresh status.'}
                  </p>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={playVerificationPhrase}
                      disabled={!activeVerificationPersona?.verification_phrase}
                      className="min-h-[44px] px-3 rounded-lg border border-emerald-400/35 bg-emerald-500/15 text-emerald-200 text-sm font-semibold disabled:opacity-45 inline-flex items-center gap-2"
                    >
                      <Volume2 className="h-4 w-4" /> Play Phrase
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!activeVerificationPersona?.id) return;
                        await base44.functions.invoke('checkPersonaStatus', { personaId: activeVerificationPersona.id });
                        queryClient.invalidateQueries({ queryKey: ['voice-personas'] });
                        haptics.light();
                      }}
                      className="min-h-[44px] px-3 rounded-lg border border-white/15 bg-white/[0.06] text-white/80 text-sm font-semibold inline-flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" /> Refresh Status
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2">
                  <button
                    type="button"
                    onClick={() => startRecording('verification')}
                    disabled={isRecording || isSubmittingVerification || !activeVerificationPersona?.id}
                    className="min-h-[44px] rounded-xl border border-emerald-500/35 bg-emerald-500/15 text-emerald-300 text-sm font-semibold px-3 disabled:opacity-45"
                  >
                    Start Phrase Rec
                  </button>
                  <button
                    type="button"
                    onClick={stopRecording}
                    disabled={!isRecording || recordingTarget !== 'verification' || isSubmittingVerification}
                    className="min-h-[44px] rounded-xl border border-red-500/40 bg-red-500/15 text-red-300 text-sm font-semibold px-3 disabled:opacity-45"
                  >
                    Stop
                  </button>
                  <button
                    type="button"
                    onClick={() => verificationInputRef.current?.click()}
                    disabled={isRecording || isSubmittingVerification}
                    className="min-h-[44px] rounded-xl border border-white/15 bg-white/[0.05] text-white/85 text-sm font-semibold px-3 inline-flex items-center justify-center gap-2 disabled:opacity-45"
                  >
                    <Upload className="h-4 w-4" /> Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePreviewPlayback('verification')}
                    disabled={!verificationPreviewUrl || isSubmittingVerification}
                    className="min-h-[44px] rounded-xl border border-white/15 bg-white/[0.05] text-white/85 text-sm font-semibold px-3 inline-flex items-center justify-center gap-2 disabled:opacity-45"
                  >
                    {isPlayingVerificationPreview ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} Preview
                  </button>
                  <button
                    type="button"
                    onClick={retakeVerification}
                    disabled={!verificationPreviewUrl || isSubmittingVerification}
                    className="min-h-[44px] rounded-xl border border-white/15 bg-white/[0.05] text-white/85 text-sm font-semibold px-3 disabled:opacity-45"
                  >
                    Re-record
                  </button>
                </div>

                {verificationFile && (
                  <p className="mt-3 text-xs text-white/55 truncate">Verification: {verificationFile.name}</p>
                )}

                <input
                  ref={verificationInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(event) => setPreviewFile(event.target.files?.[0], 'verification')}
                />

                {verificationPreviewUrl && (
                  <audio
                    ref={verificationAudioRef}
                    src={verificationPreviewUrl}
                    className="hidden"
                    onEnded={() => setIsPlayingVerificationPreview(false)}
                    onPause={() => setIsPlayingVerificationPreview(false)}
                    onPlay={() => setIsPlayingVerificationPreview(true)}
                  />
                )}

                <button
                  type="button"
                  onClick={submitVerification}
                  disabled={isSubmittingVerification || !verificationFile || !activeVerificationPersona?.id}
                  className="mt-4 w-full min-h-[44px] rounded-xl bg-emerald-500 text-black font-extrabold text-sm disabled:opacity-45 inline-flex items-center justify-center gap-2"
                >
                  {isSubmittingVerification ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
                  {isSubmittingVerification ? 'Submitting Verification...' : 'Submit Phrase Verification'}
                </button>
              </>
            )}
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
                          {persona.validation_language && <p className="text-[11px] text-white/45 mt-1">Language: {persona.validation_language}</p>}
                          {persona.verification_phrase && persona.status === 'validating' && (
                            <p className="text-[11px] text-emerald-200/80 mt-1 line-clamp-1">Phrase ready for recording</p>
                          )}
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

                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/Create?panel=generate&personaId=${encodeURIComponent(persona.id)}`)}
                          disabled={persona.status !== 'ready'}
                          className="min-h-[44px] rounded-lg border border-emerald-500/35 bg-emerald-500/15 text-emerald-300 text-sm font-semibold disabled:opacity-45"
                        >
                          Use in Song
                        </button>

                        {persona.status === 'validating' && persona.verification_phrase ? (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveVerificationPersonaId(persona.id);
                              haptics.selection();
                            }}
                            className="min-h-[44px] rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 text-sm font-semibold"
                          >
                            Verify Phrase
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={async () => {
                              await base44.functions.invoke('checkPersonaStatus', { personaId: persona.id });
                              queryClient.invalidateQueries({ queryKey: ['voice-personas'] });
                            }}
                            disabled={persona.status === 'ready' || persona.status === 'failed'}
                            className="min-h-[44px] rounded-lg border border-white/15 bg-white/[0.05] text-white/80 text-sm font-semibold disabled:opacity-45"
                          >
                            Refresh Status
                          </button>
                        )}

                        <div className="min-h-[44px] rounded-lg border border-white/10 bg-white/[0.03] text-white/45 text-sm flex items-center justify-center px-2">
                          {persona.status === 'ready' ? 'Linked to generation' : persona.status === 'failed' ? 'Failed' : 'In progress'}
                        </div>
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
