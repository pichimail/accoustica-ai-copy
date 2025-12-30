import React, { useState } from 'react';
import { supabase } from '@/api/base44Client';
import { useAppSettings } from '@/lib/use-app-settings';
import {
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_ADMIN_NAME,
  GOOGLE_AUTH_ENV,
  GOOGLE_CLIENT_ID
} from '@/lib/auth-config';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Sparkles, Mail, Lock, Crown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '@/components/utils/haptics';
import { useMobile } from '@/hooks/use-mobile';

export default function AuthBottomSheet({ isOpen, onClose }) {
  const [mode, setMode] = useState('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const { settings } = useAppSettings();
  const isMobile = useMobile();

  const hasDefaultAdmin = Boolean(DEFAULT_ADMIN_EMAIL && DEFAULT_ADMIN_PASSWORD);
  const googleClientId = settings?.google_client_id || GOOGLE_CLIENT_ID;
  const googleAuthEnabled =
    GOOGLE_AUTH_ENV ?? settings?.google_auth_enabled ?? Boolean(googleClientId);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter your email and password.');
      return;
    }

    haptics.medium();
    setIsBusy(true);
    try {
      if (mode === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (error) throw error;
        toast.success('Welcome back!');
        onClose();
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password
        });
        if (error) throw error;
        toast.success('Account created! Check your email to confirm.');
        onClose();
      }
    } catch (error) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setIsBusy(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email.trim()) {
      toast.error('Enter your email to receive a magic link.');
      return;
    }

    haptics.light();
    setIsBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin
        }
      });
      if (error) throw error;
      toast.success('Magic link sent! Check your inbox.');
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to send magic link');
    } finally {
      setIsBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
    haptics.medium();
    setIsBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error) {
      toast.error(error.message || 'Google authentication failed');
    } finally {
      setIsBusy(false);
    }
  };

  const handleClose = () => {
    haptics.light();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 glass-surface rounded-t-3xl border-t border-white/10 max-h-[90vh] overflow-y-auto"
          >
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="w-12 h-1 bg-slate-600 rounded-full" />
            </div>

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5 text-slate-400" />
            </button>

            {/* Content */}
            <div className="px-6 pb-8">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-white text-2xl font-bold">
                    {mode === 'sign-in' ? 'Welcome Back' : 'Get Started'}
                  </h2>
                  <p className="text-sm text-slate-400">
                    {mode === 'sign-in' ? 'Sign in to continue' : 'Create your account'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Google Sign In */}
                {googleAuthEnabled && (
                  <GoogleAuthButton
                    onClick={handleGoogleSignIn}
                    disabled={isBusy}
                    className="h-12"
                    iconClassName="h-5 w-5"
                  />
                )}

                {/* Default Admin (Dev Only) */}
                {hasDefaultAdmin && (
                  <Button
                    onClick={async () => {
                      haptics.medium();
                      setIsBusy(true);
                      try {
                        const { error } = await supabase.auth.signInWithPassword({
                          email: DEFAULT_ADMIN_EMAIL,
                          password: DEFAULT_ADMIN_PASSWORD
                        });
                        if (error) throw error;
                        toast.success('Logged in as admin.');
                        onClose();
                      } catch (error) {
                        toast.error(error.message || 'Admin login failed');
                      } finally {
                        setIsBusy(false);
                      }
                    }}
                    disabled={isBusy}
                    variant="outline"
                    className="w-full h-12 border-amber-500/50 text-amber-200 hover:text-white hover:border-amber-400"
                  >
                    <Crown className="h-5 w-5 mr-2" />
                    Use Default Admin
                  </Button>
                )}

                {/* Divider */}
                {(googleAuthEnabled || hasDefaultAdmin) && (
                  <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-slate-500">
                    <span className="flex-1 h-px bg-slate-700" />
                    or
                    <span className="flex-1 h-px bg-slate-700" />
                  </div>
                )}

                {/* Email Input */}
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">Email</Label>
                  <div className="relative">
                    <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@music.com"
                      className="pl-10 h-12 bg-slate-800/50 border-slate-700 text-white"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">Password</Label>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 h-12 bg-slate-800/50 border-slate-700 text-white"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') handleAuth();
                      }}
                    />
                  </div>
                </div>

                {/* Sign In/Up Button */}
                <Button
                  onClick={handleAuth}
                  disabled={isBusy}
                  className="w-full h-12 bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 text-white font-semibold"
                >
                  {mode === 'sign-in' ? 'Sign In' : 'Create Account'}
                </Button>

                {/* Magic Link */}
                <Button
                  onClick={handleMagicLink}
                  disabled={isBusy}
                  variant="outline"
                  className="w-full h-12 border-slate-700 text-slate-200 hover:text-white hover:border-slate-500"
                >
                  Send Magic Link
                </Button>

                {/* Toggle Mode */}
                <div className="flex items-center justify-center text-sm text-slate-400 pt-2">
                  {mode === 'sign-in' ? (
                    <>
                      New here?
                      <button
                        className="ml-2 text-violet-300 hover:text-violet-200 font-medium"
                        onClick={() => {
                          haptics.selection();
                          setMode('sign-up');
                        }}
                      >
                        Create an account
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?
                      <button
                        className="ml-2 text-violet-300 hover:text-violet-200 font-medium"
                        onClick={() => {
                          haptics.selection();
                          setMode('sign-in');
                        }}
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
