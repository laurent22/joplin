import { Routers } from '../utils/routeUtils';

import apiDebug from './api/debug';
import apiEvents from './api/events';
import apiItems from './api/items';
import apiPing from './api/ping';
import apiSessions from './api/sessions';
import apiUsers from './api/users';
import apiShares from './api/shares';
import apiShareUsers from './api/share_users';

import indexChanges from './index/changes';
import indexHome from './index/home';
import indexItems from './index/items';
import indexLogin from './index/login';
import indexLogout from './index/logout';
import indexNotifications from './index/notifications';
import indexSignup from './index/signup';
import indexShares from './index/shares';
import indexUsers from './index/users';

import defaultRoute from './default';

const routes: Routers = {
	'api/debug': apiDebug,
	'api/events': apiEvents,
	'api/items': apiItems,
	'api/ping': apiPing,
	'api/sessions': apiSessions,
	'api/share_users': apiShareUsers,
	'api/shares': apiShares,
	'api/users': apiUsers,

	'changes': indexChanges,
	'home': indexHome,
	'items': indexItems,
	'login': indexLogin,
	'logout': indexLogout,
	'notifications': indexNotifications,
	'signup': indexSignup,
	'shares': indexShares,
	'users': indexUsers,

	'': defaultRoute,
};

export default routes;
