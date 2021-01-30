import { Routers } from '../utils/routeUtils';

import apiSessions from './api/sessions';
import apiPing from './api/ping';
import apiFiles from './api/files';
import apiShares from './api/shares';

import indexLogin from './index/login';
import indexLogout from './index/logout';
import indexHome from './index/home';
import indexUsers from './index/users';
import indexFiles from './index/files';
import indexNotifications from './index/notifications';
import indexShares from './index/shares';

import defaultRoute from './default';

const routes: Routers = {
	'api/ping': apiPing,
	'api/sessions': apiSessions,
	'api/files': apiFiles,
	'api/shares': apiShares,

	'login': indexLogin,
	'logout': indexLogout,
	'home': indexHome,
	'users': indexUsers,
	'files': indexFiles,
	'notifications': indexNotifications,
	'shares': indexShares,

	'': defaultRoute,
};

export default routes;
