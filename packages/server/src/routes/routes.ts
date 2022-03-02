import { Routers } from '../utils/routeUtils';

import apiBatch from './api/batch';
import apiBatchItems from './api/batch_items';
import apiDebug from './api/debug';
import apiEvents from './api/events';
import apiItems from './api/items';
import apiLocks from './api/locks';
import apiPing from './api/ping';
import apiSessions from './api/sessions';
import apiShares from './api/shares';
import apiShareUsers from './api/share_users';
import apiUsers from './api/users';

import adminDashboard from './admin/dashboard';
import adminEmails from './admin/emails';
import adminTasks from './admin/tasks';
import adminUserDeletions from './admin/user_deletions';
import adminUsers from './admin/users';

import indexChanges from './index/changes';
import indexHelp from './index/help';
import indexHome from './index/home';
import indexItems from './index/items';
import indexLogin from './index/login';
import indexLogout from './index/logout';
import indexNotifications from './index/notifications';
import indexPassword from './index/password';
import indexPrivacy from './index/privacy';
import indexShares from './index/shares';
import indexSignup from './index/signup';
import indexStripe from './index/stripe';
import indexTerms from './index/terms';
import indexUpgrade from './index/upgrade';
import indexUsers from './index/users';

import defaultRoute from './default';

const routes: Routers = {
	'api/batch_items': apiBatchItems,
	'api/batch': apiBatch,
	'api/debug': apiDebug,
	'api/events': apiEvents,
	'api/items': apiItems,
	'api/locks': apiLocks,
	'api/ping': apiPing,
	'api/sessions': apiSessions,
	'api/share_users': apiShareUsers,
	'api/shares': apiShares,
	'api/users': apiUsers,

	'admin/dashboard': adminDashboard,
	'admin/emails': adminEmails,
	'admin/tasks': adminTasks,
	'admin/user_deletions': adminUserDeletions,
	'admin/users': adminUsers,

	'changes': indexChanges,
	'help': indexHelp,
	'home': indexHome,
	'items': indexItems,
	'login': indexLogin,
	'logout': indexLogout,
	'notifications': indexNotifications,
	'password': indexPassword,
	'privacy': indexPrivacy,
	'shares': indexShares,
	'signup': indexSignup,
	'stripe': indexStripe,
	'terms': indexTerms,
	'upgrade': indexUpgrade,
	'users': indexUsers,

	'': defaultRoute,
};

export default routes;
