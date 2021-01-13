import { Routes } from '../utils/routeUtils';

import apiSessions from './api/sessions';
import apiPing from './api/ping';
import apiFiles from './api/files';
import indexLoginRoute from './index/login';
import indexLogoutRoute from './index/logout';
import indexHomeRoute from './index/home';
import indexProfileRoute from './index/profile';
import indexUsersRoute from './index/users';
// import indexUserRoute from './index/user';
import indexFilesRoute from './index/files';
import indexNotificationsRoute from './index/notifications';
import defaultRoute from './default';

const routes: Routes = {
	'api/ping': apiPing,
	'api/sessions': apiSessions,
	'api/files': apiFiles,

	'login': indexLoginRoute,
	'logout': indexLogoutRoute,
	'home': indexHomeRoute,
	'profile': indexProfileRoute,
	'users': indexUsersRoute,
	// 'user': indexUserRoute,
	'files': indexFilesRoute,
	'notifications': indexNotificationsRoute,

	'': defaultRoute,
};

export default routes;
