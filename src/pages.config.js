import Create from './pages/Create';
import Library from './pages/Library';
import Discover from './pages/Discover';
import TrackView from './pages/TrackView';
import PublicTrack from './pages/PublicTrack';
import Profile from './pages/Profile';


export const PAGES = {
    "Create": Create,
    "Library": Library,
    "Discover": Discover,
    "TrackView": TrackView,
    "PublicTrack": PublicTrack,
    "Profile": Profile,
}

export const pagesConfig = {
    mainPage: "Create",
    Pages: PAGES,
};