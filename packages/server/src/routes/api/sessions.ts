import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { bodyFields, userIp } from '../../utils/requestUtils';
import limiterLoginBruteForce from '../../utils/request/limiterLoginBruteForce';
import config from '../../config';
import { ErrorForbidden } from '../../utils/errors';

const router = new Router(RouteType.Api);

router.public = true;

type SessionFields = {
	email?: string;
	password?: string;
	platform?: number;
	type?: number;
	version?: string;
};

router.post('api/sessions', async (_path: SubPath, ctx: AppContext) => {
	const fields: SessionFields = await bodyFields(ctx.req);

	// The check is before the rate limiter so email logins rejected by API_EMAIL_LOGIN_ENABLED don't count in it
	if (!config().API_EMAIL_LOGIN_ENABLED && !ctx.joplin.models.application().isApplicationId(fields.email)) {
		throw new ErrorForbidden('Email and password sign-in is not supported on this server. Please sign in again using the browser.');
	}

	await limiterLoginBruteForce(userIp(ctx));

	const clientInfo = {
		...fields,
		ip: userIp(ctx),
	};

	// we pass null on mfaCode because the user shouldn't be able to make 2FA login over the API
	const session = await ctx.joplin.models.session().authenticate(fields.email, fields.password, ctx.joplin.services, null);

	await ctx.joplin.models.application().updateOnNewLogin(fields.email, clientInfo);

	return { id: session.id, user_id: session.user_id };
});

export default router;
