import { Route } from '../../utils/routeUtils';

const route: Route = {

	exec: async function() {
		return { status: 'ok', message: 'Joplin Server is running' };
	},

};

export default route;
