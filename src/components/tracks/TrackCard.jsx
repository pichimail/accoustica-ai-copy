import React, { useState } from 'react';
import { Play, Pause, Clock, Eye, EyeOff, Music, MoreVertical, Share2, Trash2, Edit, Heart, Wand2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

const statusColors = {
  queued: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  generating: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  ready: 'bg-green-500/20 text-green-400 border-green-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const statusLabels = {
  queued: 'Queued',
  generating: 'Generating',
  ready: 'Ready',
  failed: 'Failed',
};

export default function TrackCard({
  track,
  onPlay,
  onDelete,
  onToggleVisibility,
  onEdit,
  onToggleFavorite,
  isPlaying = false,
  showActions = true,
  showVisibility = true,
}) {
  const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isReady = track.status === 'ready';
  const coverImage = track.cover_image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative bg-slate-800/40 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden hover:border-violet-500/50 transition-all duration-300"
    >
      <div className="flex">
        {/* Cover Image */}
        <div className="relative w-24 h-24 md:w-28 md:h-28 flex-shrink-0">
          <img
            src={coverImage}
            alt={track.title}
            className="w-full h-full object-cover"
          />
          <div className={cn(
            "absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity",
            !isReady && "cursor-not-allowed"
          )}>
            {isReady && (
              <Button
                size="icon"
                onClick={() => onPlay?.(track)}
                className="h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4 text-white" />
                ) : (
                  <Play className="h-4 w-4 text-white ml-0.5" />
                )}
              </Button>
            )}
          </div>
          {track.status !== 'ready' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              {track.status === 'generating' && (
                <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
              )}
              {track.status === 'queued' && (
                <Clock className="h-6 w-6 text-yellow-400" />
              )}
              {track.status === 'failed' && (
                <span className="text-red-400 text-xs text-center px-2">Failed</span>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link 
                to={createPageUrl('TrackView') + `?id=${track.id}`}
                className="hover:text-violet-400 transition-colors"
              >
                <h3 className="font-semibold text-white truncate">{track.title}</h3>
              </Link>
              <p className="text-sm text-slate-400 truncate mt-0.5">{track.style || 'Custom Style'}</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("text-xs", statusColors[track.status])}>
                {statusLabels[track.status]}
              </Badge>
              
              {showActions && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                    {isReady && (
                      <>
                        <DropdownMenuItem 
                          onClick={() => onEdit?.(track)}
                          className="text-violet-400 focus:text-violet-300 focus:bg-violet-500/10"
                        >
                          <Wand2 className="h-4 w-4 mr-2" />
                          Edit Track
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onToggleFavorite?.(track)}
                          className="text-slate-300 focus:text-white focus:bg-slate-700"
                        >
                          <Heart className={cn("h-4 w-4 mr-2", track.is_favorite && "fill-red-500 text-red-500")} />
                          {track.is_favorite ? 'Unfavorite' : 'Favorite'}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => navigator.clipboard.writeText(window.location.origin + createPageUrl('PublicTrack') + `?id=${track.id}`)}
                          className="text-slate-300 focus:text-white focus:bg-slate-700"
                        >
                          <Share2 className="h-4 w-4 mr-2" />
                          Copy Share Link
                        </DropdownMenuItem>
                        {showVisibility && (
                          <DropdownMenuItem 
                            onClick={() => onToggleVisibility?.(track)}
                            className="text-slate-300 focus:text-white focus:bg-slate-700"
                          >
                            {track.is_public ? (
                              <>
                                <EyeOff className="h-4 w-4 mr-2" />
                                Make Private
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-2" />
                                Make Public
                              </>
                            )}
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                    <DropdownMenuItem 
                      onClick={() => onDelete?.(track)}
                      className="text-red-400 focus:text-red-300 focus:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-500 truncate mt-2 line-clamp-1">
            {track.prompt}
          </p>

          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(track.duration)}
            </span>
            <span>{formatDate(track.created_date)}</span>
            {track.is_instrumental && (
              <Badge variant="outline" className="text-xs bg-slate-700/50 text-slate-400 border-slate-600">
                <Music className="h-3 w-3 mr-1" />
                Instrumental
              </Badge>
            )}
            {showVisibility && (
              <span className="flex items-center gap-1">
                {track.is_public ? (
                  <Eye className="h-3 w-3 text-green-400" />
                ) : (
                  <EyeOff className="h-3 w-3 text-slate-400" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}