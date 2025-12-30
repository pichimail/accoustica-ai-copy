import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Crown, Sparkles, Check, X, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PLAN_FEATURES, FEATURE_TIERS } from '@/lib/premium-features';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function UpgradeModal({
  open,
  onClose,
  requiredTier = FEATURE_TIERS.PRO,
  featureName,
  currentTier = FEATURE_TIERS.FREE,
}) {
  const requiredPlan = PLAN_FEATURES[requiredTier];
  const currentPlan = PLAN_FEATURES[currentTier];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl">
                Upgrade to {requiredPlan.name}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Unlock {featureName || 'this feature'} and many more
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current vs Required */}
          <div className="grid grid-cols-2 gap-4">
            {/* Current Plan */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-400">Current Plan</span>
                  <div className="px-2 py-1 rounded bg-slate-700 text-xs text-slate-300">
                    {currentPlan.name}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-400" />
                    <span className="text-slate-300">{currentPlan.daily_limit} tracks/day</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <X className="h-4 w-4 text-red-400" />
                    <span className="text-slate-500 line-through">{featureName || 'Advanced features'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Required Plan */}
            <Card className="bg-gradient-to-br from-violet-500/20 to-pink-500/20 border-violet-500/30 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-pink-500/10" />
              <CardContent className="p-4 relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-violet-300">Upgrade To</span>
                  <div className="px-2 py-1 rounded bg-gradient-to-r from-violet-500 to-pink-500 text-xs text-white font-semibold flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    {requiredPlan.name}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-violet-400" />
                    <span className="text-white font-medium">{requiredPlan.daily_limit} tracks/day</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-violet-400" />
                    <span className="text-white font-medium">{featureName || 'All advanced features'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Feature List */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Zap className="h-4 w-4 text-violet-400" />
              What you'll get with {requiredPlan.name}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {requiredPlan.features.map((feature, index) => (
                <motion.div
                  key={index}
                  variants={item}
                  className="flex items-start gap-2 p-2 rounded-lg bg-slate-800/50"
                >
                  <Check className="h-4 w-4 text-violet-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-300">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Pricing */}
          <div className="text-center p-6 rounded-xl bg-gradient-to-br from-violet-500/10 to-pink-500/10 border border-violet-500/20">
            <div className="flex items-baseline justify-center gap-2 mb-2">
              <span className="text-4xl font-bold text-white">
                ${requiredPlan.price}
              </span>
              <span className="text-slate-400">/month</span>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              Cancel anytime • No commitment
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to={createPageUrl('AdminPlans')}>
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 text-white font-semibold shadow-lg"
                  onClick={() => onClose()}
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade Now
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-slate-700 text-slate-300 hover:bg-slate-800"
                onClick={onClose}
              >
                Maybe Later
              </Button>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="flex items-center justify-center gap-6 pt-4 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <Check className="h-3 w-3 text-green-500" />
              <span>Secure Payment</span>
            </div>
            <div className="flex items-center gap-1">
              <Check className="h-3 w-3 text-green-500" />
              <span>Instant Access</span>
            </div>
            <div className="flex items-center gap-1">
              <Check className="h-3 w-3 text-green-500" />
              <span>30-Day Guarantee</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
