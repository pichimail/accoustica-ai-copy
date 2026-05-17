import { lazy } from 'react';
import Create from './pages/Create';
import Library from './pages/Library';
import Discover from './pages/Discover';
import TrackView from './pages/TrackView';
import PublicTrack from './pages/PublicTrack';
import Profile from './pages/Profile';
import Home from './pages/Home';
import AdminUsers from './pages/AdminUsers';
import AdminPlans from './pages/AdminPlans';
import AdminTracks from './pages/AdminTracks';
import MasteringStudio from './pages/MasteringStudio';
import VideoStudio from './pages/VideoStudio';
import PersonasHub from './pages/PersonasHub';
import ForYou from './pages/ForYou';
import TrackInfo from './pages/TrackInfo';
import ArtistInfo from './pages/ArtistInfo';
import SocialFeed from './pages/SocialFeed';
import SongEditor from './pages/SongEditor';
import Insights from './pages/Insights';
import __Layout from './Layout.jsx';

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const StemStudio = lazy(() => import('./pages/StemStudio'));
const MasteringProStudio = lazy(() => import('./pages/MasteringProStudio'));
const VoiceStudio = lazy(() => import('./pages/VoiceStudio'));

export const PAGES = {
  Create,
  Library,
  Discover,
  TrackView,
  PublicTrack,
  Profile,
  Home,
  AdminDashboard,
  AdminUsers,
  AdminPlans,
  AdminTracks,
  MasteringStudio,
  VideoStudio,
  PersonasHub,
  StemStudio,
  ForYou,
  TrackInfo,
  ArtistInfo,
  SocialFeed,
  SongEditor,
  RemixStudio: StemStudio, // redirects to merged StemStudio page
  MasteringProStudio,
  AdminFeatureFlags: lazy(() => import('./pages/AdminFeatureFlags')),
  Insights,
  VoiceStudio,
};

export const pagesConfig = {
  mainPage: 'Create',
  Pages: PAGES,
  Layout: __Layout,
};
