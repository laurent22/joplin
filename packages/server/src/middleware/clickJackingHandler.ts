import { AppContext, KoaNext } from '../utils/types';

export default async function(ctx: AppContext, next: KoaNext): Promise<void> {
	// https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html
	ctx.response.set('Content-Security-Policy', 'frame-ancestors \'none\'');
	ctx.response.set('X-Frame-Options', 'DENY');
	return next();
}
