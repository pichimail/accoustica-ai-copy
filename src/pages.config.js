import Create from './pages/Create';
import Library from './pages/Library';
import Discover from './pages/Discover';
import TrackView from './pages/TrackView';
import PublicTrack from './pages/PublicTrack';
import Profile from './pages/Profile';
import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminPlans from './pages/AdminPlans';
import AdminTracks from './pages/AdminTracks';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Create": Create,
    "Library": Library,
    "Discover": Discover,
    "TrackView": TrackView,
    "PublicTrack": PublicTrack,
    "Profile": Profile,
    "Home": Home,
    "AdminDashboard": AdminDashboard,
    "AdminUsers": AdminUsers,
    "AdminPlans": AdminPlans,
    "AdminTracks": AdminTracks,
}

export const pagesConfig = {
    mainPage: "Create",
    Pages: PAGES,
    Layout: __Layout,
};