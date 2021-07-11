import { Routers } from '../utils/routeUtils';

import apiBatch from './api/batch';
import apiDebug from './api/debug';
import apiEvents from './api/events';
import apiBatchItems from './api/batch_items';
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
import indexPassword from './index/password';
import indexSignup from './index/signup';
import indexShares from './index/shares';
import indexUsers from './index/users';
import indexStripe from './index/stripe';
import indexTerms from './index/terms';
import indexPrivacy from './index/privacy';

import defaultRoute from './default';

const routes: Routers = {
	'api/batch': apiBatch,
	'api/batch_items': apiBatchItems,
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
	'password': indexPassword,
	'login': indexLogin,
	'logout': indexLogout,
	'notifications': indexNotifications,
	'signup': indexSignup,
	'shares': indexShares,
	'users': indexUsers,
	'stripe': indexStripe,
	'terms': indexTerms,
	'privacy': indexPrivacy,

	'': defaultRoute,
};

export default routes;
