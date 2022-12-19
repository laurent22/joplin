import config from '../config';
import { AppContext } from './types';

export function cookieSet(ctx: AppContext, name: string, value: string) {
	ctx.cookies.set(name, value, {
		// Means that the cookies cannot be accessed from JavaScript
		httpOnly: true,
		// Can only be transferred over https
		secure: config().cookieSecure,
		// Prevent cookies from being sent in cross-site requests
		sameSite: true,
	});
}

export function cookieGet(ctx: AppContext, name: string) {
	return ctx.cookies.get(name);
}

export function cookieDelete(ctx: AppContext, name: string) {
	return cookieSet(ctx, name, '');
}
