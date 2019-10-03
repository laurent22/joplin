import { Routes } from '../utils/routeUtils';

import apiSessions from './api/sessions';
import apiPing from './api/ping';
import apiFiles from './api/files';
import oauth2Authorize from './oauth2/authorize';
import defaultRoute from './default';

const routes:Routes = {
	'api/ping': apiPing,
	'api/sessions': apiSessions,
	'api/files': apiFiles,
	'oauth2/authorize': oauth2Authorize,
	'': defaultRoute,
};

export default routes;
