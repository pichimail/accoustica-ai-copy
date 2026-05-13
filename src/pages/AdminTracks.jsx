// @ts-nocheck
// Redirects to unified Admin Console (Tracks tab)
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function AdminTracks() {
  const navigate = useNavigate();
  useEffect(() => { navigate(createPageUrl('AdminDashboard'), { replace: true }); }, [navigate]);
  return null;
}
