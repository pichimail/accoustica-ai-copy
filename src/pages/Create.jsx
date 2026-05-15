// @ts-nocheck
import React, { useCallback, useRef, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAudioPlayer } from '@/components/audio/AudioPlayerContext';
import { useLocation, useNavigate } from 'react-router-dom';
import StudioLibraryPanel from '@/components/create/StudioLibraryPanel';
import StudioCenterPanel from '@/components/create/StudioCenterPanel';
import StudioGeneratePanel from '@/components/create/StudioGeneratePanel';
import { haptics } from '@/components/utils/haptics';
import { getTrackAudioSource } from '@/components/audio/AudioPlayerContext';

// ── Auto-fill helpers ──
function computeAutoNegativeTag(styles) {
  const s = styles.toLowerCase();
  if (s.includes('shamanic') || s.includes('ecstatic dance') || s.includes('root chakra') || s.includes('tribal ambient'))
  return 'pop chorus, trap hats, dubstep wobble, metal guitars, cheap EDM risers, cartoon vocals, harsh distortion';
  if (s.includes('hitch hiker') || s.includes('hitchhiker') || s.includes('canyon pulse') || s.includes('desert house'))
  return 'cheesy pop, happy ukulele, thin bass, over-bright vocals, trap hi-hats, generic festival EDM';
  if (s.includes('maksim') || s.includes('dark minimal techno') || s.includes('warehouse groove'))
  return 'pop vocals, soft ballad, acoustic guitar, bright tropical house, lo-fi haze, orchestral drama';
  if (s.includes('nostalgia') || s.includes('night drive') || s.includes('vocoder texture'))
  return 'metal guitars, folk acoustic, raw punk, trap beat, atonal noise, muddy mix';
  if (s.includes('lo-fi') || s.includes('lofi') || s.includes('chill'))
  return 'aggressive, harsh, loud, distorted, metal';
  if (s.includes('raaga') || s.includes('classical') || s.includes('devotional') || s.includes('hindustani') || s.includes('carnatic'))
  return 'electronic, trap, edm, distorted, auto-tune, aggressive';
  if (s.includes('ambient') || s.includes('meditation') || s.includes('dreamy') || s.includes('meditat'))
  return 'aggressive, loud, harsh, distorted, fast tempo, metal';
  if (s.includes('jazz'))
  return 'electronic, trap, auto-tune, over-compressed, distorted';
  if (s.includes('folk') || s.includes('acoustic'))
  return 'electronic, synthetic, auto-tune, over-produced, harsh';
  if (s.includes('edm') || s.includes('techno') || s.includes('electronic') || s.includes('house'))
  return 'acoustic, organic, slow, low energy, unplugged';
  if (s.includes('metal') || s.includes('rock'))
  return 'soft, ballad, acoustic, smooth, mellow';
  if (s.includes('bollywood') || s.includes('telugu') || s.includes('cinematic') || s.includes('orchestral'))
  return 'atonal, harsh, noise, avant-garde, dissonant';
  if (s.includes('psychedelic') || s.includes('psy') || s.includes('hitchhiker') || s.includes('cosmic'))
  return 'bland, generic, over-polished, sterile';
  return '';
}

function computeAutoStyleWeight(styles) {
  const s = styles.toLowerCase();
  if (s.includes('raaga') || s.includes('classical') || s.includes('devotional') || s.includes('hindustani')) return 88;
  if (s.includes('ambient') || s.includes('lo-fi') || s.includes('dreamy') || s.includes('chill')) return 62;
  if (s.includes('hitchhiker') || s.includes('cosmic') || s.includes('surreal')) return 72;
  if (s.includes('techno') || s.includes('edm') || s.includes('electronic')) return 80;
  return 75;
}

function computeAutoWeirdness(styles, lyrics) {
  const s = (styles + ' ' + lyrics).toLowerCase();
  if (s.includes('psychedelic') || s.includes('experimental') || s.includes('surreal') || s.includes('psy') || s.includes('hitchhiker')) return 68;
  if (s.includes('devotional') || s.includes('classical') || s.includes('folk') || s.includes('acoustic') || s.includes('meditat')) return 32;
  if (s.includes('jazz') || s.includes('lo-fi') || s.includes('chill') || s.includes('ambient')) return 45;
  if (s.includes('techno') || s.includes('edm') || s.includes('electronic') || s.includes('house')) return 58;
  return 55;
}

