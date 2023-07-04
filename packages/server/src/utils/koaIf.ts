import { Context } from 'koa';

// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
export default function koaIf(middleware: Function, condition: any = null) {
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	return async (ctx: Context, next: Function) => {
		if (typeof condition === 'function' && condition(ctx)) {
			await middleware(ctx, next);
		} else if (typeof condition === 'boolean' && condition) {
			await middleware(ctx, next);
		} else {
			await next();
		}
	};
}
