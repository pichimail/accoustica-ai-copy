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
import MasteringStudio from './pages/MasteringStudio';
import VideoStudio from './pages/VideoStudio';
import PersonasHub from './pages/PersonasHub';
import StemStudio from './pages/StemStudio';
import ForYou from './pages/ForYou';
import TrackInfo from './pages/TrackInfo';
import ArtistInfo from './pages/ArtistInfo';
import SocialFeed from './pages/SocialFeed';
import SongEditor from './pages/SongEditor';
import RemixStudio from './pages/RemixStudio';
import MasteringProStudio from './pages/MasteringProStudio';
import AdminFeatureFlags from './pages/AdminFeatureFlags';
import Insights from './pages/Insights';
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
    "MasteringStudio": MasteringStudio,
    "VideoStudio": VideoStudio,
    "PersonasHub": PersonasHub,
    "StemStudio": StemStudio,
    "ForYou": ForYou,
    "TrackInfo": TrackInfo,
    "ArtistInfo": ArtistInfo,
    "SocialFeed": SocialFeed,
    "SongEditor": SongEditor,
    "RemixStudio": RemixStudio,
    "MasteringProStudio": MasteringProStudio,
    "AdminFeatureFlags": AdminFeatureFlags,
    "Insights": Insights,
}

export const pagesConfig = {
    mainPage: "Create",
    Pages: PAGES,
    Layout: __Layout,
};