export default function CreatePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search || '');
  const isGenerateOnlyMobile = params.get('panel') === 'generate';
  // ── User & plan ──
  const [user, setUser] = useState(null);
  useEffect(() => {base44.auth.me().then(setUser).catch(() => {});}, []);

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

  // ── Auto-fill negative tags & sliders from style/lyrics ──
  useEffect(() => {
    if (!styles && !lyrics) return;
    if (!negativeTagTouched) {
      const auto = computeAutoNegativeTag(styles);
      setNegativeTag(auto);
    }
    if (!styleWeightTouched) {
      setStyleWeight(computeAutoStyleWeight(styles));
    }
    if (!weirdnessTouched) {
      setClarityWeight(computeAutoWeirdness(styles, lyrics));
    }
  }, [styles, lyrics]);

  const queryClient = useQueryClient();
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();

  useEffect(() => {
    if (isGenerateOnlyMobile) setMobilePanelOpen(true);
  }, [isGenerateOnlyMobile]);

  const _showGeneratePanelMobile = isGenerateOnlyMobile || mobilePanelOpen;

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
      return arr.some((t) => t.status === 'generating' || t.status === 'queued') ? 5000 : false;
    }
  });

  const filteredLibTracks = allTracks.filter((t) =>
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
    if (!isAdvanced && !isRemix && !isMashup && finalPrompt.length > 495) {toast.error('Simple prompt must be 495 chars or less');return;}
    if (isAdvanced && styles.length > 995) {toast.error('Styles must be 995 chars or less');return;}
    if (isAdvanced && lyrics.length > 4995) {toast.error('Lyrics must be 4995 chars or less');return;}
    if (isAdvanced && !lyrics.trim()) {toast.error(isInstrumental ? 'Please add an instrumental structure prompt' : 'Please add lyrics');return;}
    if (!isAdvanced && !isRemix && !isMashup && !finalPrompt) {toast.error('Please describe your music');return;}
    if (isRemix && !remixSource) {toast.error('Choose a source track to remix');return;}
    if (isMashup && mashupTrackIds.length !== 2) {toast.error('Choose exactly two ready tracks for a mashup');return;}

    try {
      const today = new Date().toISOString().split('T')[0];
      await base44.auth.updateMe({
        daily_usage: (user?.daily_usage || 0) + 1,
        last_usage_reset: today,
        monthly_usage: (user?.monthly_usage || 0) + 1,
        total_tracks: (user?.total_tracks || 0) + 1,
        last_active: new Date().toISOString()
      });

      let response;

      if (isMashup) {
        const selected = allTracks.filter((track) => mashupTrackIds.includes(track.id));
        response = await base44.functions.invoke('generateMashup', {
          trackIds: mashupTrackIds,
          prompt: remixPrompt || `Blend ${selected.map((track) => track.title).join(' and ')} into a coherent mashup`,
          style: styles,
          title: title || `Mashup: ${selected.map((track) => track.title).join(' x ')}`,
          model: 'V5_5',
          instrumental: isInstrumental,
          // audioWeight controls the blend weight of source audio features (0–100 → normalised to 0–1 in the backend)
          audioWeight: remixInfluence,
          styleWeight,
          weirdnessConstraint: clarityWeight,
          ...(vocalGender !== 'Auto' && { vocalGender }),
        });
      } else if (isRemix) {
        const source = allTracks.find((track) => track.id === remixSource);
        const sourceUrl = source?.audio_url || source?.stream_audio_url;
        if (!sourceUrl) throw new Error('Selected source track has no playable audio URL yet');
        const strictVoiceDirective = selectedPersonaId && strictVoiceClone ? ' strict voice clone, preserve identity timbre and articulation' : '';
        response = await base44.functions.invoke('uploadAndCoverAudio', {
          uploadUrl: sourceUrl,
          prompt: remixPrompt || styles || `Remix ${source.title}`,
          customMode: true,
          instrumental: isInstrumental,
          model: 'V5_5',
          style: `${styles || source.style || 'AI remix'}${strictVoiceDirective}`,
          title: title || `${source.title} Remix`,
          audioWeight: remixInfluence,
          ...(negativeTag.trim() && { negativeTags: negativeTag.trim() }),
          styleWeight,
          weirdnessConstraint: clarityWeight,
          ...(vocalGender !== 'Auto' && { vocalGender }),
          ...(selectedPersonaId && { personaId: selectedPersonaId })
        });
      } else {
        const strictVoiceDirective = selectedPersonaId && strictVoiceClone ? ' strict voice clone, preserve identity timbre and articulation' : '';
        const payload = isAdvanced ? {
          mode: 'custom',
          model: 'V5_5',
          prompt: lyrics,
          style: `${styles || 'Pop'}${strictVoiceDirective}`,
          ...(title.trim() && { title: title.trim() }),
          customMode: true,
          instrumental: isInstrumental,
          ...(negativeTag.trim() && { negativeTags: negativeTag.trim() }),
          styleWeight,
          weirdnessConstraint: clarityWeight,
          ...(vocalGender !== 'Auto' && { vocalGender }),
          ...(selectedPersonaId && { personaId: selectedPersonaId })
        } : {
          mode: 'simple',
          model: 'V5_5',
          prompt: finalPrompt,
          customMode: false,
          instrumental: false
        };

        response = await base44.functions.invoke('generateMusic', payload);
      }
      if (!response.data.success) throw new Error(response.data.error || 'Generation failed');

      setGeneratingTaskId(response.data.taskId);
      toast.success('Generating your track!');
      haptics.success();
      pollStatus(response.data.taskId);
      const isMobileView = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
      if (isMobileView) {
        navigate('/Library');
      }

      // Reset form
      setSimplePrompt('');setTitle('');setLyrics('');
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
          if (tracks.length > 0 && tracks.every((t) => t.status === 'ready')) {
            setGeneratingTaskId(null);
            queryClient.invalidateQueries({ queryKey: ['studioTracks'] });
            toast.success('Track ready! 🎵');
            return;
          }
          if (tracks.some((t) => t.status === 'failed')) {
            setGeneratingTaskId(null);
            toast.error('Generation failed');
            queryClient.invalidateQueries({ queryKey: ['studioTracks'] });
            return;
          }
        }
        // Poll every 5s as recommended by kie.ai/suno API docs (max 60 attempts = 5 min)
        if (attempts < 60) setTimeout(poll, 5000);else
        {setGeneratingTaskId(null);toast.error('Timed out');}
      } catch {setGeneratingTaskId(null);}
    };
    poll();
  };

  const handlePlay = (track) => {
    const playableUrl = getTrackAudioSource(track);
    if (!playableUrl) return;
    haptics.light();
    playTrack(track, allTracks.filter((t) => !!getTrackAudioSource(t)));
  };

  return (
    <>
      {/* ════ DESKTOP: 3-panel Studio Layout ════ */}
      <div ref={desktopStudioRef} className="hidden md:flex overflow-hidden" style={{ background: '#0a0a0f', height: 'var(--content-available-height, 100vh)' }}>

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
            isLoading={tracksLoading} />
          
        </div>

        <SplitterHandle label="Resize library" onPointerDown={beginResize('library')} />

        {/* CENTER — Split track detail + generations */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Studio header bar */}
          <div className="flex-shrink-0 flex items-center justify-between px-5 py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#0a0a0f' }}>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>⚙</span>
              <span className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.75)' }}>Studio Center</span>
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
              isGenerating={isGenerating} />
            
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
            negativeTag={negativeTag} onNegativeTagChange={(value) => {setNegativeTag(value);setNegativeTagTouched(true);}}
            styleWeight={styleWeight} onStyleWeightChange={(value) => {setStyleWeight(value);setStyleWeightTouched(true);}}
            clarityWeight={clarityWeight} onClarityWeightChange={(value) => {setClarityWeight(value);setWeirdnessTouched(true);}}
            isInstrumental={isInstrumental} onInstrumentalChange={setIsInstrumental}
            strictVoiceClone={strictVoiceClone} onStrictVoiceCloneChange={setStrictVoiceClone}
            simplePrompt={simplePrompt} onSimplePromptChange={setSimplePrompt}
            showMoreOptions={showMoreOptions} onToggleMoreOptions={() => setShowMoreOptions((v) => !v)}
            remixSource={remixSource} onRemixSourceChange={setRemixSource}
            remixPrompt={remixPrompt} onRemixPromptChange={setRemixPrompt}
            remixInfluence={remixInfluence} onRemixInfluenceChange={setRemixInfluence}
            mashupTrackIds={mashupTrackIds}
            onToggleMashupTrack={(id) => setMashupTrackIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(-2))}
            selectedPersonaId={selectedPersonaId} onSelectPersona={setSelectedPersonaId}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            tracks={allTracks} />
          
        </div>
      </div>

      {/* ════ MOBILE: single column — always shows generate panel ════ */}
      <div
        className="md:hidden flex flex-col overflow-hidden"
        style={{ background: '#0a0a0f', height: 'calc(var(--content-available-height, calc(100vh - 128px)) - 3.5rem)' }}
      >
        <StudioGeneratePanel
          tab={tab} onTabChange={setTab}
          title={title} onTitleChange={setTitle}
          lyrics={lyrics} onLyricsChange={setLyrics}
          styles={styles} onStylesChange={setStyles}
          vocalGender={vocalGender} onVocalGenderChange={setVocalGender}
          negativeTag={negativeTag} onNegativeTagChange={(value) => {setNegativeTag(value);setNegativeTagTouched(true);}}
          styleWeight={styleWeight} onStyleWeightChange={(value) => {setStyleWeight(value);setStyleWeightTouched(true);}}
          clarityWeight={clarityWeight} onClarityWeightChange={(value) => {setClarityWeight(value);setWeirdnessTouched(true);}}
          isInstrumental={isInstrumental} onInstrumentalChange={setIsInstrumental}
          strictVoiceClone={strictVoiceClone} onStrictVoiceCloneChange={setStrictVoiceClone}
          simplePrompt={simplePrompt} onSimplePromptChange={setSimplePrompt}
          showMoreOptions={showMoreOptions} onToggleMoreOptions={() => setShowMoreOptions((v) => !v)}
          remixSource={remixSource} onRemixSourceChange={setRemixSource}
          remixPrompt={remixPrompt} onRemixPromptChange={setRemixPrompt}
          remixInfluence={remixInfluence} onRemixInfluenceChange={setRemixInfluence}
          mashupTrackIds={mashupTrackIds}
          onToggleMashupTrack={(id) => setMashupTrackIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(-2))}
          selectedPersonaId={selectedPersonaId} onSelectPersona={setSelectedPersonaId}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          tracks={allTracks} />
      </div>
    </>);

}

