import { holoroutes } from './hololive';
import { nijiroutes } from './nijisanji';
import { othersroutes } from './others';
import { twitcastroutes } from './twitcasting';
import { twitchroutes } from './twitch';
import { museroutes } from './museid';
import { gamesroutes } from './games';
import { u2routes } from './u2';
import { nhroutes } from './nh';
import { sauceroutes } from './saucefinder';
import { vtapiRoutes } from "./vtuberapi";

export { holoroutes as HoloRoutes, nijiroutes as NijiRoutes, othersroutes as OthersRoutes };
export { twitcastroutes as TwitcastingRoutes, twitchroutes as TwitchRoutes };
export { museroutes as MuseIDRoutes };

export {
    gamesroutes as GamesRoutes,
    u2routes as U2Routes,
    nhroutes as NHRoutes,
    sauceroutes as SauceRoutes,
    vtapiRoutes as VTAPIDashboardRoutes
};