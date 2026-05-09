import React, { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Copy, Disc3, Globe, Pause, Play, Share2, Sparkles, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { getPublicTrackUrl, getSeoDescription, getTrackPublicSlug } from '@/lib/trackSharing';

const FALLBACK_COVER = 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=1200&h=1200&fit=crop';

export default function PublicTrackPage() {
  const params = new URLSearchParams(window.location.search);
  const trackId = params.get('id');
  const slug = params.get('slug');
  const [played, setPlayed] = useState(false);

  const { data: track, isLoading } = useQuery({
    queryKey: ['publicTrack', trackId, slug],
    queryFn: async () => {
      if (trackId) {
        const byId = await base44.entities.Track.filter({ id: trackId, is_public: true });
        if (byId[0]) return byId[0];
      }
      if (slug) {
        const bySlug = await base44.entities.Track.filter({ public_slug: slug, is_public: true });
        return bySlug[0];
      }
      return null;
    },
    enabled: !!trackId || !!slug,
  });

  const coverImage = track?.cover_image_url || FALLBACK_COVER;
  const publicUrl = track ? getPublicTrackUrl(track) : window.location.href;
  const seo = useMemo(() => {
    if (!track) return null;
    return {
      title: track.seo_title || `${track.title} | Accoustica`,
      description: track.seo_description || getSeoDescription(track),
      image: coverImage,
      url: publicUrl,
    };
  }, [coverImage, publicUrl, track]);

  useEffect(() => {
    if (!seo) return undefined;
    document.title = seo.title;
    const previous = [];
    const setMeta = (selector, attrs) => {
      const existing = document.head.querySelector(selector);
      if (existing) previous.push([existing, existing.getAttribute('content')]);
      const el = existing || document.createElement('meta');
      Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
      if (!existing) document.head.appendChild(el);
    };

    setMeta('meta[name="description"]', { name: 'description', content: seo.description });
    setMeta('meta[property="og:title"]', { property: 'og:title', content: seo.title });
    setMeta('meta[property="og:description"]', { property: 'og:description', content: seo.description });
    setMeta('meta[property="og:image"]', { property: 'og:image', content: seo.image });
    setMeta('meta[property="og:url"]', { property: 'og:url', content: seo.url });
    setMeta('meta[property="og:type"]', { property: 'og:type', content: 'music.song' });
    setMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    setMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: seo.title });
    setMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: seo.description });
    setMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: seo.image });

    return () => {
      previous.forEach(([el, content]) => {
        if (content == null) el.remove();
        else el.setAttribute('content', content);
      });
    };
  }, [seo]);

  const recordPlay = async () => {
    if (!track || played) return;
    setPlayed(true);
    await Promise.allSettled([
      base44.entities.Track.update(track.id, { plays: (track.plays || 0) + 1, public_slug: track.public_slug || getTrackPublicSlug(track) }),
      base44.entities.TrackPlay.create({
        track_id: track.id,
        played_at: new Date().toISOString(),
        source: 'public',
        referrer: document.referrer || '',
      }),
    ]);
  };

  const handleShare = async () => {
    if (!track) return;
    if (navigator.share) {
      await navigator.share({ title: seo?.title || track.title, text: seo?.description, url: publicUrl });
      return;
    }
    await navigator.clipboard.writeText(publicUrl);
    toast.success('Public player link copied');
  };

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#020204' }}>
        <div className="h-9 w-9 border-2 border-white/10 border-t-rose-500 animate-spin" />
      </main>
    );
  }

  if (!track) {
    return (
      <main className="min-h-screen flex items-center justify-center px-5 text-center" style={{ background: '#020204', color: '#fff' }}>
        <div>
          <Disc3 className="h-14 w-14 mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.18)' }} />
          <h1 className="text-2xl font-extrabold">Track not available</h1>
          <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>This public link is private, missing, or no longer active.</p>
          <Link to={createPageUrl('Discover')} className="inline-flex mt-5 px-4 py-2 border text-sm font-bold" style={{ borderColor: 'rgba(255,255,255,0.14)' }}>Browse public tracks</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ background: '#020204', color: '#fff' }}>
      <header className="border-b" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(2,2,4,0.92)', backdropFilter: 'blur(18px)' }}>
        <div className="mx-auto max-w-7xl px-4 md:px-8 h-16 flex items-center justify-between">
          <Link to={createPageUrl('Home')} className="flex items-center gap-2 font-extrabold">
            <span className="inline-flex h-8 w-8 items-center justify-center border" style={{ borderColor: 'rgba(251,113,133,0.4)', color: '#fb7185' }}><Sparkles className="h-4 w-4" /></span>
            Accoustica
          </Link>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigator.clipboard.writeText(publicUrl).then(() => toast.success('Link copied'))} className="p-2 border" aria-label="Copy link" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
              <Copy className="h-4 w-4" />
            </button>
            <button type="button" onClick={handleShare} className="px-3 py-2 border text-sm font-bold flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <img src={coverImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" style={{ filter: 'blur(28px) saturate(1.35)', transform: 'scale(1.08)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(2,2,4,0.65), #020204 88%)' }} />
        <div className="relative mx-auto max-w-7xl px-4 md:px-8 py-8 md:py-14 grid lg:grid-cols-[440px_1fr] gap-8 items-end">
          <div className="aspect-square border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)' }}>
            <img src={coverImage} alt={track.title} className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2 mb-4">
              {(track.style || 'AI Generated').split(',').slice(0, 4).map(tag => (
                <span key={tag} className="px-2 py-1 border text-[11px] font-bold uppercase tracking-wider" style={{ borderColor: 'rgba(251,113,133,0.22)', color: '#fb7185', background: 'rgba(225,29,72,0.08)' }}>{tag.trim()}</span>
              ))}
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.02] max-w-4xl">{track.title}</h1>
            <p className="mt-3 text-base md:text-lg max-w-3xl" style={{ color: 'rgba(255,255,255,0.62)' }}>{seo?.description}</p>
            <div className="flex flex-wrap gap-4 mt-5 text-sm" style={{ color: 'rgba(255,255,255,0.48)' }}>
              <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" />{formatDuration(track.duration)}</span>
              <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" />{formatDate(track.created_date)}</span>
              <span className="inline-flex items-center gap-1.5"><Globe className="h-4 w-4" />{track.plays || 0} plays</span>
            </div>
            <div className="mt-7">
              <EmbeddedPlayer track={track} coverImage={coverImage} onFirstPlay={recordPlay} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 md:px-8 py-8 grid md:grid-cols-[1fr_360px] gap-px" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="p-5 md:p-6" style={{ background: '#09090f' }}>
          <p className="text-xs font-extrabold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.42)' }}>Creation Prompt</p>
          <p className="whitespace-pre-wrap leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>{track.prompt || 'No prompt provided.'}</p>
        </div>
        <aside className="p-5 md:p-6" style={{ background: '#09090f' }}>
          <p className="text-xs font-extrabold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.42)' }}>Details</p>
          <Detail label="Creator" value={track.created_by?.split('@')[0] || 'Accoustica'} />
          <Detail label="Model" value={track.model_version || 'AI'} />
          <Detail label="Mode" value={track.is_instrumental ? 'Instrumental' : 'Vocal'} />
          <Link to={createPageUrl('Create')} className="mt-5 flex items-center justify-center gap-2 px-4 py-3 font-bold border" style={{ background: '#e11d48', borderColor: '#e11d48' }}>
            <Sparkles className="h-4 w-4" />
            Create Music
          </Link>
        </aside>
      </section>
    </main>
  );
}

