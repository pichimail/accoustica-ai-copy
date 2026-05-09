// @ts-nocheck
import React from 'react';
import { Button } from "@/components/ui/button";
import { Sparkles, Globe, Play, ArrowRight, Headphones, Mic, Wand2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import FloatingAlbumArt from '@/components/home/FloatingAlbumArt';
import DynamicGradient from '@/components/background/DynamicGradient';
import { useAudioPlayer } from '@/components/audio/AudioPlayerContext';

const features = [
  {
    icon: Wand2,
    title: 'Text to Music',
    description: 'Transform any idea into a full song with just a few words',
    color: 'from-violet-500 to-purple-600',
  },
  {
    icon: Headphones,
    title: 'Professional Quality',
    description: 'Generate radio-ready tracks with studio-quality production',
    color: 'from-pink-500 to-rose-600',
  },
  {
    icon: Mic,
    title: 'Vocals or Instrumental',
    description: 'Create with or without AI-generated vocals in any style',
    color: 'from-blue-500 to-cyan-600',
  },
  {
    icon: Globe,
    title: 'Share Worldwide',
    description: 'Publish your tracks and let the world discover your music',
    color: 'from-emerald-500 to-green-600',
  },
];

const genres = [
  'Pop', 'Rock', 'Hip Hop', 'Electronic', 'Jazz', 'Classical', 
  'R&B', 'Country', 'Ambient', 'Lo-Fi', 'Metal', 'Folk'
];

export default function HomePage() {
  const { playTrack } = useAudioPlayer();
  
  // Fetch most played/liked tracks
  const { data: popularTracks = [] } = useQuery({
    queryKey: ['popularTracks'],
    queryFn: async () => {
      const tracks = await base44.entities.Track.filter(
        { is_public: true, status: 'ready' },
        '-plays',
        5
      );
      return tracks;
    },
  });

  return (
    <div className="min-h-screen bg-slate-950 overflow-hidden relative">
      {/* Dynamic Gradient Background */}
      <DynamicGradient />
      
      {/* Floating Album Art */}
      {popularTracks.length > 0 && (
        <FloatingAlbumArt tracks={popularTracks} onTrackPlay={playTrack} />
      )}
      
      <div className="relative">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 px-4">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-violet-500/20 px-4 py-2 rounded-full mb-8 border border-violet-500/30"
          >
            <Sparkles className="h-4 w-4 text-violet-400" />
            <span className="text-violet-300 text-sm font-medium">AI-Powered Music Generation</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight"
          >
            Create Music with
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-pink-400 to-purple-400">
              Your Imagination
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-400 max-w-2xl mx-auto mb-10"
          >
            Transform your ideas into professional-quality music in seconds. 
            No musical experience required.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to={createPageUrl('Create')}>
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 text-white font-semibold text-lg rounded-xl">
                <Sparkles className="h-5 w-5 mr-2" />
                Start Creating
              </Button>
            </Link>
            <Link to={createPageUrl('Discover')}>
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 bg-white/5 border-slate-700 text-white hover:bg-white/10 font-semibold text-lg rounded-xl">
                <Play className="h-5 w-5 mr-2" />
                Explore Music
              </Button>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap justify-center gap-8 md:gap-16 mt-16 pt-8 border-t border-slate-800"
          >
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-white">50K+</p>
              <p className="text-slate-400">Tracks Created</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-white">10K+</p>
              <p className="text-slate-400">Active Users</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-white">20+</p>
              <p className="text-slate-400">Music Styles</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Everything You Need
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Powerful AI tools to bring your musical vision to life
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 hover:border-violet-500/50 transition-colors group"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Genres Section */}
      <section className="py-20 px-4 bg-slate-800/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Any Genre, Any Style
            </h2>
            <p className="text-slate-400 text-lg">
              From pop hits to orchestral masterpieces
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex flex-wrap justify-center gap-3"
          >
            {genres.map((genre, index) => (
              <motion.span
                key={genre}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="px-5 py-2.5 bg-slate-700/50 hover:bg-gradient-to-r hover:from-violet-500 hover:to-pink-500 rounded-full text-white font-medium transition-all cursor-pointer"
              >
                {genre}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-slate-400 text-lg">
              Three simple steps to your first track
            </p>
          </motion.div>

          <div className="space-y-8">
            {[
              { step: 1, title: 'Describe Your Vision', desc: 'Write what kind of music you want - style, mood, lyrics, or just an idea' },
              { step: 2, title: 'Let AI Create', desc: 'Our advanced AI composes, produces, and masters your track in seconds' },
              { step: 3, title: 'Download & Share', desc: 'Get your high-quality audio file and share it with the world' },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-6 items-start"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-slate-400">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto bg-gradient-to-r from-violet-500/20 to-pink-500/20 backdrop-blur-xl rounded-3xl p-8 md:p-12 border border-violet-500/30 text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Create Your First Track?
          </h2>
          <p className="text-slate-300 text-lg mb-8">
            Join thousands of creators making amazing music with AI
          </p>
          <Link to={createPageUrl('Create')}>
            <Button size="lg" className="h-14 px-10 bg-white text-slate-900 hover:bg-slate-100 font-semibold text-lg rounded-xl">
              Get Started Free
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-violet-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-white">Accoustica Music Studio</span>
          </div>
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} Accoustica. All rights reserved.
          </p>
        </div>
      </footer>
      </div>
    </div>
  );
}