function SplitterHandle({ label, onPointerDown }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      tabIndex={0}
      onMouseDown={onPointerDown}
      onTouchStart={onPointerDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-3 flex-shrink-0 cursor-col-resize focus:outline-none group relative transition-all"
      style={{
        background: hovered ? 'rgba(225,29,72,0.08)' : 'transparent',
        borderLeft: `1px solid ${hovered ? 'rgba(225,29,72,0.25)' : 'rgba(255,255,255,0.07)'}`,
        borderRight: `1px solid ${hovered ? 'rgba(225,29,72,0.15)' : 'rgba(255,255,255,0.04)'}`
      }}>
      
      <div className="h-full flex flex-col items-center justify-center gap-1">
        <div className="w-px" style={{ height: '100%', background: hovered ? 'rgba(225,29,72,0.5)' : 'rgba(255,255,255,0.13)' }} />
      </div>
      {hovered &&
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-10 rounded-full flex flex-col items-center justify-center gap-0.5"
      style={{ background: 'rgba(225,29,72,0.18)', border: '1px solid rgba(225,29,72,0.35)' }}>
          <div className="w-0.5 h-3 rounded-full" style={{ background: '#e11d48' }} />
        </div>
      }
    </div>);

}

/* ── Mobile-only sub-components ── */
function _MobileTrackDetail({ track, currentTrack, isPlaying, onPlay }) {
  const isActive = currentTrack?.id === track.id;
  const canPlay = !!(track?.stream_audio_url || track?.audio_url);
  return (
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.07)' }}>
        {track.cover_image_url ?
        <img src={track.cover_image_url} alt={track.title} className="w-full h-full object-cover" /> :
        <div className="w-full h-full flex items-center justify-center"><span className="text-lg">🎵</span></div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: '#fff' }}>{track.title}</p>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{track.created_by?.split('@')[0] || 'You'}</p>
      </div>
      {canPlay &&
      <button onClick={onPlay}
      className="w-9 h-9 flex items-center justify-center flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-rose-400"
      style={{ background: isActive && isPlaying ? 'rgba(225,29,72,0.25)' : 'rgba(255,255,255,0.08)' }}>
          <span className="text-white text-sm">{isActive && isPlaying ? '⏸' : '▶'}</span>
        </button>
      }
    </div>);

}

