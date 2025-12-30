import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import AudioPlayer from '@/components/audio/AudioPlayer';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, Music, Play, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import BrandLogo from '@/components/brand/BrandLogo';

export default function PublicTrackPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const trackId = urlParams.get('id');

  const { data: track, isLoading } = useQuery({
    queryKey: ['publicTrack', trackId],
    queryFn: async () => {
      const tracks = await base44.entities.Track.filter({ id: trackId, is_public: true });
      return tracks[0];
    },
    enabled: !!trackId,
  });

  const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard');
  };

  // Increment play count on mount
  React.useEffect(() => {
    if (track) {
      base44.entities.Track.update(track.id, {
        plays: (track.plays || 0) + 1,
      });
    }
  }, [track?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!track) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950 flex items-center justify-center">
        <div className="text-center">
          <Music className="h-16 w-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Track not found</h2>
          <p className="text-slate-400 mb-4">This track may be private or doesn't exist</p>
          <Link to={createPageUrl('Discover')}>
            <Button className="bg-gradient-to-r from-violet-500 to-pink-500">
              Discover Music
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const coverImage = track.cover_image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=800&fit=crop';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950">
      {/* Background Blur */}
      <div 
        className="absolute inset-0 opacity-20 blur-3xl"
        style={{
          backgroundImage: `url(${coverImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      <div className="relative">
        {/* Header */}
        <div className="py-4 px-4 border-b border-slate-800/50 backdrop-blur-xl">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Link to={createPageUrl('Home')} className="flex items-center gap-2">
              <BrandLogo variant="wordmark" className="h-6 w-auto" />
            </Link>
            <Link to={createPageUrl('Discover')}>
              <Button variant="ghost" className="text-slate-400 hover:text-white">
                Discover More
              </Button>
            </Link>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800/60 backdrop-blur-xl rounded-3xl border border-slate-700/50 overflow-hidden"
          >
            {/* Hero Section */}
            <div className="p-6 md:p-10 flex flex-col md:flex-row gap-8 items-center">
              {/* Cover Image */}
              <div className="w-56 h-56 md:w-72 md:h-72 flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  src={coverImage} 
                  alt={track.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                  {track.is_instrumental && (
                    <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30">
                      <Music className="h-3 w-3 mr-1" /> Instrumental
                    </Badge>
                  )}
                  {track.style && (
                    <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30">
                      {track.style}
                    </Badge>
                  )}
                </div>

                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                  {track.title}
                </h1>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-slate-400 text-sm mb-6">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDuration(track.duration)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(track.created_date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Play className="h-4 w-4" />
                    {track.plays || 0} plays
                  </span>
                </div>

                <Button onClick={handleShare} className="bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Track
                </Button>
              </div>
            </div>

            {/* Player */}
            <div className="px-6 pb-8 md:px-10 md:pb-10">
              <AudioPlayer
                src={track.audio_url || track.stream_audio_url}
                title={track.title}
                artist={track.style}
                coverImage={coverImage}
              />
            </div>

            {/* Prompt */}
            <div className="px-6 pb-6 md:px-10 md:pb-8">
              <h3 className="text-lg font-semibold text-white mb-3">Creation Prompt</h3>
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                <p className="text-slate-300 whitespace-pre-wrap">{track.prompt}</p>
              </div>
            </div>

            {/* Tags */}
            {track.tags && (
              <div className="px-6 pb-8 md:px-10 md:pb-10">
                <div className="flex flex-wrap gap-2">
                  {track.tags.split(',').map((tag, i) => (
                    <Badge key={i} variant="outline" className="bg-slate-700/50 text-slate-300 border-slate-600">
                      {tag.trim()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mt-12"
          >
            <h2 className="text-2xl font-bold text-white mb-3">
              Want to create your own music?
            </h2>
            <p className="text-slate-400 mb-6">
              Join Accoustica and start generating amazing AI music
            </p>
            <Link to={createPageUrl('Studio')}>
              <Button size="lg" className="bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600">
                <Sparkles className="h-5 w-5 mr-2" />
                Start Creating
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
