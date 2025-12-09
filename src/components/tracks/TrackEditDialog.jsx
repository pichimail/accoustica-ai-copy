import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Music, Plus, Replace, Mic, Volume2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TrackEditDialog({ track, open, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState('extend');
  const [loading, setLoading] = useState(false);

  // Initialize state when track prop changes
  useEffect(() => {
    if (track) {
      setExtendData({
        prompt: '',
        style: track.style || '',
        title: track.title + ' (Extended)',
        continueAt: track.duration || 0,
      });
      setReplaceData({
        prompt: '',
        tags: track.style || '',
        title: track.title || '',
        infillStartS: 0,
        infillEndS: 10,
        negativeTags: '',
        fullLyrics: '',
      });
      setVocalsData({
        type: 'vocals',
        prompt: '',
        title: track.title + ' (With Vocals)',
        negativeTags: '',
        style: track.style || '',
        tags: '',
      });
    }
  }, [track]);

  // Extend Music State
  const [extendData, setExtendData] = useState({
    prompt: '',
    style: '',
    title: '',
    continueAt: 0,
  });

  // Replace Section State
  const [replaceData, setReplaceData] = useState({
    prompt: '',
    tags: '',
    title: '',
    infillStartS: 0,
    infillEndS: 10,
    negativeTags: '',
    fullLyrics: '',
  });

  // Add Vocals/Instrumental State
  const [vocalsData, setVocalsData] = useState({
    type: 'vocals',
    prompt: '',
    title: '',
    negativeTags: '',
    style: '',
    tags: '',
  });

  const handleExtend = async () => {
    if (!extendData.prompt || !extendData.style || !extendData.title) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke('extendMusic', {
        audioId: track.external_audio_id,
        prompt: extendData.prompt,
        style: extendData.style,
        title: extendData.title,
        continueAt: extendData.continueAt,
        defaultParamFlag: true,
      });

      if (response.data.success) {
        const user = await base44.auth.me();
        await base44.entities.TrackVersion.create({
          track_id: response.data.taskId,
          parent_track_id: track.id,
          changes_description: `Extended from ${extendData.continueAt}s: ${extendData.prompt}`,
          edit_type: 'extend',
          edited_by: user.email,
        });

        toast.success('Extension started! Check your library shortly.');
        onSuccess?.();
        onClose();
      } else {
        toast.error(response.data.error || 'Failed to extend music');
      }
    } catch (error) {
      toast.error('Failed to extend music: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReplace = async () => {
    if (!replaceData.prompt || !replaceData.tags || !replaceData.title) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke('replaceSection', {
        taskId: track.task_id,
        audioId: track.external_audio_id,
        prompt: replaceData.prompt,
        tags: replaceData.tags,
        title: replaceData.title,
        infillStartS: replaceData.infillStartS,
        infillEndS: replaceData.infillEndS,
        negativeTags: replaceData.negativeTags,
        fullLyrics: replaceData.fullLyrics,
      });

      if (response.data.success) {
        const user = await base44.auth.me();
        await base44.entities.TrackVersion.create({
          track_id: response.data.taskId,
          parent_track_id: track.id,
          changes_description: `Replaced section ${replaceData.infillStartS}s-${replaceData.infillEndS}s: ${replaceData.prompt}`,
          edit_type: 'replace',
          edited_by: user.email,
        });

        toast.success('Section replacement started! Check your library shortly.');
        onSuccess?.();
        onClose();
      } else {
        toast.error(response.data.error || 'Failed to replace section');
      }
    } catch (error) {
      toast.error('Failed to replace section: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVocalsOrInstrumental = async () => {
    if (!vocalsData.title) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const functionName = vocalsData.type === 'vocals' ? 'addVocals' : 'addInstrumental';
      const payload = vocalsData.type === 'vocals' 
        ? {
            uploadUrl: track.audio_url,
            prompt: vocalsData.prompt,
            title: vocalsData.title,
            negativeTags: vocalsData.negativeTags,
            style: vocalsData.style,
          }
        : {
            uploadUrl: track.audio_url,
            title: vocalsData.title,
            negativeTags: vocalsData.negativeTags,
            tags: vocalsData.tags,
          };

      const response = await base44.functions.invoke(functionName, payload);

      if (response.data.success) {
        const user = await base44.auth.me();
        await base44.entities.TrackVersion.create({
          track_id: response.data.taskId,
          parent_track_id: track.id,
          changes_description: vocalsData.type === 'vocals' 
            ? `Added vocals: ${vocalsData.prompt}`
            : 'Added instrumental layer',
          edit_type: vocalsData.type === 'vocals' ? 'add_vocals' : 'add_instrumental',
          edited_by: user.email,
        });

        toast.success(`${vocalsData.type === 'vocals' ? 'Vocals' : 'Instrumental'} addition started!`);
        onSuccess?.();
        onClose();
      } else {
        toast.error(response.data.error || 'Operation failed');
      }
    } catch (error) {
      toast.error('Operation failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!track || track.status !== 'ready') return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Track: {track.title}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800">
            <TabsTrigger value="extend" className="data-[state=active]:bg-violet-600">
              <Plus className="h-4 w-4 mr-2" />
              Extend
            </TabsTrigger>
            <TabsTrigger value="replace" className="data-[state=active]:bg-violet-600">
              <Replace className="h-4 w-4 mr-2" />
              Replace
            </TabsTrigger>
            <TabsTrigger value="addaudio" className="data-[state=active]:bg-violet-600">
              <Mic className="h-4 w-4 mr-2" />
              Add Audio
            </TabsTrigger>
          </TabsList>

          <TabsContent value="extend" className="space-y-4">
            <div>
              <Label className="text-slate-300">Continue From (seconds)</Label>
              <Input
                type="number"
                value={extendData.continueAt}
                onChange={(e) => setExtendData({ ...extendData, continueAt: parseFloat(e.target.value) })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Extension Prompt *</Label>
              <Textarea
                value={extendData.prompt}
                onChange={(e) => setExtendData({ ...extendData, prompt: e.target.value })}
                placeholder="Describe how you want to extend the track..."
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Style *</Label>
              <Input
                value={extendData.style}
                onChange={(e) => setExtendData({ ...extendData, style: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">New Title *</Label>
              <Input
                value={extendData.title}
                onChange={(e) => setExtendData({ ...extendData, title: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <Button onClick={handleExtend} disabled={loading} className="w-full bg-violet-600 hover:bg-violet-700">
              {loading ? 'Processing...' : 'Extend Track'}
            </Button>
          </TabsContent>

          <TabsContent value="replace" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Start Time (s) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={replaceData.infillStartS}
                  onChange={(e) => setReplaceData({ ...replaceData, infillStartS: parseFloat(e.target.value) })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">End Time (s) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={replaceData.infillEndS}
                  onChange={(e) => setReplaceData({ ...replaceData, infillEndS: parseFloat(e.target.value) })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>
            <div>
              <Label className="text-slate-300">Replacement Prompt *</Label>
              <Textarea
                value={replaceData.prompt}
                onChange={(e) => setReplaceData({ ...replaceData, prompt: e.target.value })}
                placeholder="Describe the replacement section..."
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Tags/Style *</Label>
              <Input
                value={replaceData.tags}
                onChange={(e) => setReplaceData({ ...replaceData, tags: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <Button onClick={handleReplace} disabled={loading} className="w-full bg-violet-600 hover:bg-violet-700">
              {loading ? 'Processing...' : 'Replace Section'}
            </Button>
          </TabsContent>

          <TabsContent value="addaudio" className="space-y-4">
            <div className="flex gap-2 mb-4">
              <Button
                variant={vocalsData.type === 'vocals' ? 'default' : 'outline'}
                onClick={() => setVocalsData({ ...vocalsData, type: 'vocals' })}
                className="flex-1"
              >
                <Mic className="h-4 w-4 mr-2" />
                Add Vocals
              </Button>
              <Button
                variant={vocalsData.type === 'instrumental' ? 'default' : 'outline'}
                onClick={() => setVocalsData({ ...vocalsData, type: 'instrumental' })}
                className="flex-1"
              >
                <Volume2 className="h-4 w-4 mr-2" />
                Add Instrumental
              </Button>
            </div>

            <div>
              <Label className="text-slate-300">New Title *</Label>
              <Input
                value={vocalsData.title}
                onChange={(e) => setVocalsData({ ...vocalsData, title: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            {vocalsData.type === 'vocals' ? (
              <>
                <div>
                  <Label className="text-slate-300">Vocal Prompt *</Label>
                  <Textarea
                    value={vocalsData.prompt}
                    onChange={(e) => setVocalsData({ ...vocalsData, prompt: e.target.value })}
                    placeholder="Describe the vocals you want to add..."
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Style *</Label>
                  <Input
                    value={vocalsData.style}
                    onChange={(e) => setVocalsData({ ...vocalsData, style: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </>
            ) : (
              <div>
                <Label className="text-slate-300">Tags *</Label>
                <Input
                  value={vocalsData.tags}
                  onChange={(e) => setVocalsData({ ...vocalsData, tags: e.target.value })}
                  placeholder="e.g., relaxing, piano, soothing"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            )}

            <div>
              <Label className="text-slate-300">Negative Tags (Optional)</Label>
              <Input
                value={vocalsData.negativeTags}
                onChange={(e) => setVocalsData({ ...vocalsData, negativeTags: e.target.value })}
                placeholder="Styles to avoid..."
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <Button onClick={handleAddVocalsOrInstrumental} disabled={loading} className="w-full bg-violet-600 hover:bg-violet-700">
              {loading ? 'Processing...' : `Add ${vocalsData.type === 'vocals' ? 'Vocals' : 'Instrumental'}`}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}