function _MobileTrackRow({ track, isCurrent, isPlaying, isSelected, onPlay, onSelect }) {
  const statusColor = { ready: '#22c55e', generating: '#a78bfa', queued: '#fbbf24', failed: '#f87171' };
  const canPlay = !!(track?.stream_audio_url || track?.audio_url);
  return (
    <div
      onClick={onSelect}
      className="flex items-center gap-3 px-4 py-2.5 border-b transition-all"
      style={{
        borderColor: 'rgba(255,255,255,0.04)',
        background: isSelected ? 'rgba(225,29,72,0.07)' : 'transparent'
      }}>
      
      <div className="relative w-10 h-10 overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {track.cover_image_url ?
        <img src={track.cover_image_url} alt="" className="w-full h-full object-cover" /> :
        <div className="w-full h-full flex items-center justify-center"><span className="text-sm">🎵</span></div>
        }
        {isPlaying &&
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="flex items-end gap-[1.5px]">
              {[0.6, 1, 0.4].map((h, i) =>
            <span key={i} className="w-[2px] rounded-full"
            style={{ height: `${h * 8}px`, background: '#e11d48', animation: `beat-bar ${0.5 + i * 0.15}s ease-in-out infinite alternate` }} />
            )}
            </div>
          </div>
        }
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
        {canPlay &&
        <button onClick={(e) => {e.stopPropagation();onPlay();}}
        className="w-8 h-8 flex items-center justify-center focus:outline-none focus:ring-1 focus:ring-rose-400"
        style={{ background: 'rgba(255,255,255,0.07)' }}>
            <span className="text-white text-xs">▶</span>
          </button>
        }
      </div>
    </div>);

}
