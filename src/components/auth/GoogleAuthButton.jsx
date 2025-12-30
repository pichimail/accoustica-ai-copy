import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const GoogleIcon = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    <path
      fill="#4285F4"
      d="M23.64 12.2045c0-.6381-.0573-1.2517-.1636-1.8409H12v3.4819h6.3733c-.2745 1.4823-1.1082 2.739-2.3577 3.577v2.9739h3.8077c2.2282-2.052 3.527-5.076 3.527-8.1919z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.957-1.0736 7.943-2.9091l-3.8077-2.9739c-1.0604.7113-2.4195 1.1313-4.1353 1.1313-3.182 0-5.875-2.1499-6.837-5.0455H1.2295v3.1591C3.2045 21.1309 7.2564 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.163 14.2025A7.22 7.22 0 0 1 4.8 12c0-.7645.1309-1.5068.363-2.2025V6.6384H1.2295A11.995 11.995 0 0 0 0 12c0 1.9355.4623 3.7645 1.2295 5.3616l3.9335-3.1591z"
    />
    <path
      fill="#EA4335"
      d="M12 4.7645c1.7582 0 3.3436.6036 4.5873 1.7891l3.4446-3.4445C17.9523 1.2109 15.235 0 12 0 7.2564 0 3.2045 2.8691 1.2295 6.6384l3.9335 3.1591C6.125 6.9145 8.818 4.7645 12 4.7645z"
    />
  </svg>
);

export default function GoogleAuthButton({
  onClick,
  disabled,
  className,
  iconClassName,
  label = 'Continue with Google',
  size = 'default'
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      variant="outline"
      size={size}
      className={cn(
        'w-full border-slate-700 text-slate-200 hover:text-white hover:border-slate-500',
        className
      )}
    >
      <GoogleIcon className={cn('h-4 w-4', iconClassName)} />
      {label}
    </Button>
  );
}
