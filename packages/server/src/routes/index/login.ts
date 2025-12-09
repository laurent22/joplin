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
import { homeUrl } from '../../utils/urlUtils';
import { generateRedirectHtml } from '../../utils/saml';
import { ErrorForbidden } from '../../utils/errors';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function makeView(error: any = null): View {
	const view = defaultView('login', 'Login');
	view.content = {
		error,
		signupUrl: config().signupEnabled || config().isJoplinCloud ? makeUrl(UrlType.Signup) : '',
		samlEnabled: config().saml.enabled,
		samlOrganizationName: config().saml.enabled && config().saml.organizationDisplayName ? config().saml.organizationDisplayName : undefined,
	};
	return view;
}

const router: Router = new Router(RouteType.Web);

router.public = true;

router.get('login', async (_path: SubPath, ctx: AppContext) => {
	if (ctx.joplin.owner) {
		return redirect(ctx, homeUrl());
	}

	if (!config().LOCAL_AUTH_ENABLED) {
		return await generateRedirectHtml('web-login');
	}

	return makeView();
});

// Log in using external authentication.
router.get('login/:id', async (path: SubPath, ctx: AppContext) => {
	if (!config().saml.enabled) throw new ErrorForbidden('SAML not enabled');

	if (config().saml.enabled && path.id === 'sso-saml') { // Server page, SAML
		return await generateRedirectHtml('web-login');
	} else if (config().saml.enabled && path.id === 'sso-saml-app') { // Client, SAML
		return await generateRedirectHtml('app-login');
	} else if (ctx.joplin.owner) { // Already logged-in
		return redirect(ctx, homeUrl());
	} else {
		return makeView();
	}
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
