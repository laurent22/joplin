import { Context } from 'koa';

export default function koaIf(middleware: Function, condition: any = null) {
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
