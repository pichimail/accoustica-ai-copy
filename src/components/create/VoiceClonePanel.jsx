import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Upload, Mic2, Check, Loader2, User, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function VoiceClonePanel({ selectedPersonaId, onSelectPersona }) {
  const [isUploading, setIsUploading] = useState(false);
  const [showPersonas, setShowPersonas] = useState(false);
  const [personaName, setPersonaName] = useState('');
  const [personaDesc, setPersonaDesc] = useState('');
  const fileRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);
  const queryClient = useQueryClient();

  const { data: personas = [] } = useQuery({
    queryKey: ['personas'],
    queryFn: () => base44.entities.Persona.list('-created_date', 20),
  });

  const selectedPersona = personas.find(p => p.id === selectedPersonaId);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!personaName.trim()) {
      toast.error('Enter a persona name first');
      return;
    }
    setIsUploading(true);
    try {
      // Upload the vocal file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Use the generatePersona backend — needs taskId + audioId from a generated track
      // For voice cloning from upload, we store locally first
      const newPersona = await base44.entities.Persona.create({
        name: personaName.trim(),
        description: personaDesc.trim() || `Custom voice: ${personaName}`,
        persona_id: `upload_${Date.now()}`,
        audio_id: file_url,
        task_id: 'upload',
      });

      queryClient.invalidateQueries({ queryKey: ['personas'] });
      onSelectPersona(newPersona.id);
      setPersonaName('');
      setPersonaDesc('');
      toast.success('Voice persona saved!');
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const saveAudioBlobAsPersona = async (blob) => {
    if (!personaName.trim()) {
      toast.error('Enter a persona name first');
      return;
    }
    setIsUploading(true);
    try {
      const file = new File([blob], `${personaName.trim().replace(/\\s+/g, '_')}.webm`, { type: 'audio/webm' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const newPersona = await base44.entities.Persona.create({
        name: personaName.trim(),
        description: personaDesc.trim() || `Custom voice: ${personaName}`,
        persona_id: `record_${Date.now()}`,
        audio_id: file_url,
        task_id: 'recording',
      });
      queryClient.invalidateQueries({ queryKey: ['personas'] });
      onSelectPersona(newPersona.id);
      setPersonaName('');
      setPersonaDesc('');
      toast.success('Recorded voice persona saved!');
    } catch (err) {
      toast.error('Recording upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stopStream();
        if (blob.size > 0) await saveAudioBlobAsPersona(blob);
      };

      recorder.start();
      setIsRecording(true);
      toast.success('Recording started');
    } catch (err) {
      toast.error('Microphone access failed');
    }
  };

  return (
    <div className="space-y-2">
      {/* Selector */}
      <button
        onClick={() => setShowPersonas(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all hover:border-rose-500/40"
        style={{ background: 'rgba(255,255,255,0.04)', borderColor: selectedPersona ? 'rgba(225,29,72,0.4)' : 'rgba(255,255,255,0.08)' }}
      >
        <Mic2 className="h-3.5 w-3.5 flex-shrink-0" style={{ color: selectedPersona ? '#e11d48' : 'rgba(255,255,255,0.3)' }} />
        <span className={cn('flex-1 text-xs truncate', selectedPersona ? 'text-white font-semibold' : 'text-white/30')}>
          {selectedPersona ? selectedPersona.name : 'No voice persona (default)'}
        </span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-white/25 transition-transform', showPersonas && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {showPersonas && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="rounded-xl border overflow-hidden"
            style={{ background: 'rgba(14,14,22,0.98)', borderColor: 'rgba(255,255,255,0.1)' }}
          >
            {/* No persona option */}
            <button
              onClick={() => { onSelectPersona(null); setShowPersonas(false); }}
              className={cn('w-full flex items-center gap-2 px-3 py-2 text-xs transition-all hover:bg-white/5', !selectedPersonaId && 'text-white' )}
              style={{ color: !selectedPersonaId ? '#e11d48' : 'rgba(255,255,255,0.4)' }}
            >
              <User className="h-3.5 w-3.5" />
              <span>Default Voice</span>
              {!selectedPersonaId && <Check className="h-3 w-3 ml-auto" />}
            </button>

            {personas.map(p => (
              <button
                key={p.id}
                onClick={() => { onSelectPersona(p.id); setShowPersonas(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-all hover:bg-white/5"
                style={{ color: selectedPersonaId === p.id ? '#e11d48' : 'rgba(255,255,255,0.7)' }}
              >
                <Mic2 className="h-3.5 w-3.5 flex-shrink-0" />
                <div className="flex-1 text-left min-w-0">
                  <p className="font-semibold truncate">{p.name}</p>
                  {p.description && <p className="text-[10px] text-white/30 truncate">{p.description}</p>}
                </div>
                {selectedPersonaId === p.id && <Check className="h-3 w-3 flex-shrink-0" />}
              </button>
            ))}

            {/* Upload new */}
            <div className="px-3 py-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Clone New Voice</p>
              <input
                value={personaName}
                onChange={e => setPersonaName(e.target.value)}
                placeholder="Persona name..."
                className="w-full rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none mb-1.5"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
              <input
                value={personaDesc}
                onChange={e => setPersonaDesc(e.target.value)}
                placeholder="Description (optional)..."
                className="w-full rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none mb-2"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
              <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={isUploading || !personaName.trim()}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
                style={{ background: 'rgba(225,29,72,0.2)', border: '1px solid rgba(225,29,72,0.35)', color: '#f43f5e' }}
              >
                {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {isUploading ? 'Uploading...' : 'Upload Vocal File'}
              </button>
              <button
                onClick={toggleRecording}
                disabled={isUploading || !personaName.trim()}
                className="w-full mt-1.5 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
                style={{ background: isRecording ? 'rgba(220,38,38,0.25)' : 'rgba(59,130,246,0.2)', border: `1px solid ${isRecording ? 'rgba(220,38,38,0.4)' : 'rgba(59,130,246,0.35)'}`, color: isRecording ? '#fca5a5' : '#93c5fd' }}
              >
                <Mic2 className={cn('h-3.5 w-3.5', isRecording && 'animate-pulse')} />
                {isRecording ? 'Stop & Save Recording' : 'Record Live Voice'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