function EmbeddedPlayer({ track, coverImage, onFirstPlay }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(track.duration || 0);
  const progress = duration ? (currentTime / duration) * 100 : 0;

  const toggle = async () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      await audioRef.current.play();
      onFirstPlay?.();
    }
  };

  return (
    <div className="border" style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.035)' }}>
      <audio
        ref={audioRef}
        src={track.audio_url || track.stream_audio_url}
        preload="metadata"
        crossOrigin="anonymous"
        onTimeUpdate={event => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={event => setDuration(event.currentTarget.duration || track.duration || 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <div className="flex items-center gap-3 p-3">
        <button type="button" onClick={toggle} className="h-12 w-12 flex items-center justify-center border flex-shrink-0" aria-label={playing ? 'Pause track' : 'Play track'} style={{ background: '#22c55e', borderColor: '#22c55e', color: '#020204' }}>
          {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
        </button>
        <img src={coverImage} alt="" className="h-12 w-12 object-cover border hidden sm:block" style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-sm font-bold truncate">{track.title}</p>
            <span className="text-xs tabular-nums" style={{ color: 'rgba(255,255,255,0.48)' }}>{formatDuration(currentTime)} / {formatDuration(duration)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={event => {
              const next = Number(event.target.value);
              audioRef.current.currentTime = next;
              setCurrentTime(next);
            }}
            aria-label="Track seek bar"
            className="w-full accent-green-500"
            style={{ background: `linear-gradient(90deg, #22c55e ${progress}%, rgba(255,255,255,0.12) ${progress}%)` }}
          />
        </div>
        <Volume2 className="h-4 w-4 hidden sm:block" style={{ color: 'rgba(255,255,255,0.36)' }} />
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
      <span className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</span>
      <span className="text-sm font-semibold text-right">{value}</span>
    </div>
  );
}

function formatDuration(seconds) {
  if (!Number.isFinite(Number(seconds)) || Number(seconds) <= 0) return '0:00';
  const value = Number(seconds);
  return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
}

function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
