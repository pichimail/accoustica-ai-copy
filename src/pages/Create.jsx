import React, { useCallback, useRef, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAudioPlayer } from '@/components/audio/AudioPlayerContext';
import { useLocation } from 'react-router-dom';
import { Share2, Maximize2, Settings2 } from 'lucide-react';
import StudioLibraryPanel from '@/components/create/StudioLibraryPanel';
import StudioCenterPanel from '@/components/create/StudioCenterPanel';
import StudioGeneratePanel from '@/components/create/StudioGeneratePanel';
import { haptics } from '@/components/utils/haptics';
import { getTrackAudioSource } from '@/components/audio/AudioPlayerContext';

export default function CreatePage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search || '');
  const isGenerateOnlyMobile = params.get('panel') === 'generate';
  // ── User & plan ──
  const [user, setUser] = useState(null);
  useEffect(() => { base44.auth.me().then(setUser); }, []);

  // ── Library state ──
  const [libSearch, setLibSearch] = useState('');
  const [selectedTrack, setSelectedTrack] = useState(null);

  // ── Generate panel state ──
  const [tab, setTab] = useState('simple');
  const [title, setTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [styles, setStyles] = useState('');
  const [vocalGender, setVocalGender] = useState('Auto');
  const [negativeTag, setNegativeTag] = useState('');
  const [styleWeight, setStyleWeight] = useState(75);
  const [clarityWeight, setClarityWeight] = useState(60);
  const [styleWeightTouched, setStyleWeightTouched] = useState(false);
  const [weirdnessTouched, setWeirdnessTouched] = useState(false);
  const [negativeTagTouched, setNegativeTagTouched] = useState(false);
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [simplePrompt, setSimplePrompt] = useState('');
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [remixSource, setRemixSource] = useState('');
  const [remixPrompt, setRemixPrompt] = useState('');
  const [remixInfluence, setRemixInfluence] = useState(55);
  const [mashupTrackIds, setMashupTrackIds] = useState([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState(null);
  const [strictVoiceClone, setStrictVoiceClone] = useState(false);
  const [generatingTaskId, setGeneratingTaskId] = useState(null);
  const [libraryWidth, setLibraryWidth] = useState(256);
  const [generateWidth, setGenerateWidth] = useState(320);
  const desktopStudioRef = useRef(null);

  // ── Mobile panel state ──
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const queryClient = useQueryClient();
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();

  useEffect(() => {
    if (isGenerateOnlyMobile) setMobilePanelOpen(true);
  }, [isGenerateOnlyMobile]);

  const showGeneratePanelMobile = isGenerateOnlyMobile || mobilePanelOpen;

  const beginResize = useCallback((panel) => (event) => {
    event.preventDefault();
    const startX = event.touches ? event.touches[0].clientX : event.clientX;
    const startLibrary = libraryWidth;
    const startGenerate = generateWidth;
    const containerWidth = desktopStudioRef.current?.offsetWidth || window.innerWidth;

    const move = (moveEvent) => {
      const clientX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const delta = clientX - startX;
      if (panel === 'library') {
        setLibraryWidth(Math.max(216, Math.min(390, startLibrary + delta)));
      } else {
        setGenerateWidth(Math.max(280, Math.min(Math.min(460, containerWidth - 520), startGenerate - delta)));
      }
    };

    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
  }, [generateWidth, libraryWidth]);

  // ── Queries ──
  const { data: allTracks = [], isLoading: tracksLoading } = useQuery({
    queryKey: ['studioTracks', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Track.filter({ created_by: user.email }, '-created_date', 50);
    },
    enabled: !!user?.email,
    refetchInterval: (data) => {
      const arr = Array.isArray(data) ? data : [];
      return arr.some(t => t.status === 'generating' || t.status === 'queued') ? 5000 : false;
    },
  });

  const filteredLibTracks = allTracks.filter(t =>
    !libSearch || t.title?.toLowerCase().includes(libSearch.toLowerCase())
  );

  // ── Generate mutation ──
  const isGenerating = !!generatingTaskId;

  const handleGenerate = async () => {
    haptics.medium();
    const isAdvanced = tab === 'advanced';
    const isRemix = tab === 'remix';
    const isMashup = tab === 'mashup';

    let finalPrompt = simplePrompt.trim();
    if (!isAdvanced && !isRemix && !isMashup && finalPrompt.length > 495) { toast.error('Simple prompt must be 495 chars or less'); return; }
    if (isAdvanced && styles.length > 995) { toast.error('Styles must be 995 chars or less'); return; }
    if (isAdvanced && lyrics.length > 4995) { toast.error('Lyrics must be 4995 chars or less'); return; }
    if (isAdvanced && !lyrics.trim()) { toast.error('Please add lyrics'); return; }
    if (!isAdvanced && !isRemix && !isMashup && !finalPrompt) { toast.error('Please describe your music'); return; }
    if (isRemix && !remixSource) { toast.error('Choose a source track to remix'); return; }
    if (isMashup && mashupTrackIds.length !== 2) { toast.error('Choose exactly two ready tracks for a mashup'); return; }

    try {
      const today = new Date().toISOString().split('T')[0];
      await base44.auth.updateMe({
        daily_usage: (user?.daily_usage || 0) + 1,
        last_usage_reset: today,
        monthly_usage: (user?.monthly_usage || 0) + 1,
        total_tracks: (user?.total_tracks || 0) + 1,
        last_active: new Date().toISOString(),
      });

      let response;

      if (isMashup) {
        const selected = allTracks.filter(track => mashupTrackIds.includes(track.id));
        response = await base44.functions.invoke('generateMashup', {
          trackIds: mashupTrackIds,
          prompt: remixPrompt || `Blend ${selected.map(track => track.title).join(' and ')} into a coherent mashup`,
          style: styles,
          title: title || `Mashup: ${selected.map(track => track.title).join(' x ')}`,
          model: 'V5',
        });
      } else if (isRemix) {
        const source = allTracks.find(track => track.id === remixSource);
        const sourceUrl = source?.audio_url || source?.stream_audio_url;
        if (!sourceUrl) throw new Error('Selected source track has no playable audio URL yet');
        const strictVoiceDirective = selectedPersonaId && strictVoiceClone ? ' strict voice clone, preserve identity timbre and articulation' : '';
        response = await base44.functions.invoke('uploadAndCoverAudio', {
          uploadUrl: sourceUrl,
          prompt: remixPrompt || styles || `Remix ${source.title}`,
          customMode: true,
          instrumental: isInstrumental,
          model: 'V5',
          style: `${styles || source.style || 'AI remix'}${strictVoiceDirective}`,
          title: title || `${source.title} Remix`,
          audioWeight: remixInfluence,
          ...(negativeTag.trim() && { negativeTags: negativeTag.trim() }),
          ...(styleWeightTouched && { styleWeight }),
          ...(weirdnessTouched && { weirdnessConstraint: clarityWeight }),
          ...(vocalGender !== 'Auto' && { vocalGender }),
          ...(selectedPersonaId && { personaId: selectedPersonaId }),
        });
      } else {
        const strictVoiceDirective = selectedPersonaId && strictVoiceClone ? ' strict voice clone, preserve identity timbre and articulation' : '';
        const payload = isAdvanced ? {
          mode: 'custom',
          model: 'V5',
          prompt: isInstrumental ? '' : lyrics,
          style: `${styles || 'Pop'}${strictVoiceDirective}`,
          ...(title.trim() && { title: title.trim() }),
          customMode: true,
          instrumental: isInstrumental,
          ...(negativeTagTouched && negativeTag.trim() && { negativeTags: negativeTag.trim() }),
          ...(styleWeightTouched && { styleWeight }),
          ...(weirdnessTouched && { weirdnessConstraint: clarityWeight }),
          ...(vocalGender !== 'Auto' && { vocalGender }),
          ...(selectedPersonaId && { personaId: selectedPersonaId }),
        } : {
          mode: 'simple',
          model: 'V5',
          prompt: finalPrompt,
          customMode: false,
          instrumental: false,
        };

        response = await base44.functions.invoke('generateMusic', payload);
      }
      if (!response.data.success) throw new Error(response.data.error || 'Generation failed');

      setGeneratingTaskId(response.data.taskId);
      toast.success('Generating your track!');
      haptics.success();
      pollStatus(response.data.taskId);

      // Reset form
      setSimplePrompt(''); setTitle(''); setLyrics('');
      setMashupTrackIds([]);
      queryClient.invalidateQueries({ queryKey: ['studioTracks'] });
    } catch (err) {
      haptics.error();
      toast.error(err.message || 'Failed to start generation');
    }
  };

  const pollStatus = async (taskId) => {
    let attempts = 0;
    const poll = async () => {
      attempts++;
      try {
        const res = await base44.functions.invoke('checkMusicStatus', { taskId });
        if (res.data.success) {
          const tracks = res.data.tracks || [];
          if (tracks.length > 0 && tracks.every(t => t.status === 'ready')) {
            setGeneratingTaskId(null);
            queryClient.invalidateQueries({ queryKey: ['studioTracks'] });
            toast.success('Track ready! 🎵');
            return;
          }
          if (tracks.some(t => t.status === 'failed')) {
            setGeneratingTaskId(null);
            toast.error('Generation failed');
            queryClient.invalidateQueries({ queryKey: ['studioTracks'] });
            return;
          }
        }
        // Poll every 5s as recommended by kie.ai/suno API docs (max 60 attempts = 5 min)
        if (attempts < 60) setTimeout(poll, 5000);
        else { setGeneratingTaskId(null); toast.error('Timed out'); }
      } catch { setGeneratingTaskId(null); }
    };
    poll();
  };

  const handlePlay = (track) => {
    const playableUrl = getTrackAudioSource(track);
    if (!playableUrl) return;
    haptics.light();
    playTrack(track, allTracks.filter(t => !!getTrackAudioSource(t)));
  };

  return (
    <>
      {/* ════ DESKTOP: 3-panel Studio Layout ════ */}
      <div ref={desktopStudioRef} className="hidden md:flex overflow-hidden" style={{ background: 'radial-gradient(circle at 20% 0%, #101325 0%, #050507 48%, #030303 100%)', height: '100vh', filter: 'contrast(1.24)' }}>

        {/* LEFT — Library */}
        <div className="flex-shrink-0 h-full overflow-hidden" style={{ width: libraryWidth }}>
          <StudioLibraryPanel
            tracks={filteredLibTracks}
            search={libSearch}
            onSearch={setLibSearch}
            selectedTrack={selectedTrack}
            onSelectTrack={setSelectedTrack}
            onPlay={handlePlay}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            isLoading={tracksLoading}
          />
        </div>

        <SplitterHandle label="Resize library" onPointerDown={beginResize('library')} />

        {/* CENTER — Split track detail + generations */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Studio header bar */}
          <div className="flex-shrink-0 flex items-center justify-between px-5 py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'linear-gradient(135deg, rgba(5,5,10,0.95), rgba(9,16,30,0.9))' }}>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>⚙</span>
              <span className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.75)' }}>Studio Center</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" title="Share">
                <Share2 className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
              </button>
              <button className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" title="Settings">
                <Settings2 className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
              </button>
              <button className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" title="Fullscreen">
                <Maximize2 className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            <StudioCenterPanel
              selectedTrack={selectedTrack}
              tracks={allTracks}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onPlay={handlePlay}
              onSelect={setSelectedTrack}
              isGenerating={isGenerating}
            />
          </div>
        </div>

        <SplitterHandle label="Resize generate panel" onPointerDown={beginResize('generate')} />

        {/* RIGHT — Generate */}
        <div className="flex-shrink-0 h-full overflow-hidden" style={{ width: generateWidth }}>
          <StudioGeneratePanel
            tab={tab} onTabChange={setTab}
            title={title} onTitleChange={setTitle}
            lyrics={lyrics} onLyricsChange={setLyrics}
            styles={styles} onStylesChange={setStyles}
            vocalGender={vocalGender} onVocalGenderChange={setVocalGender}
            negativeTag={negativeTag} onNegativeTagChange={(value) => { setNegativeTag(value); setNegativeTagTouched(true); }}
            styleWeight={styleWeight} onStyleWeightChange={(value) => { setStyleWeight(value); setStyleWeightTouched(true); }}
            clarityWeight={clarityWeight} onClarityWeightChange={(value) => { setClarityWeight(value); setWeirdnessTouched(true); }}
            isInstrumental={isInstrumental} onInstrumentalChange={setIsInstrumental}
            strictVoiceClone={strictVoiceClone} onStrictVoiceCloneChange={setStrictVoiceClone}
            simplePrompt={simplePrompt} onSimplePromptChange={setSimplePrompt}
            showMoreOptions={showMoreOptions} onToggleMoreOptions={() => setShowMoreOptions(v => !v)}
            remixSource={remixSource} onRemixSourceChange={setRemixSource}
            remixPrompt={remixPrompt} onRemixPromptChange={setRemixPrompt}
            remixInfluence={remixInfluence} onRemixInfluenceChange={setRemixInfluence}
            mashupTrackIds={mashupTrackIds}
            onToggleMashupTrack={(id) => setMashupTrackIds((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id].slice(-2))}
            selectedPersonaId={selectedPersonaId} onSelectPersona={setSelectedPersonaId}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            tracks={allTracks}
          />
        </div>
      </div>

      {/* ════ MOBILE: single column ════ */}
      <div className="md:hidden flex flex-col min-h-screen pb-40" style={{ background: 'radial-gradient(circle at 20% 0%, #101325 0%, #050507 48%, #030303 100%)', filter: 'contrast(1.24)' }}>
        {/* Mobile header */}
        {!isGenerateOnlyMobile && (
          <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b" style={{ background: 'rgba(9,9,15,0.97)', backdropFilter: 'blur(20px)', borderColor: 'rgba(255,255,255,0.06)' }}>
            <span className="text-base font-extrabold" style={{ color: '#fff' }}>Studio</span>
            <button
              onClick={() => setMobilePanelOpen(v => !v)}
              className="px-3 py-1.5 text-xs font-bold transition-all focus:outline-none focus:ring-1 focus:ring-rose-400"
              style={{ background: mobilePanelOpen ? 'rgba(225,29,72,0.25)' : 'rgba(255,255,255,0.06)', color: mobilePanelOpen ? '#f43f5e' : 'rgba(255,255,255,0.6)', border: `1px solid ${mobilePanelOpen ? 'rgba(225,29,72,0.35)' : 'rgba(255,255,255,0.08)'}` }}
            >
              {mobilePanelOpen ? 'Library' : 'Generate'}
            </button>
          </div>
        )}

        {showGeneratePanelMobile ? (
          /* Generate panel */
          <div className="flex-1">
            <StudioGeneratePanel
              tab={tab} onTabChange={setTab}
              title={title} onTitleChange={setTitle}
              lyrics={lyrics} onLyricsChange={setLyrics}
              styles={styles} onStylesChange={setStyles}
              vocalGender={vocalGender} onVocalGenderChange={setVocalGender}
              negativeTag={negativeTag} onNegativeTagChange={(value) => { setNegativeTag(value); setNegativeTagTouched(true); }}
              styleWeight={styleWeight} onStyleWeightChange={(value) => { setStyleWeight(value); setStyleWeightTouched(true); }}
              clarityWeight={clarityWeight} onClarityWeightChange={(value) => { setClarityWeight(value); setWeirdnessTouched(true); }}
              isInstrumental={isInstrumental} onInstrumentalChange={setIsInstrumental}
              strictVoiceClone={strictVoiceClone} onStrictVoiceCloneChange={setStrictVoiceClone}
              simplePrompt={simplePrompt} onSimplePromptChange={setSimplePrompt}
              showMoreOptions={showMoreOptions} onToggleMoreOptions={() => setShowMoreOptions(v => !v)}
              remixSource={remixSource} onRemixSourceChange={setRemixSource}
              remixPrompt={remixPrompt} onRemixPromptChange={setRemixPrompt}
              remixInfluence={remixInfluence} onRemixInfluenceChange={setRemixInfluence}
              mashupTrackIds={mashupTrackIds}
              onToggleMashupTrack={(id) => setMashupTrackIds((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id].slice(-2))}
              selectedPersonaId={selectedPersonaId} onSelectPersona={setSelectedPersonaId}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              tracks={allTracks}
            />
          </div>
        ) : (
          /* Library + Center stacked */
          <div className="flex-1 flex flex-col">
            {/* Selected track detail */}
            {selectedTrack && (
              <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(10,10,16,0.8)' }}>
                <MobileTrackDetail track={selectedTrack} currentTrack={currentTrack} isPlaying={isPlaying} onPlay={() => handlePlay(selectedTrack)} />
              </div>
            )}
            {/* Tracks list */}
            <div className="flex-1 overflow-y-auto">
              {allTracks.map(track => (
                <MobileTrackRow
                  key={track.id}
                  track={track}
                  isCurrent={currentTrack?.id === track.id}
                  isPlaying={currentTrack?.id === track.id && isPlaying}
                  isSelected={selectedTrack?.id === track.id}
                  onPlay={() => handlePlay(track)}
                  onSelect={() => setSelectedTrack(track)}
                />
              ))}
              {tracksLoading && (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 rounded-full border-2 border-white/10 border-t-rose-500 animate-spin" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function SplitterHandle({ label, onPointerDown }) {
  return (
    <div
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      tabIndex={0}
      onMouseDown={onPointerDown}
      onTouchStart={onPointerDown}
      className="w-2 flex-shrink-0 cursor-col-resize bg-transparent hover:bg-white/5 focus:bg-white/10 focus:outline-none"
      style={{
        borderLeft: '1px solid rgba(255,255,255,0.05)',
        borderRight: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <div className="h-full w-px mx-auto" style={{ background: 'rgba(255,255,255,0.1)' }} />
    </div>
  );
}

/* ── Mobile-only sub-components ── */
function MobileTrackDetail({ track, currentTrack, isPlaying, onPlay }) {
  const isActive = currentTrack?.id === track.id;
  const canPlay = !!(track?.stream_audio_url || track?.audio_url);
  return (
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.07)' }}>
        {track.cover_image_url
          ? <img src={track.cover_image_url} alt={track.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><span className="text-lg">🎵</span></div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: '#fff' }}>{track.title}</p>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{track.created_by?.split('@')[0] || 'You'}</p>
      </div>
      {canPlay && (
        <button onClick={onPlay}
          className="w-9 h-9 flex items-center justify-center flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-rose-400"
          style={{ background: isActive && isPlaying ? 'rgba(225,29,72,0.25)' : 'rgba(255,255,255,0.08)' }}>
          <span className="text-white text-sm">{isActive && isPlaying ? '⏸' : '▶'}</span>
        </button>
      )}
    </div>
  );
}

function MobileTrackRow({ track, isCurrent, isPlaying, isSelected, onPlay, onSelect }) {
  const statusColor = { ready: '#22c55e', generating: '#a78bfa', queued: '#fbbf24', failed: '#f87171' };
  const canPlay = !!(track?.stream_audio_url || track?.audio_url);
  return (
    <div
      onClick={onSelect}
      className="flex items-center gap-3 px-4 py-2.5 border-b transition-all"
      style={{
        borderColor: 'rgba(255,255,255,0.04)',
        background: isSelected ? 'rgba(225,29,72,0.07)' : 'transparent',
      }}
    >
      <div className="relative w-10 h-10 overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {track.cover_image_url
          ? <img src={track.cover_image_url} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><span className="text-sm">🎵</span></div>
        }
        {isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="flex items-end gap-[1.5px]">
              {[0.6, 1, 0.4].map((h, i) => (
                <span key={i} className="w-[2px] rounded-full"
                  style={{ height: `${h * 8}px`, background: '#e11d48', animation: `beat-bar ${0.5 + i * 0.15}s ease-in-out infinite alternate` }} />
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate transition-colors" style={{ color: isCurrent ? '#f43f5e' : 'rgba(255,255,255,0.85)' }}>
          {track.title}
        </p>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {track.status === 'generating' ? 'Generating…' : track.status === 'queued' ? 'In queue…' : track.created_by?.split('@')[0] || 'You'}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor[track.status] || '#555' }} />
        {canPlay && (
          <button onClick={e => { e.stopPropagation(); onPlay(); }}
            className="w-8 h-8 flex items-center justify-center focus:outline-none focus:ring-1 focus:ring-rose-400"
            style={{ background: 'rgba(255,255,255,0.07)' }}>
            <span className="text-white text-xs">▶</span>
          </button>
        )}
      </div>
    </div>
  );
}
