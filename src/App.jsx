import './App.css'
import { Suspense } from 'react'
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];

const PUBLIC_PAGES = new Set(['Home', 'PublicTrack', 'Discover', 'SocialFeed', 'TrackView', 'TrackInfo', 'ArtistInfo']);
const ADMIN_PAGES = new Set(['AdminDashboard', 'AdminUsers', 'AdminPlans', 'AdminTracks', 'AdminFeatureFlags']);

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const RouteFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

const RequireRouteAccess = ({ pageName, children }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const isPublicPage = PUBLIC_PAGES.has(pageName);
  const isAdminPage = ADMIN_PAGES.has(pageName);

  if (!isPublicPage && !isAuthenticated) {
    return <Navigate to="/Home" replace state={{ from: location.pathname }} />;
  }

  if (isAdminPage && user?.role !== 'admin') {
    return <Navigate to="/Create" replace state={{ from: location.pathname }} />;
  }

  return children;
};

const HomeRedirect = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/Create" replace /> : children;
};

const renderPage = (path, Page) => (
  <LayoutWrapper currentPageName={path}>
    <Suspense fallback={<RouteFallback />}>
      <RequireRouteAccess pageName={path}>
        {path === 'Home' ? <HomeRedirect><Page /></HomeRedirect> : <Page />}
      </RequireRouteAccess>
    </Suspense>
  </LayoutWrapper>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <Navigate to={`/${mainPageKey}`} replace />
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={renderPage(path, Page)}
        />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <SonnerToaster position="bottom-right" richColors />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
