import { AppContext } from '../../types';
import { ErrorForbidden } from '../../errors';

const isAuthorized = (apiKey: string, ctx: AppContext) => {
	return apiKey === ctx.request.headers.authorization;
};

const authorizationGuard = async (ctx: AppContext, apiKey: string) => {
	if (isAuthorized(apiKey, ctx)) {
		return;
	} else {
		throw new ErrorForbidden('Missing or invalid API Key.');
	}
};

export default authorizationGuard;
