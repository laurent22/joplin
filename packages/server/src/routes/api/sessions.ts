import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { bodyFields, userIp } from '../../utils/requestUtils';
import limiterLoginBruteForce from '../../utils/request/limiterLoginBruteForce';

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
	await limiterLoginBruteForce(userIp(ctx));

	const fields: SessionFields = await bodyFields(ctx.req);

	const clientInfo = {
		...fields,
		ip: userIp(ctx),
	};

	// we pass null on mfaCode because the user shouldn't be able to make 2FA login over the API
	const session = await ctx.joplin.models.session().authenticate(fields.email, fields.password, null);

	await ctx.joplin.models.application().updateOnNewLogin(fields.email, clientInfo);

	return { id: session.id, user_id: session.user_id };
});

export default router;
