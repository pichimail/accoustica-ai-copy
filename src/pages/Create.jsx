import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAudioPlayer } from '@/components/audio/AudioPlayerContext';
import { Share2, Maximize2, Minimize2, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import StudioLibraryPanel from '@/components/create/StudioLibraryPanel';
import StudioCenterPanel from '@/components/create/StudioCenterPanel';
import StudioGeneratePanel from '@/components/create/StudioGeneratePanel';
import { haptics } from '@/components/utils/haptics';

export default function CreatePage() {
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
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [simplePrompt, setSimplePrompt] = useState('');
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [remixSource, setRemixSource] = useState('');
  const [remixPrompt, setRemixPrompt] = useState('');
  const [remixInfluence, setRemixInfluence] = useState(55);
  const [selectedPersonaId, setSelectedPersonaId] = useState(null);
  const [generatingTaskId, setGeneratingTaskId] = useState(null);

  // ── Mobile panel state ──
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const queryClient = useQueryClient();
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();

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
      return arr.some(t => t.status === 'generating' || t.status === 'queued') ? 2500 : false;
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
    if (isAdvanced && !lyrics.trim()) { toast.error('Please add lyrics'); return; }
    if (!isAdvanced && !isRemix && !isMashup && !finalPrompt) { toast.error('Please describe your music'); return; }

    try {
      const today = new Date().toISOString().split('T')[0];
      await base44.auth.updateMe({
        daily_usage: (user?.daily_usage || 0) + 1,
        last_usage_reset: today,
        monthly_usage: (user?.monthly_usage || 0) + 1,
        total_tracks: (user?.total_tracks || 0) + 1,
        last_active: new Date().toISOString(),
      });

      const payload = {
        mode: isInstrumental ? 'instrumental' : isAdvanced ? 'custom' : 'simple',
        model: 'V5',
        prompt: isAdvanced ? lyrics : finalPrompt,
        style: styles || 'Pop',
        title: title || finalPrompt.slice(0, 40) || 'Untitled',
        customMode: isAdvanced,
        instrumental: isInstrumental,
        ...(selectedPersonaId && { personaId: selectedPersonaId }),
      };

      const response = await base44.functions.invoke('generateMusic', payload);
      if (!response.data.success) throw new Error(response.data.error || 'Generation failed');

      setGeneratingTaskId(response.data.taskId);
      toast.success('Generating your track!');
      haptics.success();
      pollStatus(response.data.taskId);

      // Reset form
      setSimplePrompt(''); setTitle(''); setLyrics('');
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
        if (attempts < 60) setTimeout(poll, 2500);
        else { setGeneratingTaskId(null); toast.error('Timed out'); }
      } catch { setGeneratingTaskId(null); }
    };
    poll();
  };

  const handlePlay = (track) => {
    if (track.status !== 'ready') return;
    haptics.light();
    playTrack(track, allTracks.filter(t => t.status === 'ready'));
  };

  return (
    <>
      {/* ════ DESKTOP: 3-panel Studio Layout ════ */}
      <div className="hidden md:flex overflow-hidden" style={{ background: '#09090f', height: '100vh' }}>

        {/* LEFT — Library */}
        <div className="w-56 lg:w-64 flex-shrink-0 h-full overflow-hidden">
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

        {/* CENTER — Split track detail + generations */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Studio header bar */}
          <div className="flex-shrink-0 flex items-center justify-between px-5 py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(10,10,16,0.9)' }}>
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

        {/* RIGHT — Generate */}
        <div className="w-64 lg:w-72 xl:w-80 flex-shrink-0 h-full overflow-hidden">
          <StudioGeneratePanel
            tab={tab} onTabChange={setTab}
            title={title} onTitleChange={setTitle}
            lyrics={lyrics} onLyricsChange={setLyrics}
            styles={styles} onStylesChange={setStyles}
            vocalGender={vocalGender} onVocalGenderChange={setVocalGender}
            negativeTag={negativeTag} onNegativeTagChange={setNegativeTag}
            styleWeight={styleWeight} onStyleWeightChange={setStyleWeight}
            clarityWeight={clarityWeight} onClarityWeightChange={setClarityWeight}
            isInstrumental={isInstrumental} onInstrumentalChange={setIsInstrumental}
            simplePrompt={simplePrompt} onSimplePromptChange={setSimplePrompt}
            showMoreOptions={showMoreOptions} onToggleMoreOptions={() => setShowMoreOptions(v => !v)}
            remixSource={remixSource} onRemixSourceChange={setRemixSource}
            remixPrompt={remixPrompt} onRemixPromptChange={setRemixPrompt}
            remixInfluence={remixInfluence} onRemixInfluenceChange={setRemixInfluence}
            selectedPersonaId={selectedPersonaId} onSelectPersona={setSelectedPersonaId}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            tracks={allTracks}
          />
        </div>
      </div>

      {/* ════ MOBILE: single column ════ */}
      <div className="md:hidden flex flex-col min-h-screen pb-40" style={{ background: '#09090f' }}>
        {/* Mobile header */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b" style={{ background: 'rgba(9,9,15,0.97)', backdropFilter: 'blur(20px)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <span className="text-base font-extrabold" style={{ color: '#fff' }}>Studio</span>
          <button
            onClick={() => setMobilePanelOpen(v => !v)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            style={{ background: mobilePanelOpen ? 'rgba(225,29,72,0.25)' : 'rgba(255,255,255,0.06)', color: mobilePanelOpen ? '#f43f5e' : 'rgba(255,255,255,0.6)', border: `1px solid ${mobilePanelOpen ? 'rgba(225,29,72,0.35)' : 'rgba(255,255,255,0.08)'}` }}
          >
            {mobilePanelOpen ? 'Library' : 'Generate'}
          </button>
        </div>

        {mobilePanelOpen ? (
          /* Generate panel */
          <div className="flex-1">
            <StudioGeneratePanel
              tab={tab} onTabChange={setTab}
              title={title} onTitleChange={setTitle}
              lyrics={lyrics} onLyricsChange={setLyrics}
              styles={styles} onStylesChange={setStyles}
              vocalGender={vocalGender} onVocalGenderChange={setVocalGender}
              negativeTag={negativeTag} onNegativeTagChange={setNegativeTag}
              styleWeight={styleWeight} onStyleWeightChange={setStyleWeight}
              clarityWeight={clarityWeight} onClarityWeightChange={setClarityWeight}
              isInstrumental={isInstrumental} onInstrumentalChange={setIsInstrumental}
              simplePrompt={simplePrompt} onSimplePromptChange={setSimplePrompt}
              showMoreOptions={showMoreOptions} onToggleMoreOptions={() => setShowMoreOptions(v => !v)}
              remixSource={remixSource} onRemixSourceChange={setRemixSource}
              remixPrompt={remixPrompt} onRemixPromptChange={setRemixPrompt}
              remixInfluence={remixInfluence} onRemixInfluenceChange={setRemixInfluence}
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

/* ── Mobile-only sub-components ── */
function MobileTrackDetail({ track, currentTrack, isPlaying, onPlay }) {
  const isActive = currentTrack?.id === track.id;
  return (
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.07)' }}>
        {track.cover_image_url
          ? <img src={track.cover_image_url} alt={track.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><span className="text-lg">🎵</span></div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: '#fff' }}>{track.title}</p>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{track.created_by?.split('@')[0] || 'You'}</p>
      </div>
      {track.status === 'ready' && (
        <button onClick={onPlay}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: isActive && isPlaying ? 'rgba(225,29,72,0.25)' : 'rgba(255,255,255,0.08)' }}>
          <span className="text-white text-sm">{isActive && isPlaying ? '⏸' : '▶'}</span>
        </button>
      )}
    </div>
  );
}

function MobileTrackRow({ track, isCurrent, isPlaying, isSelected, onPlay, onSelect }) {
  const statusColor = { ready: '#22c55e', generating: '#a78bfa', queued: '#fbbf24', failed: '#f87171' };
  return (
    <div
      onClick={onSelect}
      className="flex items-center gap-3 px-4 py-2.5 border-b transition-all"
      style={{
        borderColor: 'rgba(255,255,255,0.04)',
        background: isSelected ? 'rgba(225,29,72,0.07)' : 'transparent',
      }}
    >
      <div className="relative w-10 h-10 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
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
        {track.status === 'ready' && (
          <button onClick={e => { e.stopPropagation(); onPlay(); }}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.07)' }}>
            <span className="text-white text-xs">▶</span>
          </button>
        )}
      </div>
    </div>
  );
}