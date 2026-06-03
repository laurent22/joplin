import { Context, Middleware, Next } from 'koa';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export default function koaIf(middleware: Middleware, condition: any = null) {
	return async (ctx: Context, next: Next) => {
		if (typeof condition === 'function' && condition(ctx)) {
			await middleware(ctx, next);
		} else if (typeof condition === 'boolean' && condition) {
			await middleware(ctx, next);
		} else {
			await next();
		}
	};
}
