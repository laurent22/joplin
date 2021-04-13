import { Routers } from '../utils/routeUtils';

import apiSessions from './api/sessions';
import apiPing from './api/ping';
import apiFiles from './api/files';
import apiItems from './api/items';
import apiShares from './api/shares';
import apiShareUsers from './api/share_users';

import indexLogin from './index/login';
import indexLogout from './index/logout';
import indexHome from './index/home';
import indexUsers from './index/users';
import indexFiles from './index/files';
import indexNotifications from './index/notifications';
import indexShares from './index/shares';
import indexChanges from './index/changes';

import defaultRoute from './default';

const routes: Routers = {
	'api/ping': apiPing,
	'api/sessions': apiSessions,
	'api/files': apiFiles,
	'api/items': apiItems,
	'api/shares': apiShares,
	'api/share_users': apiShareUsers,

	'login': indexLogin,
	'logout': indexLogout,
	'home': indexHome,
	'users': indexUsers,
	'files': indexFiles,
	'notifications': indexNotifications,
	'shares': indexShares,
	'changes': indexChanges,

	'': defaultRoute,
};

export default routes;
