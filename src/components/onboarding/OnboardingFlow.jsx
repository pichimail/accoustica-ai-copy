import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Music, Wand2, Users, Play, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const steps = [
  {
    id: 'welcome',
    title: 'Welcome to Accoustica',
    description: 'Your AI-powered music creation platform',
    icon: Sparkles,
    content: (
      <div className="space-y-4 text-center">
        <p className="text-slate-300">
          Transform your ideas into professional music with the power of AI. 
          Let's get you started on your musical journey.
        </p>
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="p-4 bg-violet-500/10 rounded-lg border border-violet-500/30">
            <Music className="h-8 w-8 text-violet-400 mx-auto mb-2" />
            <p className="text-sm text-white">Create Music</p>
          </div>
          <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
            <Wand2 className="h-8 w-8 text-blue-400 mx-auto mb-2" />
            <p className="text-sm text-white">AI Mastering</p>
          </div>
          <div className="p-4 bg-pink-500/10 rounded-lg border border-pink-500/30">
            <Users className="h-8 w-8 text-pink-400 mx-auto mb-2" />
            <p className="text-sm text-white">Collaborate</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'create-track',
    title: 'Create Your First Track',
    description: 'Learn how to generate music with AI',
    icon: Music,
    content: (
      <div className="space-y-4">
        <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">1</span>
            </div>
            <div>
              <h4 className="text-white font-medium">Describe Your Song</h4>
              <p className="text-sm text-slate-400 mt-1">
                Write a description of the music you want to create. Be creative and specific!
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">2</span>
            </div>
            <div>
              <h4 className="text-white font-medium">Choose Style & Genre</h4>
              <p className="text-sm text-slate-400 mt-1">
                Select genres, moods, or let AI decide the perfect style.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">3</span>
            </div>
            <div>
              <h4 className="text-white font-medium">Generate & Listen</h4>
              <p className="text-sm text-slate-400 mt-1">
                Click Create and wait a minute for your AI-generated track!
              </p>
            </div>
          </div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
          <p className="text-sm text-blue-400 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Tip: The more detailed your description, the better the result!
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'ai-mastering',
    title: 'AI Mastering',
    description: 'Enhance your tracks professionally',
    icon: Wand2,
    content: (
      <div className="space-y-4">
        <p className="text-slate-300">
          Once your track is ready, use AI Mastering to apply professional polish:
        </p>
        <div className="space-y-3">
          <div className="bg-slate-800/50 rounded-lg p-4">
            <h4 className="text-white font-medium mb-2 flex items-center gap-2">
              <Check className="h-4 w-4 text-green-400" />
              Genre-Specific Presets
            </h4>
            <p className="text-sm text-slate-400">
              Choose from Pop, Rock, Hip Hop, Electronic, Jazz, and more
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4">
            <h4 className="text-white font-medium mb-2 flex items-center gap-2">
              <Check className="h-4 w-4 text-green-400" />
              Reference Track Analysis
            </h4>
            <p className="text-sm text-slate-400">
              Upload a reference track to match its mastering style
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4">
            <h4 className="text-white font-medium mb-2 flex items-center gap-2">
              <Check className="h-4 w-4 text-green-400" />
              Custom Presets
            </h4>
            <p className="text-sm text-slate-400">
              Save your favorite settings for future use
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'collaboration',
    title: 'Collaborate in Real-Time',
    description: 'Work together with AI assistance',
    icon: Users,
    content: (
      <div className="space-y-4">
        <p className="text-slate-300">
          The Collaborative Studio lets you work with others:
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/50 rounded-lg p-4 text-center">
            <Music className="h-6 w-6 text-violet-400 mx-auto mb-2" />
            <p className="text-sm text-white font-medium">Share Tracks</p>
            <p className="text-xs text-slate-400 mt-1">Invite collaborators</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 text-center">
            <Wand2 className="h-6 w-6 text-blue-400 mx-auto mb-2" />
            <p className="text-sm text-white font-medium">AI Co-Writing</p>
            <p className="text-xs text-slate-400 mt-1">Get AI suggestions</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 text-center">
            <Play className="h-6 w-6 text-green-400 mx-auto mb-2" />
            <p className="text-sm text-white font-medium">Real-Time Play</p>
            <p className="text-xs text-slate-400 mt-1">Listen together</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 text-center">
            <Users className="h-6 w-6 text-pink-400 mx-auto mb-2" />
            <p className="text-sm text-white font-medium">Live Chat</p>
            <p className="text-xs text-slate-400 mt-1">Discuss changes</p>
          </div>
        </div>
      </div>
    ),
  },
];

export default function OnboardingFlow({ open, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [user, setUser] = useState(null);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      
      // Check if user has onboarding progress
      const progressData = await base44.entities.OnboardingProgress.filter({ created_by: userData.email });
      if (progressData.length > 0) {
        setProgress(progressData[0]);
      }
    };
    if (open) {
      fetchUser();
    }
  }, [open]);

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await completeOnboarding();
    }
  };

  const handleSkip = async () => {
    if (user) {
      if (progress) {
        await base44.entities.OnboardingProgress.update(progress.id, {
          skipped: true,
          is_completed: true,
        });
      } else {
        await base44.entities.OnboardingProgress.create({
          completed_steps: [],
          skipped: true,
          is_completed: true,
        });
      }
    }
    toast.info('You can access the help section anytime from your profile');
    onComplete?.();
  };

  const completeOnboarding = async () => {
    if (user) {
      const completedSteps = steps.map(s => s.id);
      if (progress) {
        await base44.entities.OnboardingProgress.update(progress.id, {
          completed_steps: completedSteps,
          is_completed: true,
        });
      } else {
        await base44.entities.OnboardingProgress.create({
          completed_steps: completedSteps,
          is_completed: true,
        });
      }
    }
    toast.success('Welcome to Accoustica! 🎵');
    onComplete?.();
  };

  const step = steps[currentStep];
  const StepIcon = step.icon;
  const progressPercent = ((currentStep + 1) / steps.length) * 100;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl" hideClose>
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 mb-4">
              <StepIcon className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{step.title}</h2>
            <p className="text-slate-400">{step.description}</p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Step {currentStep + 1} of {steps.length}</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="min-h-[300px]"
            >
              {step.content}
            </motion.div>
          </AnimatePresence>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4 mr-2" />
              Skip Tour
            </Button>
            
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="border-slate-700"
                >
                  Back
                </Button>
              )}
              <Button
                onClick={handleNext}
                className="bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600"
              >
                {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}