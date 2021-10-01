import { SubPath, redirect, makeUrl, UrlType } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { formParse, userIp } from '../../utils/requestUtils';
import config from '../../config';
import defaultView from '../../utils/defaultView';
import { View } from '../../services/MustacheService';
import limiterLoginBruteForce from '../../utils/request/limiterLoginBruteForce';
import { cookieSet } from '../../utils/cookies';

function makeView(error: any = null): View {
	const view = defaultView('login', 'Login');
	view.content = {
		error,
		signupUrl: config().signupEnabled || config().isJoplinCloud ? makeUrl(UrlType.Signup) : '',
	};
	return view;
}

const router: Router = new Router(RouteType.Web);

router.public = true;

router.get('login', async (_path: SubPath, _ctx: AppContext) => {
	return makeView();
});

router.post('login', async (_path: SubPath, ctx: AppContext) => {
	await limiterLoginBruteForce(userIp(ctx));

	try {
		const body = await formParse(ctx.req);

		const session = await ctx.joplin.models.session().authenticate(body.fields.email, body.fields.password);
		cookieSet(ctx, 'sessionId', session.id);
		return redirect(ctx, `${config().baseUrl}/home`);
	} catch (error) {
		return makeView(error);
	}
});

export default router;
