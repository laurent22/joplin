import { Routers } from '../utils/routeUtils';

import apiSessions from './api/sessions';
import apiPing from './api/ping';
import apiFiles from './api/files';
import indexLoginRoute from './index/login';
import indexLogoutRoute from './index/logout';
import indexHomeRoute from './index/home';
import indexUsersRoute from './index/users';
import indexFilesRoute from './index/files';
import indexNotificationsRoute from './index/notifications';
import defaultRoute from './default';

const routes: Routers = {
	'api/ping': apiPing,
	'api/sessions': apiSessions,
	'api/files': apiFiles,

	'login': indexLoginRoute,
	'logout': indexLogoutRoute,
	'home': indexHomeRoute,
	'users': indexUsersRoute,
	'files': indexFilesRoute,
	'notifications': indexNotificationsRoute,

	'': defaultRoute,
};

export default routes;
