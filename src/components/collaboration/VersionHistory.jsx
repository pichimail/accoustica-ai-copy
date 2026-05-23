// @ts-nocheck
import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Play, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function VersionHistory({ track, open, onClose, onPlay }) {
  const { data: versions = [] } = useQuery({
    queryKey: ['trackVersions', track?.id],
    queryFn: async () => {
      if (!track?.id) return [];
      const versions = await base44.entities.TrackVersion.filter(
        { parent_track_id: track.id },
        '-created_date'
      );
      
      const tracksPromises = versions.map(v => 
        base44.entities.Track.filter({ id: v.track_id }).then(tracks => tracks[0])
      );
      const tracks = await Promise.all(tracksPromises);
      
      return versions.map((v, i) => ({ ...v, track: tracks[i] }));
    },
    enabled: !!track?.id && open,
  });

  const editTypeColors = {
    extend: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    replace: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    add_vocals: 'bg-green-500/20 text-green-400 border-green-500/30',
    add_instrumental: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    other: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!track) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-violet-400" />
            Version History: {track.title}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[500px] pr-4">
          {versions.length === 0 ? (
            <div className="text-center py-8">
              <GitBranch className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No versions yet</p>
              <p className="text-sm text-slate-500 mt-1">
                Edits made to this track will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-medium">
                          v{version.version_number || versions.length - index}
                        </span>
                        <Badge variant="outline" className={editTypeColors[version.edit_type || 'other']}>
                          {version.edit_type || 'other'}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-300 mb-2">{version.changes_description}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(version.created_date)}
                        </span>
                        <span>by {version.edited_by}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {version.track && version.track.status === 'ready' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onPlay?.(version.track)}
                            className="bg-slate-700 hover:bg-slate-600 border-slate-600"
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Play
                          </Button>
                          <Link to={createPageUrl('TrackView') + `?id=${version.track.id}`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full bg-slate-700 hover:bg-slate-600 border-slate-600"
                            >
                              View
                            </Button>
                          </Link>
                        </>
                      )}
                      {version.track && version.track.status === 'generating' && (
                        <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                          Generating...
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}