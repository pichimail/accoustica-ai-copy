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
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { toast } from 'sonner';
import { Mail, Lock, Crown } from 'lucide-react';
import BrandLogo from '@/components/brand/BrandLogo';

export default function LoginPage({ authError }) {
  const [mode, setMode] = useState('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const { settings } = useAppSettings();

  const hasDefaultAdmin = Boolean(DEFAULT_ADMIN_EMAIL && DEFAULT_ADMIN_PASSWORD);
  const googleClientId = settings?.google_client_id || GOOGLE_CLIENT_ID;
  const googleAuthEnabled =
    GOOGLE_AUTH_ENV ?? settings?.google_auth_enabled ?? Boolean(googleClientId);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter your email and password.');
      return;
    }

    setIsBusy(true);
    try {
      if (mode === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (error) throw error;
        toast.success('Welcome back!');
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password
        });
        if (error) throw error;
        toast.success('Account created! Check your email to confirm.');
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
    } catch (error) {
      toast.error(error.message || 'Failed to send magic link');
    } finally {
      setIsBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
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

  const handleDefaultAdminLogin = async () => {
    if (!hasDefaultAdmin) {
      toast.error('Set VITE_DEFAULT_ADMIN_EMAIL and VITE_DEFAULT_ADMIN_PASSWORD first.');
      return;
    }

    setIsBusy(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: DEFAULT_ADMIN_EMAIL,
        password: DEFAULT_ADMIN_PASSWORD
      });

      if (signInError) {
        const message = signInError.message?.toLowerCase() || '';
        if (message.includes('invalid') || message.includes('credentials')) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: DEFAULT_ADMIN_EMAIL,
            password: DEFAULT_ADMIN_PASSWORD,
            options: {
              data: { full_name: DEFAULT_ADMIN_NAME }
            }
          });
          if (signUpError) {
            const signUpMessage = signUpError.message?.toLowerCase() || '';
            if (signUpMessage.includes('already')) {
              throw new Error('Admin user exists but the password is incorrect.');
            }
            throw signUpError;
          }
          if (!signUpData?.session) {
            toast.success('Admin account created. Check your email to confirm, then sign in.');
            return;
          }
        } else {
          throw signInError;
        }
      }

      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id) {
        await supabase
          .from('profiles')
          .update({ role: 'admin', updated_date: new Date().toISOString() })
          .eq('id', authData.user.id);
      }
      toast.success('Logged in as admin.');
    } catch (error) {
      toast.error(error.message || 'Admin login failed');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Card className="w-full max-w-md bg-slate-900/70 border border-slate-800 shadow-xl">
        <CardHeader>
          <div className="flex flex-col gap-2">
            <BrandLogo variant="wordmark" className="h-8 w-auto" />
            <p className="text-sm text-slate-400">
              Sign in to create, publish, and collaborate.
            </p>
          </div>
          {authError?.message && (
            <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {authError.message}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {googleAuthEnabled && (
            <GoogleAuthButton onClick={handleGoogleSignIn} disabled={isBusy} />
          )}

          {hasDefaultAdmin && (
            <Button
              onClick={handleDefaultAdminLogin}
              disabled={isBusy}
              variant="outline"
              className="w-full border-amber-500/50 text-amber-200 hover:text-white hover:border-amber-400"
            >
              <Crown className="h-4 w-4 mr-2" />
              Use Default Admin
            </Button>
          )}

          {(googleAuthEnabled || hasDefaultAdmin) && (
            <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-slate-500">
              <span className="flex-1 h-px bg-slate-800" />
              or
              <span className="flex-1 h-px bg-slate-800" />
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-slate-300">Email</Label>
            <div className="relative">
              <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@music.com"
                className="pl-10 bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Password</Label>
            <div className="relative">
              <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10 bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          <Button
            onClick={handleAuth}
            disabled={isBusy}
            className="w-full bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600"
          >
            {mode === 'sign-in' ? 'Sign In' : 'Create Account'}
          </Button>

          <Button
            onClick={handleMagicLink}
            disabled={isBusy}
            variant="outline"
            className="w-full border-slate-700 text-slate-200 hover:text-white hover:border-slate-500"
          >
            Send Magic Link
          </Button>

          <div className="flex items-center justify-center text-sm text-slate-400">
            {mode === 'sign-in' ? (
              <>
                New here?
                <button
                  className="ml-2 text-violet-300 hover:text-violet-200"
                  onClick={() => setMode('sign-up')}
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?
                <button
                  className="ml-2 text-violet-300 hover:text-violet-200"
                  onClick={() => setMode('sign-in')}
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
