import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAppSettings } from '@/lib/use-app-settings';
import {
  Film,
  Image as ImageIcon,
  Music,
  Plus,
  Upload,
  Loader2,
  Download,
  Share2,
  Sparkles,
  Copy,
} from 'lucide-react';

const aspectRatios = ['16:9', '9:16', '1:1', '4:3', '3:4'];
const durations = [5, 10];
const qualities = ['720p', '1080p'];

const blobToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function VideoStudioPage({ embedded = false }) {
  const queryClient = useQueryClient();
  const { settings } = useAppSettings();
  const resolveDefaultTab = () => {
    if (settings.features.runway_text) return 'text';
    if (settings.features.runway_image) return 'image';
    if (settings.features.runway_music) return 'music';
    if (settings.features.runway_extend) return 'extend';
    return 'uploads';
  };

  const [activeTab, setActiveTab] = useState(resolveDefaultTab());

  React.useEffect(() => {
    setActiveTab(resolveDefaultTab());
  }, [
    settings.features.runway_text,
    settings.features.runway_image,
    settings.features.runway_music,
    settings.features.runway_extend,
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [textPrompt, setTextPrompt] = useState('');
  const [textAspectRatio, setTextAspectRatio] = useState('16:9');
  const [textDuration, setTextDuration] = useState(5);
  const [textQuality, setTextQuality] = useState('720p');

  const [imagePrompt, setImagePrompt] = useState('');
  const [imageAspectRatio, setImageAspectRatio] = useState('16:9');
  const [imageDuration, setImageDuration] = useState(5);
  const [imageQuality, setImageQuality] = useState('720p');
  const [imageUrl, setImageUrl] = useState('');
  const [imageUploadMode, setImageUploadMode] = useState('url');
  const [imageBase64, setImageBase64] = useState('');

  const [musicPrompt, setMusicPrompt] = useState('');
  const [musicAspectRatio, setMusicAspectRatio] = useState('16:9');
  const [musicDuration, setMusicDuration] = useState(5);
  const [musicQuality, setMusicQuality] = useState('720p');
  const [selectedTrackId, setSelectedTrackId] = useState('');
  const [useCoverAsImage, setUseCoverAsImage] = useState(true);

  const [extendPrompt, setExtendPrompt] = useState('');
  const [extendTaskId, setExtendTaskId] = useState('');
  const [extendQuality, setExtendQuality] = useState('720p');

  const [assetUploadMode, setAssetUploadMode] = useState('url');
  const [assetUploadType, setAssetUploadType] = useState('image');
  const [assetUrl, setAssetUrl] = useState('');
  const [assetBase64, setAssetBase64] = useState('');
  const [assetResult, setAssetResult] = useState(null);

  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.list('-created_date'),
  });

  const { data: videos = [] } = useQuery({
    queryKey: ['runwayVideos'],
    queryFn: async () => {
      const records = await base44.entities.VideoGeneration.filter({ provider: 'runway' }, '-created_date', 100);
      return records;
    },
    refetchInterval: (data) => {
      const hasPending = Array.isArray(data) && data.some((v) => v.status === 'pending' || v.status === 'processing');
      return hasPending ? 4000 : false;
    },
  });

  const readyVideos = videos.filter((v) => v.status === 'ready');
  const processingVideos = videos.filter((v) => v.status === 'pending' || v.status === 'processing');

  const trackMap = useMemo(() => {
    const map = new Map();
    tracks.forEach((track) => map.set(track.id, track));
    return map;
  }, [tracks]);

  const selectedTrack = trackMap.get(selectedTrackId);

  React.useEffect(() => {
    if (selectedTrack && !musicPrompt) {
      setMusicPrompt(`A cinematic visual journey inspired by "${selectedTrack.title}" with ${selectedTrack.style || 'modern'} textures.`);
    }
  }, [selectedTrack, musicPrompt]);

  const handleAssetUpload = async ({ mode, type, file }) => {
    setUploading(true);
    try {
      let payload;
      if (mode === 'url') {
        if (!assetUrl.trim()) throw new Error('Provide a URL to upload.');
        payload = { uploadType: 'url', fileUrl: assetUrl, uploadPath: `${type}s` };
      } else if (mode === 'base64') {
        if (!assetBase64.trim()) throw new Error('Paste base64 data.');
        payload = { uploadType: 'base64', base64Data: assetBase64, uploadPath: `${type}s` };
      } else if (mode === 'local') {
        if (!file) throw new Error('Select a file to upload.');
        const dataUrl = await blobToBase64(file);
        payload = { uploadType: 'base64', base64Data: dataUrl, uploadPath: `${type}s`, fileName: file.name };
      }

      const response = await base44.functions.invoke('kieUpload', payload);
      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Upload failed');
      }
      setAssetResult(response.data.data.data);
      toast.success('Upload complete');
    } catch (error) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async (payload) => {
    setIsGenerating(true);
    try {
      const response = await base44.functions.invoke('runwayGenerate', payload);
      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Generation failed');
      }
      toast.success('Runway generation started');
      queryClient.invalidateQueries({ queryKey: ['runwayVideos'] });
    } catch (error) {
      toast.error(error.message || 'Failed to generate video');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageGenerate = async () => {
    let finalImageUrl = imageUrl;
    if (!finalImageUrl && imageUploadMode === 'base64' && imageBase64) {
      setUploading(true);
      try {
        const response = await base44.functions.invoke('kieUpload', {
          uploadType: 'base64',
          base64Data: imageBase64,
          uploadPath: 'images',
        });
        if (!response.data?.success) {
          throw new Error(response.data?.error || 'Upload failed');
        }
        finalImageUrl = response.data.data.data.fileUrl;
        setImageUrl(finalImageUrl);
      } catch (error) {
        toast.error(error.message || 'Image upload failed');
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    }

    await handleGenerate({
      generationType: 'image',
      prompt: imagePrompt,
      duration: imageDuration,
      quality: imageQuality,
      aspectRatio: imageAspectRatio,
      imageUrl: finalImageUrl,
    });
  };

  const handleExtend = async () => {
    if (!extendTaskId.trim() || !extendPrompt.trim()) {
      toast.error('Task ID and prompt are required');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await base44.functions.invoke('runwayExtend', {
        taskId: extendTaskId,
        prompt: extendPrompt,
        quality: extendQuality,
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Extension failed');
      }
      toast.success('Extension started');
      queryClient.invalidateQueries({ queryKey: ['runwayVideos'] });
    } catch (error) {
      toast.error(error.message || 'Failed to extend video');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderAspectRatio = (value, onChange) => (
    <div className="flex flex-wrap gap-2">
      {aspectRatios.map((ratio) => (
        <button
          key={ratio}
          type="button"
          onClick={() => onChange(ratio)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
            value === ratio
              ? "bg-white/20 text-white"
              : "glass-surface text-slate-300 hover:text-white"
          )}
        >
          {ratio}
        </button>
      ))}
    </div>
  );

  const containerClass = embedded ? "space-y-6" : "min-h-screen px-4 py-8 lg:px-8";

  const runwayEnabled = settings.features.runway_text ||
    settings.features.runway_image ||
    settings.features.runway_extend ||
    settings.features.runway_music;

  if (!runwayEnabled) {
    return (
      <div className="glass-surface rounded-2xl p-8 text-center text-slate-300">
        Runway video generation is currently disabled by the admin.
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <div className={embedded ? "space-y-6" : "max-w-7xl mx-auto space-y-6"}>
        {!embedded && (
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
              <Film className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="app-title text-3xl font-semibold text-white">Runway Video Studio</h1>
              <p className="text-sm text-slate-300">Text, image, and music-driven video generation.</p>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full flex-wrap justify-start gap-2">
            {settings.features.runway_text && (
              <TabsTrigger value="text" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Text to Video
              </TabsTrigger>
            )}
            {settings.features.runway_image && (
              <TabsTrigger value="image" className="gap-2">
                <ImageIcon className="h-4 w-4" />
                Image to Video
              </TabsTrigger>
            )}
            {settings.features.runway_music && (
              <TabsTrigger value="music" className="gap-2">
                <Music className="h-4 w-4" />
                Music to Video
              </TabsTrigger>
            )}
            {settings.features.runway_extend && (
              <TabsTrigger value="extend" className="gap-2">
                <Plus className="h-4 w-4" />
                Extend Video
              </TabsTrigger>
            )}
            <TabsTrigger value="uploads" className="gap-2">
              <Upload className="h-4 w-4" />
              Media Uploads
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text">
            <div className="glass-surface rounded-3xl p-6 space-y-4">
              <div>
                <Label className="text-slate-200">Prompt</Label>
                <Textarea
                  value={textPrompt}
                  onChange={(e) => setTextPrompt(e.target.value)}
                  placeholder="Describe the video you want to generate..."
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-slate-200">Aspect Ratio</Label>
                  {renderAspectRatio(textAspectRatio, setTextAspectRatio)}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-200">Duration</Label>
                    <Select value={`${textDuration}`} onValueChange={(value) => setTextDuration(Number(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Duration" />
                      </SelectTrigger>
                      <SelectContent>
                        {durations.map((duration) => (
                          <SelectItem key={duration} value={`${duration}`}>
                            {duration}s
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-200">Quality</Label>
                    <Select value={textQuality} onValueChange={setTextQuality}>
                      <SelectTrigger>
                        <SelectValue placeholder="Quality" />
                      </SelectTrigger>
                      <SelectContent>
                        {qualities.map((quality) => (
                          <SelectItem key={quality} value={quality}>
                            {quality}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <Button
                onClick={() =>
                  handleGenerate({
                    generationType: 'text',
                    prompt: textPrompt,
                    duration: textDuration,
                    quality: textQuality,
                    aspectRatio: textAspectRatio,
                  })
                }
                disabled={!textPrompt.trim() || isGenerating}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500"
              >
                {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generate Video
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="image">
            <div className="glass-surface rounded-3xl p-6 space-y-4">
              <div>
                <Label className="text-slate-200">Prompt</Label>
                <Textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Describe how the image should animate..."
                />
              </div>
              <div>
                <Label className="text-slate-200">Image Source</Label>
                <div className="flex gap-2 mt-2">
                  {['url', 'local', 'base64'].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setImageUploadMode(mode)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium",
                        imageUploadMode === mode ? "bg-white/20 text-white" : "glass-surface text-slate-300"
                      )}
                    >
                      {mode.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              {imageUploadMode === 'url' && (
                <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
              )}
              {imageUploadMode === 'base64' && (
                <Textarea
                  value={imageBase64}
                  onChange={(e) => setImageBase64(e.target.value)}
                  placeholder="Paste base64 image data"
                />
              )}
              {imageUploadMode === 'local' && (
                <Input type="file" accept="image/*" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  try {
                    const dataUrl = await blobToBase64(file);
                    setImageBase64(dataUrl);
                    const response = await base44.functions.invoke('kieUpload', {
                      uploadType: 'base64',
                      base64Data: dataUrl,
                      uploadPath: 'images',
                      fileName: file.name,
                    });
                    if (!response.data?.success) {
                      throw new Error(response.data?.error || 'Upload failed');
                    }
                    setImageUrl(response.data.data.data.fileUrl);
                    toast.success('Image uploaded');
                  } catch (error) {
                    toast.error(error.message || 'Upload failed');
                  } finally {
                    setUploading(false);
                  }
                }} />
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-slate-200">Aspect Ratio</Label>
                  {renderAspectRatio(imageAspectRatio, setImageAspectRatio)}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-200">Duration</Label>
                    <Select value={`${imageDuration}`} onValueChange={(value) => setImageDuration(Number(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Duration" />
                      </SelectTrigger>
                      <SelectContent>
                        {durations.map((duration) => (
                          <SelectItem key={duration} value={`${duration}`}>
                            {duration}s
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-200">Quality</Label>
                    <Select value={imageQuality} onValueChange={setImageQuality}>
                      <SelectTrigger>
                        <SelectValue placeholder="Quality" />
                      </SelectTrigger>
                      <SelectContent>
                        {qualities.map((quality) => (
                          <SelectItem key={quality} value={quality}>
                            {quality}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <Button
                onClick={handleImageGenerate}
                disabled={!imagePrompt.trim() || (!imageUrl && !imageBase64) || isGenerating || uploading}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500"
              >
                {(isGenerating || uploading) ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-2" />}
                Generate Video
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="music">
            <div className="glass-surface rounded-3xl p-6 space-y-4">
              <div>
                <Label className="text-slate-200">Select Track</Label>
                <Select value={selectedTrackId} onValueChange={setSelectedTrackId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a track" />
                  </SelectTrigger>
                  <SelectContent>
                    {tracks
                      .filter((track) => track.status === 'ready')
                      .map((track) => (
                        <SelectItem key={track.id} value={track.id}>
                          {track.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-200">Prompt</Label>
                <Textarea
                  value={musicPrompt}
                  onChange={(e) => setMusicPrompt(e.target.value)}
                  placeholder={selectedTrack ? `Cinematic visuals inspired by ${selectedTrack.title}` : 'Describe the visuals'}
                />
              </div>
              {selectedTrack && (
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    id="use-cover"
                    type="checkbox"
                    checked={useCoverAsImage}
                    onChange={(e) => setUseCoverAsImage(e.target.checked)}
                  />
                  <label htmlFor="use-cover">Use cover art as image reference</label>
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-slate-200">Aspect Ratio</Label>
                  {renderAspectRatio(musicAspectRatio, setMusicAspectRatio)}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-200">Duration</Label>
                    <Select value={`${musicDuration}`} onValueChange={(value) => setMusicDuration(Number(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Duration" />
                      </SelectTrigger>
                      <SelectContent>
                        {durations.map((duration) => (
                          <SelectItem key={duration} value={`${duration}`}>
                            {duration}s
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-200">Quality</Label>
                    <Select value={musicQuality} onValueChange={setMusicQuality}>
                      <SelectTrigger>
                        <SelectValue placeholder="Quality" />
                      </SelectTrigger>
                      <SelectContent>
                        {qualities.map((quality) => (
                          <SelectItem key={quality} value={quality}>
                            {quality}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <Button
                onClick={() =>
                  handleGenerate({
                    generationType: 'music',
                    prompt: musicPrompt || `A cinematic video inspired by ${selectedTrack?.title || 'this track'}`,
                    duration: musicDuration,
                    quality: musicQuality,
                    aspectRatio: musicAspectRatio,
                    imageUrl: useCoverAsImage ? selectedTrack?.cover_image_url : undefined,
                    trackId: selectedTrack?.id,
                  })
                }
                disabled={!selectedTrackId || isGenerating}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500"
              >
                {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Music className="h-4 w-4 mr-2" />}
                Generate Music Video
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="extend">
            <div className="glass-surface rounded-3xl p-6 space-y-4">
              <div>
                <Label className="text-slate-200">Existing Task ID</Label>
                <Input value={extendTaskId} onChange={(e) => setExtendTaskId(e.target.value)} placeholder="Paste task ID" />
              </div>
              <div>
                <Label className="text-slate-200">Extension Prompt</Label>
                <Textarea
                  value={extendPrompt}
                  onChange={(e) => setExtendPrompt(e.target.value)}
                  placeholder="Describe how the video should continue..."
                />
              </div>
              <div className="max-w-xs">
                <Label className="text-slate-200">Quality</Label>
                <Select value={extendQuality} onValueChange={setExtendQuality}>
                  <SelectTrigger>
                    <SelectValue placeholder="Quality" />
                  </SelectTrigger>
                  <SelectContent>
                    {qualities.map((quality) => (
                      <SelectItem key={quality} value={quality}>
                        {quality}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleExtend}
                disabled={isGenerating || !extendPrompt.trim() || !extendTaskId.trim()}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500"
              >
                {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Extend Video
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="uploads">
            <div className="glass-surface rounded-3xl p-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-slate-200">Upload Type</Label>
                  <Select value={assetUploadType} onValueChange={setAssetUploadType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="audio">Music</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-200">Upload Mode</Label>
                  <Select value={assetUploadMode} onValueChange={setAssetUploadMode}>
                    <SelectTrigger>
                      <SelectValue placeholder="Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="url">URL</SelectItem>
                      <SelectItem value="local">Local File</SelectItem>
                      <SelectItem value="base64">Base64</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {assetUploadMode === 'url' && (
                <Input value={assetUrl} onChange={(e) => setAssetUrl(e.target.value)} placeholder="https://..." />
              )}
              {assetUploadMode === 'base64' && (
                <Textarea value={assetBase64} onChange={(e) => setAssetBase64(e.target.value)} placeholder="Paste base64 data" />
              )}
              {assetUploadMode === 'local' && (
                <Input
                  type="file"
                  accept={assetUploadType === 'image' ? 'image/*' : assetUploadType === 'video' ? 'video/*' : 'audio/*'}
                  onChange={(e) => handleAssetUpload({ mode: 'local', type: assetUploadType, file: e.target.files?.[0] })}
                />
              )}

              {assetUploadMode !== 'local' && (
                <Button
                  onClick={() => handleAssetUpload({ mode: assetUploadMode, type: assetUploadType })}
                  disabled={uploading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500"
                >
                  {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  Upload Asset
                </Button>
              )}

              {assetResult && (
                <div className="glass-surface rounded-2xl p-4 space-y-2 text-sm text-slate-200">
                  <div className="flex items-center justify-between">
                    <span>File URL</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(assetResult.fileUrl);
                        toast.success('URL copied');
                      }}
                      className="flex items-center gap-1 text-xs text-slate-200"
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </button>
                  </div>
                  <p className="break-all text-slate-300">{assetResult.fileUrl}</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-white">
            <Film className="h-5 w-5 text-emerald-300" />
            <h2 className="app-title text-xl font-semibold">Your Runway Videos</h2>
          </div>

          {processingVideos.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {processingVideos.map((video) => (
                <div key={video.id} className="glass-surface rounded-2xl p-4">
                  <div className="aspect-video rounded-xl bg-white/5 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 text-emerald-300 animate-spin" />
                  </div>
                  <p className="mt-3 text-sm text-slate-300">Processing…</p>
                </div>
              ))}
            </div>
          )}

          {readyVideos.length === 0 ? (
            <div className="glass-surface rounded-2xl p-6 text-center text-slate-300">
              No Runway videos yet. Start by generating a new one.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {readyVideos.map((video) => {
                const track = trackMap.get(video.track_id);
                return (
                  <div key={video.id} className="glass-surface rounded-2xl overflow-hidden">
                    <div className="relative aspect-video">
                      <video src={video.video_url} poster={video.thumbnail_url || track?.cover_image_url} controls className="w-full h-full object-cover" />
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="text-sm text-slate-200 font-medium">
                        {track?.title || video.prompt?.slice(0, 32) || 'Runway Video'}
                      </div>
                      <p className="text-xs text-slate-400">{video.generation_type || 'runway'} · {video.quality || '720p'}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(video.video_url, '_blank')}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(video.video_url);
                            toast.success('Video link copied');
                          }}
                        >
                          <Share2 className="h-3 w-3 mr-1" />
                          Share
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
