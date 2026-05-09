// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import MinimalWaveformPlayer from '@/components/audio/MinimalWaveformPlayer';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, Clock, Calendar, Music, Eye, EyeOff, Share2, Download, 
  Play, Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function TrackViewPage() {
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const urlParams = new URLSearchParams(window.location.search);
  const trackId = urlParams.get('id');

  const { data: track, isLoading } = useQuery({
    queryKey: ['track', trackId],
    queryFn: async () => {
      const tracks = await base44.entities.Track.filter({ id: trackId });
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
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleShare = async () => {
    const url = window.location.origin + createPageUrl('PublicTrack') + `?id=${track.id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (track?.audio_url) {
      const link = document.createElement('a');
      link.href = track.audio_url;
      link.download = `${track.title}.mp3`;
      link.click();
    }
  };

  const isOwner = user?.email === track?.created_by;

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
          <Link to={createPageUrl('Library')}>
            <Button variant="ghost" className="text-violet-400">
              Go to Library
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
        className="absolute inset-0 opacity-30 blur-3xl"
        style={{
          backgroundImage: `url(${coverImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      <div className="relative max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Link to={createPageUrl('Library')}>
          <Button variant="ghost" className="text-slate-400 hover:text-white mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Library
          </Button>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/60 backdrop-blur-xl rounded-3xl border border-slate-700/50 overflow-hidden"
        >
          {/* Hero Section */}
          <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6">
            {/* Cover Image */}
            <div className="w-48 h-48 md:w-64 md:h-64 mx-auto md:mx-0 flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl">
              <img 
                src={coverImage} 
                alt={track.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                {track.is_public ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <Eye className="h-3 w-3 mr-1" /> Public
                  </Badge>
                ) : (
                  <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">
                    <EyeOff className="h-3 w-3 mr-1" /> Private
                  </Badge>
                )}
                {track.is_instrumental && (
                  <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30">
                    <Music className="h-3 w-3 mr-1" /> Instrumental
                  </Badge>
                )}
              </div>

              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                {track.title}
              </h1>
              <p className="text-xl text-violet-400 mb-4">{track.style || 'Custom Style'}</p>

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

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <Button onClick={handleShare} variant="outline" className="bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700">
                  {copied ? <Check className="h-4 w-4 mr-2" /> : <Share2 className="h-4 w-4 mr-2" />}
                  {copied ? 'Copied!' : 'Share'}
                </Button>
                {track.audio_url && (
                  <Button onClick={handleDownload} variant="outline" className="bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Minimal Player */}
          <div className="px-6 pb-6 md:px-8 md:pb-8">
            <MinimalWaveformPlayer
              src={track.audio_url || track.stream_audio_url}
              className="w-full"
            />
          </div>

          {/* Prompt Section */}
          <div className="px-6 pb-6 md:px-8 md:pb-8">
            <h3 className="text-lg font-semibold text-white mb-3">Prompt</h3>
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
              <p className="text-slate-300 whitespace-pre-wrap">{track.prompt}</p>
            </div>
          </div>

          {/* Lyrics Section */}
          {track.lyrics && (
            <div className="px-6 pb-6 md:px-8 md:pb-8">
              <h3 className="text-lg font-semibold text-white mb-3">Lyrics</h3>
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                <p className="text-slate-300 whitespace-pre-wrap">{track.lyrics}</p>
              </div>
            </div>
          )}

          {/* Tags */}
          {track.tags && (
            <div className="px-6 pb-6 md:px-8 md:pb-8">
              <h3 className="text-lg font-semibold text-white mb-3">Tags</h3>
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
      </div>
    </div>
  );
}