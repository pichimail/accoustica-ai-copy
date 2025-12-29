import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CreatePage from '@/pages/Create';
import VideoStudioPage from '@/pages/VideoStudio';
import { useSearchParams } from 'react-router-dom';
import { Music, Video } from 'lucide-react';
import { useAppSettings } from '@/lib/use-app-settings';

export default function StudioPage() {
  const { settings } = useAppSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'music';

  return (
    <div className="min-h-screen px-4 py-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="app-title text-3xl font-semibold text-white">Studio</h1>
            <p className="text-sm text-slate-300">
              Switch between Music and Video generation with one tap.
            </p>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setSearchParams({ tab: value })}
          className="space-y-6"
        >
          <TabsList className="w-full justify-start gap-2">
            <TabsTrigger value="music" className="gap-2">
              <Music className="h-4 w-4" />
              Music Studio
            </TabsTrigger>
            <TabsTrigger value="video" className="gap-2">
              <Video className="h-4 w-4" />
              Video Studio
            </TabsTrigger>
          </TabsList>

          <TabsContent value="music">
            {settings.features.music_generation ? (
              <CreatePage embedded />
            ) : (
              <div className="glass-surface rounded-2xl p-8 text-center text-slate-300">
                Music generation is currently disabled by the admin.
              </div>
            )}
          </TabsContent>

          <TabsContent value="video">
            {(settings.features.runway_text ||
              settings.features.runway_image ||
              settings.features.runway_extend ||
              settings.features.runway_music) ? (
              <VideoStudioPage embedded />
            ) : (
              <div className="glass-surface rounded-2xl p-8 text-center text-slate-300">
                Video generation is currently disabled by the admin.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
