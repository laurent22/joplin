import { User } from '../services/database/types';
import { Models } from '../models/factory';
import { ErrorForbidden } from './errors';
import { escapeHtml } from './htmlUtils';
import { bodyFields, isApiRequest } from './requestUtils';
import { AppContext } from './types';
import { TokenPurpose } from '../models/TokenModel';
import config from '../config';

interface BodyWithCsrfToken {
	_csrf: string;
}

export async function csrfCheck(ctx: AppContext, isPublicRoute: boolean) {
	if (isApiRequest(ctx)) return;
	if (isPublicRoute) return;
	if (!['POST', 'PUT'].includes(ctx.method)) return;
	if (ctx.path === '/logout') return;

	const userId = ctx.joplin.owner ? ctx.joplin.owner.id : '';
	if (!userId) return;

	const fields = await bodyFields<BodyWithCsrfToken>(ctx.req);
	if (!fields._csrf) throw new ErrorForbidden('CSRF token is missing');
	if (Array.isArray(fields._csrf)) throw new Error('Multiple CSRF tokens inside the form!');

	if (!(await ctx.joplin.models.token().isValid(userId, fields._csrf, TokenPurpose.Csrf))) {
		throw new ErrorForbidden(`Invalid CSRF token: ${fields._csrf}`);
	}

	await ctx.joplin.models.token().deleteByValue(userId, fields._csrf, TokenPurpose.Csrf);
}

// Public forms that sign the browser in cannot have a CSRF token, as there is no session yet. Without this check, any
// website could sign its visitors in to an account of its choosing, and an app they then connect would sync into it.
export function checkNotCrossSiteRequest(ctx: AppContext) {
	const fetchSite = ctx.headers['sec-fetch-site'] as string;
	if (fetchSite) {
		if (!['same-origin', 'none'].includes(fetchSite)) throw new ErrorForbidden('Cross-site requests are not allowed');
		return;
	}

	// Browsers that predate Sec-Fetch-Site still send Origin on cross-site form submissions
	const origin = ctx.headers['origin'] as string;
	if (origin && origin !== new URL(config().baseUrl).origin) throw new ErrorForbidden('Cross-site requests are not allowed');
}

export async function createCsrfToken(models: Models, user: User, throwOnError = true) {
	if (!user) {
		if (!throwOnError) return '';
		throw new Error('Cannot create CSRF token without a user');
	}
	return models.token().generate(user.id, TokenPurpose.Csrf);
}

export async function createCsrfTokenFromContext(ctx: AppContext, throwOnError = true) {
	return createCsrfToken(ctx.joplin.models, ctx.joplin.owner, throwOnError);
}

export async function createCsrfTag(ctx: AppContext, throwOnError = true) {
	const token = await createCsrfTokenFromContext(ctx, throwOnError);
	return `<input type="hidden" name="_csrf" value="${escapeHtml(token)}"/>`;
}
