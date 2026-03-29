import { SubPath, redirect, makeUrl, UrlType, internalRedirect } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { formParse, userIp } from '../../utils/requestUtils';
import config from '../../config';
import defaultView from '../../utils/defaultView';
import { View } from '../../services/MustacheService';
import limiterLoginBruteForce from '../../utils/request/limiterLoginBruteForce';
import { cookieSet } from '../../utils/cookies';
import { adminDashboardUrl, applicationsConfirmUrl, homeUrl } from '../../utils/urlUtils';
import { generateRedirectHtml } from '../../utils/saml';
import { ErrorForbidden } from '../../utils/errors';

type LoginViewContentOptions = {
	showMfaCodeInput: boolean;
	showRecoveryCodeInput?: boolean;
};

type LoginInputFields = {
	email?: string;
	password?: string;
	mfaCode?: string;
	applicationAuthId?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function makeView(error: any = null, fields?: LoginInputFields, viewContentOptions?: LoginViewContentOptions): View {
	const view = defaultView('login', 'Login');
	view.content = {
		error,
		signupUrl: config().signupEnabled || config().isJoplinCloud ? makeUrl(UrlType.Signup) : '',
		email: fields?.email,
		password: fields?.password,
		applicationAuthId: fields?.applicationAuthId,
		// should only show mfa code input if recovery code is not active
		showMfaCodeInput: viewContentOptions?.showRecoveryCodeInput ? false : viewContentOptions?.showMfaCodeInput,
		showRecoveryCodeInput: viewContentOptions?.showRecoveryCodeInput,
		samlEnabled: config().saml.enabled,
		samlOrganizationName: config().saml.enabled && config().saml.organizationDisplayName ? config().saml.organizationDisplayName : undefined,
	};
	return view;
}

const router: Router = new Router(RouteType.Web);

router.public = true;

type Queries = {
	[key: string]: QueryParameter;
};

type QueryParameter = string | string[];

const getApplicationAuthId = (query: Queries, fields: LoginInputFields): string | undefined => {
	if (query?.application_auth_id && !Array.isArray(query?.application_auth_id)) {
		return query.application_auth_id;
	}
	if (fields?.applicationAuthId) {
		return fields.applicationAuthId;
	}
	return undefined;
};


const getRedirectUrl = (isAdmin: number, applicationAuthId?: string) => {
	if (applicationAuthId) return applicationsConfirmUrl(applicationAuthId);
	if (isAdmin) return adminDashboardUrl();
	return homeUrl();
};

router.get('login', async (_path: SubPath, ctx: AppContext, fields: LoginInputFields = {}, options: LoginViewContentOptions) => {
	const viewContentOptions = {
		showMfaCodeInput: !!options?.showMfaCodeInput,
		showRecoveryCodeInput: !!ctx.query?.showRecoveryCodeInput,
	};
	fields.applicationAuthId = getApplicationAuthId(ctx.query, fields);

	if (ctx.joplin.owner) {
		return redirect(ctx, getRedirectUrl(ctx.joplin.owner.is_admin, fields.applicationAuthId));
	}

	return makeView(null, fields, viewContentOptions);
});

router.post('login', async (_path: SubPath, _ctx: AppContext) => {
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

router.post('login', async (path: SubPath, ctx: AppContext) => {
	await limiterLoginBruteForce(userIp(ctx));

	const body = await formParse(ctx.req);

	try {
		const hasMFAEnabled = await ctx.joplin.models.user().hasMFAEnabled(body.fields.email);

		if (hasMFAEnabled && (!body.fields.mfaCode && !body.fields.recoveryCode)) {
			return internalRedirect(path, ctx, router, 'login', body.fields, { showMfaCodeInput: true });
		}

		const session = await ctx.joplin.models.session().authenticate(
			body.fields.email, body.fields.password, body.fields.mfaCode, body.fields.recoveryCode,
		);
		cookieSet(ctx, 'sessionId', session.id);
		const owner = await ctx.joplin.models.user().load(session.user_id, { fields: ['id', 'is_admin'] });

		return redirect(ctx, getRedirectUrl(owner.is_admin, body.fields.applicationAuthId));
	} catch (error) {
		return makeView(
			error,
			{ email: body.fields.email, password: body.fields.password, applicationAuthId: body.fields.applicationAuthId },
			{ showMfaCodeInput: Boolean(body.fields.mfaCode), showRecoveryCodeInput: Boolean(body.fields.recoveryCode) },
		);
	}
});

export default router;
