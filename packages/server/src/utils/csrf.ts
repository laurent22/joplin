import { User } from '../services/database/types';
import { Models } from '../models/factory';
import { ErrorForbidden } from './errors';
import { escapeHtml } from './htmlUtils';
import { bodyFields, isApiRequest } from './requestUtils';
import { AppContext } from './types';

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

	if (!(await ctx.joplin.models.token().isValid(userId, fields._csrf))) {
		throw new ErrorForbidden(`Invalid CSRF token: ${fields._csrf}`);
	}

	await ctx.joplin.models.token().deleteByValue(userId, fields._csrf);
}

export async function createCsrfToken(models: Models, user: User, throwOnError = true) {
	if (!user) {
		if (!throwOnError) return '';
		throw new Error('Cannot create CSRF token without a user');
	}
	return models.token().generate(user.id);
}

export async function createCsrfTokenFromContext(ctx: AppContext, throwOnError = true) {
	return createCsrfToken(ctx.joplin.models, ctx.joplin.owner, throwOnError);
}

export async function createCsrfTag(ctx: AppContext, throwOnError = true) {
	const token = await createCsrfTokenFromContext(ctx, throwOnError);
	return `<input type="hidden" name="_csrf" value="${escapeHtml(token)}"/>`;
}
